export const CrmTracks = {
  name: 'crm_tracks',
  description: 'Stores relationship progression tracks (e.g., romantic, friendship, etc.)',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'uuid_generate_v4()',
    },
    name: {
      type: 'text',
      notNull: true,
    },
    description: {
      type: 'text',
    },
    created_at: {
      type: 'timestamptz',
      defaultValue: 'NOW()',
    },
    user_id: {
      type: 'uuid',
      references: 'auth.users(id)',
      onDelete: 'CASCADE',
      notNull: true,
    },
  },
  indexes: [
    {
      name: 'crm_tracks_user_id_idx',
      columns: ['user_id'],
    },
    {
      name: 'crm_tracks_name_user_id_key',
      columns: ['name', 'user_id'],
      unique: true,
    },
  ],
  policies: [
    {
      name: 'Users can manage their own tracks',
      using: 'user_id = auth.uid()',
      check: 'user_id = auth.uid()',
      operation: 'ALL',
    },
  ],
}; 