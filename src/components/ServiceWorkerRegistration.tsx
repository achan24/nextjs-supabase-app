'use client';

import { useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const ServiceWorkerRegistration = () => {
  const { requestNotificationPermission } = useNotifications();

  useEffect(() => {
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator && 'Notification' in window) {
        try {
          // Get the base URL from the current window location
          const baseUrl = window.location.origin;
          const registration = await navigator.serviceWorker.register(`${baseUrl}/sw.js`, {
            scope: baseUrl + '/'
          });
          console.log('ServiceWorker registration successful');

          // Request notification permission after SW registration
          const permission = await requestNotificationPermission();
          if (permission) {
            console.log('Notification permission granted');
            
            // Subscribe to push notifications
            try {
              const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
              if (!publicKey) {
                throw new Error('VAPID public key not found');
              }

              const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
              });

              // Send the subscription to your backend
              const response = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(subscription),
              });

              if (!response.ok) {
                throw new Error('Failed to store push subscription on server');
              }

              console.log('Push notification subscription successful:', subscription);
            } catch (pushError) {
              console.error('Push notification subscription failed:', pushError);
            }
          }

          // Handle service worker updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'activated') {
                  console.log('New service worker activated');
                }
              });
            }
          });
        } catch (err) {
          console.error('ServiceWorker registration failed: ', err);
        }
      }
    };

    registerServiceWorker();
  }, [requestNotificationPermission]);

  return null;
}; 