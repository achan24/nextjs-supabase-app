export const CrmPersonStageActions = {
  name: 'crm_person_stage_actions',
  description: 'Stores action checklist progress for each person',
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
    user_id: {
      type: 'uuid',
      references: 'auth.users(id)',
      onDelete: 'CASCADE',
      notNull: true,
    },
    stage_action_id: {
      type: 'uuid',
      references: 'crm_stage_actions(id)',
      onDelete: 'CASCADE',
      notNull: true,
    },
    status: {
      type: 'text',
      notNull: true,
      defaultValue: "'pending'",
    },
    completed_at: {
      type: 'timestamptz',
    },
    notes: {
      type: 'text',
    },
    created_at: {
      type: 'timestamptz',
      defaultValue: 'NOW()',
    },
    updated_at: {
      type: 'timestamptz',
      defaultValue: 'NOW()',
    },
  },
  indexes: [
    {
      name: 'crm_person_stage_actions_person_id_idx',
      columns: ['person_id'],
    },
    {
      name: 'crm_person_stage_actions_user_id_idx',
      columns: ['user_id'],
    },
    {
      name: 'crm_person_stage_actions_stage_action_id_idx',
      columns: ['stage_action_id'],
    },
  ],
  foreignKeys: [
    {
      name: 'crm_person_stage_actions_user_person_fkey',
      columns: ['user_id', 'person_id'],
      references: 'crm_people(user_id, id)',
    },
  ],
  policies: [
    {
      name: 'Users can manage their own person stage actions',
      using: 'user_id = auth.uid()',
      check: 'user_id = auth.uid()',
      operation: 'ALL',
    },
  ],
  triggers: [
    {
      name: 'update_crm_person_stage_actions_updated_at',
      timing: 'BEFORE',
      event: 'UPDATE',
      level: 'ROW',
      function: 'update_updated_at_column()',
    },
  ],
}; 