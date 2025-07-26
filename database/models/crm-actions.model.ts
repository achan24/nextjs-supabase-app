export const CrmActions = {
  name: 'crm_actions',
  description: 'Stores planned and completed actions for relationship development',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'uuid_generate_v4()',
    },
    person_id: {
      type: 'uuid',
      references: 'crm_people(id)',
      onDelete: 'CASCADE',
      notNull: true,
    },
    track_id: {
      type: 'uuid',
      references: 'crm_tracks(id)',
    },
    stage_id: {
      type: 'uuid',
      references: 'crm_stages(id)',
    },
    type: {
      type: 'text',
      notNull: true,
    },
    title: {
      type: 'text',
      notNull: true,
    },
    description: {
      type: 'text',
    },
    scheduled_date: {
      type: 'timestamptz',
    },
    completed_date: {
      type: 'timestamptz',
    },
    created_at: {
      type: 'timestamptz',
      defaultValue: 'NOW()',
    },
  },
  indexes: [
    {
      name: 'crm_actions_person_id_idx',
      columns: ['person_id'],
    },
  ],
  policies: [
    {
      name: 'Users can manage their own actions',
      using: 'person_id IN (SELECT id FROM crm_people WHERE user_id = auth.uid())',
      check: 'person_id IN (SELECT id FROM crm_people WHERE user_id = auth.uid())',
      operation: 'ALL',
    },
  ],
}; 