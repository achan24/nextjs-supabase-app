const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = process.argv[2]; // Optionally pass user_id as CLI arg

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  let query = supabase.from('habits').select('*');
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching habits:', error);
    process.exit(1);
  }
  console.log('Fetched habits:', data);
}

main(); 