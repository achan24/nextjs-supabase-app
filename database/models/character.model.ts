import { TableDefinition } from './types';

/**
 * @table characters
 * @description Core character data including level and XP
 */
export const Character: TableDefinition = {
  name: 'characters',
  description: 'Core character data including level and XP',
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
    level: {
      type: 'integer',
      notNull: true,
      defaultValue: '1'
    },
    xp: {
      type: 'integer',
      notNull: true,
      defaultValue: '0'
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
      type: 'hasMany',
      table: 'character_traits',
      foreignKey: 'character_id'
    }
  ],
  indexes: [
    {
      name: 'characters_user_id_idx',
      columns: ['user_id'],
      unique: true
    }
  ],
  policies: [
    {
      name: 'Users can view their own character',
      operation: 'select',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can update their own character',
      operation: 'update',
      using: 'auth.uid() = user_id'
    }
  ]
}; 