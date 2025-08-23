export const calendarTimelineEventsModel = {
  name: 'calendar_timeline_events',
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
      name: 'color',
      type: 'text',
      notNull: true,
      default: "'#3b82f6'",
    },
    {
      name: 'duration',
      type: 'integer',
      notNull: true,
      default: '15',
    },
    {
      name: 'event_date',
      type: 'timestamp with time zone',
      notNull: true,
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
      name: 'calendar_timeline_events_user_id_idx',
      columns: ['user_id'],
    },
    {
      name: 'calendar_timeline_events_event_date_idx',
      columns: ['event_date'],
    },
    {
      name: 'calendar_timeline_events_user_date_idx',
      columns: ['user_id', 'event_date'],
    },
  ],
  relationships: [
    {
      name: 'user',
      type: 'belongsTo',
      table: 'auth.users',
      foreignKey: 'user_id',
    },
  ],
  policies: [
    {
      name: 'Allow hardcoded user to view calendar timeline events',
      operation: 'SELECT',
      using: "user_id = '875d44ba-8794-4d12-ba86-48e5e90dc796'::uuid",
    },
    {
      name: 'Allow hardcoded user to insert calendar timeline events',
      operation: 'INSERT',
      withCheck: "user_id = '875d44ba-8794-4d12-ba86-48e5e90dc796'::uuid",
    },
    {
      name: 'Allow hardcoded user to update calendar timeline events',
      operation: 'UPDATE',
      using: "user_id = '875d44ba-8794-4d12-ba86-48e5e90dc796'::uuid",
    },
    {
      name: 'Allow hardcoded user to delete calendar timeline events',
      operation: 'DELETE',
      using: "user_id = '875d44ba-8794-4d12-ba86-48e5e90dc796'::uuid",
    },
  ],
};
