# Database Model Validation

This directory contains the source of truth for our database schema, along with validation tools to ensure the actual database matches our expectations.

## Structure

- `models/` - TypeScript definitions of our database tables
- `schemas/` - JSON Schema validation rules
- `tests/` - Test suites for our models
- `validate.ts` - Script to validate database against our models

## Setup

The validation system uses the Supabase credentials from your root `.env.local` file.

## Usage

### Validate Database
```bash
npm run validate-db
```
This will check if your actual database structure matches the models defined here.

### Run Tests
```bash
npm run test:db
```
This will run the test suite to ensure our model definitions are valid.

## Adding New Tables

1. Create a new model file in `models/` following the pattern in `life-goal-area.model.ts`
2. Add tests in `tests/`
3. Run validation to ensure everything matches

## Example Model Definition

```typescript
export const MyTable: TableDefinition = {
  name: 'my_table',
  description: 'Description of what this table is for',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'gen_random_uuid()'
    },
    // ... more columns
  },
  relationships: [
    {
      type: 'hasMany',
      table: 'other_table',
      foreignKey: 'my_table_id'
    }
  ],
  // ... indexes and policies
};
```

## Why This Exists

This system helps us:
1. Maintain a single source of truth for our database schema
2. Catch drift between our expectations and reality
3. Generate accurate documentation
4. Test database changes before applying them
5. Keep track of relationships and constraints 