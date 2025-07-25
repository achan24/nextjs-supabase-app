# Database Functions Documentation

This document tracks all SQL functions in the database, their purposes, and usage patterns.

## Points Calculation Functions

### `get_area_total_points(p_area_id uuid) → numeric`
**Purpose**: Calculates the total points accumulated for a specific life goal area from its history.
**Usage**: 
```sql
SELECT get_area_total_points('area-uuid-here');
```
**Implementation**: Sums all points from `area_points_history` for the given area.

### `get_subarea_total_points(p_subarea_id uuid) → numeric`
**Purpose**: Calculates the total points accumulated for a specific life goal subarea from its history.
**Usage**: 
```sql
SELECT get_subarea_total_points('subarea-uuid-here');
```
**Implementation**: Sums all points from `subarea_points_history` for the given subarea.

### `get_goal_total_points(p_goal_id uuid) → numeric`
**Purpose**: Calculates the total points accumulated for a specific life goal from its history.
**Usage**: 
```sql
SELECT get_goal_total_points('goal-uuid-here');
```
**Implementation**: Sums all points from `goal_points_history` for the given goal.

### `get_user_total_points(p_user_id uuid) → numeric`
**Purpose**: Calculates the total points accumulated across all goals for a specific user.
**Usage**: 
```sql
SELECT get_user_total_points('user-uuid-here');
```
**Implementation**: Sums all points from `goal_points_history` for the given user.

### `reset_subarea_daily_points(p_user_id uuid) → void`
**Purpose**: Resets daily points to 0 for all subareas belonging to a user.
**Usage**: 
```sql
SELECT reset_subarea_daily_points('user-uuid-here');
```
**Implementation**: Updates `daily_points = 0` for all subareas under the user's areas.

### `reset_goal_daily_points(p_user_id uuid) → void`
**Purpose**: Resets daily points to 0 for all goals belonging to a user.
**Usage**: 
```sql
SELECT reset_goal_daily_points('user-uuid-here');
```
**Implementation**: Updates `daily_points = 0` for all goals under the user's areas/subareas.

## Triggers and Automated Functions

### `set_updated_at() → trigger`
**Purpose**: Automatically updates the `updated_at` timestamp whenever a row is modified.
**Usage**: Automatically called via trigger on tables with `updated_at` column.
**Implementation**: Sets `updated_at` to `current_timestamp` on row update.

### `update_updated_at_column() → trigger`
**Purpose**: Alternative name for `set_updated_at()`, used in some tables.
**Usage**: Automatically called via trigger on tables with `updated_at` column.
**Implementation**: Sets `updated_at` to `NOW()` on row update.

### `check_recent_completion() → trigger`
**Purpose**: Prevents duplicate sequence completions within 5 minutes.
**Usage**: Automatically called before inserting into `sequence_completions`.
**Implementation**: Raises exception if a completion exists within 5 minutes.

### `apply_sequence_contributions() → trigger`
**Purpose**: Updates metrics when sequences are completed.
**Usage**: Automatically called after inserting into `sequence_completions`.
**Implementation**: Recalculates metric values based on sequence completions.

## Schema Helper Functions

### `get_column_info(table_name text) → table`
**Purpose**: Returns detailed information about a table's columns.
**Usage**: 
```sql
SELECT * FROM get_column_info('table_name_here');
```
**Implementation**: Queries `information_schema.columns` for column metadata.

### `get_policies(table_name text) → table`
**Purpose**: Returns information about RLS policies on a table.
**Usage**: 
```sql
SELECT * FROM get_policies('table_name_here');
```
**Implementation**: Queries `pg_policies` for policy information.

---

## Function Categories

### Points & Progress
- `get_area_total_points`
- `get_subarea_total_points`
- `get_goal_total_points`
- `get_user_total_points`
- `reset_subarea_daily_points`
- `reset_goal_daily_points`

### Automation & Triggers
- `set_updated_at`
- `update_updated_at_column`
- `check_recent_completion`
- `apply_sequence_contributions`

### Schema Management
- `get_column_info`
- `get_policies`

---

## Adding New Functions

When adding new functions:
1. Create a migration file in `supabase/migrations/`
2. Add function documentation to this file
3. Add any necessary validation tests in `database/validate-functions.ts`
4. Update any TypeScript types/models if the function affects data structures

## Testing Functions

Functions can be tested using:
1. Direct SQL queries in Supabase dashboard
2. TypeScript validation script: `npx ts-node database/validate-functions.ts`
3. Application integration tests where appropriate

## Security Notes

Most functions are marked as `SECURITY DEFINER` and have explicit grants to either:
- `authenticated` role for user-facing functions
- `service_role` for admin/system functions

Always check permissions when adding new functions. 