/**
 * barcode-lookup Edge Function
 * Sprint 50 — Barcode Scanning & Food Database Pipeline
 *
 * Lookup pipeline (in order, stops at first hit):
 *   1. barcode_food_cache  — Supabase table (instant, free)
 *   2. Open Food Facts API — free, largest barcode database
 *   3. USDA FoodData Central — authoritative US data
 *   4. FatSecret API       — broad branded product coverage
 *   5. null                — not found in any source
 *
 * Successful results from external APIs are cached in barcode_food_cache.
 *
 * Request body: { barcode: string }
 * Response: BarcodeFoodResult | { error: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BarcodeFoodResult {
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
  source: 'openfoodfacts' | 'usda' | 'fatsecret' | 'manual';
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { barcode } = await req.json() as { barcode?: string };
    if (!barcode?.trim()) {
      return jsonError('barcode is required', 400);
    }
    const cleanBarcode = barcode.trim();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── Step 1: Check local cache ──────────────────────────────────────────
    const cached = await checkCache(supabase, cleanBarcode);
    if (cached) {
      return jsonOk(cached);
    }

    // ── Step 2: Open Food Facts ────────────────────────────────────────────
    const offResult = await lookupOpenFoodFacts(cleanBarcode);
    if (offResult) {
      await cacheResult(supabase, offResult);
      return jsonOk(offResult);
    }

    // ── Step 3: USDA FoodData Central ─────────────────────────────────────
    const usdaResult = await lookupUSDA(cleanBarcode);
    if (usdaResult) {
      await cacheResult(supabase, usdaResult);
      return jsonOk(usdaResult);
    }

    // ── Step 4: FatSecret ─────────────────────────────────────────────────
    const fatSecretResult = await lookupFatSecret(cleanBarcode);
    if (fatSecretResult) {
      await cacheResult(supabase, fatSecretResult);
      return jsonOk(fatSecretResult);
    }

    // ── Step 5: Not found ─────────────────────────────────────────────────
    return new Response(null, { status: 204, headers: corsHeaders });

  } catch (err: unknown) {
    console.error('[barcode-lookup] unexpected error:', err);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return jsonError(msg, 500);
  }
});

// ─── Pipeline steps ───────────────────────────────────────────────────────────

async function checkCache(
  supabase: ReturnType<typeof createClient>,
  barcode: string,
): Promise<BarcodeFoodResult | null> {
  try {
    const { data, error } = await supabase
      .from('barcode_food_cache')
      .select('*')
      .eq('barcode', barcode)
      .single();

    if (error || !data) return null;

    // Refresh stale entries (older than 30 days) in the background
    const age = Date.now() - new Date(data.last_fetched_at).getTime();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    if (age > THIRTY_DAYS_MS) {
      // Fire-and-forget: update timestamp so the next caller doesn't re-fetch
      supabase
        .from('barcode_food_cache')
        .update({ last_fetched_at: new Date().toISOString() })
        .eq('barcode', barcode)
        .then(() => {/* no-op */});
    }

    return {
      barcode:      data.barcode,
      food_name:    data.food_name,
      brand:        data.brand ?? undefined,
      serving_size: data.serving_size ?? undefined,
      serving_unit: data.serving_unit ?? undefined,
      calories:     data.calories,
      protein:      data.protein,
      carbs:        data.carbs,
      fat:          data.fat,
      fiber:        data.fiber ?? undefined,
      sugar:        data.sugar ?? undefined,
      sodium:       data.sodium ?? undefined,
      source:       data.source,
    };
  } catch {
    return null;
  }
}

async function lookupOpenFoodFacts(barcode: string): Promise<BarcodeFoodResult | null> {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}?fields=product_name,brands,serving_size,nutriments`;
    const res  = await fetch(url, {
      headers: { 'User-Agent': 'FitOS/1.0 (https://nutrifitos.app)' },
    });

    if (!res.ok) return null;
    const json = await res.json() as {
      status: number;
      product?: {
        product_name?: string;
        brands?: string;
        serving_size?: string;
        nutriments?: Record<string, number>;
      };
    };
    if (json.status !== 1 || !json.product?.product_name) return null;

    const p = json.product;
    const n = p.nutriments ?? {};

    // OFF serving — may be "100g", "30g (1 cup)", etc.
    const servingParsed = parseServingSize(p.serving_size ?? '');

    return {
      barcode,
      food_name:    p.product_name,
      brand:        p.brands?.split(',')[0]?.trim() || undefined,
      serving_size: servingParsed?.size,
      serving_unit: servingParsed?.unit,
      calories:     Math.round(n['energy-kcal_serving'] ?? n['energy-kcal_100g'] ?? 0),
      protein:      round1(n['proteins_serving']      ?? n['proteins_100g']      ?? 0),
      carbs:        round1(n['carbohydrates_serving']  ?? n['carbohydrates_100g']  ?? 0),
      fat:          round1(n['fat_serving']             ?? n['fat_100g']             ?? 0),
      fiber:        maybeRound1(n['fiber_serving']      ?? n['fiber_100g']),
      sugar:        maybeRound1(n['sugars_serving']     ?? n['sugars_100g']),
      sodium:       maybeRound0(n['sodium_serving']     ?? n['sodium_100g']),
      source: 'openfoodfacts',
    };
  } catch (err) {
    console.warn('[barcode-lookup] Open Food Facts error:', err);
    return null;
  }
}

async function lookupUSDA(barcode: string): Promise<BarcodeFoodResult | null> {
  const apiKey = Deno.env.get('USDA_API_KEY');
  if (!apiKey) return null;

  try {
    // USDA supports UPC lookup via gtinUpc query parameter
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(barcode)}&dataType=Branded&pageSize=1`;
    const res  = await fetch(url);
    if (!res.ok) return null;

    const json = await res.json() as {
      foods?: Array<{
        description: string;
        brandOwner?: string;
        brandName?: string;
        servingSize?: number;
        servingSizeUnit?: string;
        foodNutrients?: Array<{ nutrientId: number; value: number }>;
        gtinUpc?: string;
      }>;
    };

    const food = json.foods?.[0];
    if (!food) return null;

    // Verify UPC match if available
    if (food.gtinUpc && food.gtinUpc !== barcode) return null;

    const nutrients = extractUSDANutrients(food.foodNutrients ?? []);

    return {
      barcode,
      food_name:    food.description,
      brand:        food.brandOwner ?? food.brandName ?? undefined,
      serving_size: food.servingSize ?? undefined,
      serving_unit: food.servingSizeUnit ?? undefined,
      calories:     nutrients.calories,
      protein:      nutrients.protein,
      carbs:        nutrients.carbs,
      fat:          nutrients.fat,
      fiber:        nutrients.fiber,
      sugar:        nutrients.sugar,
      sodium:       nutrients.sodium,
      source: 'usda',
    };
  } catch (err) {
    console.warn('[barcode-lookup] USDA error:', err);
    return null;
  }
}

async function lookupFatSecret(barcode: string): Promise<BarcodeFoodResult | null> {
  // FatSecret requires OAuth 2.0 client_credentials flow
  const clientId     = Deno.env.get('FATSECRET_CLIENT_ID');
  const clientSecret = Deno.env.get('FATSECRET_CLIENT_SECRET');
  if (!clientId || !clientSecret) return null;

  try {
    // Step 1: Get access token
    const tokenRes = await fetch('https://oauth.fatsecret.com/connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     clientId,
        client_secret: clientSecret,
        scope:         'basic',
      }),
    });

    if (!tokenRes.ok) return null;
    const { access_token } = await tokenRes.json() as { access_token: string };

    // Step 2: Barcode lookup
    const params = new URLSearchParams({
      method:       'food.find_id_for_barcode',
      barcode_number: barcode,
      format:       'json',
    });

    const findRes = await fetch(`https://platform.fatsecret.com/rest/server.api?${params}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!findRes.ok) return null;
    const findJson = await findRes.json() as { food_id?: { value: string } };
    const foodId = findJson.food_id?.value;
    if (!foodId) return null;

    // Step 3: Get food details
    const detailParams = new URLSearchParams({
      method:  'food.get.v4',
      food_id: foodId,
      format:  'json',
    });

    const detailRes = await fetch(`https://platform.fatsecret.com/rest/server.api?${detailParams}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!detailRes.ok) return null;
    const detail = await detailRes.json() as {
      food?: {
        food_name: string;
        brand_name?: string;
        servings?: {
          serving?: Array<{
            serving_description: string;
            serving_size?: string;
            metric_serving_amount?: string;
            metric_serving_unit?: string;
            calories: string;
            protein: string;
            carbohydrate: string;
            fat: string;
            fiber?: string;
            sugar?: string;
            sodium?: string;
          }> | {
            serving_description: string;
            serving_size?: string;
            metric_serving_amount?: string;
            metric_serving_unit?: string;
            calories: string;
            protein: string;
            carbohydrate: string;
            fat: string;
            fiber?: string;
            sugar?: string;
            sodium?: string;
          };
        };
      };
    };

    const f = detail.food;
    if (!f) return null;

    // Grab first serving (may be array or single object)
    const servingsRaw = f.servings?.serving;
    const serving = Array.isArray(servingsRaw) ? servingsRaw[0] : servingsRaw;
    if (!serving) return null;

    const servingParsed = parseServingSize(serving.serving_description ?? '');

    return {
      barcode,
      food_name:    f.food_name,
      brand:        f.brand_name ?? undefined,
      serving_size: serving.metric_serving_amount
                      ? parseFloat(serving.metric_serving_amount)
                      : servingParsed?.size,
      serving_unit: serving.metric_serving_unit ?? servingParsed?.unit,
      calories: Math.round(parseFloat(serving.calories)    || 0),
      protein:  round1(parseFloat(serving.protein)         || 0),
      carbs:    round1(parseFloat(serving.carbohydrate)    || 0),
      fat:      round1(parseFloat(serving.fat)             || 0),
      fiber:    serving.fiber  ? round1(parseFloat(serving.fiber))  : undefined,
      sugar:    serving.sugar  ? round1(parseFloat(serving.sugar))  : undefined,
      sodium:   serving.sodium ? Math.round(parseFloat(serving.sodium)) : undefined,
      source: 'fatsecret',
    };
  } catch (err) {
    console.warn('[barcode-lookup] FatSecret error:', err);
    return null;
  }
}

// ─── Cache write ─────────────────────────────────────────────────────────────

async function cacheResult(
  supabase: ReturnType<typeof createClient>,
  result: BarcodeFoodResult,
): Promise<void> {
  try {
    await supabase.from('barcode_food_cache').upsert(
      {
        barcode:        result.barcode,
        food_name:      result.food_name,
        brand:          result.brand ?? null,
        serving_size:   result.serving_size ?? null,
        serving_unit:   result.serving_unit ?? null,
        calories:       result.calories,
        protein:        result.protein,
        carbs:          result.carbs,
        fat:            result.fat,
        fiber:          result.fiber ?? null,
        sugar:          result.sugar ?? null,
        sodium:         result.sodium ?? null,
        source:         result.source,
        last_fetched_at: new Date().toISOString(),
      },
      { onConflict: 'barcode' },
    );
  } catch (err) {
    console.warn('[barcode-lookup] cacheResult error:', err);
  }
}

// ─── Utility functions ────────────────────────────────────────────────────────

function jsonOk(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function maybeRound1(n: number | undefined): number | undefined {
  return n != null ? round1(n) : undefined;
}

function maybeRound0(n: number | undefined): number | undefined {
  return n != null ? Math.round(n * 1000) : undefined; // sodium stored in g, convert to mg
}

function parseServingSize(raw: string): { size: number; unit: string } | null {
  // e.g. "30g", "1 cup (250ml)", "100 g"
  const match = raw.match(/^([\d.]+)\s*([a-zA-Z]+)/);
  if (!match) return null;
  return { size: parseFloat(match[1]), unit: match[2].toLowerCase() };
}

function extractUSDANutrients(
  list: Array<{ nutrientId: number; value: number }>,
): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
} {
  const result = { calories: 0, protein: 0, carbs: 0, fat: 0 } as {
    calories: number; protein: number; carbs: number; fat: number;
    fiber?: number; sugar?: number; sodium?: number;
  };
  for (const n of list) {
    switch (n.nutrientId) {
      case 1008: result.calories = Math.round(n.value);                  break;
      case 1003: result.protein  = round1(n.value);                      break;
      case 1005: result.carbs    = round1(n.value);                      break;
      case 1004: result.fat      = round1(n.value);                      break;
      case 1079: result.fiber    = round1(n.value);                      break;
      case 2000: result.sugar    = round1(n.value);                      break;
      case 1093: result.sodium   = Math.round(n.value);                  break;
    }
  }
  return result;
}
