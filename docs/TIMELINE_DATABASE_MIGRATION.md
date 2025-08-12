# Timeline Database Migration

This document describes the migration from localStorage to a proper SQL database for the Decision Timelines feature.

## Overview

The Decision Timelines feature has been migrated from using localStorage to a proper Supabase database. This eliminates hydration issues, provides better data persistence, and enables multi-device access.

## Database Schema

### Tables

1. **timeline_nodes** - Stores the main timeline structure
   - `id` (UUID, Primary Key)
   - `title` (VARCHAR) - Node title
   - `kind` (ENUM: 'action' | 'decision') - Node type
   - `parent_id` (UUID, Foreign Key) - Parent node reference
   - `user_id` (UUID, Foreign Key) - User who owns this node
   - `default_duration_ms` (INTEGER) - Default duration for actions
   - `chosen_child_id` (UUID, Foreign Key) - Chosen child for decisions
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)

2. **timeline_action_records** - Stores action completion history
   - `id` (UUID, Primary Key)
   - `node_id` (UUID, Foreign Key) - Reference to timeline_nodes
   - `duration_ms` (INTEGER) - Actual completion time
   - `started_at` (TIMESTAMP) - When action started
   - `completed_at` (TIMESTAMP) - When action completed
   - `user_id` (UUID, Foreign Key) - User who performed the action
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)

3. **timeline_decision_records** - Stores decision choice history
   - `id` (UUID, Primary Key)
   - `node_id` (UUID, Foreign Key) - Reference to timeline_nodes
   - `chosen_child_id` (UUID, Foreign Key) - Which child was chosen
   - `decided_at` (TIMESTAMP) - When decision was made
   - `user_id` (UUID, Foreign Key) - User who made the decision
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)

## Setup Instructions

### 1. Run the SQL Migration

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `scripts/setup-timeline-tables.sql`
4. Execute the script

### 2. Verify the Setup

The script will:
- Create all three tables with proper relationships
- Set up indexes for performance
- Enable Row Level Security (RLS)
- Create RLS policies for user isolation

### 3. Test the Migration

1. Start your development server: `npm run dev`
2. Navigate to `/dashboard/decision-timelines`
3. Create a new timeline
4. Verify that data is being saved to the database

## Key Benefits

### 1. **No More Hydration Issues**
- Eliminates server/client localStorage mismatches
- Consistent data loading across environments

### 2. **Better Data Persistence**
- Data survives browser clears and device changes
- Automatic backups through Supabase
- No localStorage size limits

### 3. **Multi-Device Support**
- Access timelines from any device
- Real-time synchronization (if implemented later)

### 4. **Proper Data Relationships**
- Foreign key constraints ensure data integrity
- Cascading deletes maintain consistency
- Indexes improve query performance

### 5. **User Isolation**
- Row Level Security ensures users only see their own data
- Proper authentication integration

## Migration Notes

- **Backward Compatibility**: The component will create a default timeline if no data exists
- **Data Loss**: Existing localStorage data will not be automatically migrated
- **Performance**: Database queries are optimized with proper indexes
- **Security**: All tables use RLS with user-specific policies

## Troubleshooting

### Common Issues

1. **"Cannot find module" errors**
   - Ensure you're using the latest version of the code
   - Check that all imports are correct

2. **Authentication errors**
   - Verify that the user is logged in
   - Check that RLS policies are correctly set up

3. **Data not loading**
   - Check browser console for errors
   - Verify database connection in Supabase dashboard

### Debug Steps

1. Check browser console for error messages
2. Verify user authentication status
3. Check Supabase logs for database errors
4. Ensure all tables were created successfully

## Future Enhancements

With the database foundation in place, future enhancements could include:

- Real-time collaboration
- Timeline sharing between users
- Advanced analytics and reporting
- Timeline templates and libraries
- Export/import functionality
