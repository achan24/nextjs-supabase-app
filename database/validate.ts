import { createClient } from '@supabase/supabase-js';
import { TableDefinition } from './models/types';
import * as dotenv from 'dotenv';
import { join } from 'path';

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
  const { LifeGoalArea } = require('./models/life-goal-area.model');
  const { LifeGoalSubarea } = require('./models/life-goal-subarea.model');
  const { LifeGoal } = require('./models/life-goal.model');
  const { LifeGoalMilestone } = require('./models/life-goal-milestone.model');
  const { LifeGoalMetric } = require('./models/life-goal-metric.model');
  const { LifeGoalMetricThreshold } = require('./models/life-goal-metric-threshold.model');
  const { LifeGoalSequenceContribution } = require('./models/life-goal-sequence-contribution.model');
  const { ProcessFlow } = require('./models/process-flow.model');
  const { Node } = require('./models/node.model');
  const { ProjectNodeLink } = require('./models/project-node-link.model');
  const { ProcessFlowFavorite } = require('./models/process-flow-favorite.model');
  const { Task } = require('./models/task.model');
  const { Project } = require('./models/project.model');
  const { Habit } = require('./models/habit.model');
  const { Character } = require('./models/character.model');
  const { CharacterTrait } = require('./models/character-trait.model');
  const { TraitHistory } = require('./models/trait-history.model');
  const { CharacterArea } = require('./models/character-area.model');
  const { CharacterSubarea } = require('./models/character-subarea.model');
  const { CharacterGoal } = require('./models/character-goal.model');
  const { CharacterWeeklyTarget } = require('./models/character-weekly-target.model');
  const { AreaPointsHistory } = require('./models/area-points-history.model');
  const { SubareaPointsHistory } = require('./models/subarea-points-history.model');
  const { GoalPointsHistory } = require('./models/goal-points-history.model');
  
  const models = { 
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
    GoalPointsHistory
  };

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