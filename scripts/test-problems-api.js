const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Test configuration
const BASE_URL = 'http://localhost:3000';
const HARDCODED_USER_ID = '875d44ba-8794-4d12-ba86-48e5e90dc796';

async function testProblemsAPI() {
  console.log('🧪 Testing Problems API Endpoints\n');

  // Test 1: Create a problem
  console.log('1️⃣ Testing POST /api/problems');
  try {
    const createResponse = await fetch(`${BASE_URL}/api/problems`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test Problem - Sleep Issues',
        description: 'Having trouble sleeping consistently',
        type: 'problem',
        priority: 'high'
      })
    });

    console.log('Status:', createResponse.status);
    const createData = await createResponse.json();
    console.log('Response:', createData);

    if (createResponse.ok && createData.id) {
      console.log('✅ Problem created successfully');
      const problemId = createData.id;

      // Test 2: Get widget data
      console.log('\n2️⃣ Testing GET /api/problems/widget');
      const widgetResponse = await fetch(`${BASE_URL}/api/problems/widget`);
      console.log('Status:', widgetResponse.status);
      const widgetData = await widgetResponse.json();
      console.log('Response:', widgetData);

      if (widgetResponse.ok) {
        console.log('✅ Widget data retrieved successfully');
      } else {
        console.log('❌ Widget data failed');
      }

      // Test 3: Create a child problem
      console.log('\n3️⃣ Testing POST /api/problems/[id]/quick-child');
      const childResponse = await fetch(`${BASE_URL}/api/problems/${problemId}/quick-child`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Sub-problem: Caffeine intake',
          type: 'problem'
        })
      });

      console.log('Status:', childResponse.status);
      const childData = await childResponse.json();
      console.log('Response:', childData);

      if (childResponse.ok) {
        console.log('✅ Child problem created successfully');
      } else {
        console.log('❌ Child problem creation failed');
      }

      // Test 4: Get widget data again to see the change
      console.log('\n4️⃣ Testing GET /api/problems/widget (after adding child)');
      const widgetResponse2 = await fetch(`${BASE_URL}/api/problems/widget`);
      console.log('Status:', widgetResponse2.status);
      const widgetData2 = await widgetResponse2.json();
      console.log('Response:', widgetData2);

    } else {
      console.log('❌ Problem creation failed');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Test database functions directly
async function testDatabaseFunctions() {
  console.log('\n🔍 Testing Database Functions Directly\n');

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase credentials in .env.local');
    return;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Test 1: Check if problems table exists and has data
    console.log('1️⃣ Checking problems table...');
    const { data: problems, error: problemsError } = await supabase
      .from('problems')
      .select('*')
      .limit(5);

    if (problemsError) {
      console.error('❌ Problems table error:', problemsError);
    } else {
      console.log('✅ Problems table accessible');
      console.log('Problems count:', problems.length);
      if (problems.length > 0) {
        console.log('Sample problem:', problems[0]);
      }
    }

    // Test 2: Test the get_problem_widget function
    console.log('\n2️⃣ Testing get_problem_widget function...');
    
    // Use the hardcoded user ID that's used throughout the app
    const userId = HARDCODED_USER_ID;
    console.log('✅ Using hardcoded user ID:', userId);

    // Check if this user already has problems
    const { data: existingProblems, error: existingProblemsError } = await supabase
      .from('problems')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    if (existingProblemsError) {
      console.error('❌ Error checking existing problems:', existingProblemsError);
      return;
    }

    if (!existingProblems || existingProblems.length === 0) {
      console.log('ℹ️ No problems found for user, creating test data...');
      
      // Create a test problem
      const { data: testProblem, error: createError } = await supabase
        .from('problems')
        .insert({
          user_id: userId,
          title: 'Test Problem',
          type: 'problem',
          status: 'open',
          priority: 'medium'
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Failed to create test problem:', createError);
        return;
      }

      console.log('✅ Test problem created');
    } else {
      console.log('✅ User already has problems');
    }

    // Now test the function
    const { data: widgetData, error: widgetError } = await supabase
      .rpc('get_problem_widget', { 
        user_uuid: userId
      });

    if (widgetError) {
      console.error('❌ Widget function error:', widgetError);
    } else {
      console.log('✅ Widget function works');
      console.log('Widget data:', widgetData);
    }

  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Problems API Tests\n');
  
  await testDatabaseFunctions();
  await testProblemsAPI();
  
  console.log('\n✨ Tests completed!');
}

runTests().catch(console.error); 