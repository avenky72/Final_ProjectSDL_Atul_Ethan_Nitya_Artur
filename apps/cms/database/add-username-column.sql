-- Migration script to add username column to users table if it doesn't exist
-- Run this in your Supabase SQL editor

-- Check if column exists and add it if it doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'username'
    ) THEN
        ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE;
        RAISE NOTICE 'Username column added successfully';
    ELSE
        RAISE NOTICE 'Username column already exists';
    END IF;
END $$;

