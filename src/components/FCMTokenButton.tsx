'use client';

import React, { useState } from 'react';
import { getMessagingInstance, getToken } from '@/utils/firebase';
import { Messaging } from 'firebase/messaging';
import { createClient } from '@supabase/supabase-js';

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const FCMTokenButton = () => {
  const [loading, setLoading] = useState(false);

  const handleGetToken = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      setLoading(true);
      console.log('Step 1: Getting messaging instance...');
      const messaging = await getMessagingInstance();
      if (!messaging) {
        throw new Error('Failed to get messaging instance');
      }
      console.log('Step 2: Messaging instance obtained');

      console.log('Step 3: Requesting notification permission...');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }
      console.log('Step 4: Notification permission granted');

      console.log('Step 5: Getting service worker registration...');
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        throw new Error('No service worker registration found');
      }
      console.log('Step 6: Service worker registration obtained:', registration);
      console.log('VAPID_KEY:', VAPID_KEY);

      console.log('Step 7: Getting FCM token...');
      let token;
      try {
        if (!VAPID_KEY) {
          throw new Error('VAPID key is not defined');
        }
        token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration
        });
        if (token) {
          console.log('Step 8: FCM token obtained:', token);
        } else {
          console.log('Step 8: FCM token is null or undefined:', token);
        }
      } catch (tokenError) {
        console.error('Step 8: Error getting FCM token:', tokenError);
        throw tokenError;
      }

      console.log('Step 9: Getting Supabase user...');
      const { data: { user } } = await supabase.auth.getUser();
      const userId = '875d44ba-8794-4d12-ba86-48e5e90dc796';

      console.log('Step 10: Sending token to backend...');
      const response = await fetch('/api/fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, userId }),
      });

      const responseData = await response.json();
      console.log('API Response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to store FCM token on server');
      }
      console.log('Step 11: Token stored successfully');

      alert('Push notifications enabled successfully!');
    } catch (error: unknown) {
      console.error('Error enabling push notifications:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to enable push notifications: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendFcmNotification = async () => {
    setLoading(true);
    try {
      // Get FCM token as before
      const messaging = await getMessagingInstance();
      if (!messaging) throw new Error('Failed to get messaging instance');
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) throw new Error('No service worker registration found');
      if (!VAPID_KEY) throw new Error('VAPID key is not defined');
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });
      if (!token) throw new Error('Failed to get FCM token');

      // Send notification via backend
      const response = await fetch('/api/send-fcm-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          title: 'Test Notification',
          body: 'This is a test notification sent via FCM!',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send notification');
      alert('Notification sent via FCM!');
    } catch (error: any) {
      alert(`Failed to send FCM notification: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleGetToken}
        disabled={loading}
        className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Enabling...' : 'Enable Push Notifications (FCM)'}
      </button>
      <button
        onClick={handleSendFcmNotification}
        disabled={loading}
        className="ml-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Sending...' : 'Test Notification (via FCM)'}
      </button>
    </>
  );
}; 