-- Create URL history table for tracking changes
CREATE TABLE IF NOT EXISTS url_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url_id UUID NOT NULL REFERENCES custom_scraping_urls(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL, -- 'created', 'updated', 'deleted', 'tested'
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_url_history_url_id ON url_history(url_id);
CREATE INDEX IF NOT EXISTS idx_url_history_created_at ON url_history(created_at);

-- Enable RLS
ALTER TABLE url_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own URL history" ON url_history
  FOR SELECT USING (auth.uid() = changed_by);

CREATE POLICY "Users can insert their own URL history" ON url_history
  FOR INSERT WITH CHECK (auth.uid() = changed_by);

-- Create function to automatically log URL changes
CREATE OR REPLACE FUNCTION log_url_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO url_history (url_id, action, new_data, changed_by)
    VALUES (NEW.id, 'created', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO url_history (url_id, action, old_data, new_data, changed_by)
    VALUES (NEW.id, 'updated', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO url_history (url_id, action, old_data, changed_by)
    VALUES (OLD.id, 'deleted', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic logging
DROP TRIGGER IF EXISTS url_changes_trigger ON custom_scraping_urls;
CREATE TRIGGER url_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON custom_scraping_urls
  FOR EACH ROW EXECUTE FUNCTION log_url_changes();
