const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function migrateLocalStorageToDB() {
  console.log('Starting server-side localStorage to database migration...');
  
  try {
    // Path to localStorage backup (if you have one)
    const localStoragePath = path.join(__dirname, 'localstorage-backup.json');
    
    let graph;
    
    // Try to read from backup file first
    if (fs.existsSync(localStoragePath)) {
      console.log('Reading from localStorage backup file...');
      const rawData = fs.readFileSync(localStoragePath, 'utf8');
      graph = JSON.parse(rawData);
    } else {
      console.log('No backup file found. You can create one by:');
      console.log('1. Going to browser console on decision-timelines page');
      console.log('2. Running: copy(JSON.stringify(JSON.parse(localStorage.getItem("branching-timelines-v1"))))');
      console.log('3. Pasting the result into scripts/localstorage-backup.json');
      return;
    }
    
    console.log('Found graph with', Object.keys(graph.nodes).length, 'nodes');
    
    // Get all users (since we don't know which user the data belongs to)
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
      console.error('Failed to get users:', usersError);
      return;
    }
    
    if (users.length === 0) {
      console.log('No users found in database');
      return;
    }
    
    // Use the first user (or you can specify a user ID)
    const userId = users[0].id;
    console.log('Using user ID:', userId);
    
    // Create nodes
    const idMap = new Map();
    
    for (const [oldId, node] of Object.entries(graph.nodes)) {
      console.log(`Creating node: ${node.title} (${node.kind})`);
      
      const { data: newNode, error } = await supabase
        .from('timeline_nodes')
        .insert({
          title: node.title,
          kind: node.kind,
          user_id: userId,
          default_duration_ms: node.defaultDurationMs,
          chosen_child_id: node.chosenChildIds?.[0] || null,
        })
        .select()
        .single();
      
      if (error) {
        console.error(`Failed to create node ${node.title}:`, error);
        continue;
      }
      
      idMap.set(oldId, newNode.id);
      console.log(`Created: ${node.title} -> ${newNode.id}`);
    }
    
    // Update parent relationships
    for (const [oldId, node] of Object.entries(graph.nodes)) {
      if (node.parentId && idMap.has(node.parentId)) {
        const newId = idMap.get(oldId);
        const newParentId = idMap.get(node.parentId);
        
        console.log(`Updating parent: ${newId} -> ${newParentId}`);
        
        const { error } = await supabase
          .from('timeline_nodes')
          .update({ parent_id: newParentId })
          .eq('id', newId);
        
        if (error) {
          console.error(`Failed to update parent for ${newId}:`, error);
        }
      }
    }
    
    // Migrate action records
    for (const [oldId, node] of Object.entries(graph.nodes)) {
      if (node.kind === 'action' && node.durationsMs && node.durationsMs.length > 0) {
        const newId = idMap.get(oldId);
        
        console.log(`Migrating ${node.durationsMs.length} action records for ${node.title}`);
        
        for (const durationMs of node.durationsMs) {
          const startedAt = new Date(Date.now() - durationMs);
          const completedAt = new Date();
          
          const { error } = await supabase
            .from('timeline_action_records')
            .insert({
              node_id: newId,
              duration_ms: durationMs,
              started_at: startedAt.toISOString(),
              completed_at: completedAt.toISOString(),
              user_id: userId,
            });
          
          if (error) {
            console.error(`Failed to create action record:`, error);
          }
        }
      }
    }
    
    // Migrate decision records
    for (const [oldId, node] of Object.entries(graph.nodes)) {
      if (node.kind === 'decision' && node.chosenChildIds && node.chosenChildIds.length > 0) {
        const newId = idMap.get(oldId);
        
        console.log(`Migrating ${node.chosenChildIds.length} decision records for ${node.title}`);
        
        for (const chosenChildId of node.chosenChildIds) {
          const newChosenChildId = idMap.get(chosenChildId);
          
          if (newChosenChildId) {
            const { error } = await supabase
              .from('timeline_decision_records')
              .insert({
                node_id: newId,
                chosen_child_id: newChosenChildId,
                decided_at: new Date().toISOString(),
                user_id: userId,
              });
            
            if (error) {
              console.error(`Failed to create decision record:`, error);
            }
          }
        }
      }
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('New root node ID:', idMap.get(graph.rootId));
    console.log('Total nodes migrated:', idMap.size);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
migrateLocalStorageToDB();
