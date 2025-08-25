'use client';

import { NotificationProvider } from '../contexts/NotificationContext';
import { ServiceWorkerRegistration } from '../components/ServiceWorkerRegistration';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TaskTimerProvider } from '@/contexts/TaskTimerContext';
import { TimelineEngineProvider } from '@/contexts/TimelineEngineContext';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TaskTimerProvider>
        <TimelineEngineProvider>
          <NotificationProvider>
            <ServiceWorkerRegistration />
            {children}
            <Toaster />
          </NotificationProvider>
        </TimelineEngineProvider>
      </TaskTimerProvider>
    </ThemeProvider>
  );
} 