export const CrmPersonMetadata = {
  name: 'crm_person_metadata',
  description: 'Stores metadata like interests, personality traits, etc. for CRM people',
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
    category: {
      type: 'text',
      notNull: true,
    },
    key: {
      type: 'text',
      notNull: true,
    },
    value: {
      type: 'text',
      notNull: true,
    },
    created_at: {
      type: 'timestamptz',
      defaultValue: 'NOW()',
    },
  },
  indexes: [
    {
      name: 'crm_person_metadata_person_id_idx',
      columns: ['person_id'],
    },
  ],
  policies: [
    {
      name: 'Users can manage their own person metadata',
      using: 'person_id IN (SELECT id FROM crm_people WHERE user_id = auth.uid())',
      check: 'person_id IN (SELECT id FROM crm_people WHERE user_id = auth.uid())',
      operation: 'ALL',
    },
  ],
}; 