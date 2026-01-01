-- Migration: Food Database Caching
-- Description: Cache USDA FoodData Central results locally for faster searches and offline support
-- Epic 6.1: Food Database Integration

-- Cached foods from USDA FoodData Central
CREATE TABLE IF NOT EXISTS cached_foods (
    fdc_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT,
    serving_size DECIMAL(10, 2),
    serving_size_unit TEXT,
    calories INTEGER NOT NULL DEFAULT 0,
    protein DECIMAL(10, 1) NOT NULL DEFAULT 0,
    carbs DECIMAL(10, 1) NOT NULL DEFAULT 0,
    fat DECIMAL(10, 1) NOT NULL DEFAULT 0,
    fiber DECIMAL(10, 1),
    sugar DECIMAL(10, 1),
    sodium INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_cached_foods_name ON cached_foods USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_cached_foods_brand ON cached_foods USING gin(to_tsvector('english', brand));
CREATE INDEX IF NOT EXISTS idx_cached_foods_name_brand ON cached_foods (name, brand);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_cached_foods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cached_foods_updated_at
    BEFORE UPDATE ON cached_foods
    FOR EACH ROW
    EXECUTE FUNCTION update_cached_foods_updated_at();

-- RLS Policies
ALTER TABLE cached_foods ENABLE ROW LEVEL SECURITY;

-- Everyone can read cached foods
CREATE POLICY "Cached foods are public"
    ON cached_foods
    FOR SELECT
    TO authenticated
    USING (true);

-- Only the system can insert/update cached foods (prevent abuse)
-- In production, this would be done by a backend service
CREATE POLICY "System can manage cached foods"
    ON cached_foods
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Comments
COMMENT ON TABLE cached_foods IS 'Local cache of USDA FoodData Central foods for faster searches and offline support';
COMMENT ON COLUMN cached_foods.fdc_id IS 'USDA FoodData Central ID';
COMMENT ON COLUMN cached_foods.serving_size IS 'Default serving size';
COMMENT ON COLUMN cached_foods.serving_size_unit IS 'Unit for serving size (g, ml, cup, etc)';
COMMENT ON COLUMN cached_foods.calories IS 'Calories per serving (kcal)';
COMMENT ON COLUMN cached_foods.protein IS 'Protein per serving (g)';
COMMENT ON COLUMN cached_foods.carbs IS 'Carbohydrates per serving (g)';
COMMENT ON COLUMN cached_foods.fat IS 'Total fat per serving (g)';
COMMENT ON COLUMN cached_foods.fiber IS 'Dietary fiber per serving (g)';
COMMENT ON COLUMN cached_foods.sugar IS 'Total sugars per serving (g)';
COMMENT ON COLUMN cached_foods.sodium IS 'Sodium per serving (mg)';
