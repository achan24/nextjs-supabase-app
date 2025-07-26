export const CrmActionFeedback = {
  name: 'crm_action_feedback',
  description: 'Stores feedback and learnings from completed relationship actions',
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
    what_went_right: {
      type: 'text',
    },
    what_went_wrong: {
      type: 'text',
    },
    their_reaction: {
      type: 'text',
    },
    emotional_response: {
      type: 'text',
    },
    self_rating: {
      type: 'integer',
      check: 'self_rating BETWEEN 1 AND 5',
    },
    future_adjustments: {
      type: 'text',
    },
    created_at: {
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
      name: 'Users can manage their own action feedback',
      using: 'action_id IN (SELECT id FROM crm_actions WHERE person_id IN (SELECT id FROM crm_people WHERE user_id = auth.uid()))',
      check: 'action_id IN (SELECT id FROM crm_actions WHERE person_id IN (SELECT id FROM crm_people WHERE user_id = auth.uid()))',
      operation: 'ALL',
    },
  ],
}; 