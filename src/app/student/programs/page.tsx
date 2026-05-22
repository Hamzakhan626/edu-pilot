/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/auth";
import { toast } from "sonner";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import {
  BookOpen,
  Search,
  Loader2,
  Calendar,
  Clock,
  CheckCircle2,
  PlayCircle,
  Lock,
  Award,
  Target,
  TrendingUp,
  BookMarked,
  FileText,
  Video,
  Download,
  Eye,
  ChevronRight,
  GraduationCap,
  Users,
  BarChart3,
  Star,
  Filter,
  Brain,
} from "lucide-react";

type StudentCourse = {
  id: string;
  student_id: string;
  course_id: string;
  enrollment_date: string;
  status: 'enrolled' | 'completed' | 'dropped' | 'failed';
  grade: string | null;
  course: {
    id: string;
    name: string;
    code: string;
    description: string | null;
    slug: string;
  };
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
  file_url: string | null;
};

type Quiz = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  total_questions: number | null;
  passing_score: number | null;
  time_limit_minutes: number | null;
  type: string | null;
  difficulty: string | null;
  status: string | null;
};

type CourseWithLessons = {
  enrollment: StudentCourse;
  lessons: Lesson[];
  quizzes: Quiz[];
  completedLessons: number;
  totalDuration: number;
};

export default function StudentCoursesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<StudentCourse[]>([]);
  const [coursesWithLessons, setCoursesWithLessons] = useState<CourseWithLessons[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCourse, setSelectedCourse] = useState<CourseWithLessons | null>(null);

  useEffect(() => {
    loadUserAndCourses();
  }, []);

  const loadUserAndCourses = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to view your courses");
        router.push("/login");
        return;
      }

      setCurrentUser(user);

      // Get enrolled courses
      const { data: enrollments, error: enrollError } = await supabase
        .from("student_courses")
        .select("*")
        .eq("student_id", user.id)
        .order("enrollment_date", { ascending: false });

      if (enrollError) throw enrollError;

      // Get course data for enrolled courses
      if (enrollments && enrollments.length > 0) {
        const courseIds = enrollments.map(e => e.course_id);
        
        const { data: courses, error: coursesError } = await supabase
          .from("courses")
          .select("id, name, code, description, slug")
          .in("id", courseIds);

        if (coursesError) throw coursesError;

        // Combine the data
        const combinedEnrollments = enrollments.map(enrollment => ({
          ...enrollment,
          course: courses?.find(c => c.id === enrollment.course_id) || {
            id: enrollment.course_id,
            name: "Unknown Course",
            code: "N/A",
            description: null,
            slug: ""
          }
        }));

        setEnrolledCourses(combinedEnrollments);

        // Load lessons and quizzes for each course
        const coursesData: CourseWithLessons[] = await Promise.all(
          combinedEnrollments.map(async (enrollment) => {
            // Fetch lessons (remove is_published filter to show all lessons)
            const { data: lessons, error: lessonsError } = await supabase
              .from("lessons")
              .select("*")
              .eq("course_id", enrollment.course_id)
              .order("order_number", { ascending: true });

            if (lessonsError) {
              console.error("Error loading lessons:", lessonsError);
            }

            // Fetch quizzes
            const { data: quizzes, error: quizzesError } = await supabase
              .from("quizzes")
              .select("*")
              .eq("course_id", enrollment.course_id)
              .order("created_at", { ascending: true });

            if (quizzesError) {
              console.error("Error loading quizzes:", quizzesError);
            }

            const lessonsList = lessons || [];
            const quizzesList = quizzes || [];
            const totalDuration = lessonsList.reduce(
              (sum, l) => sum + (l.duration_minutes || 0),
              0
            );

            // TODO: Fetch actual completion data from a progress tracking table
            const completedLessons = 0;

            return {
              enrollment,
              lessons: lessonsList,
              quizzes: quizzesList,
              completedLessons,
              totalDuration,
            };
          })
        );

        setCoursesWithLessons(coursesData);
      } else {
        setEnrolledCourses([]);
        setCoursesWithLessons([]);
      }
    } catch (err: any) {
      console.error("Error loading courses:", err);
      toast.error(err?.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = useMemo(() => {
    const q = search.toLowerCase().trim();
    return coursesWithLessons.filter((courseData) => {
      const course = courseData.enrollment.course;
      const matchesSearch =
        !q ||
        course.name.toLowerCase().includes(q) ||
        course.code.toLowerCase().includes(q) ||
        (course.description?.toLowerCase().includes(q) ?? false);

      const matchesStatus =
        statusFilter === "all" || courseData.enrollment.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [coursesWithLessons, search, statusFilter]);

  const stats = useMemo(() => {
    const totalCourses = enrolledCourses.length;
    const activeCourses = enrolledCourses.filter(
      (e) => e.status === "enrolled"
    ).length;
    const completedCourses = enrolledCourses.filter(
      (e) => e.status === "completed"
    ).length;
    const totalLessons = coursesWithLessons.reduce(
      (sum, c) => sum + (c.lessons?.length || 0),
      0
    );
    const totalQuizzes = coursesWithLessons.reduce(
      (sum, c) => sum + (c.quizzes?.length || 0),
      0
    );
    const completedLessons = coursesWithLessons.reduce(
      (sum, c) => sum + (c.completedLessons || 0),
      0
    );

    return {
      totalCourses,
      activeCourses,
      completedCourses,
      totalLessons,
      totalQuizzes,
      completedLessons,
      overallProgress:
        totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0,
    };
  }, [enrolledCourses, coursesWithLessons]);

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

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
        return "bg-green-100 text-green-800 border-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "hard":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getCourseProgress = (courseData: CourseWithLessons) => {
    const lessonsLength = courseData.lessons?.length || 0;
    if (lessonsLength === 0) return 0;
    return Math.round(
      (courseData.completedLessons / lessonsLength) * 100
    );
  };

  const handleViewLesson = (lesson: Lesson) => {
    // Navigate to lesson view page
    router.push(`/student/lessons/${lesson.id}`);
  };

  const handleViewQuiz = (quiz: Quiz) => {
    // Navigate to quiz page
    router.push(`/student/quizzes/${quiz.id}`);
  };

  const handleDownloadLesson = async (lesson: Lesson) => {
    if (!lesson.file_url) {
      toast.error("No file available for download");
      return;
    }

    try {
      toast.loading("Preparing download...", { id: "download" });

      if (lesson.file_url.includes("supabase")) {
        const url = new URL(lesson.file_url);
        const pathParts = url.pathname.split("/");
        const bucketIndex = pathParts.findIndex((part) => part === "lesson-files");

        if (bucketIndex === -1) {
          throw new Error("Invalid file URL");
        }

        const filePath = pathParts.slice(bucketIndex + 1).join("/");

        const { data, error } = await supabase.storage
          .from("lesson-files")
          .download(filePath);

        if (error) throw error;

        const blob = new Blob([data]);
        const blobUrl = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filePath.split("/").pop() || `${lesson.slug}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);

        toast.success("Download started", { id: "download" });
      } else {
        window.open(lesson.file_url, "_blank");
        toast.success("Opening file", { id: "download" });
      }
    } catch (err: any) {
      console.error("Download error:", err);
      toast.error(err?.message || "Failed to download", { id: "download" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-slate-600">Loading your courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Courses</h1>
              <p className="text-blue-100">
                Track your learning progress and access course materials
              </p>
            </div>
            <div className="hidden md:block">
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-blue-100">Overall Progress</p>
                  <p className="text-2xl font-bold">{stats.overallProgress}%</p>
                </div>
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                  <Award className="h-8 w-8" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Courses</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.totalCourses}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Active Courses</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.activeCourses}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Completed</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.completedCourses}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Target className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Lessons</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.completedLessons}/{stats.totalLessons}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-pink-100 flex items-center justify-center">
                  <Brain className="h-6 w-6 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Quizzes</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.totalQuizzes}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses..."
              className="pl-10 h-12 bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-400" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-12 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                <SelectItem value="enrolled">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="dropped">Dropped</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Courses List */}
        {filteredCourses.length === 0 && !search && statusFilter === "all" ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center mx-auto mb-6">
                <GraduationCap className="h-10 w-10 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                No Courses Enrolled
              </h3>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">
                You haven't enrolled in any courses yet. Contact your instructor
                or administrator to get enrolled.
              </p>
            </CardContent>
          </Card>
        ) : filteredCourses.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Search className="h-16 w-16 text-slate-300 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                No courses found
              </h3>
              <p className="text-slate-500 mb-6">
                Try adjusting your search or filters
              </p>
              <div className="flex gap-3 justify-center">
                {search && (
                  <Button variant="outline" onClick={() => setSearch("")}>
                    Clear Search
                  </Button>
                )}
                {statusFilter !== "all" && (
                  <Button variant="outline" onClick={() => setStatusFilter("all")}>
                    Clear Filter
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredCourses.map((courseData) => {
              const { enrollment, lessons, quizzes } = courseData;
              const progress = getCourseProgress(courseData);

              return (
                <Card key={enrollment.id} className="border-0 shadow-lg overflow-hidden">
                  <div className="p-6">
                    {/* Course Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-2xl font-bold text-slate-900">
                            {enrollment.course.name}
                          </h2>
                          <Badge
                            variant="outline"
                            className={getStatusColor(enrollment.status)}
                          >
                            {enrollment.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
                          <span className="flex items-center gap-1">
                            <BookMarked className="h-4 w-4" />
                            {enrollment.course.code}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {courseData.totalDuration} minutes
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {lessons?.length || 0} lessons
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Brain className="h-4 w-4" />
                            {quizzes?.length || 0} quizzes
                          </span>
                        </div>
                        {enrollment.course.description && (
                          <p className="text-slate-600 mt-3">
                            {enrollment.course.description}
                          </p>
                        )}
                      </div>
                      {enrollment.grade && (
                        <div className="ml-6 text-right">
                          <p className="text-sm text-slate-500 mb-1">Grade</p>
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                            <span className="text-2xl font-bold text-white">
                              {enrollment.grade}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">
                          Course Progress
                        </span>
                        <span className="text-sm font-semibold text-slate-900">
                          {courseData.completedLessons} / {lessons?.length || 0} lessons
                        </span>
                      </div>
                      <Progress value={progress} className="h-3" />
                      <p className="text-xs text-slate-500 mt-1">{progress}% complete</p>
                    </div>

                    {/* Lessons and Quizzes Accordion */}
                    <Accordion type="multiple" className="w-full">
                      {/* Lessons Section */}
                      {lessons && lessons.length > 0 && (
                        <AccordionItem value="lessons" className="border-0">
                          <AccordionTrigger className="hover:no-underline py-3 px-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-5 w-5 text-slate-600" />
                              <span className="font-semibold text-slate-900">
                                View All Lessons ({lessons.length})
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-4">
                            <div className="space-y-3">
                              {lessons.map((lesson) => (
                                <div
                                  key={lesson.id}
                                  className="flex items-center justify-between p-4 bg-white border-2 border-slate-200 rounded-lg hover:border-blue-300 transition-colors group"
                                >
                                  <div className="flex items-start gap-4 flex-1">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                                      {lesson.order_number}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                                        {lesson.title}
                                      </h4>
                                      {lesson.description && (
                                        <p className="text-sm text-slate-600 line-clamp-2">
                                          {lesson.description}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-4 mt-2">
                                        {lesson.duration_minutes && (
                                          <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {lesson.duration_minutes} min
                                          </span>
                                        )}
                                        {lesson.file_url && (
                                          <Badge
                                            variant="outline"
                                            className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                          >
                                            Has Materials
                                          </Badge>
                                        )}
                                        {!lesson.is_published && (
                                          <Badge
                                            variant="outline"
                                            className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200"
                                          >
                                            Draft
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 ml-4">
                                    {lesson.file_url && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDownloadLesson(lesson)}
                                        className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                                      >
                                        <Download className="h-4 w-4 mr-2" />
                                        Download
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      onClick={() => handleViewLesson(lesson)}
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      View
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* Quizzes Section */}
                      {quizzes && quizzes.length > 0 && (
                        <AccordionItem value="quizzes" className="border-0 mt-2">
                          <AccordionTrigger className="hover:no-underline py-3 px-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                            <div className="flex items-center gap-2">
                              <Brain className="h-5 w-5 text-slate-600" />
                              <span className="font-semibold text-slate-900">
                                View All Quizzes ({quizzes.length})
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-4">
                            <div className="space-y-3">
                              {quizzes.map((quiz) => (
                                <div
                                  key={quiz.id}
                                  className="flex items-center justify-between p-4 bg-white border-2 border-slate-200 rounded-lg hover:border-purple-300 transition-colors group"
                                >
                                  <div className="flex items-start gap-4 flex-1">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white flex-shrink-0">
                                      <Brain className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-slate-900 mb-1 group-hover:text-purple-600 transition-colors">
                                        {quiz.title}
                                      </h4>
                                      {quiz.description && (
                                        <p className="text-sm text-slate-600 line-clamp-2">
                                          {quiz.description}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                                        {quiz.total_questions && (
                                          <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <FileText className="h-3 w-3" />
                                            {quiz.total_questions} questions
                                          </span>
                                        )}
                                        {quiz.time_limit_minutes && (
                                          <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {quiz.time_limit_minutes} min
                                          </span>
                                        )}
                                        {quiz.passing_score && (
                                          <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <Target className="h-3 w-3" />
                                            Pass: {quiz.passing_score}%
                                          </span>
                                        )}
                                        {quiz.difficulty && (
                                          <Badge
                                            variant="outline"
                                            className={getDifficultyColor(quiz.difficulty)}
                                          >
                                            {quiz.difficulty}
                                          </Badge>
                                        )}
                                        {quiz.type && (
                                          <Badge
                                            variant="outline"
                                            className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200"
                                          >
                                            {quiz.type}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 ml-4">
                                    <Button
                                      size="sm"
                                      onClick={() => handleViewQuiz(quiz)}
                                      className="bg-purple-600 hover:bg-purple-700"
                                    >
                                      <PlayCircle className="h-4 w-4 mr-2" />
                                      Start Quiz
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                    </Accordion>

                    {/* Course Footer */}
                    <div className="flex items-center justify-between mt-6 pt-6 border-t">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Enrolled on{" "}
                          {new Date(enrollment.enrollment_date).toLocaleDateString()}
                        </span>
                      </div>
                      {enrollment.status === "enrolled" && lessons && lessons.length > 0 && (
                        <Button
                          onClick={() =>
                            handleViewLesson(
                              lessons[courseData.completedLessons] || lessons[0]
                            )
                          }
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                          <PlayCircle className="h-4 w-4 mr-2" />
                          {courseData.completedLessons > 0
                            ? "Continue Learning"
                            : "Start Course"}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}