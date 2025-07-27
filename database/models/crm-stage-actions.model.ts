export interface CrmStageAction {
  id: string;
  stage_id: string;
  title: string;
  description: string | null;
  importance: number;
  expected_outcome: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmPersonStageAction {
  id: string;
  person_id: string;
  user_id: string;
  stage_action_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const CrmStageActionModel = {
  name: 'crm_stage_actions',
  columns: {
    id: { type: 'uuid', primaryKey: true },
    stage_id: { type: 'uuid', references: 'crm_stages(id)', onDelete: 'CASCADE' },
    title: { type: 'text', notNull: true },
    description: { type: 'text' },
    importance: { type: 'integer', notNull: true, default: 1 },
    expected_outcome: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: 'NOW()' },
    updated_at: { type: 'timestamptz', notNull: true, default: 'NOW()' }
  },
  indexes: {
    crm_stage_actions_stage_id_idx: { columns: ['stage_id'] }
  },
  policies: {
    'Anyone can read stage actions': {
      using: 'true',
      operation: 'SELECT'
    }
  }
};

export const CrmPersonStageActionModel = {
  name: 'crm_person_stage_actions',
  columns: {
    id: { type: 'uuid', primaryKey: true },
    person_id: { type: 'uuid', references: 'crm_people(id)', onDelete: 'CASCADE' },
    user_id: { type: 'uuid', references: 'auth.users(id)', onDelete: 'CASCADE' },
    stage_action_id: { type: 'uuid', references: 'crm_stage_actions(id)', onDelete: 'CASCADE' },
    status: { type: 'text', notNull: true, default: "'pending'" },
    completed_at: { type: 'timestamptz' },
    notes: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: 'NOW()' },
    updated_at: { type: 'timestamptz', notNull: true, default: 'NOW()' }
  },
  indexes: {
    crm_person_stage_actions_person_id_idx: { columns: ['person_id'] },
    crm_person_stage_actions_user_id_idx: { columns: ['user_id'] },
    crm_person_stage_actions_stage_action_id_idx: { columns: ['stage_action_id'] }
  },
  policies: {
    'Users can manage their own person stage actions': {
      using: 'user_id = auth.uid()',
      operation: 'ALL'
    }
  },
  foreignKeys: {
    crm_person_stage_actions_user_person_fkey: {
      columns: ['user_id', 'person_id'],
      references: 'crm_people(user_id, id)'
    }
  }
}; 