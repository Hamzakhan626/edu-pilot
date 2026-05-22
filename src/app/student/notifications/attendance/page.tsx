/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Download
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface CourseAttendance {
  course_id: string;
  course_name: string;
  course_code: string;
  total_classes: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
}

interface DailyAttendance {
  id: string;
  date: string;
  course_name: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  marked_by?: string;
  notes?: string;
}

interface EnrollmentWithCourse {
  course_id: string;
  courses: {
    id: string;
    name: string;
    code: string;
  };
}

interface AttendanceRecord {
  id: string;
  course_id: string;
  student_id: string;
  attendance_date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  marked_by?: string;
  notes?: string;
  courses: {
    name: string;
    code: string;
  };
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StudentAttendancePage() {
  const { toast } = useToast();
  const [courseAttendance, setCourseAttendance] = useState<CourseAttendance[]>([]);
  const [dailyAttendance, setDailyAttendance] = useState<DailyAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [overallPercentage, setOverallPercentage] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get student's enrollments
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          course_id,
          courses (
            id,
            name,
            code
          )
        `)
        .eq('student_id', user.id);

      if (enrollmentsError) throw enrollmentsError;

      // Get attendance records
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          *,
          courses (
            name,
            code
          )
        `)
        .eq('student_id', user.id)
        .order('attendance_date', { ascending: false });

      if (attendanceError) throw attendanceError;

      // Calculate per-course attendance
      const courseStats = new Map<string, CourseAttendance>();

      (enrollments as unknown as EnrollmentWithCourse[])?.forEach(enrollment => {
        const courseId = enrollment.course_id;
        courseStats.set(courseId, {
          course_id: courseId,
          course_name: enrollment.courses.name,
          course_code: enrollment.courses.code,
          total_classes: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          percentage: 0
        });
      });

      let totalPresent = 0;
      let totalClasses = 0;

      (attendance as AttendanceRecord[])?.forEach(record => {
        const courseId = record.course_id;
        const stats = courseStats.get(courseId);
        if (stats) {
          stats.total_classes++;
          stats[record.status]++;
          totalClasses++;
          if (record.status === 'present' || record.status === 'late') {
            totalPresent++;
          }
        }
      });

      // Calculate percentages
      courseStats.forEach(stats => {
        stats.percentage = stats.total_classes > 0 
          ? ((stats.present + stats.late) / stats.total_classes) * 100 
          : 0;
      });

      setCourseAttendance(Array.from(courseStats.values()));
      setOverallPercentage(totalClasses > 0 ? (totalPresent / totalClasses) * 100 : 0);

      // Format daily attendance
      const daily = (attendance as AttendanceRecord[])?.map(record => ({
        id: record.id,
        date: record.attendance_date,
        course_name: record.courses.name,
        status: record.status,
        marked_by: record.marked_by,
        notes: record.notes
      })) || [];

      setDailyAttendance(daily);

    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast({
        title: 'Error',
        description: 'Failed to load attendance data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Present</Badge>;
      case 'absent':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Absent</Badge>;
      case 'late':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Late</Badge>;
      case 'excused':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Excused</Badge>;
      default:
        return null;
    }
  };

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 75) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const filteredDaily = dailyAttendance.filter(record => {
    const date = new Date(record.date);
    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
  });

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <Skeleton className="h-8 w-64 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl bg-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Attendance</h1>
          <p className="text-gray-600 mt-1">
            Track your attendance across all courses
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            // Export functionality
          }}
        >
          <Download className="h-4 w-4" />
          Download Report
        </Button>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Overall Attendance</p>
                <p className={`text-2xl font-bold ${getAttendanceColor(overallPercentage)}`}>
                  {overallPercentage.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Present</p>
                <p className="text-2xl font-bold text-green-900">
                  {dailyAttendance.filter(d => d.status === 'present').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">Late</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {dailyAttendance.filter(d => d.status === 'late').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Absent</p>
                <p className="text-2xl font-bold text-red-900">
                  {dailyAttendance.filter(d => d.status === 'absent').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course-wise Attendance */}
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Course-wise Attendance</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {courseAttendance.map((course) => (
          <Card key={course.course_id} className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{course.course_name}</h3>
                  <p className="text-sm text-gray-500">{course.course_code}</p>
                </div>
                <span className={`text-lg font-bold ${getAttendanceColor(course.percentage)}`}>
                  {course.percentage.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={course.percentage} 
                className={`h-2 mb-3 ${getProgressColor(course.percentage)}`}
              />
              <div className="grid grid-cols-4 gap-2 text-center text-sm">
                <div>
                  <p className="text-gray-500">Present</p>
                  <p className="font-semibold text-green-600">{course.present}</p>
                </div>
                <div>
                  <p className="text-gray-500">Late</p>
                  <p className="font-semibold text-yellow-600">{course.late}</p>
                </div>
                <div>
                  <p className="text-gray-500">Absent</p>
                  <p className="font-semibold text-red-600">{course.absent}</p>
                </div>
                <div>
                  <p className="text-gray-500">Excused</p>
                  <p className="font-semibold text-blue-600">{course.excused}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low Attendance Alert */}
      {courseAttendance.some(c => c.percentage < 75) && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">Attendance Alert</p>
                <p className="text-sm text-orange-600">
                  You have {courseAttendance.filter(c => c.percentage < 75).length} courses below 75% attendance.
                  Please ensure regular attendance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Attendance */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Daily Attendance Record</CardTitle>
            <div className="flex gap-2">
              <Select
                value={selectedMonth.toString()}
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {format(new Date(2024, i, 1), 'MMMM')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2023, 2022].map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Marked By</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDaily.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No attendance records found for this month
                  </TableCell>
                </TableRow>
              ) : (
                filteredDaily.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {format(new Date(record.date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="font-medium">{record.course_name}</TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell className="text-gray-600">{record.marked_by || 'System'}</TableCell>
                    <TableCell className="text-gray-500">{record.notes || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}