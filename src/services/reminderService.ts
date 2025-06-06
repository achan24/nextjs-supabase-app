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
    // Check every 5 seconds for more responsive short-duration timers
    this.checkInterval = setInterval(() => this.checkDueTasks(), 5000);
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
      if (now - this.lastCheckTime > 5000) { // If more than 5 seconds have passed
        await this.checkDueTasks();
      }
    }
  };

  private async checkDueTasks() {
    try {
      const now = new Date();
      console.log('[ReminderService] Checking for due tasks at:', now.toISOString());
      this.lastCheckTime = Date.now();

      // Get tasks with their unsent reminders using proper join
      const { data: tasks, error: tasksError } = await this.supabase
        .from('tasks')
        .select(`
          id,
          title,
          due_date,
          reminders!inner (
            id,
            type,
            minutes_before,
            time,
            sent_at
          )
        `)
        .is('reminders.sent_at', null);

      if (tasksError) {
        console.error('[ReminderService] Error fetching tasks:', tasksError);
        return;
      }

      console.log('[ReminderService] Found tasks with unsent reminders:', tasks);

      if (!tasks || tasks.length === 0) {
        console.log('[ReminderService] No tasks with unsent reminders found');
        return;
      }

      const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('[ReminderService] Local timezone:', localTimeZone);

      for (const task of tasks) {
        console.log('[ReminderService] Processing task:', task);
        
        // Check each reminder
        for (const reminder of task.reminders || []) {
          try {
            let reminderTime: Date;
            if (reminder.type === 'at' && reminder.time) {
              // Convert reminder time to local timezone with seconds precision
              reminderTime = new Date(reminder.time);
              console.log('[ReminderService] At reminder time (UTC):', reminderTime.toISOString());
              console.log('[ReminderService] Current time (UTC):', now.toISOString());
            } else if (reminder.type === 'before' && task.due_date && reminder.minutes_before) {
              // For 'before' type with due_date, calculate the reminder time based on minutes_before
              const dueDate = new Date(task.due_date);
              // Convert to milliseconds for more precise timing
              const millisBefore = reminder.minutes_before * 60 * 1000;
              reminderTime = new Date(dueDate.getTime() - millisBefore);
              console.log('[ReminderService] Before reminder time (UTC):', reminderTime.toISOString());
              console.log('[ReminderService] Due date (UTC):', dueDate.toISOString());
              console.log('[ReminderService] Minutes before:', reminder.minutes_before);
            } else {
              console.log('[ReminderService] Skipping reminder due to missing data:', reminder);
              continue;
            }

            // Check if it's time to show the reminder (within the last 5 seconds to be more responsive)
            const fiveSecondsAgo = new Date(now.getTime() - 5000);
            const isTimeToRemind = reminderTime <= now && reminderTime > fiveSecondsAgo;
            
            console.log('[ReminderService] Time check:', {
              reminderTime: reminderTime.toISOString(),
              now: now.toISOString(),
              fiveSecondsAgo: fiveSecondsAgo.toISOString(),
              isTimeToRemind
            });

            if (isTimeToRemind) {
              console.log('[ReminderService] Sending reminder for task:', task.title);
              
              // Mark reminder as sent BEFORE showing notification
              const { error: updateError } = await this.supabase
                .from('reminders')
                .update({ sent_at: now.toISOString() })
                .eq('id', reminder.id);

              if (updateError) {
                console.error('[ReminderService] Error updating reminder:', updateError);
                continue;
              }

              // Double-check notification permission before sending
              if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                const notificationTitle = reminder.type === 'at' ? 'Task Timer Complete' : 'Task Reminder';
                const notificationBody = reminder.type === 'at' ? 
                  `${task.title} timer is complete!` :
                  `${task.title} is due in ${reminder.minutes_before} minutes`;

                console.log('[ReminderService] Sending notification:', {
                  title: notificationTitle,
                  body: notificationBody
                });

                this.notificationContext.addNotification({
                  title: notificationTitle,
                  body: notificationBody,
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
            continue;
          }
        }
      }
    } catch (error) {
      console.error('[ReminderService] Error checking reminders:', error);
    }
  }
} 