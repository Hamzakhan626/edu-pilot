/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

import {
  BookOpen,
  Download,
  Loader2,
  ArrowLeft,
  Clock,
  FileText,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Home,
  List,
  Eye,
  BookMarked,
  PlayCircle,
  Calendar,
  User,
  Info,
  AlertCircle,
  ExternalLink,
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

type LessonNavigation = {
  previous: Lesson | null;
  next: Lesson | null;
  current: number;
  total: number;
};

export default function StudentLessonPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = params?.id as string;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [navigation, setNavigation] = useState<LessonNavigation | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (lessonId) {
      loadLessonData();
    }
  }, [lessonId]);

  const loadLessonData = async () => {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to view lessons");
        router.push("/login");
        return;
      }
      setCurrentUser(user);

      // Get lesson details
      const { data: lessonData, error: lessonError } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", lessonId)
        .single();

      if (lessonError) throw lessonError;
      if (!lessonData) {
        toast.error("Lesson not found");
        router.push("/student/programs");
        return;
      }

      setLesson(lessonData);

      // Get course details
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("id, name, code, description, slug")
        .eq("id", lessonData.course_id)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Check enrollment
      const { data: enrollment, error: enrollError } = await supabase
        .from("student_courses")
        .select("id")
        .eq("student_id", user.id)
        .eq("course_id", lessonData.course_id)
        .single();

      if (enrollError && enrollError.code !== "PGRST116") {
        console.error("Enrollment check error:", enrollError);
      }

      setIsEnrolled(!!enrollment);

      // Get all lessons for this course
      const { data: lessons, error: lessonsError } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", lessonData.course_id)
        .order("order_number", { ascending: true });

      if (lessonsError) throw lessonsError;

      setAllLessons(lessons || []);

      // Calculate navigation
      if (lessons && lessons.length > 0) {
        const currentIndex = lessons.findIndex((l) => l.id === lessonId);
        setNavigation({
          previous: currentIndex > 0 ? lessons[currentIndex - 1] : null,
          next:
            currentIndex < lessons.length - 1
              ? lessons[currentIndex + 1]
              : null,
          current: currentIndex + 1,
          total: lessons.length,
        });
      }
    } catch (err: any) {
      console.error("Error loading lesson:", err);
      toast.error(err?.message || "Failed to load lesson");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!lesson?.file_url) {
      toast.error("No file available for download");
      return;
    }

    try {
      setDownloading(true);
      toast.loading("Preparing download...", { id: "download" });

      if (lesson.file_url.includes("supabase")) {
        const url = new URL(lesson.file_url);
        const pathParts = url.pathname.split("/");
        const bucketIndex = pathParts.findIndex(
          (part) => part === "lesson-files",
        );

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
    } finally {
      setDownloading(false);
    }
  };

  const handleNavigate = (lessonId: string) => {
    router.push(`/student/lessons/${lessonId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-slate-600">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (!lesson || !course) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Lesson Not Found</h3>
            <p className="text-slate-600 mb-4">
              The lesson you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push("/student/programs")}>
              <Home className="h-4 w-4 mr-2" />
              Go to My Courses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isEnrolled) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Access Restricted</h3>
            <p className="text-slate-600 mb-4">
              You need to be enrolled in {course.name} to access this lesson.
            </p>
            <Button onClick={() => router.push("/student/programs")}>
              <Home className="h-4 w-4 mr-2" />
              Go to My Courses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/student/programs")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>

            <div className="flex items-center gap-2">
              {lesson.file_url && (
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download Materials
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-100">
              <BookMarked className="h-4 w-4" />
              <span className="text-sm">
                {course.name} ({course.code})
              </span>
            </div>
            <h1 className="text-3xl font-bold">
              Lesson {lesson.order_number}: {lesson.title}
            </h1>
            {navigation && (
              <div className="flex items-center gap-2 text-blue-100 text-sm">
                <Progress
                  value={(navigation.current / navigation.total) * 100}
                  className="w-32 h-2 bg-white/20"
                />
                <span>
                  {navigation.current} of {navigation.total} lessons
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lesson Info Card */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-2">
                      {lesson.title}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      {lesson.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {lesson.duration_minutes} minutes
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(lesson.created_at).toLocaleDateString()}
                      </span>
                      {!lesson.is_published && (
                        <Badge
                          variant="outline"
                          className="bg-yellow-50 text-yellow-700 border-yellow-200"
                        >
                          Draft
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {lesson.description && (
                  <CardDescription className="text-base mt-4">
                    {lesson.description}
                  </CardDescription>
                )}
              </CardHeader>
            </Card>

            {/* Lesson Content */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Lesson Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lesson.content ? (
                  <div
                    className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-a:text-blue-600 prose-strong:text-slate-900 prose-code:text-purple-600 prose-pre:bg-slate-900 prose-pre:text-slate-100"
                    dangerouslySetInnerHTML={{ __html: lesson.content }}
                  />
                ) : (
                  <div className="text-center py-12">
                    <Info className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 mb-2">
                      No content available yet
                    </p>
                    <p className="text-sm text-slate-400">
                      The instructor hasn't added content to this lesson.
                    </p>
                    {lesson.file_url && (
                      <p className="text-sm text-slate-600 mt-4">
                        You can download the lesson materials above.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            {navigation && (
              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  onClick={() =>
                    navigation.previous &&
                    handleNavigate(navigation.previous.id)
                  }
                  disabled={!navigation.previous}
                  className="flex-1 h-12"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous Lesson
                </Button>
                <Button
                  onClick={() =>
                    navigation.next && handleNavigate(navigation.next.id)
                  }
                  disabled={!navigation.next}
                  className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Next Lesson
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Course Info */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Course Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-900 mb-1">
                    {course.name}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {course.code}
                  </Badge>
                </div>
                {course.description && (
                  <div>
                    <p className="text-sm text-slate-600">
                      {course.description}
                    </p>
                  </div>
                )}
                <Separator />
                <Button asChild variant="outline" className="w-full">
                  <Link href="/student/programs">
                    <List className="h-4 w-4 mr-2" />
                    View All My Courses
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* All Lessons */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Course Lessons</CardTitle>
                <CardDescription>
                  {allLessons.length} lessons available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {allLessons.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => handleNavigate(l.id)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        l.id === lessonId
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                            l.id === lessonId
                              ? "bg-blue-600 text-white"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {l.order_number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium line-clamp-2 ${
                              l.id === lessonId
                                ? "text-blue-900"
                                : "text-slate-900"
                            }`}
                          >
                            {l.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {l.duration_minutes && (
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {l.duration_minutes} min
                              </span>
                            )}
                            {l.file_url && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-green-50 text-green-700 border-green-200"
                              >
                                Materials
                              </Badge>
                            )}
                          </div>
                        </div>
                        {l.id === lessonId && (
                          <PlayCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {lesson.file_url && (
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Download className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                    <h4 className="font-semibold text-slate-900 mb-2">
                      Download Materials
                    </h4>
                    <p className="text-sm text-slate-600 mb-4">
                      Get offline access to this lesson's materials
                    </p>
                    <Button
                      onClick={handleDownload}
                      disabled={downloading}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {downloading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Download Now
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
