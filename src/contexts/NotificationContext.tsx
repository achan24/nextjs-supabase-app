'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'task' | 'system' | 'reminder';
  url?: string;
  timestamp: Date;
  read: boolean;
}

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  requestNotificationPermission: () => Promise<boolean>;
  sendPushNotification: (title: string, body: string, url?: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Load notifications from localStorage on mount
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      const parsed = JSON.parse(savedNotifications);
      setNotifications(parsed.map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      })));
    }
  }, []);

  useEffect(() => {
    // Save notifications to localStorage when they change
    localStorage.setItem('notifications', JSON.stringify(notifications));
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);

    // If permission is granted, send push notification
    if (Notification.permission === 'granted') {
      sendPushNotification(newNotification.title, newNotification.body, newNotification.url);
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const sendPushNotification = async (title: string, body: string, url?: string) => {
    console.log("[sendPushNotification] called with:", { title, body, url });
    try {
      if (!('serviceWorker' in navigator)) {
        console.error("[sendPushNotification] Service workers not supported in this browser.");
        return;
      }
      const readyPromise = navigator.serviceWorker.ready;
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Service worker ready timed out")), 5000)
      );
      const registration = await Promise.race([readyPromise, timeoutPromise]) as ServiceWorkerRegistration;
      console.log("[sendPushNotification] Service worker ready:", registration);

      await registration.showNotification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        data: { url }
      });
      console.log("[sendPushNotification] Notification should be shown now.");
    } catch (error) {
      console.error("[sendPushNotification] Error sending push notification:", error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        requestNotificationPermission,
        sendPushNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}; 