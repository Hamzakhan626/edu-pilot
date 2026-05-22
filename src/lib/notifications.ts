import { createBrowserClient } from '@supabase/ssr';
import { format } from 'date-fns';

type NotificationType = 
  | 'attendance_marked'
  | 'attendance_reminder'
  | 'quiz_created'
  | 'quiz_due'
  | 'quiz_graded'
  | 'assignment_created'
  | 'assignment_due'
  | 'assignment_graded'
  | 'lesson_added'
  | 'fee_due'
  | 'fee_paid'
  | 'announcement'
  | 'system_alert'
  | 'low_attendance_alert'
  | 'grade_published'
  | 'course_registration'
  | 'profile_update';

type RelatedEntityType = 
  | 'course'
  | 'quiz'
  | 'assignment'
  | 'lesson'
  | 'fee'
  | 'attendance'
  | 'grade'
  | 'announcement';

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  notificationType: NotificationType;
  relatedEntityId?: string;
  relatedEntityType?: RelatedEntityType;
}

interface NotificationSettings {
  assignment_notifications: boolean;
  quiz_notifications: boolean;
  attendance_notifications: boolean;
  fee_notifications: boolean;
  grade_notifications: boolean;
  announcement_notifications: boolean;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Create a notification
export async function createNotification({
  userId,
  title,
  message,
  notificationType,
  relatedEntityId,
  relatedEntityType,
}: CreateNotificationParams) {
  try {
    // Check if user has this notification type enabled
    const { data: settings } = await supabase
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (settings) {
      const notificationTypeMap: Record<NotificationType, keyof NotificationSettings> = {
        attendance_marked: 'attendance_notifications',
        attendance_reminder: 'attendance_notifications',
        low_attendance_alert: 'attendance_notifications',
        quiz_created: 'quiz_notifications',
        quiz_due: 'quiz_notifications',
        quiz_graded: 'quiz_notifications',
        assignment_created: 'assignment_notifications',
        assignment_due: 'assignment_notifications',
        assignment_graded: 'assignment_notifications',
        lesson_added: 'assignment_notifications',
        fee_due: 'fee_notifications',
        fee_paid: 'fee_notifications',
        grade_published: 'grade_notifications',
        announcement: 'announcement_notifications',
        system_alert: 'announcement_notifications',
        course_registration: 'announcement_notifications',
        profile_update: 'announcement_notifications',
      };

      const settingKey = notificationTypeMap[notificationType];
      if (!settings[settingKey]) {
        console.log(`Notification type ${notificationType} is disabled for user ${userId}`);
        return null;
      }
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        notification_type: notificationType,
        related_entity_id: relatedEntityId,
        related_entity_type: relatedEntityType,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

// Create notifications for multiple users
export async function createBulkNotifications(
  userIds: string[],
  params: Omit<CreateNotificationParams, 'userId'>
) {
  try {
    // Get all users' notification settings
    const { data: settings } = await supabase
      .from('user_notification_settings')
      .select('user_id, *')
      .in('user_id', userIds);

    const settingsMap = new Map(settings?.map(s => [s.user_id, s]) || []);

    const notificationTypeMap: Record<NotificationType, keyof NotificationSettings> = {
      attendance_marked: 'attendance_notifications',
      attendance_reminder: 'attendance_notifications',
      low_attendance_alert: 'attendance_notifications',
      quiz_created: 'quiz_notifications',
      quiz_due: 'quiz_notifications',
      quiz_graded: 'quiz_notifications',
      assignment_created: 'assignment_notifications',
      assignment_due: 'assignment_notifications',
      assignment_graded: 'assignment_notifications',
      lesson_added: 'assignment_notifications',
      fee_due: 'fee_notifications',
      fee_paid: 'fee_notifications',
      grade_published: 'grade_notifications',
      announcement: 'announcement_notifications',
      system_alert: 'announcement_notifications',
      course_registration: 'announcement_notifications',
      profile_update: 'announcement_notifications',
    };

    const notifications = userIds
      .filter(userId => {
        const userSettings = settingsMap.get(userId);
        if (!userSettings) return true; // If no settings, default to true
        const settingKey = notificationTypeMap[params.notificationType];
        return userSettings[settingKey];
      })
      .map(userId => ({
        user_id: userId,
        title: params.title,
        message: params.message,
        notification_type: params.notificationType,
        related_entity_id: params.relatedEntityId,
        related_entity_type: params.relatedEntityType,
        is_read: false,
        created_at: new Date().toISOString(),
      }));

    if (notifications.length === 0) return [];

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    return [];
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(userId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
}

// Get user notifications with pagination
export async function getUserNotifications(
  userId: string,
  page: number = 1,
  limit: number = 20,
  unreadOnly: boolean = false
) {
  try {
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return { data, count, page, limit };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { data: [], count: 0, page, limit };
  }
}

// Get unread count
export async function getUnreadCount(userId: string) {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

// Initialize notification settings for a new user
export async function initializeNotificationSettings(userId: string) {
  try {
    const { error } = await supabase
      .from('user_notification_settings')
      .insert({
        user_id: userId,
        assignment_notifications: true,
        quiz_notifications: true,
        attendance_notifications: true,
        fee_notifications: true,
        grade_notifications: true,
        announcement_notifications: true,
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error initializing notification settings:', error);
    return false;
  }
}

// Update notification settings
export async function updateNotificationSettings(
  userId: string,
  settings: Partial<NotificationSettings>
) {
  try {
    const { error } = await supabase
      .from('user_notification_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return false;
  }
}

// Get notification settings
export async function getNotificationSettings(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no settings found, create default settings
      if (error.code === 'PGRST116') {
        await initializeNotificationSettings(userId);
        return {
          assignment_notifications: true,
          quiz_notifications: true,
          attendance_notifications: true,
          fee_notifications: true,
          grade_notifications: true,
          announcement_notifications: true,
        };
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting notification settings:', error);
    return null;
  }
}

// Delete old notifications (can be run as a cron job)
export async function deleteOldNotifications(daysOld: number = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { error } = await supabase
      .from('notifications')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .eq('is_read', true); // Only delete read notifications

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting old notifications:', error);
    return false;
  }
}

// Notification helper functions for specific events

// Notify students about new attendance marked
export async function notifyAttendanceMarked(
  courseId: string,
  courseName: string,
  date: Date,
  studentIds: string[]
) {
  return createBulkNotifications(studentIds, {
    title: 'Attendance Marked',
    message: `Your attendance for ${courseName} on ${format(date, 'PPP')} has been marked.`,
    notificationType: 'attendance_marked',
    relatedEntityId: courseId,
    relatedEntityType: 'course',
  });
}

// Notify about low attendance
export async function notifyLowAttendance(
  studentId: string,
  courseName: string,
  percentage: number
) {
  return createNotification({
    userId: studentId,
    title: 'Low Attendance Alert',
    message: `Your attendance in ${courseName} is ${percentage.toFixed(1)}%. Please ensure regular attendance.`,
    notificationType: 'low_attendance_alert',
    relatedEntityType: 'attendance',
  });
}

// Notify about new quiz
export async function notifyNewQuiz(
  courseId: string,
  courseName: string,
  quizTitle: string,
  dueDate: Date,
  studentIds: string[]
) {
  return createBulkNotifications(studentIds, {
    title: 'New Quiz Available',
    message: `A new quiz "${quizTitle}" is available for ${courseName}. Due: ${format(dueDate, 'PPP')}`,
    notificationType: 'quiz_created',
    relatedEntityId: courseId,
    relatedEntityType: 'quiz',
  });
}

// Notify about quiz graded
export async function notifyQuizGraded(
  studentId: string,
  quizTitle: string,
  courseName: string,
  score: number,
  totalScore: number
) {
  return createNotification({
    userId: studentId,
    title: 'Quiz Graded',
    message: `Your quiz "${quizTitle}" in ${courseName} has been graded. Score: ${score}/${totalScore}`,
    notificationType: 'quiz_graded',
    relatedEntityType: 'quiz',
  });
}

// Notify about new lesson
export async function notifyNewLesson(
  courseId: string,
  courseName: string,
  lessonTitle: string,
  studentIds: string[]
) {
  return createBulkNotifications(studentIds, {
    title: 'New Lesson Available',
    message: `New lesson "${lessonTitle}" has been added to ${courseName}.`,
    notificationType: 'lesson_added',
    relatedEntityId: courseId,
    relatedEntityType: 'lesson',
  });
}

// Notify about fee due
export async function notifyFeeDue(
  studentId: string,
  amount: number,
  dueDate: Date
) {
  return createNotification({
    userId: studentId,
    title: 'Fee Payment Due',
    message: `Your fee payment of ₹${amount} is due on ${format(dueDate, 'PPP')}.`,
    notificationType: 'fee_due',
    relatedEntityType: 'fee',
  });
}

// Notify admin about new student registration
export async function notifyAdminNewStudent(
  adminIds: string[],
  studentName: string,
  departmentName: string
) {
  return createBulkNotifications(adminIds, {
    title: 'New Student Registered',
    message: `${studentName} has registered in ${departmentName} department.`,
    notificationType: 'course_registration',
    relatedEntityType: 'announcement',
  });
}

// Notify about grade published
export async function notifyGradePublished(
  studentId: string,
  courseName: string,
  grade: string
) {
  return createNotification({
    userId: studentId,
    title: 'Grade Published',
    message: `Your grade for ${courseName} has been published: ${grade}`,
    notificationType: 'grade_published',
    relatedEntityType: 'grade',
  });
}