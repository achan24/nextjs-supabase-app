export const CrmStages = {
  name: 'crm_stages',
  description: 'Stores stages within relationship tracks (e.g., Connect, Bond, etc.)',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'uuid_generate_v4()',
    },
    track_id: {
      type: 'uuid',
      references: 'crm_tracks(id)',
      onDelete: 'CASCADE',
      notNull: true,
    },
    name: {
      type: 'text',
      notNull: true,
    },
    description: {
      type: 'text',
    },
    order_index: {
      type: 'integer',
      notNull: true,
    },
    created_at: {
      type: 'timestamptz',
      defaultValue: 'NOW()',
    },
  },
  indexes: [
    {
      name: 'crm_stages_track_id_idx',
      columns: ['track_id'],
    },
    {
      name: 'crm_stages_name_track_id_key',
      columns: ['name', 'track_id'],
      unique: true,
    },
  ],
  policies: [
    {
      name: 'Users can manage stages in their tracks',
      using: 'track_id IN (SELECT id FROM crm_tracks WHERE user_id = auth.uid())',
      check: 'track_id IN (SELECT id FROM crm_tracks WHERE user_id = auth.uid())',
      operation: 'ALL',
    },
  ],
}; 