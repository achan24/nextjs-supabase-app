import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Check for required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('FCM token API called');
  
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    console.log('Request body:', req.body);
    
    // Get the FCM token and userId from the request body
    const { token, userId } = req.body;
    if (!token || !userId) {
      console.error('Missing FCM token or userId in request body');
      res.status(400).json({ error: 'Missing FCM token or userId' });
      return;
    }

    console.log('Storing FCM token:', token, 'for user:', userId);

    // Store the token
    const { data, error: dbError } = await supabase
      .from('fcm_tokens')
      .upsert({
        token,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();

    if (dbError) {
      console.error('Error storing FCM token:', dbError);
      res.status(500).json({ error: 'Failed to store FCM token' });
      return;
    }

    console.log('FCM token stored successfully:', data);
    res.status(200).json({ message: 'FCM token stored successfully', data });
  } catch (error) {
    console.error('Error in FCM token handler:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
} 