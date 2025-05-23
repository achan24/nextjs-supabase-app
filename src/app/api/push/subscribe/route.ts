import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import webPush from 'web-push';

// Configure web-push with your VAPID keys
webPush.setVapidDetails(
  'mailto:your-email@example.com', // Replace with your email
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the push subscription object
    const subscription = await request.json();

    // Store the subscription in Supabase
    const { error: dbError } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        subscription: subscription,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('Error storing subscription:', dbError);
      return NextResponse.json({ error: 'Failed to store subscription' }, { status: 500 });
    }

    // Send a test notification
    try {
      await webPush.sendNotification(
        subscription,
        JSON.stringify({
          title: 'Push Notifications Enabled',
          body: 'You will now receive notifications for your tasks and reminders!',
          url: '/dashboard'
        })
      );
    } catch (pushError) {
      console.error('Error sending test notification:', pushError);
      // Don't fail the subscription if the test notification fails
    }

    return NextResponse.json({ message: 'Subscription stored successfully' });
  } catch (error) {
    console.error('Error in push subscription handler:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 