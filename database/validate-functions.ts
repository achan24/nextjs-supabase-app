import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

const supabase = createClient();

interface TestCase {
  name: string;
  run: () => Promise<void>;
}

interface PointsHistory {
  points: number;
}

async function testAreaPoints() {
  console.log('\n=== Testing Area Points ===');
  
  // Get a test area
  const { data: areas } = await supabase
    .from('life_goal_areas')
    .select('id, name')
    .limit(1);

  if (!areas?.length) {
    console.log('❌ No test area found');
    return;
  }

  const area = areas[0];
  console.log(`Testing with area: ${area.name}`);

  // Add some test points
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Add points for yesterday
  await supabase
    .from('area_points_history')
    .upsert({
      area_id: area.id,
      points: 5,
      target: 10,
      date: format(yesterday, 'yyyy-MM-dd')
    });

  // Add points for today
  await supabase
    .from('area_points_history')
    .upsert({
      area_id: area.id,
      points: 3,
      target: 10,
      date: format(today, 'yyyy-MM-dd')
    });

  // Test get_area_total_points function
  const { data: totalPoints } = await supabase
    .rpc('get_area_total_points', { p_area_id: area.id });

  console.log('Total points:', totalPoints);
  console.log('Expected:', 8);
  console.log(totalPoints === 8 ? '✓ Points sum correctly' : '❌ Points sum incorrectly');
}

async function testSubareaPoints() {
  console.log('\n=== Testing Subarea Points ===');
  
  // Get a test subarea
  const { data: subareas } = await supabase
    .from('life_goal_subareas')
    .select('id, name')
    .limit(1);

  if (!subareas?.length) {
    console.log('❌ No test subarea found');
    return;
  }

  const subarea = subareas[0];
  console.log(`Testing with subarea: ${subarea.name}`);

  // Add some test points
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Add points for yesterday
  await supabase
    .from('subarea_points_history')
    .upsert({
      subarea_id: subarea.id,
      points: 4,
      target: 8,
      date: format(yesterday, 'yyyy-MM-dd')
    });

  // Add points for today
  await supabase
    .from('subarea_points_history')
    .upsert({
      subarea_id: subarea.id,
      points: 2,
      target: 8,
      date: format(today, 'yyyy-MM-dd')
    });

  // Test get_subarea_total_points function
  const { data: totalPoints } = await supabase
    .rpc('get_subarea_total_points', { p_subarea_id: subarea.id });

  console.log('Total points:', totalPoints);
  console.log('Expected:', 6);
  console.log(totalPoints === 6 ? '✓ Points sum correctly' : '❌ Points sum incorrectly');
}

async function testGoalPoints() {
  console.log('\n=== Testing Goal Points ===');
  
  // Get a test goal
  const { data: goals } = await supabase
    .from('life_goals')
    .select('id, title')
    .limit(1);

  if (!goals?.length) {
    console.log('❌ No test goal found');
    return;
  }

  const goal = goals[0];
  console.log(`Testing with goal: ${goal.title}`);

  // Add some test points
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Add points for yesterday
  await supabase
    .from('goal_points_history')
    .upsert({
      goal_id: goal.id,
      points: 3,
      target: 5,
      date: format(yesterday, 'yyyy-MM-dd')
    });

  // Add points for today
  await supabase
    .from('goal_points_history')
    .upsert({
      goal_id: goal.id,
      points: 1,
      target: 5,
      date: format(today, 'yyyy-MM-dd')
    });

  // Test get_goal_total_points function
  const { data: totalPoints } = await supabase
    .rpc('get_goal_total_points', { p_goal_id: goal.id });

  console.log('Total points:', totalPoints);
  console.log('Expected:', 4);
  console.log(totalPoints === 4 ? '✓ Points sum correctly' : '❌ Points sum incorrectly');
}

async function testUserTotalPoints() {
  console.log('\n=== Testing User Total Points ===');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log('❌ No user found');
    return;
  }

  // Test get_user_total_points function
  const { data: totalPoints } = await supabase
    .rpc('get_user_total_points', { p_user_id: user.id });

  console.log('User total points:', totalPoints);
  console.log('This should match the sum of all goal points in history');

  // Verify by getting all goal points directly
  const { data: goalHistory } = await supabase
    .from('goal_points_history')
    .select('points')
    .eq('user_id', user.id);

  const manualSum = (goalHistory || []).reduce((sum: number, record: PointsHistory) => 
    sum + (record.points || 0), 0);
  
  console.log('Manual sum:', manualSum);
  console.log(totalPoints === manualSum ? '✓ Points match' : '❌ Points mismatch');
}

async function runTests() {
  const tests: TestCase[] = [
    { name: 'Area Points', run: testAreaPoints },
    { name: 'Subarea Points', run: testSubareaPoints },
    { name: 'Goal Points', run: testGoalPoints },
    { name: 'User Total Points', run: testUserTotalPoints }
  ];

  console.log('Starting function validation tests...\n');

  for (const test of tests) {
    try {
      await test.run();
    } catch (error) {
      console.error(`❌ Error in ${test.name} test:`, error);
    }
  }
}

runTests().catch(console.error); 