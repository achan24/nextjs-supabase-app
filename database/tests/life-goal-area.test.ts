import { describe, it, expect } from 'vitest';
import { LifeGoalArea } from '../models/life-goal-area.model';

describe('LifeGoalArea Model', () => {
  it('should have required properties', () => {
    expect(LifeGoalArea.name).toBe('life_goal_areas');
    expect(LifeGoalArea.columns).toHaveProperty('id');
    expect(LifeGoalArea.columns).toHaveProperty('user_id');
    expect(LifeGoalArea.columns).toHaveProperty('name');
  });

  it('should have correct relationships', () => {
    expect(LifeGoalArea.relationships).toHaveLength(1);
    expect(LifeGoalArea.relationships[0].table).toBe('life_goal_subareas');
    expect(LifeGoalArea.relationships[0].type).toBe('hasMany');
  });

  it('should have required policies', () => {
    expect(LifeGoalArea.policies).toHaveLength(4);
    expect(LifeGoalArea.policies.map(p => p.operation)).toContain('select');
    expect(LifeGoalArea.policies.map(p => p.operation)).toContain('insert');
    expect(LifeGoalArea.policies.map(p => p.operation)).toContain('update');
    expect(LifeGoalArea.policies.map(p => p.operation)).toContain('delete');
  });

  it('should have correct column types', () => {
    expect(LifeGoalArea.columns.id.type).toBe('uuid');
    expect(LifeGoalArea.columns.user_id.type).toBe('uuid');
    expect(LifeGoalArea.columns.name.type).toBe('text');
    expect(LifeGoalArea.columns.daily_points.type).toBe('numeric');
  });
}); 