/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "sonner";
import { format, subDays } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";

// ---------- Types ----------
interface CourseStats {
  id: string;
  name: string;
  code: string;
  total_students: number;
  avg_attendance: number;
  avg_quiz_score: number | null;
  quiz_count: number;
}

interface DailyAttendance {
  date: string;
  present: number;
  total: number;
}

export default function HoDReportsPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [department, setDepartment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [deptStats, setDeptStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalCourses: 0,
    totalPrograms: 0,
  });

  const [coursePerformance, setCoursePerformance] = useState<CourseStats[]>([]);
  const [dailyAttendance, setDailyAttendance] = useState<DailyAttendance[]>([]);
  const [overallAttendance, setOverallAttendance] = useState(0);
  const [overallQuizAvg, setOverallQuizAvg] = useState<number | null>(null);

  // Auth & department
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    if (currentUser.role !== "hod" && currentUser.role !== "admin") {
      router.push("/login");
      return;
    }
    setUser(currentUser);

    supabase
      .from("departments")
      .select("id, name, code")
      .eq("hod_id", currentUser.id)
      .maybeSingle()
      .then(({ data: dept, error }) => {
        if (error || !dept) {
          toast.error("No department assigned");
          router.push("/hod/programs");
          return;
        }
        setDepartment(dept);
        fetchAllReports(dept.id);
      });
  }, []);

  const fetchAllReports = async (deptId: string) => {
    try {
      setLoading(true);

      // 1. Basic counts (programs, courses, teachers)
      const [
        { count: progCount },
        { count: courseCount },
        { count: teacherCount },
      ] = await Promise.all([
        supabase
          .from("programs")
          .select("*", { count: "exact", head: true })
          .eq("department_id", deptId),
        supabase
          .from("courses")
          .select("*", { count: "exact", head: true })
          .eq("department_id", deptId),
        supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("role", "teacher")
          .eq("department_id", deptId),
      ]);

      // 2. Get all courses of this department
      const { data: courses } = await supabase
        .from("courses")
        .select("id, name, code")
        .eq("department_id", deptId);

      const courseIds = (courses || []).map((c) => c.id);

      // 3. Total distinct students in department courses
      const { data: enrollments } = await supabase
        .from("student_courses")
        .select("student_id")
        .in("course_id", courseIds);

      const distinctStudents = new Set(
        (enrollments || []).map((e: any) => e.student_id)
      ).size;

      setDeptStats({
        totalPrograms: progCount || 0,
        totalCourses: courseCount || 0,
        totalTeachers: teacherCount || 0,
        totalStudents: distinctStudents,
      });

      // 4. Course performance (attendance + quiz scores)
      const courseStats: CourseStats[] = [];
      let overallAttSum = 0;
      let overallAttCount = 0;
      let overallQuizSum = 0;
      let overallQuizCount = 0;

      for (const course of courses || []) {
        // student count per course
        const { count: stuCount } = await supabase
          .from("student_courses")
          .select("*", { count: "exact", head: true })
          .eq("course_id", course.id);

        // attendance percentage last 30 days
        const since = format(subDays(new Date(), 30), "yyyy-MM-dd");
        const { data: attRows } = await supabase
          .from("attendance")
          .select("status")
          .eq("course_id", course.id)
          .gte("attendance_date", since);

        let attPresent = 0;
        const attTotal = (attRows || []).length;
        (attRows || []).forEach((a) => {
          if (a.status === "present") attPresent++;
        });
        const attPct = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0;
        if (attTotal > 0) {
          overallAttSum += attPresent;
          overallAttCount += attTotal;
        }

        // quiz scores
        const { data: quizSubs } = await supabase
          .from("quiz_submissions")
          .select("percentage")
          .eq("course_id", course.id)
          .not("percentage", "is", null);

        let quizAvg = null;
        if (quizSubs && quizSubs.length > 0) {
          const sum = quizSubs.reduce((acc: number, s: any) => acc + (s.percentage || 0), 0);
          quizAvg = Math.round((sum / quizSubs.length) * 100) / 100;
          overallQuizSum += sum;
          overallQuizCount += quizSubs.length;
        }

        courseStats.push({
          id: course.id,
          name: course.name,
          code: course.code,
          total_students: stuCount || 0,
          avg_attendance: attPct,
          avg_quiz_score: quizAvg,
          quiz_count: quizSubs?.length || 0,
        });
      }

      setCoursePerformance(courseStats);
      setOverallAttendance(
        overallAttCount > 0 ? Math.round((overallAttSum / overallAttCount) * 100) : 0
      );
      setOverallQuizAvg(
        overallQuizCount > 0 ? Math.round((overallQuizSum / overallQuizCount) * 100) / 100 : null
      );

      // 5. Daily attendance trend last 14 days
      const twoWeeksAgo = format(subDays(new Date(), 14), "yyyy-MM-dd");
      const { data: dailyAtt } = await supabase
        .from("attendance")
        .select("attendance_date, status")
        .in("course_id", courseIds)
        .gte("attendance_date", twoWeeksAgo);

      const dailyMap: Record<string, { present: number; total: number }> = {};
      (dailyAtt || []).forEach((a: any) => {
        const dt = a.attendance_date;
        if (!dailyMap[dt]) dailyMap[dt] = { present: 0, total: 0 };
        dailyMap[dt].total++;
        if (a.status === "present") dailyMap[dt].present++;
      });

      const trend: DailyAttendance[] = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, vals]) => ({
          date,
          present: vals.present,
          total: vals.total,
        }));
      setDailyAttendance(trend);

    } catch (err: any) {
      toast.error("Failed to load reports: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !department) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/hod/dashboard")}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">
              Reports & Analytics
            </h1>
            <p className="text-gray-600">
              {department.name} ({department.code}) - Department overview
            </p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <GraduationCap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Students</p>
                <p className="text-2xl font-bold">{deptStats.totalStudents}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Teachers</p>
                <p className="text-2xl font-bold">{deptStats.totalTeachers}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-emerald-100">
                <CalendarCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Attendance</p>
                <p className="text-2xl font-bold">{overallAttendance}%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-100">
                <BarChart3 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Quiz Score</p>
                <p className="text-2xl font-bold">
                  {overallQuizAvg != null ? `${overallQuizAvg}%` : "N/A"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for deeper views */}
        <Tabs defaultValue="attendance">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="performance">Course Performance</TabsTrigger>
            <TabsTrigger value="trend">Daily Trend</TabsTrigger>
          </TabsList>

          {/* Attendance Tab */}
          <TabsContent value="attendance">
            <Card>
              <CardHeader>
                <CardTitle>Overall Attendance</CardTitle>
                <CardDescription>
                  Average attendance across all department courses (last 30 days)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <Progress value={overallAttendance} className="h-3 flex-1" />
                  <span className="text-sm font-medium">{overallAttendance}%</span>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coursePerformance.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          {c.name} <span className="text-gray-400 text-xs">({c.code})</span>
                        </TableCell>
                        <TableCell>{c.total_students}</TableCell>
                        <TableCell>{c.avg_attendance}%</TableCell>
                        <TableCell>
                          <Progress value={c.avg_attendance} className="h-2 w-24" />
                        </TableCell>
                      </TableRow>
                    ))}
                    {coursePerformance.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-gray-400">
                          No data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Course Performance Tab */}
          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Course Performance</CardTitle>
                <CardDescription>
                  Quiz performance and attendance side by side
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Avg Quiz</TableHead>
                      <TableHead>Quizzes Taken</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coursePerformance.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          {c.name} ({c.code})
                        </TableCell>
                        <TableCell>{c.total_students}</TableCell>
                        <TableCell>{c.avg_attendance}%</TableCell>
                        <TableCell>
                          {c.avg_quiz_score != null ? `${c.avg_quiz_score}%` : "—"}
                        </TableCell>
                        <TableCell>{c.quiz_count}</TableCell>
                      </TableRow>
                    ))}
                    {coursePerformance.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-400">
                          No data
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Daily Trend Tab */}
          <TabsContent value="trend">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Trend (Last 14 Days)</CardTitle>
                <CardDescription>Daily present vs total attendance across all courses</CardDescription>
              </CardHeader>
              <CardContent>
                {dailyAttendance.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No attendance records in the last 14 days.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Present</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyAttendance.map((d) => (
                        <TableRow key={d.date}>
                          <TableCell>{format(new Date(d.date), "dd MMM yyyy")}</TableCell>
                          <TableCell>{d.present}</TableCell>
                          <TableCell>{d.total}</TableCell>
                          <TableCell>
                            {d.total > 0 ? Math.round((d.present / d.total) * 100) : 0}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}