-- Add sharing functionality to calculation_history table
-- Migration: 004_add_sharing_to_calculations.sql

-- Add share_id column for unique shareable links
ALTER TABLE calculation_history 
ADD COLUMN IF NOT EXISTS share_id UUID DEFAULT gen_random_uuid() UNIQUE;

-- Add is_shared column to track sharing status
ALTER TABLE calculation_history 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

-- Add shared_at timestamp
ALTER TABLE calculation_history 
ADD COLUMN IF NOT EXISTS shared_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster share_id lookups
CREATE INDEX IF NOT EXISTS idx_calculation_history_share_id ON calculation_history(share_id);

-- Create index for shared calculations
CREATE INDEX IF NOT EXISTS idx_calculation_history_is_shared ON calculation_history(is_shared);

-- Add comment for documentation
COMMENT ON COLUMN calculation_history.share_id IS 'Unique identifier for sharing calculations publicly';
COMMENT ON COLUMN calculation_history.is_shared IS 'Whether this calculation is shared publicly';
COMMENT ON COLUMN calculation_history.shared_at IS 'When the calculation was shared';

-- Update RLS policies to allow public access to shared calculations
-- Allow anyone to read shared calculations
CREATE POLICY "Allow public read access to shared calculations" ON calculation_history
  FOR SELECT USING (is_shared = true);

-- Note: The existing "Allow all operations for calculation_history" policy 
-- already covers the owner's access to their own calculations
