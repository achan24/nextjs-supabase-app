import React, { useState, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { BellIcon } from '@heroicons/react/24/outline';

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, sendPushNotification, requestNotificationPermission } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState<'default' | 'granted' | 'denied'>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      console.log("[NotificationBell] Notification.permission:", Notification.permission);
    } else {
      console.log("[NotificationBell] Notification API not available");
    }
  }, []);

  const handleNotificationClick = (id: string, url?: string) => {
    markAsRead(id);
    if (url) {
      window.location.href = url;
    }
    setIsOpen(false);
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setPermission(Notification.permission);
    if (granted) {
      // Optionally, you can trigger a test notification or subscription here
      window.location.reload(); // Reload to trigger ServiceWorkerRegistration logic if needed
    }
  };

  const testNotification = async () => {
    console.log("Test Notification button clicked");
    console.log("sendPushNotification is:", sendPushNotification); // Debug log
    try {
      await sendPushNotification(
        "Test Notification",
        "This is a test notification to verify push notifications are working!",
        "/dashboard"
      );
      console.log("Test notification sent");
    } catch (error) {
      console.error("Failed to send test notification:", error);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {permission !== 'granted' && (
          <button
            onClick={handleEnableNotifications}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Enable Notifications
          </button>
        )}
        <button
          onClick={testNotification}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          disabled={permission !== 'granted'}
        >
          Test Notification
        </button>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-full hover:bg-gray-100 relative"
        >
          <BellIcon className="h-6 w-6 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification.id, notification.url)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{notification.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{notification.body}</p>
                    </div>
                    {!notification.read && (
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(notification.timestamp).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 