/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Bell, 
  Settings, 
  CheckCheck, 
  Users, 
  GraduationCap, 
  Calendar,
  CreditCard,
  TrendingUp,
  AlertCircle,
  FileText
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { NotificationList } from '@/components/notifications/NotificationList';
import { NotificationFilters } from '@/components/notifications/NotificationFilters';
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/lib/notifications';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  related_entity_id: string | null;
  related_entity_type: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

interface ParentStats {
  childrenCount: number;
  attendanceAlerts: number;
  feeAlerts: number;
  gradeUpdates: number;
  upcomingEvents: number;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ParentNotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [userId, setUserId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [parentStats, setParentStats] = useState<ParentStats>({
    childrenCount: 2,
    attendanceAlerts: 0,
    feeAlerts: 1,
    gradeUpdates: 3,
    upcomingEvents: 2
  });

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        
        let query = supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (filter === 'unread') {
          query = query.eq('is_read', false);
        } else if (filter === 'read') {
          query = query.eq('is_read', true);
        }

        if (typeFilter !== 'all') {
          query = query.eq('notification_type', typeFilter);
        }

        const { data, error } = await query;

        if (error) throw error;
        setNotifications(data || []);
        
        // Calculate stats
        const attendanceAlerts = data?.filter(n => 
          n.notification_type === 'low_attendance_alert' && !n.is_read
        ).length || 0;
        
        const feeAlerts = data?.filter(n => 
          n.notification_type === 'fee_due' && !n.is_read
        ).length || 0;
        
        const gradeUpdates = data?.filter(n => 
          n.notification_type === 'grade_published' && !n.is_read
        ).length || 0;

        setParentStats(prev => ({
          ...prev,
          attendanceAlerts,
          feeAlerts,
          gradeUpdates
        }));
      } catch (error) {
        console.error('Error fetching notifications:', error);
        toast({
          title: 'Error',
          description: 'Failed to load notifications',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [userId, filter, typeFilter, toast]);

  useEffect(() => {
    if (!userId) return;

    const subscription = supabase
      .channel('parent-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          
          toast({
            title: newNotification.title,
            description: newNotification.message,
            className: "bg-white border-blue-200",
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications(prev =>
            prev.map(n => n.id === updated.id ? updated : n)
          );
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, toast]);

  const handleMarkAsRead = async (id: string) => {
    const success = await markNotificationAsRead(id);
    if (success) {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userId) return;
    
    setMarkingAll(true);
    const success = await markAllNotificationsAsRead(userId);
    if (success) {
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      setParentStats(prev => ({ ...prev, attendanceAlerts: 0, feeAlerts: 0, gradeUpdates: 0 }));
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
        className: "bg-white border-green-200",
      });
    }
    setMarkingAll(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== id));
      
      toast({
        title: 'Success',
        description: 'Notification deleted',
        className: "bg-white border-green-200",
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        variant: 'destructive',
      });
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl bg-white min-h-screen">
      {/* Parent Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Parent Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Stay updated with your children's academic progress
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/parent/notifications/settings">
              <Button variant="outline" className="gap-2 bg-white border-gray-300">
                <Settings className="h-4 w-4" />
                Preferences
              </Button>
            </Link>
            <Button
              onClick={handleMarkAllAsRead}
              disabled={markingAll || unreadCount === 0}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </Button>
          </div>
        </div>

        {/* Children Overview */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">My Children</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-white border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">John Doe</p>
                    <p className="text-sm text-gray-600">Grade 10 • Section A</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Attendance</p>
                    <p className="font-semibold text-green-600">92%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Average</p>
                    <p className="font-semibold text-blue-600">85%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Fees</p>
                    <p className="font-semibold text-green-600">Paid</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Jane Doe</p>
                    <p className="text-sm text-gray-600">Grade 8 • Section B</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Attendance</p>
                    <p className="font-semibold text-yellow-600">88%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Average</p>
                    <p className="font-semibold text-blue-600">90%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Fees</p>
                    <p className="font-semibold text-red-600">Due</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Parent Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <Card className="bg-white border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Children</p>
                  <p className="text-2xl font-bold text-blue-900">{parentStats.childrenCount}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">Attendance Alerts</p>
                  <p className="text-2xl font-bold text-yellow-900">{parentStats.attendanceAlerts}</p>
                </div>
                <Calendar className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Fee Alerts</p>
                  <p className="text-2xl font-bold text-red-900">{parentStats.feeAlerts}</p>
                </div>
                <CreditCard className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Grade Updates</p>
                  <p className="text-2xl font-bold text-green-900">{parentStats.gradeUpdates}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Link href="/parent/attendance">
            <Button variant="outline" size="sm" className="gap-2 bg-white">
              <Calendar className="h-4 w-4" />
              View Attendance
            </Button>
          </Link>
          <Link href="/parent/fees">
            <Button variant="outline" size="sm" className="gap-2 bg-white">
              <CreditCard className="h-4 w-4" />
              Pay Fees
            </Button>
          </Link>
          <Link href="/parent/grades">
            <Button variant="outline" size="sm" className="gap-2 bg-white">
              <GraduationCap className="h-4 w-4" />
              Academic Reports
            </Button>
          </Link>
          <Link href="/parent/events">
            <Button variant="outline" size="sm" className="gap-2 bg-white">
              <FileText className="h-4 w-4" />
              School Events
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6 border border-gray-200 shadow-sm bg-white">
        <CardContent className="p-4">
          <NotificationFilters
            filter={filter}
            onFilterChange={setFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            totalCount={notifications.length}
            userRole="parent"
          />
        </CardContent>
      </Card>

      {/* Urgent Alerts */}
      {(parentStats.attendanceAlerts > 0 || parentStats.feeAlerts > 0) && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">Attention Required</p>
                <p className="text-sm text-orange-600">
                  {parentStats.attendanceAlerts > 0 && `${parentStats.attendanceAlerts} attendance concerns • `}
                  {parentStats.feeAlerts > 0 && `${parentStats.feeAlerts} pending fees`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      <Card className="border border-gray-200 shadow-sm bg-white">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4 bg-gray-200" />
                    <Skeleton className="h-3 w-1/2 bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16">
              <div className="p-4 bg-gray-100 rounded-full inline-block mb-4">
                <Bell className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No notifications
              </h3>
              <p className="text-gray-600">
                Your children are doing well! Check back for updates.
              </p>
            </div>
          ) : (
            <NotificationList
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
              userRole="parent"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}