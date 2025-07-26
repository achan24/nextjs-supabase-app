import { createClient } from '@supabase/supabase-js';
import { TableDefinition } from './models/types';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { config } from 'dotenv';
import { LifeGoalArea } from './models/life-goal-area.model';
import { LifeGoalSubarea } from './models/life-goal-subarea.model';
import { LifeGoal } from './models/life-goal.model';
import { LifeGoalMilestone } from './models/life-goal-milestone.model';
import { LifeGoalMetric } from './models/life-goal-metric.model';
import { LifeGoalMetricThreshold } from './models/life-goal-metric-threshold.model';
import { LifeGoalSequenceContribution } from './models/life-goal-sequence-contribution.model';
import { ProcessFlow } from './models/process-flow.model';
import { Node } from './models/node.model';
import { ProjectNodeLink } from './models/project-node-link.model';
import { ProcessFlowFavorite } from './models/process-flow-favorite.model';
import { Task } from './models/task.model';
import { Project } from './models/project.model';
import { Habit } from './models/habit.model';
import { Character } from './models/character.model';
import { CharacterTrait } from './models/character-trait.model';
import { TraitHistory } from './models/trait-history.model';
import { CharacterArea } from './models/character-area.model';
import { CharacterSubarea } from './models/character-subarea.model';
import { CharacterGoal } from './models/character-goal.model';
import { CharacterWeeklyTarget } from './models/character-weekly-target.model';
import { AreaPointsHistory } from './models/area-points-history.model';
import { SubareaPointsHistory } from './models/subarea-points-history.model';
import { GoalPointsHistory } from './models/goal-points-history.model';
import { CrmPeople } from './models/crm-people.model';
import { CrmPersonMetadata } from './models/crm-person-metadata.model';
import { CrmTracks } from './models/crm-tracks.model';
import { CrmStages } from './models/crm-stages.model';
import { CrmPersonTracks } from './models/crm-person-tracks.model';
import { CrmActions } from './models/crm-actions.model';
import { CrmActionFeedback } from './models/crm-action-feedback.model';

// Load environment variables from root .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function validateDatabase() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase credentials in .env.local file');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Import all models
  const models = [
    LifeGoalArea,
    LifeGoalSubarea,
    LifeGoal,
    LifeGoalMilestone,
    LifeGoalMetric,
    LifeGoalMetricThreshold,
    LifeGoalSequenceContribution,
    ProcessFlow,
    Node,
    ProjectNodeLink,
    ProcessFlowFavorite,
    Task,
    Project,
    Habit,
    Character,
    CharacterTrait,
    TraitHistory,
    CharacterArea,
    CharacterSubarea,
    CharacterGoal,
    CharacterWeeklyTarget,
    AreaPointsHistory,
    SubareaPointsHistory,
    GoalPointsHistory,
    CrmPeople,
    CrmPersonMetadata,
    CrmTracks,
    CrmStages,
    CrmPersonTracks,
    CrmActions,
    CrmActionFeedback,
  ];

  for (const [modelName, model] of Object.entries(models)) {
    console.log(`\nValidating ${modelName} against database...`);
    
    try {
      // First, check if we can query the table at all
      const { data, error: tableError } = await supabase
        .from((model as TableDefinition).name)
        .select()
        .limit(0);

      if (tableError) {
        console.error(`❌ Table ${(model as TableDefinition).name} cannot be queried: ${tableError.message}`);
        console.error('Our model might be wrong - please check the table name and permissions');
        continue;
      }

      console.log(`✓ Table ${(model as TableDefinition).name} exists and is accessible`);

      // Try to get a sample row
      const { data: rows, error: rowsError } = await supabase
        .from((model as TableDefinition).name)
        .select('*')
        .limit(1);

      if (rowsError) {
        console.error(`❌ Cannot examine table structure: ${rowsError.message}`);
        continue;
      }

      // Get database columns from the row or fall back to model columns for empty tables
      const dbColumns = rows && rows.length > 0 
        ? Object.keys(rows[0])
        : Object.keys((model as TableDefinition).columns);
      
      // Compare our model's columns with actual database columns
      console.log('\nComparing model to database structure:');
      
      for (const [columnName, columnDef] of Object.entries((model as TableDefinition).columns)) {
        if (!dbColumns.includes(columnName)) {
          console.error(`❌ Column "${columnName}" in our model does not exist in database`);
          console.error('Our model is wrong - please update it to match the database');
          continue;
        }
        console.log(`✓ Found column: ${columnName}`);
      }

      // For empty tables, we can't detect extra columns
      if (rows && rows.length > 0) {
        // Check for columns in database that aren't in our model
        const modelColumnNames = Object.keys((model as TableDefinition).columns);
        const extraDbColumns = dbColumns.filter(col => !modelColumnNames.includes(col));

        if (extraDbColumns.length) {
          console.error('\n❌ Database has columns not in our model:');
          extraDbColumns.forEach(col => {
            console.error(`- ${col}`);
          });
          console.error('Please update the model to include these columns');
        }
      } else {
        console.log('\nℹ️ Table is empty - cannot verify additional columns');
      }

    } catch (error) {
      console.error(`\n❌ Error validating ${modelName}:`, error);
    }
  }
}

validateDatabase().catch(error => {
  console.error('\n❌ Validation script error:', error);
  process.exit(1);
}); 