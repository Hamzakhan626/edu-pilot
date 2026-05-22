/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  ArrowLeft,
  CalendarCheck,
  Users,
  BookOpen,
  TrendingUp,
  Loader2,
  Download,
  Search,
} from "lucide-react";

// ---------- Types ----------
interface CourseAttendance {
  id: string;
  name: string;
  code: string;
  total_students: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  attendance_percentage: number;
}

interface StudentAttendance {
  student_id: string;
  full_name: string;
  email: string;
  enrollment_number: string | null;
  total_days: number;
  present_days: number;
  attendance_percentage: number;
}

export default function HoDAttendanceSummaryPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [department, setDepartment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Date range filter (default last 30 days)
  const [startDate, setStartDate] = useState(
    format(subDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Data
  const [courseAttendance, setCourseAttendance] = useState<CourseAttendance[]>(
    []
  );
  const [studentAttendance, setStudentAttendance] = useState<
    StudentAttendance[]
  >([]);
  const [overallAttendance, setOverallAttendance] = useState(0);

  // Search for student tab
  const [searchQuery, setSearchQuery] = useState("");

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
      });
  }, []);

  // Load summary data
  useEffect(() => {
    if (department) {
      fetchSummaryData();
    }
  }, [department, startDate, endDate]);

  const fetchSummaryData = async () => {
    if (!department) return;
    try {
      setLoading(true);

      // 1. All courses in department
      const { data: courses } = await supabase
        .from("courses")
        .select("id, name, code")
        .eq("department_id", department.id);

      const courseIds = (courses || []).map((c) => c.id);

      // 2. Enrollments per course (for total students count)
      const enrollmentCounts: Record<string, number> = {};
      for (const cid of courseIds) {
        const { count } = await supabase
          .from("student_courses")
          .select("*", { count: "exact", head: true })
          .eq("course_id", cid);
        enrollmentCounts[cid] = count || 0;
      }

      // 3. Attendance records in date range
      const { data: attRows, error: attError } = await supabase
        .from("attendance")
        .select("course_id, student_id, status")
        .in("course_id", courseIds)
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate);

      if (attError) {
        toast.error("Failed to load attendance data");
        return;
      }

      // 4. Process per-course statistics
      const courseStats: Record<
        string,
        {
          present: number;
          absent: number;
          late: number;
          excused: number;
          total: number;
        }
      > = {};
      const studentStats: Record<
        string,
        { present: number; total: number }
      > = {};

      (attRows || []).forEach((row: any) => {
        // Course stats
        if (!courseStats[row.course_id]) {
          courseStats[row.course_id] = {
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            total: 0,
          };
        }
        courseStats[row.course_id][row.status as keyof typeof courseStats[string]]++;
        courseStats[row.course_id].total++;

        // Student stats
        if (!studentStats[row.student_id]) {
          studentStats[row.student_id] = { present: 0, total: 0 };
        }
        studentStats[row.student_id].total++;
        if (row.status === "present") {
          studentStats[row.student_id].present++;
        }
      });

      // 5. Format course list
      const courseList: CourseAttendance[] = (courses || []).map((c: any) => {
        const stats = courseStats[c.id] || {
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          total: 0,
        };
        const totalStudents = enrollmentCounts[c.id] || 0;
        const attendancePct =
          stats.total > 0
            ? Math.round((stats.present / stats.total) * 100)
            : 0;

        return {
          id: c.id,
          name: c.name,
          code: c.code,
          total_students: totalStudents,
          present_count: stats.present,
          absent_count: stats.absent,
          late_count: stats.late,
          excused_count: stats.excused,
          attendance_percentage: attendancePct,
        };
      });
      setCourseAttendance(courseList);

      // 6. Format student list
      const studentIds = Object.keys(studentStats);
      if (studentIds.length > 0) {
        const { data: usersData } = await supabase
          .from("users")
          .select("id, full_name, email, enrollment_number")
          .in("id", studentIds);

        const studentList: StudentAttendance[] = studentIds.map((sid) => {
          const user = (usersData || []).find((u: any) => u.id === sid);
          const stats = studentStats[sid];
          const pct =
            stats.total > 0
              ? Math.round((stats.present / stats.total) * 100)
              : 0;
          return {
            student_id: sid,
            full_name: user?.full_name || "Unknown",
            email: user?.email || "",
            enrollment_number: user?.enrollment_number || null,
            total_days: stats.total,
            present_days: stats.present,
            attendance_percentage: pct,
          };
        });
        setStudentAttendance(studentList);
      } else {
        setStudentAttendance([]);
      }

      // 7. Overall attendance percentage
      const totalPresent = Object.values(studentStats).reduce(
        (sum, s) => sum + s.present,
        0
      );
      const totalDays = Object.values(studentStats).reduce(
        (sum, s) => sum + s.total,
        0
      );
      const overall =
        totalDays > 0 ? Math.round((totalPresent / totalDays) * 100) : 0;
      setOverallAttendance(overall);
    } catch (err: any) {
      toast.error("Failed to load summary data");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "Course",
      "Code",
      "Total Students",
      "Present",
      "Absent",
      "Late",
      "Excused",
      "Attendance %",
    ];
    const rows = courseAttendance.map((c) => [
      c.name,
      c.code,
      c.total_students,
      c.present_count,
      c.absent_count,
      c.late_count,
      c.excused_count,
      `${c.attendance_percentage}%`,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
      "\n"
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-summary-${department?.code || "dept"}-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Exported CSV");
  };

  const filteredStudents = studentAttendance.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.enrollment_number || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/hod/attendance")}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Attendance
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">
              Attendance Summary
            </h1>
            <p className="text-gray-600">
              {department.name} ({department.code})
            </p>
          </div>
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={fetchSummaryData}
                variant="secondary"
                className="w-full sm:w-auto"
              >
                Update
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Overall Attendance Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-emerald-100">
                <CalendarCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  Overall Department Attendance
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {overallAttendance}%
                </p>
              </div>
              <Progress value={overallAttendance} className="w-32 h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Courses / Students */}
        <Tabs defaultValue="courses">
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="courses">
              <BookOpen className="h-4 w-4 mr-2" />
              By Course
            </TabsTrigger>
            <TabsTrigger value="students">
              <Users className="h-4 w-4 mr-2" />
              By Student
            </TabsTrigger>
          </TabsList>

          {/* Courses Tab */}
          <TabsContent value="courses">
            <Card>
              <CardHeader>
                <CardTitle>Attendance by Course</CardTitle>
                <CardDescription>
                  Breakdown per course for the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Present</TableHead>
                      <TableHead>Absent</TableHead>
                      <TableHead>Late</TableHead>
                      <TableHead>Excused</TableHead>
                      <TableHead>%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courseAttendance.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          {c.name} <span className="text-gray-400 text-xs">({c.code})</span>
                        </TableCell>
                        <TableCell>{c.total_students}</TableCell>
                        <TableCell>{c.present_count}</TableCell>
                        <TableCell>{c.absent_count}</TableCell>
                        <TableCell>{c.late_count}</TableCell>
                        <TableCell>{c.excused_count}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              c.attendance_percentage >= 75
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {c.attendance_percentage}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {courseAttendance.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-400">
                          No attendance records in this period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle>Attendance by Student</CardTitle>
                <CardDescription>
                  Individual student attendance over the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search student..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Enrollment No.</TableHead>
                      <TableHead>Total Days</TableHead>
                      <TableHead>Present Days</TableHead>
                      <TableHead>%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((s) => (
                      <TableRow key={s.student_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{s.full_name}</p>
                            <p className="text-xs text-gray-500">{s.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{s.enrollment_number || "—"}</TableCell>
                        <TableCell>{s.total_days}</TableCell>
                        <TableCell>{s.present_days}</TableCell>
                        <TableCell>
                          <Progress
                            value={s.attendance_percentage}
                            className="h-2 w-24"
                          />
                          <span className="text-xs ml-2">
                            {s.attendance_percentage}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredStudents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-400">
                          No students found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}