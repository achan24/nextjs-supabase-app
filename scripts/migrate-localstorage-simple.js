// Simple migration script - copy and paste this into browser console
// Make sure you're on the decision-timelines page and logged in

(async () => {
  console.log('Starting localStorage migration...');
  
  // Get user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('Not logged in');
    return;
  }
  
  // Get localStorage data
  const raw = localStorage.getItem('branching-timelines-v1');
  if (!raw) {
    console.log('No localStorage data found');
    return;
  }
  
  const graph = JSON.parse(raw);
  console.log('Found graph with', Object.keys(graph.nodes).length, 'nodes');
  
  // Create nodes
  const idMap = new Map();
  
  for (const [oldId, node] of Object.entries(graph.nodes)) {
    const { data: newNode } = await supabase
      .from('timeline_nodes')
      .insert({
        title: node.title,
        kind: node.kind,
        user_id: user.id,
        default_duration_ms: node.defaultDurationMs,
        chosen_child_id: node.chosenChildIds?.[0] || null,
      })
      .select()
      .single();
    
    idMap.set(oldId, newNode.id);
    console.log(`Created: ${node.title} -> ${newNode.id}`);
  }
  
  // Update parent relationships
  for (const [oldId, node] of Object.entries(graph.nodes)) {
    if (node.parentId && idMap.has(node.parentId)) {
      await supabase
        .from('timeline_nodes')
        .update({ parent_id: idMap.get(node.parentId) })
        .eq('id', idMap.get(oldId));
    }
  }
  
  console.log('Migration complete! Root ID:', idMap.get(graph.rootId));
  
  if (confirm('Clear localStorage?')) {
    localStorage.removeItem('branching-timelines-v1');
    console.log('localStorage cleared');
  }
})();
