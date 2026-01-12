import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/**
 * Parsed food item from natural language
 */
export interface ParsedFood {
  foodName: string;
  servingQty: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  photoUrl?: string;
  brandName?: string;
}

/**
 * Portion size descriptors that users commonly say
 */
const PORTION_DESCRIPTORS: Record<string, { qty: number; unit: string }> = {
  // Hand-based portions
  'fist': { qty: 1, unit: 'cup' },
  'fist-sized': { qty: 1, unit: 'cup' },
  'fist sized': { qty: 1, unit: 'cup' },
  'palm': { qty: 4, unit: 'oz' },
  'palm-sized': { qty: 4, unit: 'oz' },
  'palm sized': { qty: 4, unit: 'oz' },
  'handful': { qty: 0.5, unit: 'cup' },
  'thumb': { qty: 1, unit: 'tbsp' },
  'thumb-sized': { qty: 1, unit: 'tbsp' },

  // Common descriptors
  'small': { qty: 0.75, unit: 'serving' },
  'medium': { qty: 1, unit: 'serving' },
  'large': { qty: 1.5, unit: 'serving' },
  'huge': { qty: 2, unit: 'serving' },

  // Specific sizes
  'can': { qty: 1, unit: 'can' },
  'bottle': { qty: 1, unit: 'bottle' },
  'glass': { qty: 8, unit: 'oz' },
  'bowl': { qty: 1.5, unit: 'cup' },
  'plate': { qty: 2, unit: 'cup' },
};

/**
 * NutritionParserService - Natural language food parsing
 *
 * Features:
 * - Nutritionix Natural Language API integration
 * - Portion size estimation (fist-sized, handful, etc.)
 * - Multi-food parsing ("eggs, toast, and coffee")
 * - Restaurant meal estimation
 * - Caching for quick re-logging
 *
 * Usage:
 * ```typescript
 * const foods = await nutritionParser.parseNaturalLanguage(
 *   "a fist-sized chicken breast and some rice"
 * );
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class NutritionParserService {
  private http = inject(HttpClient);

  // Nutritionix API configuration
  private readonly NUTRITIONIX_APP_ID = ''; // TODO: Load from environment
  private readonly NUTRITIONIX_API_KEY = ''; // TODO: Load from environment
  private readonly NUTRITIONIX_API_URL = 'https://trackapi.nutritionix.com/v2';

  // State
  isProcessing = signal(false);
  error = signal<string | null>(null);

  // Cache for quick re-logging
  private cache = new Map<string, ParsedFood[]>();

  /**
   * Parse natural language food description
   */
  async parseNaturalLanguage(text: string): Promise<ParsedFood[]> {
    const cacheKey = text.toLowerCase().trim();

    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    this.isProcessing.set(true);
    this.error.set(null);

    try {
      // Preprocess text to expand portion descriptors
      const processedText = this.preprocessPortions(text);

      // Call Nutritionix NLP API
      const foods = await this.callNutritionixNLP(processedText);

      // Cache the result
      this.cache.set(cacheKey, foods);

      return foods;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse food description';
      this.error.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.isProcessing.set(false);
    }
  }

  /**
   * Parse restaurant meal description using AI
   */
  async parseRestaurantMeal(restaurant: string, meal: string): Promise<ParsedFood[]> {
    this.isProcessing.set(true);
    this.error.set(null);

    try {
      // Use Nutritionix with restaurant context
      const query = `${meal} from ${restaurant}`;
      return await this.callNutritionixNLP(query);
    } catch (err) {
      this.error.set('Failed to parse restaurant meal');
      throw err;
    } finally {
      this.isProcessing.set(false);
    }
  }

  /**
   * Get quick suggestions based on partial input
   */
  async getInstantSuggestions(partialText: string): Promise<string[]> {
    if (partialText.length < 2) return [];

    try {
      const headers = new HttpHeaders({
        'x-app-id': this.NUTRITIONIX_APP_ID,
        'x-app-key': this.NUTRITIONIX_API_KEY,
      });

      const response = await firstValueFrom(
        this.http.get<any>(`${this.NUTRITIONIX_API_URL}/search/instant`, {
          params: { query: partialText },
          headers,
        })
      );

      // Return top 5 common foods
      return response.common?.slice(0, 5).map((item: any) => item.food_name) || [];
    } catch {
      return [];
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Preprocess text to expand portion size descriptors
   * "a fist-sized chicken breast" -> "1 cup chicken breast"
   */
  private preprocessPortions(text: string): string {
    let processed = text.toLowerCase();

    // Replace portion descriptors with standard measurements
    for (const [descriptor, measurement] of Object.entries(PORTION_DESCRIPTORS)) {
      const regex = new RegExp(`\\b(?:a |an )?${descriptor}\\b`, 'gi');
      processed = processed.replace(regex, `${measurement.qty} ${measurement.unit}`);
    }

    return processed;
  }

  /**
   * Call Nutritionix Natural Language API
   */
  private async callNutritionixNLP(query: string): Promise<ParsedFood[]> {
    // TODO: Implement when API keys are available
    // For now, return mock data to show the architecture
    console.warn('Nutritionix API not configured, returning mock data');

    if (!this.NUTRITIONIX_APP_ID || !this.NUTRITIONIX_API_KEY) {
      return this.getMockParsedFoods(query);
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-app-id': this.NUTRITIONIX_APP_ID,
      'x-app-key': this.NUTRITIONIX_API_KEY,
    });

    const body = {
      query,
      timezone: 'US/Eastern', // TODO: Get from user settings
    };

    const response = await firstValueFrom(
      this.http.post<any>(`${this.NUTRITIONIX_API_URL}/natural/nutrients`, body, { headers })
    );

    // Parse Nutritionix response into our format
    return response.foods.map((food: any) => ({
      foodName: food.food_name,
      servingQty: food.serving_qty,
      servingUnit: food.serving_unit,
      calories: Math.round(food.nf_calories),
      protein: Math.round(food.nf_protein),
      carbs: Math.round(food.nf_total_carbohydrate),
      fat: Math.round(food.nf_total_fat),
      confidence: 0.9, // Nutritionix has ~90% accuracy
      photoUrl: food.photo?.thumb,
      brandName: food.brand_name,
    }));
  }

  /**
   * Mock parsed foods for development/testing
   */
  private getMockParsedFoods(query: string): ParsedFood[] {
    const lowerQuery = query.toLowerCase();

    // Simple mock based on keywords
    const foods: ParsedFood[] = [];

    if (lowerQuery.includes('chicken')) {
      foods.push({
        foodName: 'Chicken Breast',
        servingQty: 1,
        servingUnit: 'cup',
        calories: 231,
        protein: 43,
        carbs: 0,
        fat: 5,
        confidence: 0.85,
      });
    }

    if (lowerQuery.includes('rice')) {
      foods.push({
        foodName: 'White Rice',
        servingQty: 1,
        servingUnit: 'cup',
        calories: 206,
        protein: 4,
        carbs: 45,
        fat: 0,
        confidence: 0.9,
      });
    }

    if (lowerQuery.includes('egg')) {
      const count = lowerQuery.match(/(\d+)\s*egg/)?.[1] || '2';
      foods.push({
        foodName: 'Eggs',
        servingQty: parseInt(count, 10),
        servingUnit: 'large',
        calories: 72 * parseInt(count, 10),
        protein: 6 * parseInt(count, 10),
        carbs: 1 * parseInt(count, 10),
        fat: 5 * parseInt(count, 10),
        confidence: 0.95,
      });
    }

    if (lowerQuery.includes('protein shake') || lowerQuery.includes('whey')) {
      foods.push({
        foodName: 'Protein Shake',
        servingQty: 1,
        servingUnit: 'scoop',
        calories: 120,
        protein: 24,
        carbs: 3,
        fat: 1,
        confidence: 0.8,
      });
    }

    // If no matches, return a generic entry
    if (foods.length === 0) {
      foods.push({
        foodName: query.trim(),
        servingQty: 1,
        servingUnit: 'serving',
        calories: 200,
        protein: 10,
        carbs: 20,
        fat: 8,
        confidence: 0.5,
      });
    }

    return foods;
  }
}
