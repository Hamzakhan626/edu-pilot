/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  TrendingUp,
  Calendar,
  BookOpen,
  Award,
  AlertCircle,
  Eye
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// ─── Types ──────────────────────────────────────────────
interface Child {
  id: string;
  full_name: string;
  enrollment_number: string;
  semester: number;
  department_id: string;
  department_name: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  teacher_name: string;
  marks?: number;
  total_marks?: number;
  grade?: string;
  attendance_percentage: number;
}

interface Exam {
  id: string;
  title: string;
  subject_name: string;
  exam_date: string;
  marks_obtained?: number;
  total_marks: number;
  percentage?: number;
  grade?: string;
}

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  created_at: string;
  related_entity_type: string;
  related_entity_id: string;
}

// ─── Helpers for query types ────────────────────────────
type ParentLink = {
  student_id: string;
  users: {
    id: string;
    full_name: string;
    enrollment_number: string;
    semester: number;
    department_id: string;
    departments: { name: string } | null;
  } | null;
};

type EnrollmentRow = {
  course_id: string;
  courses: {
    id: string;
    name: string;
    code: string;
    teacher_id: string;
    users: { full_name: string } | null;
  } | null;
};

type ExamResultRow = {
  id: string;
  exam_id: string;
  marks_obtained: number;
  exams: {
    title: string;
    exam_date: string;
    total_marks: number;
    course_id: string;
    courses: { name: string } | null;
  } | null;
};

type AttendanceRow = { status: string };

type GradeRow = {
  marks: number;
  total_marks: number;
  grade: string;
};

type NotificationRow = {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  created_at: string;
  related_entity_type: string;
  related_entity_id: string;
};

// ─── Client ─────────────────────────────────────────────
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ChildProgressPage() {
  const { toast } = useToast();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    total: 0,
    percentage: 0
  });
  const [performanceStats, setPerformanceStats] = useState({
    average: 0,
    totalSubjects: 0,
    highest: 0,
    lowest: 0
  });

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      fetchChildData(selectedChild);
    }
  }, [selectedChild]);

  const fetchChildren = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get parent's children via parent_student junction
      const { data: parentLinks, error } = await supabase
        .from('parent_student')
        .select(`
          student_id,
          users (
            id,
            full_name,
            enrollment_number,
            semester,
            department_id,
            departments ( name )
          )
        `)
        .eq('parent_id', user.id)
        .returns<ParentLink[]>();

      if (error) throw error;

      const childrenList: Child[] = (parentLinks ?? [])
        .filter(link => link.users !== null)
        .map(link => ({
          id: link.users!.id,
          full_name: link.users!.full_name,
          enrollment_number: link.users!.enrollment_number,
          semester: link.users!.semester,
          department_id: link.users!.department_id,
          department_name: link.users!.departments?.name || 'N/A'
        }));

      setChildren(childrenList);
      if (childrenList.length > 0 && !selectedChild) {
        setSelectedChild(childrenList[0].id);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
      toast({
        title: 'Error',
        description: 'Failed to load children data',
        variant: 'destructive',
      });
    }
  };

  const fetchChildData = async (childId: string) => {
    try {
      setLoading(true);
      await Promise.all([
        fetchEnrolledCourses(childId),
        fetchExamResults(childId),
        fetchAttendanceStats(childId),
        fetchRecentActivities(childId)
      ]);
    } catch (error) {
      console.error('Error fetching child data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load child progress data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrolledCourses = async (studentId: string) => {
    try {
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(`
          course_id,
          courses (
            id,
            name,
            code,
            teacher_id,
            users ( full_name )
          )
        `)
        .eq('student_id', studentId)
        .returns<EnrollmentRow[]>();

      if (error) throw error;

      const subjectsList: Subject[] = [];

      if (enrollments) {
        for (const enrollment of enrollments) {
          const course = enrollment.courses;
          if (!course) continue;

          // Attendance for this course
          const { data: attendance } = await supabase
            .from('attendance')
            .select('status')
            .eq('student_id', studentId)
            .eq('course_id', course.id)
            .returns<AttendanceRow[]>();

          const total = attendance?.length ?? 0;
          const present = attendance?.filter(a => a.status === 'present' || a.status === 'late').length ?? 0;
          const percentage = total > 0 ? (present / total) * 100 : 0;

          // Latest grade for this course
          const { data: grade } = await supabase
            .from('grades')
            .select('marks, total_marks, grade')
            .eq('student_id', studentId)
            .eq('course_id', course.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle<GradeRow>();

          subjectsList.push({
            id: course.id,
            name: course.name,
            code: course.code,
            teacher_name: course.users?.full_name || 'Unknown',
            marks: grade?.marks,
            total_marks: grade?.total_marks,
            grade: grade?.grade,
            attendance_percentage: percentage
          });
        }
      }

      setSubjects(subjectsList);

      // Calculate performance stats
      const gradedSubjects = subjectsList.filter(s => s.marks != null && s.total_marks != null);
      if (gradedSubjects.length > 0) {
        const percentages = gradedSubjects.map(g => (g.marks! / g.total_marks!) * 100);
        setPerformanceStats({
          average: percentages.reduce((a, b) => a + b, 0) / percentages.length,
          totalSubjects: subjectsList.length,
          highest: Math.max(...percentages),
          lowest: Math.min(...percentages)
        });
      } else {
        setPerformanceStats({
          average: 0,
          totalSubjects: subjectsList.length,
          highest: 0,
          lowest: 0
        });
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }
  };

  const fetchExamResults = async (studentId: string) => {
    try {
      const { data: results, error } = await supabase
        .from('exam_results')
        .select(`
          id,
          exam_id,
          marks_obtained,
          exams (
            title,
            exam_date,
            total_marks,
            course_id,
            courses ( name )
          )
        `)
        .eq('student_id', studentId)
        .order('exams(exam_date)', { ascending: false })
        .returns<ExamResultRow[]>();

      if (error) throw error;

      const examsList: Exam[] = (results ?? [])
        .filter(r => r.exams !== null)
        .map(result => {
          const percentage = (result.marks_obtained / result.exams!.total_marks) * 100;
          let grade = 'F';
          if (percentage >= 90) grade = 'A+';
          else if (percentage >= 80) grade = 'A';
          else if (percentage >= 70) grade = 'B+';
          else if (percentage >= 60) grade = 'B';
          else if (percentage >= 50) grade = 'C';
          else if (percentage >= 40) grade = 'D';

          return {
            id: result.id,
            title: result.exams!.title,
            subject_name: result.exams!.courses?.name || 'N/A',
            exam_date: result.exams!.exam_date,
            marks_obtained: result.marks_obtained,
            total_marks: result.exams!.total_marks,
            percentage,
            grade
          };
        });

      setExams(examsList);
    } catch (error) {
      console.error('Error fetching exam results:', error);
      throw error;
    }
  };

  const fetchAttendanceStats = async (studentId: string) => {
    try {
      const { data: attendance, error } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', studentId)
        .returns<AttendanceRow[]>();

      if (error) throw error;

      const total = attendance?.length ?? 0;
      const present = attendance?.filter(a => a.status === 'present' || a.status === 'late').length ?? 0;
      const percentage = total > 0 ? (present / total) * 100 : 0;

      setAttendanceStats({ present, total, percentage });
    } catch (error) {
      console.error('Error fetching attendance:', error);
      throw error;
    }
  };

  const fetchRecentActivities = async (studentId: string) => {
    try {
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', studentId)
        .order('created_at', { ascending: false })
        .limit(10)
        .returns<NotificationRow[]>();

      if (error) throw error;

      const activitiesList: Activity[] = (notifications ?? []).map(n => ({
        id: n.id,
        type: n.notification_type,
        title: n.title,
        description: n.message,
        created_at: n.created_at,
        related_entity_type: n.related_entity_type,
        related_entity_id: n.related_entity_id
      }));

      setActivities(activitiesList);
    } catch (error) {
      console.error('Error fetching activities:', error);
      throw error;
    }
  };

  const getActivityIcon = (type: string) => {
    if (type.includes('attendance')) return <Calendar className="h-4 w-4" />;
    if (type.includes('grade') || type.includes('quiz')) return <GraduationCap className="h-4 w-4" />;
    if (type.includes('fee')) return <Award className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const getActivityColor = (type: string) => {
    if (type.includes('attendance')) return 'bg-blue-100 text-blue-600 border-blue-200';
    if (type.includes('grade') || type.includes('quiz')) return 'bg-green-100 text-green-600 border-green-200';
    if (type.includes('fee')) return 'bg-yellow-100 text-yellow-600 border-yellow-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  const selectedChildData = children.find(c => c.id === selectedChild);

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-32 w-full mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl bg-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Child&apos;s Progress</h1>
          <p className="text-gray-600 mt-1">
            Monitor academic performance and activities
          </p>
        </div>
        {children.length > 0 && (
          <Select value={selectedChild} onValueChange={setSelectedChild}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Select child" />
            </SelectTrigger>
            <SelectContent>
              {children.map(child => (
                <SelectItem key={child.id} value={child.id}>
                  {child.full_name} (Grade {child.semester})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedChildData && (
        <>
          {/* Child Overview */}
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-white border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-xl">
                    {selectedChildData.full_name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedChildData.full_name}</h2>
                  <p className="text-gray-600">
                    {selectedChildData.department_name} • Semester {selectedChildData.semester} • Roll No: {selectedChildData.enrollment_number}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="bg-white border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600">Attendance</p>
                    <p className="text-2xl font-bold text-green-900">
                      {attendanceStats.percentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {attendanceStats.present} out of {attendanceStats.total} days
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-green-500" />
                </div>
                <Progress 
                  value={attendanceStats.percentage} 
                  className="h-2 mt-2"
                />
              </CardContent>
            </Card>

            <Card className="bg-white border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600">Average Performance</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {performanceStats.average.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      Highest: {performanceStats.highest.toFixed(1)}% • Lowest: {performanceStats.lowest.toFixed(1)}%
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
                <Progress 
                  value={performanceStats.average} 
                  className="h-2 mt-2"
                />
              </CardContent>
            </Card>
          </div>

          {/* Subject Performance */}
          <Card className="mb-6 border border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-lg">Subject Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {subjects.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No subjects found</p>
              ) : (
                <div className="space-y-4">
                  {subjects.map((subject) => (
                    <div key={subject.id} className="flex items-center gap-4">
                      <div className="w-1/4">
                        <p className="font-medium text-gray-900">{subject.name}</p>
                        <p className="text-xs text-gray-500">{subject.teacher_name}</p>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            {subject.marks != null ? (
                              <>
                                <div className="flex justify-between text-sm mb-1">
                                  <span>Marks</span>
                                  <span className="font-medium">{subject.marks}/{subject.total_marks}</span>
                                </div>
                                <Progress value={(subject.marks! / subject.total_marks!) * 100} className="h-2" />
                              </>
                            ) : (
                              <p className="text-sm text-gray-500">No grades available</p>
                            )}
                          </div>
                          {subject.grade && (
                            <div className="w-20 text-center">
                              <Badge className={
                                subject.grade.startsWith('A') ? 'bg-green-100 text-green-800' :
                                subject.grade.startsWith('B') ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }>
                                {subject.grade}
                              </Badge>
                            </div>
                          )}
                          <div className="w-20 text-center">
                            <Badge variant="outline" className={
                              subject.attendance_percentage >= 90 ? 'bg-green-50 text-green-700' :
                              subject.attendance_percentage >= 75 ? 'bg-blue-50 text-blue-700' :
                              'bg-yellow-50 text-yellow-700'
                            }>
                              {subject.attendance_percentage.toFixed(0)}% Att
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Exams */}
          <Card className="mb-6 border border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-lg">Recent Exams</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {exams.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No exam results found</p>
              ) : (
                <div className="space-y-4">
                  {exams.slice(0, 5).map((exam) => (
                    <div key={exam.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{exam.title}</p>
                        <p className="text-sm text-gray-600">{exam.subject_name} • {format(new Date(exam.exam_date), 'MMM d, yyyy')}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          (exam.percentage ?? 0) >= 75 ? 'text-green-600' :
                          (exam.percentage ?? 0) >= 60 ? 'text-blue-600' :
                          (exam.percentage ?? 0) >= 40 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {exam.percentage?.toFixed(1)}%
                        </p>
                        <p className="text-sm text-gray-600">
                          {exam.marks_obtained}/{exam.total_marks} • {exam.grade}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-lg">Recent Activities</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {activities.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No recent activities</p>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{activity.title}</p>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(activity.created_at), 'MMM d, yyyy • h:mm a')}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {children.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center">
            <GraduationCap className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Children Found</h3>
            <p className="text-gray-600">No student records are linked to your account.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
