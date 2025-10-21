-- Fix group_members table structure
-- This script will drop and recreate the group_members table with the correct columns

-- Drop the existing table if it has wrong structure
DROP TABLE IF EXISTS group_members CASCADE;

-- Recreate group_members junction table with correct structure
CREATE TABLE group_members (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  associate_id UUID NOT NULL REFERENCES associates(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (group_id, associate_id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_associate_id ON group_members(associate_id);

-- Add comment for documentation
COMMENT ON TABLE group_members IS 'Many-to-many relationship between groups and associates';

