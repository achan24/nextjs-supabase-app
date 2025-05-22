import { createClient } from '@/lib/supabase';
import { NotificationContextType } from '@/contexts/NotificationContext';
import { Task, Reminder } from '@/types/task';

export class ReminderService {
  private supabase = createClient();
  private checkInterval: NodeJS.Timeout | null = null;
  private notificationContext: NotificationContextType;
  private lastCheckTime: number = 0;

  constructor(notificationContext: NotificationContextType) {
    this.notificationContext = notificationContext;
  }

  async startCheckingReminders() {
    // Check every minute instead of every 5 seconds to be more battery-friendly
    this.checkInterval = setInterval(() => this.checkDueTasks(), 60000);
    // Initial check
    await this.checkDueTasks();

    // Add visibility change listener for mobile
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  stopCheckingReminders() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange = async () => {
    if (document.visibilityState === 'visible') {
      // Check if we missed any reminders while hidden
      const now = Date.now();
      if (now - this.lastCheckTime > 60000) { // If more than a minute has passed
        await this.checkDueTasks();
      }
    }
  };

  private async checkDueTasks() {
    try {
      console.log('[ReminderService] Checking for due tasks...');
      this.lastCheckTime = Date.now();

      // Get tasks with their reminders (only unsent reminders)
      const { data: tasks, error: tasksError } = await this.supabase
        .from('tasks')
        .select(`
          *,
          reminders (*, sent_at)
        `)
        .eq('status', 'todo')
        .not('due_date', 'is', null);

      if (tasksError) throw tasksError;

      const now = new Date();
      const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('[ReminderService] Local timezone:', localTimeZone);

      for (const task of tasks) {
        if (!task.due_date) continue;

        // Convert due_date to local timezone
        const dueDate = new Date(task.due_date);
        const localDueDate = new Date(dueDate.toLocaleString('en-US', { timeZone: localTimeZone }));
        
        // Check each reminder
        for (const reminder of task.reminders || []) {
          try {
            if (reminder.sent_at) continue; // Only trigger unsent reminders
            
            let reminderTime: Date;
            if (reminder.type === 'at') {
              // Convert reminder time to local timezone
              reminderTime = new Date(new Date(reminder.time).toLocaleString('en-US', { timeZone: localTimeZone }));
              console.log('[ReminderService] At reminder time:', reminderTime);
            } else {
              // For 'before' type, calculate the reminder time based on minutes_before
              const minutesBefore = reminder.minutes_before || 0;
              reminderTime = new Date(localDueDate.getTime() - minutesBefore * 60 * 1000);
              console.log('[ReminderService] Before reminder time:', reminderTime);
            }

            // Check if it's time to show the reminder (within the last 5 minutes to be more lenient)
            const fiveMinutesAgo = new Date(now.getTime() - 300000);
            if (reminderTime <= now && reminderTime > fiveMinutesAgo) {
              console.log('[ReminderService] Sending reminder for task:', task.title);
              
              // Mark reminder as sent BEFORE showing notification
              const { error: updateError } = await this.supabase
                .from('reminders')
                .update({ sent_at: new Date().toISOString() })
                .eq('id', reminder.id);

              if (updateError) {
                console.error('[ReminderService] Error updating reminder:', updateError);
                continue;
              }

              const minutesUntilDue = Math.floor((localDueDate.getTime() - now.getTime()) / (60 * 1000));
              const timeText = reminder.type === 'at' 
                ? 'now' 
                : `${reminder.minutes_before} minutes before due time`;

              // Double-check notification permission before sending
              if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                this.notificationContext.addNotification({
                  title: 'Task Reminder',
                  body: `${task.title} is due ${timeText} (${minutesUntilDue} minutes remaining)`,
                  type: 'task',
                  url: `/dashboard/process-flow?task=${task.id}`
                });
                console.log('[ReminderService] Notification sent successfully');
              } else {
                console.log('[ReminderService] Notification permission not granted');
              }
            }
          } catch (reminderError) {
            console.error('[ReminderService] Error processing reminder:', reminderError);
            continue; // Continue with next reminder even if one fails
          }
        }
      }
    } catch (error) {
      console.error('[ReminderService] Error checking reminders:', error);
    }
  }
} 