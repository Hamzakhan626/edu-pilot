/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Flame,
  Clock,
  BookOpen,
  Target,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/auth';

// ---------- Types ----------
interface UpcomingTask {
  id: string;
  title: string;
  subject: string;
  due_date: string;
}

interface FeeRecord {
  amount: number;
  status: string;
}

// ---------- Helper ----------
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400)
    return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) > 1 ? 's' : ''} ago`;
  if (diff < 604800)
    return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
};

export function StudentDashboard() {
  const router = useRouter();
  // const supabase = createClientComponentClient();

  const [userName, setUserName] = useState('Student');
  const [loading, setLoading] = useState(true);

  // Quick stats
  const [streak, setStreak] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [pendingFeeAmount, setPendingFeeAmount] = useState(0);

  // Upcoming tasks (from assignment_submissions)
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);

  // Recent submitted assignments (as recent activity)
  const [recentSubmissions, setRecentSubmissions] = useState<
    { id: string; title: string; subject: string; submitted_at: string }[]
  >([]);

  // ---------- Fetch all data ----------
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Get current authenticated user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserName(
        user.user_metadata?.full_name ||
          user.email?.split('@')[0] ||
          'Student'
      );

      // 2. Fetch streak from profiles (if exists)
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_streak')
        .eq('id', user.id)
        .single();
      setStreak(profile?.current_streak || 0);

      // 3. Fetch attendance (table may not exist → default to 0)
      try {
        const { data: attendanceRows } = await supabase
          .from('attendance')
          .select('status')
          .eq('student_id', user.id);
        if (attendanceRows && attendanceRows.length > 0) {
          const present = attendanceRows.filter(
            (a) => a.status === 'present'
          ).length;
          setAttendanceRate((present / attendanceRows.length) * 100);
        } else {
          setAttendanceRate(0);
        }
      } catch {
        setAttendanceRate(0);
      }

      // 4. Fetch upcoming tasks via assignment_submissions (status = 'pending')
      //    Join assignments to get title, due_date, and course name (through class_id → courses)
      const { data: submissions, error: subError } = await supabase
        .from('assignment_submissions')
        .select(
          `id, status,
          assignment:assignments!inner(
            id, title, due_date,
            course:class_id( name )
          )`
        )
        .eq('student_id', user.id)
        .eq('status', 'pending')
        .order('due_date', { foreignTable: 'assignments', ascending: true })
        .limit(3);

      if (!subError && submissions) {
        const tasks: UpcomingTask[] = submissions
          .filter((s: any) => s.assignment)
          .map((s: any) => ({
            id: s.id,
            title: s.assignment.title,
            subject: s.assignment.course?.name || 'Unknown',
            due_date: s.assignment.due_date,
          }));
        setUpcomingTasks(tasks);
        setPendingTasksCount(tasks.length);
      } else {
        setUpcomingTasks([]);
        setPendingTasksCount(0);
        console.error('Assignments fetch error:', subError);
      }

      // 5. Fetch fees – sum amounts where status != 'paid'
      const { data: fees, error: feeError } = await supabase
        .from('fees')
        .select('amount, status')
        .eq('student_id', user.id)
        .neq('status', 'paid');
      if (!feeError && fees) {
        const totalPending = (fees as FeeRecord[]).reduce(
          (sum, f) => sum + Number(f.amount),
          0
        );
        setPendingFeeAmount(totalPending);
      } else if (feeError) {
        console.error('Fees fetch error:', feeError);
      }

      // 6. Fetch recent submitted assignments (as recent activity)
      const { data: recentSubs } = await supabase
        .from('assignment_submissions')
        .select(
          `id, submitted_at,
          assignment:assignments!inner(
            title,
            course:class_id( name )
          )`
        )
        .eq('student_id', user.id)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(3);
      if (recentSubs) {
        const formatted = recentSubs
          .filter((s: any) => s.assignment)
          .map((s: any) => ({
            id: s.id,
            title: s.assignment.title,
            subject: s.assignment.course?.name || 'Unknown',
            submitted_at: s.submitted_at,
          }));
        setRecentSubmissions(formatted);
      } else {
        setRecentSubmissions([]);
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      toast.error('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ---------- Render ----------
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {userName}! 🎓
        </h1>
        <p className="text-blue-100">
          Here's a quick overview of your progress.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-orange-100 rounded-xl mr-4">
              <Flame className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              ) : (
                <>
                  <p className="text-2xl font-bold">{streak}</p>
                  <p className="text-sm text-gray-500">Day Streak</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-green-100 rounded-xl mr-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              ) : (
                <>
                  <p className="text-2xl font-bold">
                    {attendanceRate.toFixed(0)}%
                  </p>
                  <p className="text-sm text-gray-500">Attendance</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-blue-100 rounded-xl mr-4">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              ) : (
                <>
                  <p className="text-2xl font-bold">{pendingTasksCount}</p>
                  <p className="text-sm text-gray-500">Pending Tasks</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-purple-100 rounded-xl mr-4">
              <CreditCard className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              ) : (
                <>
                  <p className="text-2xl font-bold">
                    Rs{pendingFeeAmount.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Fees Due</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Tasks */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Upcoming Tasks
            </CardTitle>
            <CardDescription>
              Don't miss these important deadlines
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : upcomingTasks.length > 0 ? (
              <div className="space-y-4">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-gray-500">{task.subject}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {new Date(task.due_date).toLocaleDateString()}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>No pending tasks! 🎉</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity – shows last submitted assignments */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="mr-2 h-5 w-5" />
              Recent Submissions
            </CardTitle>
            <CardDescription>
              Your latest submitted assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : recentSubmissions.length > 0 ? (
              <div className="space-y-4">
                {recentSubmissions.map((sub) => (
                  <div key={sub.id} className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{sub.title}</p>
                      <p className="text-sm text-gray-500">
                        {sub.subject} • {formatTimeAgo(sub.submitted_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>No submissions yet. Complete an assignment to see it here!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Optional: Quick link to view all assignments */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="mr-2 h-5 w-5" />
            Continue Learning
          </CardTitle>
          <CardDescription>
            Jump back into your courses and assignments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={() => router.push('/student/assignments')}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            View All Assignments
          </Button>
          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={() => router.push('/student/programs')}
          >
            <Target className="mr-2 h-4 w-4" />
            My Courses
          </Button>
          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={fetchDashboardData}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Refresh Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}