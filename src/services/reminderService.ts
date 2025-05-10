import { createClient } from '@/lib/supabase';
import { NotificationContextType } from '@/contexts/NotificationContext';
import { Task, Reminder } from '@/types/task';

export class ReminderService {
  private supabase = createClient();
  private checkInterval: NodeJS.Timeout | null = null;
  private notificationContext: NotificationContextType;

  constructor(notificationContext: NotificationContextType) {
    this.notificationContext = notificationContext;
  }

  async startCheckingReminders() {
    // Check every 5 seconds
    this.checkInterval = setInterval(() => this.checkDueTasks(), 5000);
    // Initial check
    await this.checkDueTasks();
  }

  stopCheckingReminders() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async checkDueTasks() {
    try {
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

      tasks.forEach((task: Task & { reminders: Reminder[] }) => {
        if (!task.due_date) return;

        // Convert due_date to local timezone
        const dueDate = new Date(task.due_date);
        const localDueDate = new Date(dueDate.toLocaleString('en-US', { timeZone: localTimeZone }));
        
        // Check each reminder
        task.reminders?.forEach(async reminder => {
          if (reminder.sent_at) return; // Only trigger unsent reminders
          let reminderTime: Date;
          
          if (reminder.type === 'at') {
            // Convert reminder time to local timezone
            reminderTime = new Date(new Date(reminder.time).toLocaleString('en-US', { timeZone: localTimeZone }));
          } else {
            // For 'before' type, calculate the reminder time based on minutes_before
            // Use local timezone for calculations
            const minutesBefore = reminder.minutes_before || 0;
            reminderTime = new Date(localDueDate.getTime() - minutesBefore * 60 * 1000);
          }

          // Check if it's time to show the reminder (within the last minute)
          const oneMinuteAgo = new Date(now.getTime() - 60000);
          if (reminderTime <= now && reminderTime > oneMinuteAgo) {
            // Mark reminder as sent BEFORE showing notification
            await this.supabase
              .from('reminders')
              .update({ sent_at: new Date().toISOString() })
              .eq('id', reminder.id);
            const minutesUntilDue = Math.floor((localDueDate.getTime() - now.getTime()) / (60 * 1000));
            const timeText = reminder.type === 'at' 
              ? 'now' 
              : `${reminder.minutes_before} minutes before due time`;
            this.notificationContext.addNotification({
              title: 'Task Reminder',
              body: `${task.title} is due ${timeText} (${minutesUntilDue} minutes remaining)`,
              type: 'task',
              url: `/dashboard/process-flow?task=${task.id}`
            });
          }
        });
      });
    } catch (error) {
      console.error('Error checking reminders:', error);
    }
  }
} 