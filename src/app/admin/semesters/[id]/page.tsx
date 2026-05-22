/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

import {
  ArrowLeft,
  CalendarRange,
  Loader2,
  AlertCircle,
  Shield,
  Edit,
  Trash,
  BookOpen,
  Users,
  GraduationCap,
  Clock,
  TrendingUp,
  Calendar,
  Info,
  Building2,
  Plus,
  X,
  Search,
} from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

type Semester = {
  id: string;
  name: string;
  semester_type: string;
  year: number;
  start_date: string;
  end_date: string;
  status: string;
  total_courses: number | null;
  total_students: number | null;
  credits_offered: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  program: {
    id: string;
    name: string;
    code: string;
  } | null;
};

type Course = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  credits: number;
  semester: number;
  section: string | null;
  instructor: string | null;
  department: {
    name: string;
    code: string;
  } | null;
  program: {
    name: string;
    code: string;
  } | null;
};

const STATUS_STYLES: Record<
  string,
  { label: string; className: string; icon: any; bgClass: string }
> = {
  upcoming: {
    label: "Upcoming",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Clock,
    bgClass: "from-blue-500 to-blue-600",
  },
  active: {
    label: "Active",
    className: "bg-green-50 text-green-700 border-green-200",
    icon: TrendingUp,
    bgClass: "from-green-500 to-green-600",
  },
  completed: {
    label: "Completed",
    className: "bg-gray-50 text-gray-700 border-gray-200",
    icon: Calendar,
    bgClass: "from-gray-500 to-gray-600",
  },
};

export default function SemesterDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [semester, setSemester] = useState<Semester | null>(null);
  const [assignedCourses, setAssignedCourses] = useState<Course[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Course assignment dialog states
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(
    new Set()
  );
  const [assigningCourses, setAssigningCourses] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingCourses, setLoadingCourses] = useState(false);

  const semesterId = params?.id;

  // 1. Auth + admin guard
  useEffect(() => {
    const checkAuthAndRole = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/login");
          return;
        }

        const { data: userProfile, error: userError } = await supabase
          .from("users")
          .select("id, role")
          .eq("id", session.user.id)
          .single();

        if (userError || !userProfile) {
          setError("User profile not found. Please contact administrator.");
          return;
        }

        if (userProfile.role !== "admin") {
          setError(
            "Access denied: Only administrators can view semester details."
          );
          return;
        }
      } catch (err: any) {
        console.error("Auth check error:", err);
        setError("Failed to verify your session. Please log in again.");
      } finally {
        setAuthChecking(false);
      }
    };

    void checkAuthAndRole();
  }, [router]);

  // 2. Load semester details
  useEffect(() => {
    if (authChecking || error || !semesterId) return;

    const loadSemester = async () => {
      setLoading(true);
      try {
        const { data, error: semError } = await supabase
          .from("semesters")
          .select(
            `
            id,
            name,
            semester_type,
            year,
            start_date,
            end_date,
            status,
            total_courses,
            total_students,
            credits_offered,
            created_at,
            updated_at,
            created_by,
            program:programs (
              id,
              name,
              code
            )
          `
          )
          .eq("id", semesterId)
          .single();

        if (semError) {
          console.error("Failed to load semester:", semError);
          setError(semError.message || "Failed to load semester details.");
          return;
        }

        if (!data) {
          setError("Semester not found.");
          return;
        }

        const s = data as any;

        const mapped: Semester = {
          id: s.id,
          name: s.name,
          semester_type: s.semester_type,
          year: s.year,
          start_date: s.start_date,
          end_date: s.end_date,
          status: s.status,
          total_courses: s.total_courses ?? 0,
          total_students: s.total_students ?? 0,
          credits_offered: s.credits_offered ?? 0,
          created_at: s.created_at,
          updated_at: s.updated_at,
          created_by: s.created_by ?? null,
          program: s.program
            ? {
                id: s.program.id,
                name: s.program.name,
                code: s.program.code,
              }
            : null,
        };

        setSemester(mapped);
        await loadAssignedCourses(semesterId);
      } catch (err: any) {
        console.error("Load semester error:", err);
        setError("Failed to load semester details.");
      } finally {
        setLoading(false);
      }
    };

    void loadSemester();
  }, [authChecking, error, semesterId]);

  // 3. Load assigned courses
  const loadAssignedCourses = async (semId: string) => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select(
          `
          id,
          name,
          code,
          description,
          credits,
          semester,
          section,
          instructor,
          department:departments (
            name,
            code
          ),
          program:programs (
            name,
            code
          )
        `
        )
        .eq("semester_id", semId)
        .order("code");

      if (error) throw error;

      setAssignedCourses((data || []) as unknown as Course[]);
    } catch (err: any) {
      console.error("Load assigned courses error:", err);
      toast.error("Failed to load assigned courses");
    }
  };

  // 4. Load available courses (not assigned to this semester)
  const loadAvailableCourses = async () => {
    if (!semester) return;

    setLoadingCourses(true);
    try {
      const { data, error } = await supabase
        .from("courses")
        .select(
          `
          id,
          name,
          code,
          description,
          credits,
          semester,
          section,
          instructor,
          department:departments (
            name,
            code
          ),
          program:programs (
            name,
            code
          )
        `
        )
        .or(`semester_id.is.null,semester_id.neq.${semester.id}`)
        .eq("program_id", semester.program?.id)
        .order("code");

      if (error) throw error;

      setAvailableCourses((data || []) as unknown as Course[]);
    } catch (err: any) {
      console.error("Load available courses error:", err);
      toast.error("Failed to load available courses");
    } finally {
      setLoadingCourses(false);
    }
  };

  // 5. Handle opening assign dialog
  const handleOpenAssignDialog = () => {
    setShowAssignDialog(true);
    setSelectedCourses(new Set());
    setSearchQuery("");
    loadAvailableCourses();
  };

  // 6. Handle course selection
  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  // 7. Assign selected courses to semester
  const handleAssignCourses = async () => {
    if (!semester || selectedCourses.size === 0) return;

    setAssigningCourses(true);
    try {
      const updates = Array.from(selectedCourses).map((courseId) =>
        supabase
          .from("courses")
          .update({ semester_id: semester.id })
          .eq("id", courseId)
      );

      const results = await Promise.all(updates);
      const failed = results.filter((r) => r.error);

      if (failed.length > 0) {
        throw new Error(`Failed to assign ${failed.length} course(s)`);
      }

      toast.success(`Successfully assigned ${selectedCourses.size} course(s)`);
      setShowAssignDialog(false);
      await loadAssignedCourses(semester.id);
    } catch (err: any) {
      console.error("Assign courses error:", err);
      toast.error(err.message || "Failed to assign courses");
    } finally {
      setAssigningCourses(false);
    }
  };

  // 8. Remove course from semester
  const handleRemoveCourse = async (courseId: string) => {
    if (!confirm("Remove this course from the semester?")) return;

    try {
      const { error } = await supabase
        .from("courses")
        .update({ semester_id: null })
        .eq("id", courseId);

      if (error) throw error;

      toast.success("Course removed from semester");
      await loadAssignedCourses(semesterId!);
    } catch (err: any) {
      console.error("Remove course error:", err);
      toast.error("Failed to remove course");
    }
  };

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (iso: string | null | undefined) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const key = status?.toLowerCase();
    const cfg = STATUS_STYLES[key] ?? {
      label: status || "Unknown",
      className: "bg-gray-50 text-gray-700 border-gray-200",
      icon: Calendar,
      bgClass: "from-gray-500 to-gray-600",
    };
    const Icon = cfg.icon;
    return (
      <Badge
        variant="outline"
        className={`${cfg.className} flex items-center gap-1.5 px-3 py-1`}
      >
        <Icon className="h-3.5 w-3.5" />
        {cfg.label}
      </Badge>
    );
  };

  const handleEdit = () => {
    if (!semester) return;
    router.push(`/admin/semesters/${semester.id}/edit`);
  };

  const handleDelete = async () => {
    if (!semester) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete semester "${semester.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const { error: delError } = await supabase
        .from("semesters")
        .delete()
        .eq("id", semester.id);

      if (delError) {
        console.error("Delete semester error:", delError);
        setError("Failed to delete semester. Check policies or relations.");
        return;
      }

      router.push("/admin/semesters");
    } catch (err: any) {
      console.error("Delete semester error:", err);
      setError("Failed to delete semester. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  // Filter available courses by search
  const filteredAvailableCourses = availableCourses.filter(
    (course) =>
      course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authChecking || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen ">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary relative" />
          </div>
          <p className="text-gray-600 font-medium">
            {authChecking ? "Checking permissions..." : "Loading semester..."}
          </p>
        </div>
      </div>
    );
  }

  if (!semester && !error) {
    return (
      <div className="flex items-center justify-center min-h-screen ">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Semester not found
          </h2>
          <p className="text-gray-600 mb-6">
            The semester you're looking for doesn't exist.
          </p>
          <Button
            onClick={() => router.push("/admin/semesters")}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Semesters
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        {/* Header Section */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/admin/semesters")}
              className="rounded-full hover:bg-white/50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  {semester?.name ?? "Semester"}
                </h1>
                {semester && getStatusBadge(semester.status)}
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200"
                >
                  <Shield className="h-3 w-3 mr-1" />
                  Admin Only
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <span className="font-medium">
                  {semester?.semester_type} {semester?.year}
                </span>
                {semester?.program && (
                  <>
                    <span className="text-gray-400">•</span>
                    <Building2 className="h-4 w-4" />
                    <span>
                      {semester.program.name} ({semester.program.code})
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleEdit}
              className="bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 shadow-sm"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Semester
            </Button>
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-300 shadow-sm"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
            <CardHeader className="pb-3 relative">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-blue-100">
                  Semester Duration
                </CardTitle>
                <CalendarRange className="h-5 w-5 text-white/70" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-2xl font-bold mb-1">
                {formatDate(semester?.start_date)}
              </p>
              <p className="text-sm text-blue-100 flex items-center gap-1">
                <ArrowLeft className="h-3 w-3 rotate-180" />
                {formatDate(semester?.end_date)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
            <CardHeader className="pb-3 relative">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-purple-100">
                  Courses & Credits
                </CardTitle>
                <BookOpen className="h-5 w-5 text-white/70" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-3xl font-bold">{assignedCourses.length}</p>
                  <p className="text-xs text-purple-100">Courses</p>
                </div>
                <div className="h-10 w-px bg-white/20"></div>
                <div>
                  <p className="text-3xl font-bold">
                    {assignedCourses.reduce((sum, c) => sum + c.credits, 0)}
                  </p>
                  <p className="text-xs text-purple-100">Credits</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
            <CardHeader className="pb-3 relative">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-orange-100">
                  Student Enrollment
                </CardTitle>
                <Users className="h-5 w-5 text-white/70" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-bold">
                    {semester?.total_students ?? 0}
                  </p>
                  <p className="text-xs text-orange-100 mt-1">
                    Total students enrolled
                  </p>
                </div>
                <GraduationCap className="h-10 w-10 text-white/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assigned Courses Section */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                  Assigned Courses
                </CardTitle>
                <CardDescription>
                  Courses currently assigned to this semester
                </CardDescription>
              </div>
              <Button
                onClick={handleOpenAssignDialog}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Assign Courses
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {assignedCourses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 mb-4">No courses assigned yet</p>
                <Button
                  variant="outline"
                  onClick={handleOpenAssignDialog}
                  className="hover:bg-purple-50 hover:text-purple-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Assign First Course
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {assignedCourses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-white hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className="font-mono">
                          {course.code}
                        </Badge>
                        <h3 className="font-semibold text-gray-900">
                          {course.name}
                        </h3>
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                          {course.credits} Credits
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {course.department && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {course.department.name}
                          </span>
                        )}
                        {course.section && (
                          <span>Section: {course.section}</span>
                        )}
                        {course.instructor && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {course.instructor}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveCourse(course.id)}
                      className="hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <Card className="lg:col-span-2 border-0 shadow-xl">
            <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                <CardTitle>Semester Information</CardTitle>
              </div>
              <CardDescription>
                Core details about this academic term
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Semester Name
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {semester?.name ?? "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Program
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {semester?.program
                      ? `${semester.program.name} (${semester.program.code})`
                      : "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Semester Type
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {semester?.semester_type ?? "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Academic Year
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {semester?.year ?? "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Start Date
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {formatDate(semester?.start_date)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    End Date
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {formatDate(semester?.end_date)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Info */}
          <Card className="border-0 shadow-xl">
            <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Audit Trail
              </CardTitle>
              <CardDescription>Record metadata and timestamps</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Created At
                </p>
                <p className="text-sm text-gray-900 font-medium">
                  {formatDateTime(semester?.created_at)}
                </p>
              </div>
              <div className="h-px bg-gray-200"></div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Last Updated
                </p>
                <p className="text-sm text-gray-900 font-medium">
                  {formatDateTime(semester?.updated_at)}
                </p>
              </div>
              <div className="h-px bg-gray-200"></div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Created By
                </p>
                <p className="text-sm text-gray-600 font-mono">
                  {semester?.created_by ?? "-"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assign Courses Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
              Assign Courses to {semester?.name}
            </DialogTitle>
            <DialogDescription>
              Select courses to assign to this semester. Only courses from the
              same program are shown.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search courses by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Course List */}
            <div className="flex-1 overflow-y-auto border rounded-lg">
              {loadingCourses ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
              ) : filteredAvailableCourses.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">
                    {searchQuery
                      ? "No courses match your search"
                      : "No available courses to assign"}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredAvailableCourses.map((course) => (
                    <div
                      key={course.id}
                      className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => toggleCourseSelection(course.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedCourses.has(course.id)}
                          onCheckedChange={() =>
                            toggleCourseSelection(course.id)
                          }
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="outline" className="font-mono">
                              {course.code}
                            </Badge>
                            <h4 className="font-semibold text-gray-900">
                              {course.name}
                            </h4>
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                              {course.credits} Credits
                            </Badge>
                          </div>
                          {course.description && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {course.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            {course.department && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {course.department.name}
                              </span>
                            )}
                            {course.program && (
                              <span className="flex items-center gap-1">
                                <GraduationCap className="h-3 w-3" />
                                {course.program.name}
                              </span>
                            )}
                            <span>Semester {course.semester}</span>
                            {course.section && (
                              <span>Section: {course.section}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected count */}
            {selectedCourses.size > 0 && (
              <div className="px-4 py-2 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-700 font-medium">
                  {selectedCourses.size} course
                  {selectedCourses.size !== 1 ? "s" : ""} selected
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAssignDialog(false)}
              disabled={assigningCourses}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignCourses}
              disabled={selectedCourses.size === 0 || assigningCourses}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {assigningCourses ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign{" "}
                  {selectedCourses.size > 0 ? `(${selectedCourses.size})` : ""}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
