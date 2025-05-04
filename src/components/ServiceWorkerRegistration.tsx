'use client';

import { useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';

export const ServiceWorkerRegistration = () => {
  const { requestNotificationPermission } = useNotifications();

  useEffect(() => {
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator && 'Notification' in window) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          });
          console.log('ServiceWorker registration successful');

          // Request notification permission after SW registration
          const permission = await requestNotificationPermission();
          if (permission) {
            console.log('Notification permission granted');
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