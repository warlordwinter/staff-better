# Database Migrations for Groups Feature

## Overview
This directory contains SQL migration files for the Groups functionality.

## Migration Files

### 001_create_groups_tables.sql
Creates the necessary database tables for the Groups feature:
- `groups` table: Stores group information scoped to companies
- `group_members` table: Junction table for many-to-many relationship between groups and associates
- Indexes for performance optimization
- Automatic timestamp updates via triggers

## How to Apply Migrations

### Using Supabase Dashboard
1. Log in to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `001_create_groups_tables.sql`
4. Paste into the SQL Editor
5. Click "Run" to execute the migration

### Using Supabase CLI
```bash
# If you have the Supabase CLI installed
supabase db push
```

### Manual PostgreSQL Connection
```bash
# Connect to your database
psql -h your-db-host -U your-db-user -d your-db-name

# Run the migration file
\i database-migrations/001_create_groups_tables.sql
```

## Verification

After running the migration, verify the tables were created:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('groups', 'group_members');

-- Check indexes
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('groups', 'group_members');

-- Check foreign keys
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('groups', 'group_members');
```

## Rollback

If you need to rollback this migration:

```sql
-- Drop tables in correct order (due to foreign keys)
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;

-- Drop the trigger function if you want
DROP FUNCTION IF EXISTS update_updated_at_column();
```

## Notes

- The migration includes CASCADE delete behavior, so deleting a group will automatically delete all its members from the junction table
- The migration includes CASCADE delete behavior for companies, so deleting a company will delete all its groups and group members
- An automatic trigger updates the `updated_at` timestamp whenever a group is modified
- All timestamps use `TIMESTAMP WITH TIME ZONE` for proper timezone handling



