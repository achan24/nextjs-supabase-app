'use client';

import { NotificationProvider } from '../contexts/NotificationContext';
import { ServiceWorkerRegistration } from '../components/ServiceWorkerRegistration';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TaskTimerProvider } from '@/contexts/TaskTimerContext';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TaskTimerProvider>
        <NotificationProvider>
          <ServiceWorkerRegistration />
          {children}
          <Toaster />
        </NotificationProvider>
      </TaskTimerProvider>
    </ThemeProvider>
  );
} 