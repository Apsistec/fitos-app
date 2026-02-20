import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SupabaseService } from './supabase.service';

// USDA FoodData Central API types
export interface USDAFood {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: USDANutrient[];
}

export interface USDANutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber: string;
  unitName: string;
  value: number;
}

export interface USDASearchResult {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  foods: USDAFood[];
}

// Simplified food for our app
export interface Food {
  id: string; // fdcId as string
  name: string;
  brand?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

@Injectable({
  providedIn: 'root',
})
export class FoodService {
  private supabase = inject(SupabaseService);

  // State
  searchResults = signal<Food[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Cache for recently searched foods
  private foodCache = new Map<string, Food>();
  private readonly CACHE_SIZE = 100;

  // USDA API configuration
  private readonly USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';
  private readonly API_KEY = environment.usdaApiKey;

  /**
   * Search for foods using USDA FoodData Central API
   */
  async searchFoods(query: string, pageSize = 20): Promise<Food[]> {
    if (!query.trim()) {
      this.searchResults.set([]);
      return [];
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      // First, check our local cache in Supabase
      const cachedFoods = await this.searchCachedFoods(query, pageSize);
      if (cachedFoods.length > 0) {
        this.searchResults.set(cachedFoods);
        this.loading.set(false);
        return cachedFoods;
      }

      // If not in cache, query USDA API
      const url = `${this.USDA_BASE_URL}/foods/search?api_key=${this.API_KEY}&query=${encodeURIComponent(query)}&pageSize=${pageSize}&dataType=Foundation,SR Legacy,Branded`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`USDA API error: ${response.statusText}`);
      }

      const data: USDASearchResult = await response.json();

      // Transform USDA foods to our simplified format
      const foods = data.foods.map((usdaFood) => this.transformUSDAFood(usdaFood));

      // Cache the results
      await this.cacheFoods(foods);

      this.searchResults.set(foods);
      return foods;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search foods';
      this.error.set(errorMessage);
      console.error('Error searching foods:', err);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Get detailed food information by FDC ID
   */
  async getFoodById(fdcId: string): Promise<Food | null> {
    // Check memory cache first
    if (this.foodCache.has(fdcId)) {
      return this.foodCache.get(fdcId) as Food;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      // Check database cache
      const { data } = await this.supabase.client
        .from('cached_foods')
        .select('*')
        .eq('fdc_id', fdcId)
        .single();

      if (data) {
        const food = this.transformCachedFood(data);
        this.foodCache.set(fdcId, food);
        return food;
      }

      // Not in cache, fetch from USDA API
      const url = `${this.USDA_BASE_URL}/food/${fdcId}?api_key=${this.API_KEY}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`USDA API error: ${response.statusText}`);
      }

      const usdaFood: USDAFood = await response.json();
      const food = this.transformUSDAFood(usdaFood);

      // Cache it
      await this.cacheFoods([food]);
      this.foodCache.set(fdcId, food);

      return food;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get food details';
      this.error.set(errorMessage);
      console.error('Error getting food:', err);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Search cached foods in local database
   */
  private async searchCachedFoods(query: string, limit: number): Promise<Food[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('cached_foods')
        .select('*')
        .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
        .limit(limit);

      if (error) throw error;

      return (data || []).map((row) => this.transformCachedFood(row));
    } catch (err) {
      console.error('Error searching cached foods:', err);
      return [];
    }
  }

  /**
   * Cache foods in local database for faster future searches
   */
  private async cacheFoods(foods: Food[]): Promise<void> {
    try {
      const rows = foods.map((food) => ({
        fdc_id: food.id,
        name: food.name,
        brand: food.brand,
        serving_size: food.servingSize,
        serving_size_unit: food.servingSizeUnit,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber,
        sugar: food.sugar,
        sodium: food.sodium,
      }));

      // Insert or update (upsert)
      const { error } = await this.supabase.client
        .from('cached_foods')
        .upsert(rows, { onConflict: 'fdc_id' });

      if (error) {
        console.error('Error caching foods:', error);
      }
    } catch (err) {
      console.error('Error caching foods:', err);
    }
  }

  /**
   * Transform USDA food data to our simplified format
   */
  private transformUSDAFood(usdaFood: USDAFood): Food {
    const nutrients = this.extractNutrients(usdaFood.foodNutrients);

    return {
      id: usdaFood.fdcId.toString(),
      name: usdaFood.description,
      brand: usdaFood.brandOwner || usdaFood.brandName,
      servingSize: usdaFood.servingSize,
      servingSizeUnit: usdaFood.servingSizeUnit,
      calories: nutrients.calories,
      protein: nutrients.protein,
      carbs: nutrients.carbs,
      fat: nutrients.fat,
      fiber: nutrients.fiber,
      sugar: nutrients.sugar,
      sodium: nutrients.sodium,
    };
  }

  /**
   * Transform cached food data to our Food interface
   */
  private transformCachedFood(row: {
    fdc_id: string;
    name: string;
    brand?: string;
    serving_size?: number;
    serving_size_unit?: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  }): Food {
    return {
      id: row.fdc_id,
      name: row.name,
      brand: row.brand,
      servingSize: row.serving_size,
      servingSizeUnit: row.serving_size_unit,
      calories: row.calories,
      protein: row.protein,
      carbs: row.carbs,
      fat: row.fat,
      fiber: row.fiber,
      sugar: row.sugar,
      sodium: row.sodium,
    };
  }

  /**
   * Extract key nutrients from USDA nutrient array
   */
  private extractNutrients(foodNutrients: USDANutrient[]): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  } {
    const nutrients: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
    } = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };

    foodNutrients.forEach((nutrient) => {
      // Nutrient IDs from USDA FoodData Central
      switch (nutrient.nutrientId) {
        case 1008: // Energy (kcal)
          nutrients.calories = Math.round(nutrient.value);
          break;
        case 1003: // Protein
          nutrients.protein = Math.round(nutrient.value * 10) / 10;
          break;
        case 1005: // Carbohydrates
          nutrients.carbs = Math.round(nutrient.value * 10) / 10;
          break;
        case 1004: // Total lipid (fat)
          nutrients.fat = Math.round(nutrient.value * 10) / 10;
          break;
        case 1079: // Fiber
          nutrients.fiber = Math.round(nutrient.value * 10) / 10;
          break;
        case 2000: // Total sugars
          nutrients.sugar = Math.round(nutrient.value * 10) / 10;
          break;
        case 1093: // Sodium
          nutrients.sodium = Math.round(nutrient.value);
          break;
      }
    });

    return nutrients;
  }

  /**
   * Look up a food item by barcode (UPC/EAN) via the barcode-lookup Edge Function.
   * Pipeline: local cache → Open Food Facts → USDA → FatSecret → null
   *
   * Returns a Food object shaped to match existing search results,
   * or null if not found in any database.
   */
  async lookupBarcode(barcode: string): Promise<Food | null> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.client.functions.invoke<{
        barcode: string;
        food_name: string;
        brand?: string;
        serving_size?: number;
        serving_unit?: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber?: number;
        sugar?: number;
        sodium?: number;
        source: string;
      }>('barcode-lookup', { body: { barcode } });

      if (error) throw error;
      if (!data) return null;

      // Map to our standard Food shape
      const food: Food = {
        id: `barcode:${data.barcode}`,
        name: data.food_name,
        brand: data.brand,
        servingSize: data.serving_size,
        servingSizeUnit: data.serving_unit,
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
        fiber: data.fiber,
        sugar: data.sugar,
        sodium: data.sodium,
      };

      // Surface in searchResults signal so the add-food page can show it
      this.searchResults.set([food]);
      return food;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Barcode lookup failed';
      this.error.set(msg);
      console.error('[FoodService] lookupBarcode error:', err);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Clear the in-memory cache
   */
  clearCache(): void {
    this.foodCache.clear();
  }

  /**
   * Get cached food count (for debugging)
   */
  getCacheSize(): number {
    return this.foodCache.size;
  }
}
