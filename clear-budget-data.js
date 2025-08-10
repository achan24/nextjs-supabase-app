const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function clearFakeData() {
  try {
    console.log('Clearing fake budget data...');
    
    // Clear all budget transactions
    const { error: txError } = await supabase
      .from('budget_transactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (txError) {
      console.error('Error clearing transactions:', txError);
    } else {
      console.log('✅ Budget transactions cleared');
    }
    
    // Clear all budget targets
    const { error: budgetError } = await supabase
      .from('budget_targets')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (budgetError) {
      console.error('Error clearing budgets:', budgetError);
    } else {
      console.log('✅ Budget targets cleared');
    }
    
    console.log('🎉 All fake budget data cleared from database!');
    console.log('Refresh your budget app to see the clean slate.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

clearFakeData();
