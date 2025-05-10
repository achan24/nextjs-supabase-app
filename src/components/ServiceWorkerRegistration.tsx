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
      if ('serviceWorker' in navigator) {
        try {
          // Check for existing registration first
          const existingRegistration = await navigator.serviceWorker.getRegistration();
          if (existingRegistration) {
            console.log('[SW] Existing service worker found:', existingRegistration);
            return;
          }

          console.log('[SW] Starting service worker registration...');
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/'
          });
          console.log('[SW] Service worker registered successfully:', registration);

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('[SW] New worker installing:', newWorker);
            
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                console.log('[SW] Worker state changed:', newWorker.state);
                if (newWorker.state === 'activated') {
                  console.log('[SW] New service worker activated');
                }
              });
            }
          });

          // Wait for the service worker to be fully active
          console.log('[SW-DEBUG] Waiting for navigator.serviceWorker.ready...');
          const ready = await navigator.serviceWorker.ready;
          console.log('[SW-DEBUG] navigator.serviceWorker.ready resolved:', ready);

          if (Notification.permission === 'granted') {
            try {
              const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
              if (!publicKey) {
                throw new Error('VAPID public key not found');
              }
              const subscription = await ready.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
              });
              console.log('[SW-DEBUG] Push notification subscription successful:', subscription);
            } catch (pushError) {
              console.error('[SW-DEBUG] Push notification subscription failed:', pushError);
            }
          }
        } catch (error) {
          console.error('[SW] Service worker registration failed:', error);
        }
      } else {
        console.log('[SW] Service workers not supported in this browser');
      }
    };

    registerServiceWorker();
  }, []);

  return null;
}; 