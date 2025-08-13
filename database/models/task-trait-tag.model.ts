import { TableDefinition } from './types';

/**
 * @table task_trait_tags
 * @description Link tasks to traits for automatic classification
 */
export const TaskTraitTag: TableDefinition = {
  name: 'task_trait_tags',
  description: 'Link tasks to traits for automatic classification',
  columns: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'gen_random_uuid()'
    },
    task_id: {
      type: 'uuid',
      references: 'tasks(id)',
      notNull: true
    },
    trait_tags: {
      type: 'jsonb',
      notNull: true,
      defaultValue: "'[]'::jsonb"
    },
    task_metadata: {
      type: 'jsonb',
      notNull: true,
      defaultValue: "'{}'::jsonb"
    },
    auto_classified: {
      type: 'boolean',
      notNull: true,
      defaultValue: 'false'
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
      table: 'tasks',
      foreignKey: 'task_id'
    }
  ],
  indexes: [
    {
      name: 'task_trait_tags_task_id_idx',
      columns: ['task_id']
    },
    {
      name: 'task_trait_tags_auto_classified_idx',
      columns: ['auto_classified']
    }
  ],
  policies: [
    {
      name: 'Users can view own task trait tags',
      operation: 'select',
      using: 'exists (select 1 from tasks where id = task_trait_tags.task_id and user_id = auth.uid())'
    },
    {
      name: 'Users can insert own task trait tags',
      operation: 'insert',
      check: 'exists (select 1 from tasks where id = task_id and user_id = auth.uid())'
    },
    {
      name: 'Users can update own task trait tags',
      operation: 'update',
      using: 'exists (select 1 from tasks where id = task_trait_tags.task_id and user_id = auth.uid())'
    },
    {
      name: 'Users can delete own task trait tags',
      operation: 'delete',
      using: 'exists (select 1 from tasks where id = task_trait_tags.task_id and user_id = auth.uid())'
    }
  ]
};
