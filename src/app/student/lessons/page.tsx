/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/auth";
import { toast } from "sonner";
import Link from "next/link";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  BookOpen,
  Search,
  Loader2,
  Clock,
  FileText,
  Download,
  Eye,
  Filter,
  BookMarked,
  GraduationCap,
  Calendar,
  Award,
  TrendingUp,
  PlayCircle,
  CheckCircle2,
  List,
  Grid3x3,
  ArrowRight,
} from "lucide-react";

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
  created_at: string;
};

type Course = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  slug: string;
};

type EnrolledCourse = {
  id: string;
  student_id: string;
  course_id: string;
  enrollment_date: string;
  status: string;
  course: Course;
};

type LessonWithCourse = Lesson & {
  course: Course;
};

export default function StudentLessonsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [lessons, setLessons] = useState<LessonWithCourse[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    loadLessonsData();
  }, []);

  const loadLessonsData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to view lessons");
        router.push("/login");
        return;
      }

      setCurrentUser(user);

      // Get enrolled courses
      const { data: enrollments, error: enrollError } = await supabase
        .from("student_courses")
        .select("*")
        .eq("student_id", user.id)
        .eq("status", "enrolled");

      if (enrollError) throw enrollError;

      if (!enrollments || enrollments.length === 0) {
        setEnrolledCourses([]);
        setLessons([]);
        return;
      }

      const courseIds = enrollments.map((e) => e.course_id);

      // Get course details
      const { data: courses, error: coursesError } = await supabase
        .from("courses")
        .select("id, name, code, description, slug")
        .in("id", courseIds);

      if (coursesError) throw coursesError;

      // Combine enrollments with course data
      const enrichedEnrollments = enrollments.map((enrollment) => ({
        ...enrollment,
        course: courses?.find((c) => c.id === enrollment.course_id) || {
          id: enrollment.course_id,
          name: "Unknown Course",
          code: "N/A",
          description: null,
          slug: "",
        },
      }));

      setEnrolledCourses(enrichedEnrollments);

      // Get all lessons for enrolled courses
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select("*")
        .in("course_id", courseIds)
        .order("created_at", { ascending: false });

      if (lessonsError) throw lessonsError;

      // Enrich lessons with course data
      const enrichedLessons = (lessonsData || []).map((lesson) => ({
        ...lesson,
        course: courses?.find((c) => c.id === lesson.course_id) || {
          id: lesson.course_id,
          name: "Unknown Course",
          code: "N/A",
          description: null,
          slug: "",
        },
      }));

      setLessons(enrichedLessons);
    } catch (err: any) {
      console.error("Error loading lessons:", err);
      toast.error(err?.message || "Failed to load lessons");
    } finally {
      setLoading(false);
    }
  };

  const filteredLessons = useMemo(() => {
    const q = search.toLowerCase().trim();
    return lessons.filter((lesson) => {
      const matchesSearch =
        !q ||
        lesson.title.toLowerCase().includes(q) ||
        (lesson.description?.toLowerCase().includes(q) ?? false) ||
        lesson.course.name.toLowerCase().includes(q) ||
        lesson.course.code.toLowerCase().includes(q);

      const matchesCourse =
        courseFilter === "all" || lesson.course_id === courseFilter;

      return matchesSearch && matchesCourse;
    });
  }, [lessons, search, courseFilter]);

  // Group lessons by course
  const lessonsByCourse = useMemo(() => {
    const grouped = new Map<string, LessonWithCourse[]>();
    filteredLessons.forEach((lesson) => {
      const courseId = lesson.course_id;
      if (!grouped.has(courseId)) {
        grouped.set(courseId, []);
      }
      grouped.get(courseId)!.push(lesson);
    });
    
    // Sort lessons within each course by order_number
    grouped.forEach((lessons) => {
      lessons.sort((a, b) => a.order_number - b.order_number);
    });
    
    return grouped;
  }, [filteredLessons]);

  const stats = useMemo(() => {
    return {
      totalLessons: lessons.length,
      totalCourses: enrolledCourses.length,
      totalDuration: lessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0),
      lessonsWithMaterials: lessons.filter((l) => l.file_url).length,
    };
  }, [lessons, enrolledCourses]);

  const handleViewLesson = (lessonId: string) => {
    router.push(`/student/lessons/${lessonId}`);
  };

  const handleDownloadLesson = async (lesson: Lesson, e: React.MouseEvent) => {
    e.stopPropagation();
    
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
          <p className="text-lg text-slate-600">Loading your lessons...</p>
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
              <h1 className="text-3xl font-bold mb-2">My Lessons</h1>
              <p className="text-blue-100">
                Access all your course materials in one place
              </p>
            </div>
            <div className="hidden md:block">
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-blue-100">Total Lessons</p>
                  <p className="text-2xl font-bold">{stats.totalLessons}</p>
                </div>
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                  <BookOpen className="h-8 w-8" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Lessons</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.totalLessons}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <BookMarked className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Active Courses</p>
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
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Duration</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {Math.round(stats.totalDuration / 60)}h
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Download className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">With Materials</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.lessonsWithMaterials}
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
              placeholder="Search lessons by title, description, or course..."
              className="pl-10 h-12 bg-white"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-400" />
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-[200px] h-12 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {enrolledCourses.map((enrollment) => (
                  <SelectItem key={enrollment.course_id} value={enrollment.course_id}>
                    {enrollment.course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1 bg-white rounded-lg border p-1">
            <Button
              size="sm"
              variant={viewMode === "grid" ? "default" : "ghost"}
              onClick={() => setViewMode("grid")}
              className="h-10"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              onClick={() => setViewMode("list")}
              className="h-10"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Lessons Display */}
        {filteredLessons.length === 0 && !search && courseFilter === "all" ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center mx-auto mb-6">
                <BookOpen className="h-10 w-10 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                No Lessons Available
              </h3>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">
                You don't have any lessons yet. Your instructors will add lessons to your enrolled courses.
              </p>
              <Button
                asChild
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                <Link href="/student/programs">
                  <BookMarked className="h-4 w-4 mr-2" />
                  View My Courses
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : filteredLessons.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Search className="h-16 w-16 text-slate-300 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                No lessons found
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
                {courseFilter !== "all" && (
                  <Button variant="outline" onClick={() => setCourseFilter("all")}>
                    Clear Filter
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList className="bg-white border shadow-sm">
              <TabsTrigger value="all">All Lessons</TabsTrigger>
              <TabsTrigger value="by-course">By Course</TabsTrigger>
            </TabsList>

            {/* All Lessons View */}
            <TabsContent value="all" className="space-y-4">
              {viewMode === "grid" ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredLessons.map((lesson) => (
                    <Card
                      key={lesson.id}
                      className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer group"
                      onClick={() => handleViewLesson(lesson.id)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                            {lesson.order_number}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Badge variant="outline" className="text-xs mb-2">
                              {lesson.course.code}
                            </Badge>
                            <CardTitle className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                              {lesson.title}
                            </CardTitle>
                          </div>
                        </div>
                        {lesson.description && (
                          <CardDescription className="line-clamp-2 text-sm">
                            {lesson.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-4 text-xs text-slate-600">
                          {lesson.duration_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {lesson.duration_minutes} min
                            </span>
                          )}
                          {lesson.file_url && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              Has Materials
                            </Badge>
                          )}
                          {!lesson.is_published && (
                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                              Draft
                            </Badge>
                          )}
                        </div>

                        <div className="text-xs text-slate-500">
                          {lesson.course.name}
                        </div>

                        <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                          {lesson.file_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleDownloadLesson(lesson, e)}
                              className="flex-1 hover:bg-green-50 hover:text-green-600 hover:border-green-300"
                            >
                              <Download className="h-3.5 w-3.5 mr-1.5" />
                              Download
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleViewLesson(lesson.id)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLessons.map((lesson) => (
                    <Card
                      key={lesson.id}
                      className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
                      onClick={() => handleViewLesson(lesson.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                            {lesson.order_number}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {lesson.course.code}
                              </Badge>
                              <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                {lesson.title}
                              </h3>
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs text-slate-600">
                              <span className="truncate">{lesson.course.name}</span>
                              {lesson.duration_minutes && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {lesson.duration_minutes} min
                                  </span>
                                </>
                              )}
                              {lesson.file_url && (
                                <>
                                  <span>•</span>
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                    Materials
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {lesson.file_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => handleDownloadLesson(lesson, e)}
                                className="hover:bg-green-50 hover:text-green-600 hover:border-green-300"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleViewLesson(lesson.id)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* By Course View */}
            <TabsContent value="by-course" className="space-y-6">
              {Array.from(lessonsByCourse.entries()).map(([courseId, courseLessons]) => {
                const course = courseLessons[0].course;
                return (
                  <Card key={courseId} className="border-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xl">{course.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                            <Badge variant="outline">{course.code}</Badge>
                            <span>•</span>
                            <span>{courseLessons.length} lessons</span>
                          </div>
                        </div>
                        <BookMarked className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        {courseLessons.map((lesson) => (
                          <div
                            key={lesson.id}
                            onClick={() => handleViewLesson(lesson.id)}
                            className="flex items-center justify-between p-4 bg-white border-2 border-slate-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                                {lesson.order_number}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                                  {lesson.title}
                                </h4>
                                <div className="flex items-center gap-4 mt-1 text-xs text-slate-600">
                                  {lesson.duration_minutes && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {lesson.duration_minutes} min
                                    </span>
                                  )}
                                  {lesson.file_url && (
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      Materials
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              {lesson.file_url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => handleDownloadLesson(lesson, e)}
                                  className="hover:bg-green-50 hover:text-green-600 hover:border-green-300"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </Button>
                              )}
                              <Button
                                size="sm"
                                onClick={() => handleViewLesson(lesson.id)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}