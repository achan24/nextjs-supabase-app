'use client';

import { NotificationBell } from '../../components/NotificationBell';
import { useEffect } from 'react';
import { ReminderService } from '../../services/reminderService';
import { useNotifications } from '@/contexts/NotificationContext';
import { AppNavDropdown } from '@/components/AppNavDropdown';
import { ActiveSequenceProvider } from '@/contexts/ActiveSequenceContext';
import { ActiveSequenceIndicator } from '@/components/ActiveSequenceIndicator';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const notificationContext = useNotifications();

  useEffect(() => {
    const reminderService = new ReminderService(notificationContext);
    reminderService.startCheckingReminders();

    return () => {
      reminderService.stopCheckingReminders();
    };
  }, [notificationContext]);

  return (
    <ActiveSequenceProvider>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <AppNavDropdown />
              </div>
              <div className="flex items-center gap-4">
                <ActiveSequenceIndicator />
                <NotificationBell />
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </ActiveSequenceProvider>
  );
} 