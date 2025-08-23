const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkCalendarEvents() {
  try {
    console.log('🔍 Checking calendar_timeline_events table...');
    
    // Since there's only one user, let's check all events
    const { data: events, error } = await supabase
      .from('calendar_timeline_events')
      .select('*')
      .order('event_date', { ascending: true });
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    console.log(`📅 Found ${events.length} calendar timeline events:`);
    
    if (events.length === 0) {
      console.log('   No events found in database');
    } else {
      events.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.title} (${event.duration}min) - ${new Date(event.event_date).toLocaleString()} - User: ${event.user_id}`);
      });
    }
    
    // Also check the tasks table to see if there are any tasks
    console.log('\n🔍 Checking tasks table...');
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, is_starred_for_today')
      .limit(5);
    
    if (tasksError) {
      console.error('❌ Tasks table error:', tasksError);
    } else {
      console.log(`📋 Found ${tasks.length} tasks (showing first 5):`);
      tasks.forEach((task, index) => {
        console.log(`   ${index + 1}. ${task.title} (starred: ${task.is_starred_for_today})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Run the check
checkCalendarEvents();
