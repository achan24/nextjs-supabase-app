import webpush from 'web-push';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { cookies } from 'next/headers';

// VAPID keys should be generated only once and stored securely
const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  privateKey: process.env.VAPID_PRIVATE_KEY!,
};

webpush.setVapidDetails(
  'mailto:your-email@example.com', // Replace with your email
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    
    // Verify user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await request.json();

    // Store the subscription in your database
    const { error: dbError } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: session.user.id,
        subscription: subscription,
        created_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error('Error storing subscription:', dbError);
      return NextResponse.json({ error: 'Failed to store subscription' }, { status: 500 });
    }

    // Send a test notification
    try {
      await webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: 'Test Notification',
          body: 'Notifications are working!',
        })
      );
    } catch (error) {
      console.error('Error sending test notification:', error);
      // Don't return error here as the subscription was still stored successfully
    }

    return NextResponse.json({ message: 'Subscription added successfully' });
  } catch (error) {
    console.error('Error in push subscription handler:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 