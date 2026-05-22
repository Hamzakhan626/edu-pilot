/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "sonner";
import { format } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  ArrowLeft,
  BookOpen,
  Users,
  GraduationCap,
  School,
  ClipboardList,
  CalendarCheck,
  UserCheck,
  Briefcase,
  BarChart3,
  Clock,
  Sparkles,
  ChevronRight,
  Loader2,
  ShieldAlert,
} from "lucide-react";

interface DepartmentStats {
  totalPrograms: number;
  totalCourses: number;
  totalStudents: number;
  totalTeachers: number;
  totalStaff: number;
}

interface RecentAttendance {
  course_name: string;
  course_code: string;
  attendance_date: string;
  present_count: number;
  total_count: number;
}

export default function HoDDashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [department, setDepartment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DepartmentStats>({
    totalPrograms: 0,
    totalCourses: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalStaff: 0,
  });
  const [recentAttendance, setRecentAttendance] = useState<RecentAttendance[]>([]);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    if (currentUser.role !== "hod" && currentUser.role !== "admin") {
      setAuthError(true);
      return;
    }
    setUser(currentUser);

    // Fetch HoD's department
    supabase
      .from("departments")
      .select("id, name, code")
      .eq("hod_id", currentUser.id)
      .maybeSingle()
      .then(({ data: dept, error }) => {
        if (error || !dept) {
          toast.error("No department assigned to your account.");
          router.push("/hod/programs");
          return;
        }
        setDepartment(dept);
        fetchDepartmentData(dept.id);
      });
  }, []);

  const fetchDepartmentData = async (deptId: string) => {
    try {
      setLoading(true);

      // Fetch stats in parallel
      const [
        { count: programCount },
        { count: courseCount },
        { count: teacherCount },
        { count: staffCount },
        { data: studentCourses },
        { data: recentAtt },
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
        supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("role", "staff")
          .eq("department_id", deptId),
        // Count distinct students enrolled in courses of this department
        supabase
          .from("student_courses")
          .select("student_id")
          .in(
            "course_id",
            (
              await supabase
                .from("courses")
                .select("id")
                .eq("department_id", deptId)
            ).data?.map((c) => c.id) ?? []
          ),
        // Recent attendance: latest 5 days with present counts
        supabase
          .from("attendance")
          .select(
            "course_id, attendance_date, status, courses!inner(name, code)"
          )
          .in(
            "course_id",
            (
              await supabase
                .from("courses")
                .select("id")
                .eq("department_id", deptId)
            ).data?.map((c) => c.id) ?? []
          )
          .order("attendance_date", { ascending: false })
          .limit(50),
      ]);

      // Calculate unique students
      const uniqueStudents = new Set(
        (studentCourses || []).map((sc: any) => sc.student_id)
      ).size;

      setStats({
        totalPrograms: programCount || 0,
        totalCourses: courseCount || 0,
        totalStudents: uniqueStudents,
        totalTeachers: teacherCount || 0,
        totalStaff: staffCount || 0,
      });

      // Process recent attendance
      if (recentAtt) {
        const grouped: Record<string, any> = {};
        recentAtt.forEach((r: any) => {
          const key = `${r.course_id}_${r.attendance_date}`;
          if (!grouped[key]) {
            grouped[key] = {
              course_name: (r.courses as any)?.name || "Unknown",
              course_code: (r.courses as any)?.code || "",
              attendance_date: r.attendance_date,
              present: 0,
              total: 0,
            };
          }
          grouped[key].total++;
          if (r.status === "present") {
            grouped[key].present++;
          }
        });

        const formatted = Object.values(grouped)
          .slice(0, 5)
          .map((g: any) => ({
            course_name: g.course_name,
            course_code: g.course_code,
            attendance_date: g.attendance_date,
            present_count: g.present,
            total_count: g.total,
          }));
        setRecentAttendance(formatted);
      }
    } catch (err: any) {
      toast.error("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  if (authError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <ShieldAlert className="h-12 w-12 text-red-500 mx-auto" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              This page is only accessible to HoD accounts.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading || !department) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const StatCard = ({
    icon: Icon,
    label,
    value,
    color,
  }: {
    icon: any;
    label: string;
    value: number;
    color: string;
  }) => (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );

  const QuickLinkCard = ({
    icon: Icon,
    title,
    description,
    href,
  }: {
    icon: any;
    title: string;
    description: string;
    href: string;
  }) => (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-gray-200"
      onClick={() => router.push(href)}
    >
      <CardContent className="p-6 flex items-start gap-4">
        <div className="p-3 rounded-lg bg-blue-50">
          <Icon className="h-6 w-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400" />
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/hod/programs")}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Programs
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">
              {department.name} ({department.code})
            </h1>
            <p className="text-gray-600 mt-1">Department Dashboard</p>
          </div>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            icon={School}
            label="Programs"
            value={stats.totalPrograms}
            color="bg-blue-500"
          />
          <StatCard
            icon={BookOpen}
            label="Courses"
            value={stats.totalCourses}
            color="bg-purple-500"
          />
          <StatCard
            icon={GraduationCap}
            label="Students"
            value={stats.totalStudents}
            color="bg-emerald-500"
          />
          <StatCard
            icon={UserCheck}
            label="Teachers"
            value={stats.totalTeachers}
            color="bg-orange-500"
          />
          <StatCard
            icon={Briefcase}
            label="Staff"
            value={stats.totalStaff}
            color="bg-cyan-500"
          />
        </div>

        {/* Quick Links + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Links */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Management Quick Links
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <QuickLinkCard
                icon={School}
                title="Programs & Courses"
                description="Manage programs, courses, and semesters"
                href="/hod/programs"
              />
              <QuickLinkCard
                icon={ClipboardList}
                title="Assignments"
                description="Create and grade assignments"
                href="/hod/assignments"
              />
              <QuickLinkCard
                icon={CalendarCheck}
                title="Attendance"
                description="Mark and view student attendance"
                href="/hod/attendance"
              />
              <QuickLinkCard
                icon={UserCheck}
                title="Faculty Management"
                description="View and edit faculty details"
                href="/hod/faculty"
              />
              <QuickLinkCard
                icon={Briefcase}
                title="Hiring Requests"
                description="Manage hiring for your department"
                href="/hod/hiring"
              />
              <QuickLinkCard
                icon={BarChart3}
                title="Quizzes"
                description="Create and manage quizzes"
                href="/hod/quizzes"
              />
            </div>
          </div>

          {/* Recent Attendance */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Recent Attendance
            </h2>
            <Card className="border-gray-200">
              <CardContent className="p-4">
                {recentAttendance.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">
                    No attendance records yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentAttendance.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {item.course_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.course_code} -{" "}
                            {format(new Date(item.attendance_date), "dd MMM yyyy")}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {item.present_count}/{item.total_count} present
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/hod/attendance")}
            >
              View All Attendance
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}