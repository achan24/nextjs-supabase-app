export const timelineEventsModel = {
  name: 'timeline_events',
  columns: [
    {
      name: 'id',
      type: 'uuid',
      primaryKey: true,
      default: 'gen_random_uuid()',
    },
    {
      name: 'user_id',
      type: 'uuid',
      references: 'auth.users(id)',
      onDelete: 'CASCADE',
      notNull: true,
    },
    {
      name: 'title',
      type: 'text',
      notNull: true,
    },
    {
      name: 'description',
      type: 'text',
    },
    {
      name: 'event_date',
      type: 'timestamp with time zone',
      notNull: true,
    },
    {
      name: 'event_type',
      type: 'text',
      notNull: true,
      default: "'general'",
    },
    {
      name: 'category',
      type: 'text',
      default: "'personal'",
    },
    {
      name: 'priority',
      type: 'text',
      default: "'medium'",
    },
    {
      name: 'is_completed',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'related_goal_id',
      type: 'uuid',
      references: 'life_goals(id)',
      onDelete: 'SET NULL',
    },
    {
      name: 'related_skill_id',
      type: 'uuid',
      references: 'skills(id)',
      onDelete: 'SET NULL',
    },
    {
      name: 'created_at',
      type: 'timestamp with time zone',
      default: 'now()',
      notNull: true,
    },
    {
      name: 'updated_at',
      type: 'timestamp with time zone',
      default: 'now()',
      notNull: true,
    },
  ],
  indexes: [
    {
      name: 'timeline_events_user_id_idx',
      columns: ['user_id'],
    },
    {
      name: 'timeline_events_event_date_idx',
      columns: ['event_date'],
    },
    {
      name: 'timeline_events_user_date_idx',
      columns: ['user_id', 'event_date'],
    },
    {
      name: 'timeline_events_category_idx',
      columns: ['category'],
    },
  ],
  relationships: [
    {
      name: 'user',
      type: 'belongsTo',
      table: 'auth.users',
      foreignKey: 'user_id',
    },
    {
      name: 'related_goal',
      type: 'belongsTo',
      table: 'life_goals',
      foreignKey: 'related_goal_id',
    },
    {
      name: 'related_skill',
      type: 'belongsTo',
      table: 'skills',
      foreignKey: 'related_skill_id',
    },
  ],
  rls: {
    enable: true,
    policies: [
      {
        name: 'Users can view their own timeline events',
        operation: 'SELECT',
        definition: 'auth.uid() = user_id',
      },
      {
        name: 'Users can insert their own timeline events',
        operation: 'INSERT',
        definition: 'auth.uid() = user_id',
      },
      {
        name: 'Users can update their own timeline events',
        operation: 'UPDATE',
        definition: 'auth.uid() = user_id',
      },
      {
        name: 'Users can delete their own timeline events',
        operation: 'DELETE',
        definition: 'auth.uid() = user_id',
      },
    ],
  },
};
