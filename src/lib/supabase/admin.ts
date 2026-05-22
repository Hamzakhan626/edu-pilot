/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './client';

// Types
export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalUsers: number;
}

export interface EnrollmentData {
  month: string;
  students: number;
}

export interface FeeData {
  name: string;
  value: number;
  color: string;
  count: number;
}

export interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  created_at: string;
  user?: {
    full_name: string;
  } | null;
}

interface User {
  role: string;
}

interface Enrollment {
  enrollment_date: string;
}

interface Fee {
  status: string;
  amount: number;
}

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string | null;
  details: Record<string, any> | null;
  created_at: string;
  user: {
    full_name: string;
  } | null;
}

// Re-export supabase client for backward compatibility
export { supabase };

// Get dashboard statistics
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data: users, error } = await supabase
    .from('users')
    .select('role')
    .returns<User[]>();

  if (error) throw error;
  if (!users) throw new Error('No users data returned');

  return {
    totalStudents: users.filter((u) => u.role === 'student').length,
    totalTeachers: users.filter((u) => u.role === 'teacher').length,
    totalParents: users.filter((u) => u.role === 'parent').length,
    totalUsers: users.length
  };
}

// Get enrollment trend data (last 6 months)
export async function getEnrollmentTrend(): Promise<EnrollmentData[]> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data, error } = await supabase
    .from('enrollments')
    .select('enrollment_date')
    .gte('enrollment_date', sixMonthsAgo.toISOString())
    .order('enrollment_date', { ascending: true })
    .returns<Enrollment[]>();

  if (error) throw error;
  if (!data) return [];

  const monthCounts: { [key: string]: number } = {};
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ];

  data.forEach((enrollment) => {
    const date = new Date(enrollment.enrollment_date);
    const monthYear = `${months[date.getMonth()]} ${date.getFullYear()}`;
    monthCounts[monthYear] = (monthCounts[monthYear] || 0) + 1;
  });

  const result: EnrollmentData[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
    result.push({
      month: months[date.getMonth()],
      students: monthCounts[monthKey] || 0
    });
  }

  return result;
}

// Get fee collection status
export async function getFeeCollectionStatus(): Promise<FeeData[]> {
  const { data, error } = await supabase
    .from('fees')
    .select('status, amount')
    .returns<Fee[]>();

  if (error) throw error;
  if (!data) return [];

  const total = data.length;
  const statusCounts: Record<string, number> = {
    paid: 0,
    pending: 0,
    overdue: 0,
    partial: 0
  };

  data.forEach((fee) => {
    if (fee.status in statusCounts) {
      statusCounts[fee.status]++;
    }
  });

  const pending = statusCounts.pending + statusCounts.partial;

  return [
    {
      name: 'Paid',
      value: total > 0 ? Math.round((statusCounts.paid / total) * 100) : 0,
      count: statusCounts.paid,
      color: '#22C55E'
    },
    {
      name: 'Pending',
      value: total > 0 ? Math.round((pending / total) * 100) : 0,
      count: pending,
      color: '#EF4444'
    },
    {
      name: 'Overdue',
      value: total > 0 ? Math.round((statusCounts.overdue / total) * 100) : 0,
      count: statusCounts.overdue,
      color: '#F59E0B'
    }
  ];
}

// Get recent activities
export async function getRecentActivities(
  limit: number = 10
): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select(
      `
      id,
      action,
      entity_type,
      details,
      created_at,
      user:users(full_name)
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<ActivityLog[]>();

  if (error) throw error;
  if (!data) return [];

  return data.map((activity) => ({
    id: activity.id,
    type: activity.entity_type || 'system',
    title: formatActivityTitle(activity.action, activity.entity_type),
    description: formatActivityDescription(
      activity.action,
      activity.entity_type,
      activity.details
    ),
    created_at: activity.created_at,
    user: activity.user
  }));
}

function formatActivityTitle(
  action: string,
  entityType: string | null
): string {
  const actionMap: { [key: string]: string } = {
    create: 'Created',
    update: 'Updated',
    delete: 'Deleted',
    register: 'Registered',
    login: 'Logged in',
    logout: 'Logged out'
  };

  const entityMap: { [key: string]: string } = {
    user: 'User',
    class: 'Class',
    enrollment: 'Enrollment',
    fee: 'Fee',
    system: 'System'
  };

  const actionText = actionMap[action.toLowerCase()] || action;
  const entityText = entityType
    ? entityMap[entityType.toLowerCase()] || entityType
    : '';

  return `${actionText} ${entityText}`.trim();
}

function formatActivityDescription(
  action: string,
  entityType: string | null,
  details: Record<string, any> | null
): string {
  if (details?.description) return details.description;

  const descMap: { [key: string]: string } = {
    user_create: 'A new user has been added to the system',
    user_update: 'User information has been updated',
    user_delete: 'A user has been removed from the system',
    class_create: 'A new class has been created',
    enrollment_create: 'Student enrolled in a class',
    fee_create: 'New fee record added',
    fee_update: 'Fee status updated',
    system_backup: 'System backup completed successfully'
  };

  const key = `${entityType}_${action}`.toLowerCase();
  return descMap[key] || 'Activity recorded';
}

// Create activity log
export async function createActivityLog(
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  details?: Record<string, any>
) {
  const { error } = await supabase.from('activity_log').insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details
  });

  if (error) throw error;
}

// Get cumulative enrollment count
export async function getCumulativeEnrollmentTrend(): Promise<
  EnrollmentData[]
> {
  const { data, error } = await supabase
    .from('enrollments')
    .select('enrollment_date')
    .order('enrollment_date', { ascending: true })
    .returns<Enrollment[]>();

  if (error) throw error;
  if (!data) return [];

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ];
  const result: EnrollmentData[] = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const endOfMonth = new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0
    );

    const count = data.filter(
      (e) => new Date(e.enrollment_date) <= endOfMonth
    ).length;

    result.push({
      month: months[date.getMonth()],
      students: count
    });
  }

  return result;
}

