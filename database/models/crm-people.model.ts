export const CrmPeople = {
  name: 'crm_people',
  description: 'Stores information about people in the personal CRM system',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'uuid_generate_v4()',
    },
    user_id: {
      type: 'uuid',
      references: 'auth.users(id)',
      onDelete: 'CASCADE',
      notNull: true,
    },
    name: {
      type: 'text',
      notNull: true,
    },
    nickname: {
      type: 'text',
    },
    role: {
      type: 'relationship_role',
      notNull: true,
    },
    status: {
      type: 'relationship_status',
      defaultValue: "'active'",
    },
    first_met_date: {
      type: 'timestamptz',
    },
    first_met_context: {
      type: 'text',
    },
    location: {
      type: 'text',
    },
    birthday: {
      type: 'date',
    },
    photo_url: {
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
      name: 'crm_people_user_id_idx',
      columns: ['user_id'],
    },
  ],
  policies: [
    {
      name: 'Users can manage their own CRM people',
      using: 'user_id = auth.uid()',
      check: 'user_id = auth.uid()',
      operation: 'ALL',
    },
  ],
  triggers: [
    {
      name: 'update_crm_people_updated_at',
      timing: 'BEFORE',
      event: 'UPDATE',
      level: 'ROW',
      function: 'update_updated_at_column()',
    },
  ],
}; 