-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on company_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_groups_company_id ON groups(company_id);

-- Create group_members junction table
CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  associate_id UUID NOT NULL REFERENCES associates(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (group_id, associate_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_associate_id ON group_members(associate_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE groups IS 'Groups for organizing associates within a company';
COMMENT ON TABLE group_members IS 'Many-to-many relationship between groups and associates';
COMMENT ON COLUMN groups.company_id IS 'Reference to the company that owns this group';
COMMENT ON COLUMN groups.name IS 'Display name of the group';
COMMENT ON COLUMN groups.description IS 'Optional description of the group purpose';


