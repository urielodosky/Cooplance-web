-- Migration: Refactor coops categories to use a single array column
-- 1. Add categories column
ALTER TABLE coops ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';

-- 2. Migrate data from old columns if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coops' AND column_name='category_1') THEN
        UPDATE coops SET categories = ARRAY_REMOVE(ARRAY[category_1, category_2, category_3], NULL);
        
        -- 3. Remove old columns
        ALTER TABLE coops DROP COLUMN category_1;
        ALTER TABLE coops DROP COLUMN category_2;
        ALTER TABLE coops DROP COLUMN category_3;
    END IF;
END $$;
