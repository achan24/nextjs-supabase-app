# Database Source of Truth

## Important: Supabase is the Source of Truth

The Supabase database is THE SOURCE OF TRUTH for our application's data structure. The models and validation system in this directory exist to help TypeScript understand and validate against what exists in Supabase, NOT the other way around.

## Purpose of This Directory

This directory contains TypeScript models and validation tools that:
1. Help TypeScript understand what exists in Supabase
2. Validate that our understanding (models) matches reality (Supabase)
3. Catch when our models are out of sync with Supabase
4. Provide type safety for database operations

## Workflow

1. Changes are made to Supabase first (through migrations)
2. Models in this directory are updated to reflect those changes
3. Validation tools check if our models accurately reflect Supabase
4. TypeScript uses these models to provide type safety

## Important Notes

- NEVER assume the models are correct - always check Supabase
- If there's a discrepancy, Supabase is right and models should be updated
- Migrations in Supabase define the schema, not these models
- These models are for TypeScript's benefit, not Supabase's

## Example

If you add a column in Supabase:
1. Create and run the migration in Supabase
2. Update the corresponding model in this directory
3. Run validation to ensure the model matches Supabase
4. TypeScript now understands the new column exists

Remember: Models follow Supabase, not the other way around. 