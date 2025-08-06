import { TableDefinition } from './types';

/**
 * @table skill_organizations
 * @description Custom organization of skills into folders and hierarchies
 */
export const SkillOrganization: TableDefinition = {
  name: 'skill_organizations',
  description: 'Custom organization of skills into folders and hierarchies',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'gen_random_uuid()'
    },
    user_id: {
      type: 'uuid',
      references: 'auth.users(id)',
      notNull: true
    },
    name: {
      type: 'text',
      notNull: true
    },
    type: {
      type: 'text',
      notNull: true,
      check: "type in ('folder', 'skill', 'target')"
    },
    parent_id: {
      type: 'uuid',
      references: 'skill_organizations(id)',
      notNull: false
    },
    skill_id: {
      type: 'text',
      notNull: false
    },
    flow_id: {
      type: 'text',
      notNull: false
    },
    display_order: {
      type: 'integer',
      notNull: true,
      defaultValue: '0'
    },
    is_expanded: {
      type: 'boolean',
      notNull: true,
      defaultValue: 'true'
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      defaultValue: 'now()'
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      defaultValue: 'now()'
    }
  },
  relationships: [
    {
      type: 'belongsTo',
      table: 'auth.users',
      foreignKey: 'user_id'
    },
    {
      type: 'belongsTo',
      table: 'skill_organizations',
      foreignKey: 'parent_id'
    },
    {
      type: 'hasMany',
      table: 'skill_organizations',
      foreignKey: 'parent_id'
    }
  ],
  indexes: [
    {
      name: 'skill_organizations_user_id_idx',
      columns: ['user_id']
    },
    {
      name: 'skill_organizations_parent_id_idx',
      columns: ['parent_id']
    },
    {
      name: 'skill_organizations_display_order_idx',
      columns: ['display_order']
    },
    {
      name: 'skill_organizations_skill_id_idx',
      columns: ['skill_id']
    }
  ],
  policies: [
    {
      name: 'Users can view their own skill organizations',
      operation: 'select',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can create their own skill organizations',
      operation: 'insert',
      check: 'auth.uid() = user_id'
    },
    {
      name: 'Users can update their own skill organizations',
      operation: 'update',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can delete their own skill organizations',
      operation: 'delete',
      using: 'auth.uid() = user_id'
    }
  ]
}; 