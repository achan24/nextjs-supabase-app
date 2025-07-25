import { TableDefinition } from './types';

/**
 * @table character_weekly_targets
 * @description Weekly target points for character development areas, subareas, and goals
 */
export const CharacterWeeklyTarget: TableDefinition = {
  name: 'character_weekly_targets',
  description: 'Weekly target points for character development areas, subareas, and goals',
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
    target_id: {
      type: 'uuid',
      notNull: true
    },
    target_type: {
      type: 'text',
      notNull: true,
      check: "target_type in ('area', 'subarea', 'goal')"
    },
    day_of_week: {
      type: 'integer',
      notNull: true,
      check: 'day_of_week between 0 and 6'
    },
    points: {
      type: 'numeric',
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
    }
  ],
  indexes: [
    {
      name: 'character_weekly_targets_user_id_idx',
      columns: ['user_id']
    },
    {
      name: 'character_weekly_targets_target_lookup_idx',
      columns: ['user_id', 'target_id', 'day_of_week'],
      unique: true
    }
  ],
  policies: [
    {
      name: 'Users can view own character weekly targets',
      operation: 'select',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can insert own character weekly targets',
      operation: 'insert',
      check: 'auth.uid() = user_id'
    },
    {
      name: 'Users can update own character weekly targets',
      operation: 'update',
      using: 'auth.uid() = user_id'
    },
    {
      name: 'Users can delete own character weekly targets',
      operation: 'delete',
      using: 'auth.uid() = user_id'
    }
  ]
}; 