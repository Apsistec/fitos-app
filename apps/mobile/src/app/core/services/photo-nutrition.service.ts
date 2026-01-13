import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { SupabaseService } from './supabase.service';

/**
 * Identified food item from photo
 */
export interface IdentifiedFood {
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
  isEdited?: boolean;
}

/**
 * Food recognition API response
 */
interface FoodRecognitionResult {
  foods: IdentifiedFood[];
  processingTime: number;
  overallConfidence: number;
}

/**
 * PhotoNutritionService - AI-powered food recognition from photos
 *
 * Features:
 * - Capacitor Camera integration
 * - Food recognition API integration (Passio AI or SnapCalorie)
 * - Multi-food plate detection
 * - Confidence scoring
 * - Manual editing fallback
 * - Portion size estimation
 *
 * Usage:
 * ```typescript
 * const photo = await photoNutrition.capturePhoto();
 * const foods = await photoNutrition.recognizeFoods(photo);
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class PhotoNutritionService {
  private http = inject(HttpClient);
  private supabase = inject(SupabaseService);

  // Food recognition API configuration
  private passioApiKey: string | null = null;
  private readonly PASSIO_API_URL = 'https://api.passiolife.com/v2';

  // State
  isProcessing = signal(false);
  error = signal<string | null>(null);
  lastPhoto = signal<Photo | null>(null);

  /**
   * Capture photo using device camera
   */
  async capturePhoto(source: CameraSource = CameraSource.Camera): Promise<Photo> {
    try {
      this.error.set(null);

      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source,
      });

      this.lastPhoto.set(photo);
      return photo;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to capture photo';
      this.error.set(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Recognize foods in photo
   */
  async recognizeFoods(photo: Photo): Promise<IdentifiedFood[]> {
    this.isProcessing.set(true);
    this.error.set(null);

    try {
      // Call food recognition API
      const result = await this.callFoodRecognitionAPI(photo);

      // Filter out low-confidence results
      const highConfidenceFoods = result.foods.filter(food => food.confidence >= 0.7);

      // If all results are low confidence, return empty for manual entry
      if (highConfidenceFoods.length === 0) {
        this.error.set('Could not identify foods with high confidence. Please enter manually.');
        return [];
      }

      return highConfidenceFoods;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to recognize foods';
      this.error.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.isProcessing.set(false);
    }
  }

  /**
   * Check camera permissions
   */
  async checkPermissions(): Promise<boolean> {
    try {
      const permissions = await Camera.checkPermissions();
      return permissions.camera === 'granted';
    } catch (err) {
      console.error('Error checking camera permissions:', err);
      return false;
    }
  }

  /**
   * Request camera permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const permissions = await Camera.requestPermissions();
      return permissions.camera === 'granted';
    } catch (err) {
      console.error('Error requesting camera permissions:', err);
      this.error.set('Camera permission denied');
      return false;
    }
  }

  /**
   * Call food recognition API (Passio AI)
   */
  private async callFoodRecognitionAPI(photo: Photo): Promise<FoodRecognitionResult> {
    const startTime = Date.now();

    // TODO: Implement when API key is available
    // For now, return mock data to show the architecture
    console.warn('Food recognition API not configured, returning mock data');

    if (!this.passioApiKey) {
      return this.getMockRecognitionResult();
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.passioApiKey}`,
    });

    const body = {
      image: photo.base64String,
      format: photo.format,
    };

    const response = await firstValueFrom(
      this.http.post<any>(`${this.PASSIO_API_URL}/recognize`, body, { headers })
    );

    const processingTime = Date.now() - startTime;

    // Parse Passio response into our format
    const foods: IdentifiedFood[] = response.results.map((result: any) => ({
      foodName: result.foodName,
      servingQty: result.servingSize?.quantity || 1,
      servingUnit: result.servingSize?.unit || 'serving',
      calories: Math.round(result.nutrition?.calories || 0),
      protein: Math.round(result.nutrition?.protein || 0),
      carbs: Math.round(result.nutrition?.carbs || 0),
      fat: Math.round(result.nutrition?.fat || 0),
      confidence: result.confidence,
      photoUrl: result.imageUrl,
    }));

    const overallConfidence = foods.length > 0
      ? foods.reduce((sum, f) => sum + f.confidence, 0) / foods.length
      : 0;

    return {
      foods,
      processingTime,
      overallConfidence,
    };
  }

  /**
   * Mock food recognition for development/testing
   */
  private getMockRecognitionResult(): FoodRecognitionResult {
    // Simulate API processing time
    const processingTime = 1500 + Math.random() * 1000;

    // Mock foods with varying confidence
    const mockFoods: IdentifiedFood[] = [
      {
        foodName: 'Grilled Chicken Breast',
        servingQty: 6,
        servingUnit: 'oz',
        calories: 280,
        protein: 53,
        carbs: 0,
        fat: 6,
        confidence: 0.92,
      },
      {
        foodName: 'Brown Rice',
        servingQty: 1,
        servingUnit: 'cup',
        calories: 216,
        protein: 5,
        carbs: 45,
        fat: 2,
        confidence: 0.88,
      },
      {
        foodName: 'Steamed Broccoli',
        servingQty: 1.5,
        servingUnit: 'cup',
        calories: 51,
        protein: 4,
        carbs: 10,
        fat: 1,
        confidence: 0.85,
      },
    ];

    const overallConfidence = mockFoods.reduce((sum, f) => sum + f.confidence, 0) / mockFoods.length;

    return {
      foods: mockFoods,
      processingTime,
      overallConfidence,
    };
  }

  /**
   * Adjust serving size for a food
   */
  adjustServingSize(food: IdentifiedFood, multiplier: number): IdentifiedFood {
    return {
      ...food,
      servingQty: food.servingQty * multiplier,
      calories: Math.round(food.calories * multiplier),
      protein: Math.round(food.protein * multiplier),
      carbs: Math.round(food.carbs * multiplier),
      fat: Math.round(food.fat * multiplier),
      isEdited: true,
    };
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }
}
