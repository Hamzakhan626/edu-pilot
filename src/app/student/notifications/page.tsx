'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Settings, 
  CheckCheck, 
  Calendar, 
  BookOpen, 
  CreditCard,
  GraduationCap,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

interface StudentStats {
  totalCourses: number;
  attendancePercentage: number;
  pendingFees: number;
  upcomingQuizzes: number;
  newGrades: number;
  unreadAnnouncements: number;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StudentNotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [userId, setUserId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [studentStats, setStudentStats] = useState<StudentStats>({
    totalCourses: 0,
    attendancePercentage: 0,
    pendingFees: 0,
    upcomingQuizzes: 0,
    newGrades: 0,
    unreadAnnouncements: 0
  });

  // Navigation items for student notification pages
  const notificationPages = [
    {
      title: 'Course Updates',
      description: 'View updates from your enrolled courses',
      href: '/student/notifications/course-updates',
      icon: BookOpen,
      color: 'bg-blue-100 text-blue-600',
      count: studentStats.upcomingQuizzes
    },
    {
      title: 'Attendance',
      description: 'Track your attendance records',
      href: '/student/notifications/attendance',
      icon: Calendar,
      color: 'bg-green-100 text-green-600',
      count: null
    },
    {
      title: 'Grades',
      description: 'View your exam results and grades',
      href: '/student/notifications/grades',
      icon: GraduationCap,
      color: 'bg-purple-100 text-purple-600',
      count: studentStats.newGrades
    },
    {
      title: 'Fees',
      description: 'Manage fee payments and dues',
      href: '/student/notifications/fees',
      icon: CreditCard,
      color: 'bg-yellow-100 text-yellow-600',
      count: studentStats.pendingFees
    },
    {
      title: 'Settings',
      description: 'Configure notification preferences',
      href: '/student/notifications/settings',
      icon: Settings,
      color: 'bg-gray-100 text-gray-600',
      count: null
    }
  ];

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchStudentStats(user.id);
      }
    };
    getUser();
  }, []);

  const fetchStudentStats = async (studentId: string) => {
    try {
      // Get enrolled courses count
      const { count: coursesCount } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId);

      // Get pending fees
      const { count: feesCount } = await supabase
        .from('fees')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('status', 'pending');

      // Get new grades (simplified - you'd have a last_viewed timestamp)
      const { count: gradesCount } = await supabase
        .from('exam_results')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .gt('created_at', new Date(Date.now() - 7*24*60*60*1000).toISOString());

      setStudentStats(prev => ({
        ...prev,
        totalCourses: coursesCount || 0,
        pendingFees: feesCount || 0,
        newGrades: gradesCount || 0
      }));
    } catch (error) {
      console.error('Error fetching student stats:', error);
    }
  };

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

        const { data, error } = await query.limit(20);

        if (error) throw error;
        setNotifications(data || []);
        
        // Calculate stats from notifications
        const upcomingQuizzes = data?.filter(n => 
          n.notification_type === 'quiz_due' && !n.is_read
        ).length || 0;
        
        const pendingFees = data?.filter(n => 
          n.notification_type === 'fee_due' && !n.is_read
        ).length || 0;

        const unreadAnnouncements = data?.filter(n => 
          n.notification_type === 'announcement' && !n.is_read
        ).length || 0;

        setStudentStats(prev => ({
          ...prev,
          upcomingQuizzes,
          pendingFees,
          unreadAnnouncements
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
      .channel('student-notifications')
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
          setNotifications(prev => [newNotification, ...prev].slice(0, 20));
          
          if (newNotification.notification_type === 'quiz_due') {
            setStudentStats(prev => ({ ...prev, upcomingQuizzes: prev.upcomingQuizzes + 1 }));
          } else if (newNotification.notification_type === 'fee_due') {
            setStudentStats(prev => ({ ...prev, pendingFees: prev.pendingFees + 1 }));
          } else if (newNotification.notification_type === 'announcement') {
            setStudentStats(prev => ({ ...prev, unreadAnnouncements: prev.unreadAnnouncements + 1 }));
          }
          
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
      
      const notification = notifications.find(n => n.id === id);
      if (notification?.notification_type === 'quiz_due') {
        setStudentStats(prev => ({ ...prev, upcomingQuizzes: Math.max(0, prev.upcomingQuizzes - 1) }));
      } else if (notification?.notification_type === 'fee_due') {
        setStudentStats(prev => ({ ...prev, pendingFees: Math.max(0, prev.pendingFees - 1) }));
      } else if (notification?.notification_type === 'announcement') {
        setStudentStats(prev => ({ ...prev, unreadAnnouncements: Math.max(0, prev.unreadAnnouncements - 1) }));
      }
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
      setStudentStats(prev => ({ 
        ...prev, 
        upcomingQuizzes: 0, 
        pendingFees: 0,
        unreadAnnouncements: 0 
      }));
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
    <div className="container mx-auto py-8 px-4 max-w-7xl bg-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Notifications</h1>
          <p className="text-gray-600 mt-1">
            Stay updated with your courses, assignments, and activities
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/student/notifications/settings">
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Link href="/student/notifications/course-updates" className="block">
          <Card className="bg-white border-blue-200 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Course Updates</p>
                  <p className="text-2xl font-bold text-blue-900">{studentStats.upcomingQuizzes}</p>
                </div>
                <BookOpen className="h-8 w-8 text-blue-500" />
              </div>
              {studentStats.upcomingQuizzes > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  {studentStats.upcomingQuizzes} new updates
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/student/notifications/attendance" className="block">
          <Card className="bg-white border-green-200 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Attendance</p>
                  <p className="text-2xl font-bold text-green-900">
                    {studentStats.attendancePercentage}%
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/student/notifications/grades" className="block">
          <Card className="bg-white border-purple-200 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">New Grades</p>
                  <p className="text-2xl font-bold text-purple-900">{studentStats.newGrades}</p>
                </div>
                <GraduationCap className="h-8 w-8 text-purple-500" />
              </div>
              {studentStats.newGrades > 0 && (
                <p className="text-xs text-purple-600 mt-1">
                  {studentStats.newGrades} new grades
                </p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/student/notifications/fees" className="block">
          <Card className="bg-white border-yellow-200 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">Pending Fees</p>
                  <p className="text-2xl font-bold text-yellow-900">{studentStats.pendingFees}</p>
                </div>
                <CreditCard className="h-8 w-8 text-yellow-500" />
              </div>
              {studentStats.pendingFees > 0 && (
                <p className="text-xs text-yellow-600 mt-1">
                  {studentStats.pendingFees} pending payments
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Navigation Cards */}
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Access</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {notificationPages.map((page) => (
          <Link key={page.href} href={page.href}>
            <Card className="border border-gray-200 hover:shadow-lg transition-all cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${page.color}`}>
                    <page.icon className="h-6 w-6" />
                  </div>
                  {page.count !== null && page.count > 0 && (
                    <Badge className="bg-red-500 text-white">
                      {page.count}
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 mt-4 group-hover:text-blue-600 transition-colors">
                  {page.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {page.description}
                </p>
                <div className="flex items-center text-sm text-blue-600 mt-4">
                  <span>View</span>
                  <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Urgent Alerts */}
      {(studentStats.pendingFees > 0 || studentStats.upcomingQuizzes > 0) && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div className="flex-1">
                <p className="font-medium text-orange-800">Action Required</p>
                <p className="text-sm text-orange-600">
                  {studentStats.pendingFees > 0 && `${studentStats.pendingFees} pending fees • `}
                  {studentStats.upcomingQuizzes > 0 && `${studentStats.upcomingQuizzes} upcoming quizzes`}
                </p>
              </div>
              <Link href="/student/notifications/fees">
                <Button variant="outline" size="sm" className="bg-white">
                  View
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6 border border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <NotificationFilters
            filter={filter}
            onFilterChange={setFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            totalCount={notifications.length}
            userRole="student"
          />
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Recent Notifications</CardTitle>
            <Link href="/student/notifications/course-updates" className="text-sm text-blue-600 hover:underline">
              View all course updates →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <NotificationList
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
              userRole="student"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}