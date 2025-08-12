// Migration script to transfer localStorage data to SQL database
// Run this in the browser console while on the decision-timelines page

const STORAGE_KEY = "branching-timelines-v1";

async function migrateLocalStorageToDB() {
  console.log('Starting localStorage to database migration...');
  
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found');
      return;
    }
    
    console.log('User authenticated:', user.id);
    
    // Read localStorage data
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      console.log('No localStorage data found to migrate');
      return;
    }
    
    const graph = JSON.parse(rawData);
    console.log('Found localStorage graph:', graph);
    console.log('Nodes to migrate:', Object.keys(graph.nodes).length);
    
    // Convert and insert nodes
    const nodeIds = new Map(); // Map old IDs to new UUIDs
    
    for (const [oldId, node] of Object.entries(graph.nodes)) {
      console.log(`Migrating node: ${node.title} (${node.kind})`);
      
      // Create new node in database
      const { data: newNode, error } = await supabase
        .from('timeline_nodes')
        .insert({
          title: node.title,
          kind: node.kind,
          parent_id: null, // Will update after all nodes are created
          user_id: user.id,
          default_duration_ms: node.defaultDurationMs,
          chosen_child_id: node.chosenChildIds?.[0] || null,
        })
        .select()
        .single();
      
      if (error) {
        console.error(`Failed to create node ${node.title}:`, error);
        continue;
      }
      
      nodeIds.set(oldId, newNode.id);
      console.log(`Created node with new ID: ${newNode.id}`);
    }
    
    // Update parent relationships
    for (const [oldId, node] of Object.entries(graph.nodes)) {
      if (node.parentId && nodeIds.has(node.parentId)) {
        const newId = nodeIds.get(oldId);
        const newParentId = nodeIds.get(node.parentId);
        
        console.log(`Updating parent relationship: ${newId} -> ${newParentId}`);
        
        const { error } = await supabase
          .from('timeline_nodes')
          .update({ parent_id: newParentId })
          .eq('id', newId);
        
        if (error) {
          console.error(`Failed to update parent for ${newId}:`, error);
        }
      }
    }
    
    // Migrate action records (if any exist)
    for (const [oldId, node] of Object.entries(graph.nodes)) {
      if (node.kind === 'action' && node.durationsMs && node.durationsMs.length > 0) {
        const newId = nodeIds.get(oldId);
        
        console.log(`Migrating ${node.durationsMs.length} action records for node ${newId}`);
        
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
              user_id: user.id,
            });
          
          if (error) {
            console.error(`Failed to create action record for ${newId}:`, error);
          }
        }
      }
    }
    
    // Migrate decision records (if any exist)
    for (const [oldId, node] of Object.entries(graph.nodes)) {
      if (node.kind === 'decision' && node.chosenChildIds && node.chosenChildIds.length > 0) {
        const newId = nodeIds.get(oldId);
        
        console.log(`Migrating ${node.chosenChildIds.length} decision records for node ${newId}`);
        
        for (const chosenChildId of node.chosenChildIds) {
          const newChosenChildId = nodeIds.get(chosenChildId);
          
          if (newChosenChildId) {
            const { error } = await supabase
              .from('timeline_decision_records')
              .insert({
                node_id: newId,
                chosen_child_id: newChosenChildId,
                decided_at: new Date().toISOString(),
                user_id: user.id,
              });
            
            if (error) {
              console.error(`Failed to create decision record for ${newId}:`, error);
            }
          }
        }
      }
    }
    
    console.log('Migration completed successfully!');
    console.log('New root node ID:', nodeIds.get(graph.rootId));
    
    // Optionally, clear localStorage after successful migration
    const shouldClear = confirm('Migration completed! Clear localStorage data?');
    if (shouldClear) {
      localStorage.removeItem(STORAGE_KEY);
      console.log('localStorage data cleared');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Export for use in browser console
window.migrateLocalStorageToDB = migrateLocalStorageToDB;

console.log('Migration script loaded. Run migrateLocalStorageToDB() to start migration.');
