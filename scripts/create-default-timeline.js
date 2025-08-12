const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function createDefaultTimeline() {
  console.log('Creating default timeline with starter node...');
  
  try {
    // Get the first user
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
      console.error('Failed to get users:', usersError);
      return;
    }
    
    if (users.length === 0) {
      console.log('No users found - you need to be logged in first');
      return;
    }
    
    const userId = users[0].id;
    console.log('Using user ID:', userId);
    
    // Create a default "Empty Node" as the root
    const { data: rootNode, error: rootError } = await supabase
      .from('timeline_nodes')
      .insert({
        title: 'Empty Node',
        kind: 'action',
        parent_id: null, // Root node has no parent
        user_id: userId,
        default_duration_ms: 5000, // 5 seconds default
        chosen_child_id: null,
      })
      .select()
      .single();
    
    if (rootError) {
      console.error('Failed to create root node:', rootError);
      return;
    }
    
    console.log('✅ Created default timeline with root node:', rootNode.id);
    console.log('Title:', rootNode.title);
    console.log('Kind:', rootNode.kind);
    console.log('User ID:', rootNode.user_id);
    
    console.log('\n🎉 Default timeline created!');
    console.log('Now refresh your decision-timelines page to see the "Empty Node"');
    console.log('You can click on it and use the "Add Action" and "Add Decision" buttons');
    
  } catch (error) {
    console.error('❌ Failed to create default timeline:', error);
  }
}

createDefaultTimeline();
