export const CrmActionFeedback = {
  name: 'crm_action_feedback',
  description: 'Stores feedback and learnings from CRM actions',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'uuid_generate_v4()',
    },
    action_id: {
      type: 'uuid',
      references: 'crm_actions(id)',
      onDelete: 'CASCADE',
      notNull: true,
    },
    what_went_well: {
      type: 'text[]',
    },
    what_went_wrong: {
      type: 'text[]',
    },
    their_reaction: {
      type: 'text',
      notNull: true,
    },
    emotional_response: {
      type: 'emotional_response',
      notNull: true,
    },
    self_rating: {
      type: 'integer',
      notNull: true,
      check: 'self_rating BETWEEN 1 AND 5',
    },
    future_adjustments: {
      type: 'text',
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
      name: 'crm_action_feedback_action_id_idx',
      columns: ['action_id'],
    },
  ],
  policies: [
    {
      name: 'Users can manage feedback for their own actions',
      using: `EXISTS (
        SELECT 1 FROM crm_actions
        WHERE crm_actions.id = action_id
        AND crm_actions.user_id = auth.uid()
      )`,
      check: `EXISTS (
        SELECT 1 FROM crm_actions
        WHERE crm_actions.id = action_id
        AND crm_actions.user_id = auth.uid()
      )`,
      operation: 'ALL',
    },
  ],
  triggers: [
    {
      name: 'update_crm_action_feedback_updated_at',
      timing: 'BEFORE',
      event: 'UPDATE',
      level: 'ROW',
      function: 'update_updated_at_column()',
    },
  ],
}; 