/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/auth";
import { toast } from "sonner";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  BookOpen,
  Plus,
  Search,
  Loader2,
  Trash2,
  Edit,
  Sparkles,
  Upload,
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Zap,
  Download,
  ListChecks,
  Users,
  Timer,
  CheckCircle,
  Eye,
  Copy,
  Settings,
  BarChart,
  MoreVertical,
  ExternalLink,
  ChevronRight,
  File,
  Brain,
  Target,
  Star,
  FolderOpen,
  Layers,
  Activity,
  UserPlus,
  UserMinus,
  Mail,
  Phone,
  GraduationCap,
  AlertCircle,
  Filter,
  X,
} from "lucide-react";

import AILessonGeneratorModal from "@/components/AICourseGenerator";

type Course = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  slug: string;
  created_at: string;
  updated_at: string;
};

type Lesson = {
  id: string;
  course_id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  order_number: number;
  duration_minutes: number | null;
  is_published: boolean;
  created_at: string;
  file_url?: string | null;
};

type EnrolledStudent = {
  id: string;
  student_id: string;
  course_id: string;
  enrollment_date: string;
  status: "enrolled" | "completed" | "dropped" | "failed";
  grade: string | null;
  student: {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    role: string;
  };
};

type AvailableStudent = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
};

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>(
    [],
  );
  const [availableStudents, setAvailableStudents] = useState<
    AvailableStudent[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [enrollmentSearch, setEnrollmentSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [stats, setStats] = useState({
    totalDuration: 0,
    publishedLessons: 0,
    avgLessonDuration: 0,
  });

  // Modal States
  const [showAIModal, setShowAIModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [studentToRemove, setStudentToRemove] =
    useState<EnrolledStudent | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("order_number", { ascending: true });

      if (lessonsError) throw lessonsError;
      const lessonsList = lessonsData || [];
      setLessons(lessonsList);

      // Calculate stats
      const totalDuration = lessonsList.reduce(
        (acc, l) => acc + (l.duration_minutes || 0),
        0,
      );
      const publishedLessons = lessonsList.filter((l) => l.is_published).length;
      const avgLessonDuration =
        lessonsList.length > 0
          ? Math.round(totalDuration / lessonsList.length)
          : 0;

      setStats({
        totalDuration,
        publishedLessons,
        avgLessonDuration,
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to load course data");
      console.error("loadData error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadEnrolledStudents = async () => {
    try {
      setStudentsLoading(true);

      // First, get the student_courses data
      const { data: enrollments, error: enrollError } = await supabase
        .from("student_courses")
        .select("*")
        .eq("course_id", courseId)
        .order("enrollment_date", { ascending: false });

      if (enrollError) {
        console.error("Enrollment query error:", enrollError);
        throw enrollError;
      }

      console.log("Enrollments loaded:", enrollments);

      // If no enrollments, return early
      if (!enrollments || enrollments.length === 0) {
        console.log("No enrollments found");
        setEnrolledStudents([]);
        return;
      }

      // Get student IDs
      const studentIds = enrollments.map((e) => e.student_id);
      console.log("Fetching users for IDs:", studentIds);

      // Try to get user data - try different table names/structures
      let students: any[] = [];

      // First try: users table with standard fields
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, email, full_name, phone, avatar_url, role")
          .in("id", studentIds);

        if (!error && data) {
          students = data;
          console.log("Students loaded from users table:", students);
        } else if (error) {
          console.warn("Users table query failed:", error);

          // Second try: auth.users (if accessible)
          const { data: authData } = await supabase.auth.admin.listUsers();
          if (authData?.users) {
            students = authData.users
              .filter((u) => studentIds.includes(u.id))
              .map((u) => ({
                id: u.id,
                email: u.email || "No email",
                full_name: u.user_metadata?.full_name || null,
                phone: u.phone || null,
                avatar_url: u.user_metadata?.avatar_url || null,
                role: "student",
              }));
            console.log("Students loaded from auth.users:", students);
          }
        }
      } catch (userError) {
        console.error("Error fetching users:", userError);
      }

      // Combine the data
      const combinedData = enrollments.map((enrollment) => {
        const student = students?.find((s) => s.id === enrollment.student_id);

        return {
          id: enrollment.id,
          student_id: enrollment.student_id,
          course_id: enrollment.course_id,
          enrollment_date: enrollment.enrollment_date,
          status: enrollment.status,
          grade: enrollment.grade,
          student: student || {
            id: enrollment.student_id,
            email: "Unknown User",
            full_name: "Unknown",
            phone: null,
            avatar_url: null,
            role: "student",
          },
        };
      });

      console.log("Combined data:", combinedData);
      setEnrolledStudents(combinedData);
    } catch (err: any) {
      console.error("Full error object:", err);
      console.error("Error message:", err?.message);
      console.error("Error code:", err?.code);
      console.error("Error details:", err?.details);
      toast.error(err?.message || "Failed to load enrolled students");
    } finally {
      setStudentsLoading(false);
    }
  };

  const loadAvailableStudents = async () => {
    try {
      // Get all students
      const { data: allStudents, error: studentsError } = await supabase
        .from("users")
        .select("id, email, full_name, phone, role")
        .eq("role", "student")
        .order("full_name");

      if (studentsError) throw studentsError;

      // Get enrolled student IDs
      const enrolledIds = enrolledStudents.map((e) => e.student_id);

      // Filter out already enrolled students
      const available = (allStudents || []).filter(
        (s) => !enrolledIds.includes(s.id),
      );

      setAvailableStudents(available);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load available students");
      console.error("loadAvailableStudents error:", err);
    }
  };

  useEffect(() => {
    if (courseId) {
      void loadData();
      void loadEnrolledStudents();
    }
  }, [courseId]);

  useEffect(() => {
    if (showEnrollModal && enrolledStudents.length >= 0) {
      void loadAvailableStudents();
    }
  }, [showEnrollModal, enrolledStudents]);

  const handleLessonsGenerated = async (generatedLessons: any[]) => {
    try {
      const lessonsToInsert = generatedLessons.map((lesson) => {
        const { id, isNew, ...lessonData } = lesson as any;

        return {
          course_id: courseId,
          title: lessonData.title,
          slug: lessonData.slug,
          description: lessonData.description || null,
          content: lessonData.content || null,
          order_number: lessonData.order_number,
          duration_minutes: lessonData.duration_minutes || null,
          is_published: lessonData.is_published || false,
          file_url: lessonData.file_url || null,
        };
      });

      const { data, error } = await supabase
        .from("lessons")
        .insert(lessonsToInsert)
        .select();

      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }

      toast.success(
        `Successfully created ${data.length} lesson${
          data.length !== 1 ? "s" : ""
        }`,
      );

      await loadData();
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err?.message || "Failed to save lessons");
    }
  };

  const handleEnrollStudents = async () => {
    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student");
      return;
    }

    try {
      setEnrolling(true);

      console.log("Enrolling students:", selectedStudents);
      console.log("Course ID:", courseId);

      // Create enrollment records
      const enrollments = selectedStudents.map((studentId) => ({
        student_id: studentId,
        course_id: courseId,
        status: "enrolled",
        // Remove enrollment_date - let it default to CURRENT_TIMESTAMP
      }));

      console.log("Enrollment data to insert:", enrollments);

      const { data, error } = await supabase
        .from("student_courses")
        .insert(enrollments)
        .select();

      if (error) {
        console.error("Supabase insert error:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        console.error("Error details:", error.details);
        console.error("Error hint:", error.hint);
        throw error;
      }

      console.log("Successfully inserted:", data);

      toast.success(
        `Successfully enrolled ${selectedStudents.length} student${selectedStudents.length !== 1 ? "s" : ""}`,
      );
      setShowEnrollModal(false);
      setSelectedStudents([]);
      await loadEnrolledStudents();
    } catch (err: any) {
      console.error("Full error object:", err);
      console.error("Error type:", typeof err);
      console.error("Error keys:", Object.keys(err || {}));
      console.error("Error stringified:", JSON.stringify(err, null, 2));

      const errorMessage =
        err?.message ||
        err?.error_description ||
        err?.error ||
        "Failed to enroll students";
      toast.error(errorMessage);
      console.error("handleEnrollStudents error:", err);
    } finally {
      setEnrolling(false);
    }
  };

  const handleRemoveStudent = async () => {
    if (!studentToRemove) return;

    try {
      const { error } = await supabase
        .from("student_courses")
        .delete()
        .eq("id", studentToRemove.id);

      if (error) throw error;

      toast.success("Student removed from course");
      setStudentToRemove(null);
      await loadEnrolledStudents();
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove student");
      console.error("handleRemoveStudent error:", err);
    }
  };

  const handleUpdateStatus = async (
    enrollmentId: string,
    newStatus: string,
  ) => {
    try {
      const { error } = await supabase
        .from("student_courses")
        .update({ status: newStatus })
        .eq("id", enrollmentId);

      if (error) throw error;

      toast.success("Status updated successfully");
      await loadEnrolledStudents();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
      console.error("handleUpdateStatus error:", err);
    }
  };

  const filteredLessons = useMemo(() => {
    const q = search.toLowerCase().trim();
    return lessons.filter((l) => {
      const matchesSearch =
        !q ||
        l.title.toLowerCase().includes(q) ||
        (l.description ?? "").toLowerCase().includes(q);
      return matchesSearch;
    });
  }, [lessons, search]);

  const filteredEnrolledStudents = useMemo(() => {
    const q = enrollmentSearch.toLowerCase().trim();
    return enrolledStudents.filter((enrollment) => {
      const student = enrollment.student;
      const matchesSearch =
        !q ||
        (student.full_name?.toLowerCase().includes(q) ?? false) ||
        student.email.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" || enrollment.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [enrolledStudents, enrollmentSearch, statusFilter]);

  const filteredAvailableStudents = useMemo(() => {
    const q = studentSearch.toLowerCase().trim();
    return availableStudents.filter((student) => {
      return (
        !q ||
        (student.full_name?.toLowerCase().includes(q) ?? false) ||
        student.email.toLowerCase().includes(q)
      );
    });
  }, [availableStudents, studentSearch]);

  const handleDeleteLesson = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lesson?")) return;

    try {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;
      toast.success("Lesson deleted successfully");
      setLessons((prev) => prev.filter((l) => l.id !== id));
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete lesson");
    }
  };

  const handleDownloadLesson = async (lesson: Lesson) => {
    try {
      if (lesson.file_url) {
        toast.loading("Preparing download...", { id: "download" });

        if (lesson.file_url.includes("supabase")) {
          try {
            const url = new URL(lesson.file_url);
            const pathParts = url.pathname.split("/");

            const bucketIndex = pathParts.findIndex(
              (part) => part === "lesson-files",
            );
            if (bucketIndex === -1) {
              throw new Error("Could not find bucket in URL");
            }

            const filePath = pathParts.slice(bucketIndex + 1).join("/");

            const { data, error } = await supabase.storage
              .from("lesson-files")
              .download(filePath);

            if (error) {
              console.error("Supabase storage download error:", error);
              throw error;
            }

            const blob = new Blob([data]);
            const blobUrl = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = blobUrl;

            const fileName = filePath.split("/").pop() || `${lesson.slug}.pdf`;
            a.download = decodeURIComponent(fileName);

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);

            toast.success("Download started", { id: "download" });
          } catch (storageError: any) {
            console.error("Storage download failed:", storageError);

            const link = document.createElement("a");
            link.href = lesson.file_url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("Opening file in new tab", { id: "download" });
          }
        } else {
          const a = document.createElement("a");
          a.href = lesson.file_url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";

          const urlParts = lesson.file_url.split("/");
          const fileName =
            urlParts[urlParts.length - 1] || `${lesson.slug}.pdf`;
          a.download = decodeURIComponent(fileName);

          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          toast.success("Download started", { id: "download" });
        }
      } else {
        toast.loading("Generating PDF...", { id: "download" });
        toast.success("PDF ready - Please save using Print dialog", {
          id: "download",
        });
      }
    } catch (err: any) {
      console.error("Download error:", err);
      toast.error(err?.message || "Failed to download lesson", {
        id: "download",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "enrolled":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "dropped":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (!course) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin/courses")}
                className="hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Courses
              </Button>
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {course.name}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-sm">
                    {course.code}
                  </Badge>
                  <span className="text-sm text-slate-500">
                    {lessons.length}{" "}
                    {lessons.length === 1 ? "lesson" : "lessons"}
                  </span>
                  <span className="text-sm text-slate-400">•</span>
                  <span className="text-sm text-slate-500">
                    {enrolledStudents.length}{" "}
                    {enrolledStudents.length === 1 ? "student" : "students"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/admin/courses/${courseId}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                size="sm"
                onClick={() => setShowAIModal(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Lesson
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Course Overview Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Course Overview
              </h2>
              {course.description && (
                <p className="text-slate-600 mt-1 max-w-3xl">
                  {course.description}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => router.push(`/admin/courses/${courseId}/quizzes`)}
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <ListChecks className="h-4 w-4 mr-2" />
              Manage Quizzes
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Lessons</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {lessons.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Enrolled</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {enrolledStudents.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Duration</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.totalDuration}m
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Published</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.publishedLessons}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Avg. Lesson</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.avgLessonDuration}m
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs for Lessons and Students */}
        <Tabs defaultValue="lessons" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="lessons" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Lessons ({lessons.length})
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Students ({enrolledStudents.length})
            </TabsTrigger>
          </TabsList>

          {/* Lessons Tab */}
          <TabsContent value="lessons" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Course Lessons
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Manage your learning content
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search lessons..."
                    className="pl-9"
                  />
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Settings className="h-4 w-4 mr-2" />
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowAIModal(true)}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate with AI
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Upload className="h-4 w-4 mr-2" />
                      Import from File
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(`/admin/courses/${courseId}/analytics`)
                      }
                    >
                      <BarChart className="h-4 w-4 mr-2" />
                      View Analytics
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
                <p className="text-slate-600">Loading lessons...</p>
              </div>
            ) : filteredLessons.length === 0 && !search ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center mx-auto mb-6">
                  <BookOpen className="h-8 w-8 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  No lessons yet
                </h3>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">
                  Start building your course by adding lessons. You can create
                  them manually or use AI to generate content.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => setShowAIModal(true)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate with AI
                  </Button>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Manually
                  </Button>
                </div>
              </div>
            ) : filteredLessons.length === 0 && search ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Search className="h-12 w-12 text-slate-300 mx-auto mb-6" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  No lessons found
                </h3>
                <p className="text-slate-500 mb-6">
                  Try adjusting your search terms
                </p>
                <Button variant="outline" onClick={() => setSearch("")}>
                  Clear Search
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Lessons Header */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="grid grid-cols-12 gap-4 text-sm font-medium text-slate-500">
                    <div className="col-span-1">#</div>
                    <div className="col-span-5">Lesson Title</div>
                    <div className="col-span-2">Duration</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>
                </div>

                {/* Lessons List */}
                {filteredLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="bg-white rounded-lg border border-slate-200 p-4 hover:border-purple-200 transition-colors"
                  >
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Lesson Number */}
                      <div className="col-span-1">
                        <div className="w-8 h-8 rounded-md bg-purple-100 flex items-center justify-center">
                          <span className="font-semibold text-purple-700">
                            {lesson.order_number}
                          </span>
                        </div>
                      </div>

                      {/* Lesson Info */}
                      <div className="col-span-5">
                        <div>
                          <h3 className="font-medium text-slate-900 mb-1">
                            {lesson.title}
                          </h3>
                          {lesson.description && (
                            <p className="text-sm text-slate-500 line-clamp-1">
                              {lesson.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Duration */}
                      <div className="col-span-2">
                        {lesson.duration_minutes ? (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock className="h-4 w-4" />
                            <span>{lesson.duration_minutes} min</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>

                      {/* Status */}
                      <div className="col-span-2">
                        {lesson.is_published ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Published
                          </Badge>
                        ) : (
                          <Badge variant="outline">Draft</Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="col-span-2 flex justify-end gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:bg-slate-100"
                                onClick={() =>
                                  void handleDownloadLesson(lesson)
                                }
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Download</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:bg-slate-100"
                                onClick={() =>
                                  router.push(
                                    `/admin/lessons/${lesson.id}/edit`,
                                  )
                                }
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                                onClick={() =>
                                  void handleDeleteLesson(lesson.id)
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Enrolled Students
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Manage student enrollments
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="enrolled">Enrolled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="dropped">Dropped</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={enrollmentSearch}
                    onChange={(e) => setEnrollmentSearch(e.target.value)}
                    placeholder="Search students..."
                    className="pl-9"
                  />
                </div>

                <Button
                  onClick={() => setShowEnrollModal(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Enroll Students
                </Button>
              </div>
            </div>

            {studentsLoading ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-slate-600">Loading students...</p>
              </div>
            ) : filteredEnrolledStudents.length === 0 &&
              !enrollmentSearch &&
              statusFilter === "all" ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center mx-auto mb-6">
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  No students enrolled
                </h3>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">
                  Start building your class by enrolling students in this
                  course.
                </p>
                <Button
                  onClick={() => setShowEnrollModal(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Enroll Students
                </Button>
              </div>
            ) : filteredEnrolledStudents.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Search className="h-12 w-12 text-slate-300 mx-auto mb-6" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  No students found
                </h3>
                <p className="text-slate-500 mb-6">
                  Try adjusting your search or filters
                </p>
                <div className="flex gap-3 justify-center">
                  {enrollmentSearch && (
                    <Button
                      variant="outline"
                      onClick={() => setEnrollmentSearch("")}
                    >
                      Clear Search
                    </Button>
                  )}
                  {statusFilter !== "all" && (
                    <Button
                      variant="outline"
                      onClick={() => setStatusFilter("all")}
                    >
                      Clear Filter
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Students Header */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="grid grid-cols-12 gap-4 text-sm font-medium text-slate-500">
                    <div className="col-span-4">Student</div>
                    <div className="col-span-3">Contact</div>
                    <div className="col-span-2">Enrolled</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-1 text-right">Actions</div>
                  </div>
                </div>

                {/* Students List */}
                {filteredEnrolledStudents.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="bg-white rounded-lg border border-slate-200 p-4 hover:border-blue-200 transition-colors"
                  >
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Student Info */}
                      <div className="col-span-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                            {enrollment.student.full_name
                              ?.charAt(0)
                              .toUpperCase() ||
                              enrollment.student.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-medium text-slate-900">
                              {enrollment.student.full_name || "No Name"}
                            </h3>
                            <p className="text-sm text-slate-500">
                              {enrollment.student.email}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="col-span-3">
                        {enrollment.student.phone ? (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Phone className="h-4 w-4" />
                            <span className="text-sm">
                              {enrollment.student.phone}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">
                            No phone
                          </span>
                        )}
                      </div>

                      {/* Enrollment Date */}
                      <div className="col-span-2">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">
                            {new Date(
                              enrollment.enrollment_date,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="col-span-2">
                        <Select
                          value={enrollment.status}
                          onValueChange={(value) =>
                            handleUpdateStatus(enrollment.id, value)
                          }
                        >
                          <SelectTrigger
                            className={`w-full ${getStatusColor(enrollment.status)}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="enrolled">Enrolled</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="dropped">Dropped</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/admin/students/${enrollment.student_id}`,
                                )
                              }
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="h-4 w-4 mr-2" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setStudentToRemove(enrollment)}
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              Remove from Course
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Quick Links Section */}
        <div className="mt-12">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Course Management
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-slate-200 hover:border-blue-200 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <ListChecks className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">
                      Quizzes & Assessments
                    </h4>
                    <p className="text-sm text-slate-500 mb-4">
                      Create and manage quizzes to test student understanding
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(`/admin/courses/${courseId}/quizzes`)
                      }
                      className="w-full"
                    >
                      Manage Quizzes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 hover:border-purple-200 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Brain className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">
                      AI Content Generation
                    </h4>
                    <p className="text-sm text-slate-500 mb-4">
                      Generate lessons, quizzes, and assessments using AI
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAIModal(true)}
                      className="w-full"
                    >
                      Generate Content
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* AI Lesson Generator Modal */}
      <AILessonGeneratorModal
        open={showAIModal}
        onOpenChange={setShowAIModal}
        courseId={courseId}
        courseName={course.name}
        courseDescription={course.description}
        onLessonsGenerated={handleLessonsGenerated}
        existingLessonsCount={lessons.length}
      />

      {/* Enroll Students Modal */}
      <Dialog open={showEnrollModal} onOpenChange={setShowEnrollModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col bg-white">
          <DialogHeader>
            <DialogTitle>Enroll Students in {course.name}</DialogTitle>
            <DialogDescription>
              Select students to enroll in this course
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search available students..."
                  className="pl-9"
                />
              </div>
            </div>

            {filteredAvailableStudents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {studentSearch
                    ? "No students found"
                    : "No available students"}
                </h3>
                <p className="text-slate-500">
                  {studentSearch
                    ? "Try adjusting your search terms"
                    : "All students are already enrolled in this course"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAvailableStudents.map((student) => (
                  <div
                    key={student.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedStudents.includes(student.id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    onClick={() => {
                      setSelectedStudents((prev) =>
                        prev.includes(student.id)
                          ? prev.filter((id) => id !== student.id)
                          : [...prev, student.id],
                      );
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedStudents.includes(student.id)
                            ? "border-blue-500 bg-blue-500"
                            : "border-slate-300"
                        }`}
                      >
                        {selectedStudents.includes(student.id) && (
                          <CheckCircle className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                        {student.full_name?.charAt(0).toUpperCase() ||
                          student.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">
                          {student.full_name || "No Name"}
                        </h4>
                        <p className="text-sm text-slate-500">
                          {student.email}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between w-full">
              <p className="text-sm text-slate-600">
                {selectedStudents.length} student
                {selectedStudents.length !== 1 ? "s" : ""} selected
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEnrollModal(false);
                    setSelectedStudents([]);
                    setStudentSearch("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEnrollStudents}
                  disabled={selectedStudents.length === 0 || enrolling}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {enrolling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enrolling...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Enroll{" "}
                      {selectedStudents.length > 0 &&
                        `(${selectedStudents.length})`}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Student Confirmation Dialog */}
      <AlertDialog
        open={!!studentToRemove}
        onOpenChange={() => setStudentToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Student from Course?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>
                {studentToRemove?.student.full_name ||
                  studentToRemove?.student.email}
              </strong>{" "}
              from this course? This action cannot be undone and all progress
              data will be retained.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveStudent}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove Student
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
