'use client';

import { NotificationBell } from '../../components/NotificationBell';
import { useEffect } from 'react';
import { ReminderService } from '../../services/reminderService';
import { useNotifications } from '@/contexts/NotificationContext';
import { AppNavDropdown } from '@/components/AppNavDropdown';
import { ActiveSequenceProvider } from '@/contexts/ActiveSequenceContext';
import { ActiveSequenceIndicator } from '@/components/ActiveSequenceIndicator';
import { ThemeToggle } from '@/components/ThemeToggle';
import WalletPill from '@/components/WalletPill';
import Link from 'next/link';
import { initializeAutoSave } from '@/services/characterProgressService';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const notificationContext = useNotifications();
  const { user } = useAuth();

  useEffect(() => {
    const reminderService = new ReminderService(notificationContext);
    reminderService.startCheckingReminders();

    // Initialize auto-save for character progress
    // DISABLED: Auto-save for character daily progress is turned off
    let cleanup: (() => void) | undefined;
    // if (user?.id) {
    //   cleanup = initializeAutoSave(user.id);
    // }

    return () => {
      reminderService.stopCheckingReminders();
      if (cleanup) cleanup();
    };
  }, [user]);

  return (
    <ActiveSequenceProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <a href="/dashboard" className="text-2xl font-bold text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Dashboard</a>
                <AppNavDropdown />
              </div>
              <div className="flex items-center gap-4">
                <ActiveSequenceIndicator />
                <WalletPill />
                <NotificationBell />
                <ThemeToggle />
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