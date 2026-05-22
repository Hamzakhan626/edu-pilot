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
  Brain,
  Search,
  Loader2,
  Clock,
  FileText,
  PlayCircle,
  Filter,
  BookMarked,
  GraduationCap,
  Calendar,
  Award,
  TrendingUp,
  CheckCircle2,
  List,
  Grid3x3,
  Target,
  AlertCircle,
  Trophy,
  BarChart3,
  Eye,
} from "lucide-react";

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
  scheduled_at: string | null;
  status: string | null;
  allow_late_submission: boolean | null;
  show_results: boolean | null;
  shuffle_questions: boolean | null;
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

type QuizWithCourse = Quiz & {
  course: Course;
};

type QuizAttempt = {
  percentage: null;
  id: string;
  quiz_id: string;
  student_id: string;
  score: number | null;
  total_score: number | null;
  status: string;
  started_at: string;
  completed_at: string | null;
};

export default function StudentQuizzesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<QuizWithCourse[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    loadQuizzesData();
  }, []);

  const loadQuizzesData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to view quizzes");
        router.push("/login");
        setLoading(false);
        return;
      }

      setCurrentUser(user);

      // Get enrolled courses
      const { data: enrollments, error: enrollError } = await supabase
        .from("student_courses")
        .select("*")
        .eq("student_id", user.id)
        .eq("status", "enrolled");

      if (enrollError) {
        console.error("Enrollment error:", enrollError);
        throw enrollError;
      }

      if (!enrollments || enrollments.length === 0) {
        setEnrolledCourses([]);
        setQuizzes([]);
        setQuizAttempts([]);
        setLoading(false);
        return;
      }

      const courseIds = enrollments.map((e) => e.course_id);

      // Get course details
      const { data: courses, error: coursesError } = await supabase
        .from("courses")
        .select("id, name, code, description, slug")
        .in("id", courseIds);

      if (coursesError) {
        console.error("Courses error:", coursesError);
        throw coursesError;
      }

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

      // Get all quizzes for enrolled courses
      const { data: quizzesData, error: quizzesError } = await supabase
        .from("quizzes")
        .select("*")
        .in("course_id", courseIds)
        .order("created_at", { ascending: false });

      if (quizzesError) {
        console.error("Quizzes error:", quizzesError);
        throw quizzesError;
      }

      // Enrich quizzes with course data
      const enrichedQuizzes = (quizzesData || []).map((quiz) => ({
        ...quiz,
        course: courses?.find((c) => c.id === quiz.course_id) || {
          id: quiz.course_id,
          name: "Unknown Course",
          code: "N/A",
          description: null,
          slug: "",
        },
      }));

      setQuizzes(enrichedQuizzes);

      // Get quiz submissions for this student
      if (quizzesData && quizzesData.length > 0) {
        const quizIds = quizzesData.map(q => q.id);
        
        const { data: submissions, error: submissionsError } = await supabase
          .from("quiz_submissions")
          .select("*")
          .eq("student_id", user.id)
          .in("quiz_id", quizIds);

        if (submissionsError) {
          console.error("Error loading submissions:", submissionsError);
          // Don't throw - submissions are optional
          setQuizAttempts([]);
        } else {
          setQuizAttempts(submissions || []);
        }
      } else {
        setQuizAttempts([]);
      }

    } catch (err: any) {
      console.error("Error loading quizzes:", err);
      toast.error(err?.message || "Failed to load quizzes");
      setEnrolledCourses([]);
      setQuizzes([]);
      setQuizAttempts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuizzes = useMemo(() => {
    const q = search.toLowerCase().trim();
    return quizzes.filter((quiz) => {
      const matchesSearch =
        !q ||
        quiz.title.toLowerCase().includes(q) ||
        (quiz.description?.toLowerCase().includes(q) ?? false) ||
        quiz.course.name.toLowerCase().includes(q) ||
        quiz.course.code.toLowerCase().includes(q);

      const matchesCourse =
        courseFilter === "all" || quiz.course_id === courseFilter;

      const matchesDifficulty =
        difficultyFilter === "all" || quiz.difficulty === difficultyFilter;

      const matchesStatus =
        statusFilter === "all" || quiz.status === statusFilter;

      return matchesSearch && matchesCourse && matchesDifficulty && matchesStatus;
    });
  }, [quizzes, search, courseFilter, difficultyFilter, statusFilter]);

  // Group quizzes by course
  const quizzesByCourse = useMemo(() => {
    const grouped = new Map<string, QuizWithCourse[]>();
    filteredQuizzes.forEach((quiz) => {
      const courseId = quiz.course_id;
      if (!grouped.has(courseId)) {
        grouped.set(courseId, []);
      }
      grouped.get(courseId)!.push(quiz);
    });
    
    return grouped;
  }, [filteredQuizzes]);

  const stats = useMemo(() => {
    const completedSubmissions = quizAttempts.filter(
      (attempt) => attempt.status === "submitted"
    );

    return {
      totalQuizzes: quizzes.length,
      totalCourses: enrolledCourses.length,
      publishedQuizzes: quizzes.filter((q) => q.status === "published").length,
      attemptedQuizzes: completedSubmissions.length,
    };
  }, [quizzes, enrolledCourses, quizAttempts]);

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

  const getStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case "published":
        return "bg-green-100 text-green-800 border-green-200";
      case "draft":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "scheduled":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleStartQuiz = (quizId: string) => {
    // Check if quiz has been attempted
    const submission = quizAttempts.find((attempt) => attempt.quiz_id === quizId);

    if (submission) {
      if (submission.status === "submitted" && submission.percentage !== null) {
        // Graded - go to results
        router.push(`/student/quizzes/${quizId}/results`);
      } else if (submission.status === "submitted" && submission.percentage === null) {
        // Submitted but not graded yet - go to pending page
        router.push(`/student/quizzes/${quizId}/pending`);
      } else if (submission.status === "in_progress") {
        // In progress - resume quiz
        router.push(`/student/quizzes/${quizId}`);
      }
    } else {
      // New attempt - start quiz
      router.push(`/student/quizzes/${quizId}`);
    }
  };

  const getQuizSubmission = (quizId: string) => {
    return quizAttempts.find((attempt) => attempt.quiz_id === quizId);
  };

  const getSubmissionStatus = (quizId: string) => {
    const submission = getQuizSubmission(quizId);
    if (!submission) return null;

    if (submission.status === "submitted" && submission.percentage === null) {
      return {
        label: "Pending Grade",
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        score: null,
      };
    } else if (submission.status === "submitted" && submission.percentage !== null) {
      return {
        label: "Graded",
        color: "bg-green-100 text-green-800 border-green-200",
        score: submission.percentage ? `${Math.round(submission.percentage)}%` : null,
      };
    } else if (submission.status === "in_progress") {
      return {
        label: "In Progress",
        color: "bg-blue-100 text-blue-800 border-blue-200",
        score: null,
      };
    }

    return null;
  };

  const isQuizAvailable = (quiz: Quiz) => {
    console.log('Checking availability for quiz:', {
      id: quiz.id,
      title: quiz.title,
      status: quiz.status,
      scheduled_at: quiz.scheduled_at,
    });

    // If quiz status is not published, it's not available
    // Handle both 'published' and null/undefined status (consider null as published for backwards compatibility)
    const status = quiz.status?.toLowerCase();
    
    if (status && status !== "published") {
      console.log(`❌ Quiz "${quiz.title}" not available - status: ${quiz.status}`);
      return false;
    }
    
    // If there's a scheduled date, check if it has passed
    if (quiz.scheduled_at) {
      const scheduledDate = new Date(quiz.scheduled_at);
      const now = new Date();
      console.log('Schedule check:', {
        scheduled: scheduledDate.toISOString(),
        now: now.toISOString(),
        isPast: now >= scheduledDate,
      });
      if (now < scheduledDate) {
        console.log(`❌ Quiz "${quiz.title}" not available - scheduled for: ${scheduledDate}`);
        return false;
      }
    }
    
    // Quiz is available
    console.log(`✅ Quiz "${quiz.title}" IS available`);
    return true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-lg text-slate-600">Loading your quizzes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - Full width */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">My Quizzes</h1>
              <p className="text-purple-100">
                Test your knowledge and track your progress
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-purple-100">Total Quizzes</p>
                <p className="text-2xl font-bold">{stats.totalQuizzes}</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <Brain className="h-8 w-8" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards - Fixed spacing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Brain className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-500 font-medium">Total Quizzes</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {stats.totalQuizzes}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-500 font-medium">Published</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {stats.publishedQuizzes}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <BookMarked className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-500 font-medium">Courses</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {stats.totalCourses}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Trophy className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-500 font-medium">Attempted</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {stats.attemptedQuizzes}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Controls */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search quizzes by title, description, or course..."
                  className="pl-10 h-12 bg-white border-2 border-slate-200 focus:border-purple-300 transition-colors"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white rounded-lg border-2 border-slate-200 p-1">
                <Button
                  size="sm"
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  onClick={() => setViewMode("grid")}
                  className={`h-9 px-3 ${viewMode === "grid" ? "bg-purple-100 text-purple-700 hover:bg-purple-200" : ""}`}
                >
                  <Grid3x3 className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">Grid</span>
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "list" ? "default" : "ghost"}
                  onClick={() => setViewMode("list")}
                  className={`h-9 px-3 ${viewMode === "list" ? "bg-purple-100 text-purple-700 hover:bg-purple-200" : ""}`}
                >
                  <List className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">List</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filters:</span>
            </div>
            
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-10 bg-white border-2 border-slate-200">
                <SelectValue placeholder="All Courses" />
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

            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-full sm:w-[160px] h-10 bg-white border-2 border-slate-200">
                <SelectValue placeholder="All Difficulties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px] h-10 bg-white border-2 border-slate-200">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>

            {(search || courseFilter !== "all" || difficultyFilter !== "all" || statusFilter !== "all") && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSearch("");
                  setCourseFilter("all");
                  setDifficultyFilter("all");
                  setStatusFilter("all");
                }}
                className="ml-auto text-sm"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Quizzes Display */}
        {filteredQuizzes.length === 0 && !search && courseFilter === "all" ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center mx-auto mb-6">
                <Brain className="h-10 w-10 text-purple-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                No Quizzes Available
              </h3>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">
                You don't have any quizzes yet. Your instructors will add quizzes to your enrolled courses.
              </p>
              <Button
                asChild
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Link href="/student/programs">
                  <BookMarked className="h-4 w-4 mr-2" />
                  View My Courses
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : filteredQuizzes.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Search className="h-16 w-16 text-slate-300 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                No quizzes found
              </h3>
              <p className="text-slate-500 mb-6">
                Try adjusting your search or filters
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setCourseFilter("all");
                  setDifficultyFilter("all");
                  setStatusFilter("all");
                }}
              >
                Clear All Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList className="bg-white border-2 border-slate-200 shadow-sm">
              <TabsTrigger value="all" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
                All Quizzes
              </TabsTrigger>
              <TabsTrigger value="by-course" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
                By Course
              </TabsTrigger>
            </TabsList>

            {/* All Quizzes View */}
            <TabsContent value="all" className="space-y-6">
              {viewMode === "grid" ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredQuizzes.map((quiz) => {
                    const submissionStatus = getSubmissionStatus(quiz.id);
                    const submission = getQuizSubmission(quiz.id);
                    
                    return (
                      <Card
                        key={quiz.id}
                        className="border-2 border-slate-200 shadow-lg hover:shadow-xl hover:border-purple-300 transition-all duration-300 group"
                      >
                        <CardHeader className="pb-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge variant="outline" className="text-xs font-medium">
                                  {quiz.course.code}
                                </Badge>
                                {quiz.status && (
                                  <Badge variant="outline" className={`text-xs ${getStatusColor(quiz.status)}`}>
                                    {quiz.status}
                                  </Badge>
                                )}
                                {submissionStatus && (
                                  <Badge variant="outline" className={`text-xs ${submissionStatus.color}`}>
                                    {submissionStatus.label}
                                  </Badge>
                                )}
                              </div>
                              <CardTitle className="text-lg font-semibold text-slate-900 group-hover:text-purple-600 transition-colors line-clamp-2">
                                {quiz.title}
                              </CardTitle>
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                              <Brain className="h-5 w-5 text-white" />
                            </div>
                          </div>
                          {quiz.description && (
                            <CardDescription className="text-sm text-slate-600 line-clamp-2">
                              {quiz.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        
                        <CardContent className="pt-0">
                          {submissionStatus?.score && (
                            <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-green-700">Your Score</span>
                                <span className="text-2xl font-bold text-green-700">{submissionStatus.score}</span>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3 mb-4">
                            {quiz.total_questions && (
                              <div className="flex items-center gap-2 text-sm">
                                <FileText className="h-4 w-4 text-slate-400" />
                                <div>
                                  <p className="text-xs text-slate-500">Questions</p>
                                  <p className="font-semibold text-slate-900">{quiz.total_questions}</p>
                                </div>
                              </div>
                            )}
                            {quiz.time_limit_minutes && (
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-slate-400" />
                                <div>
                                  <p className="text-xs text-slate-500">Duration</p>
                                  <p className="font-semibold text-slate-900">{quiz.time_limit_minutes} min</p>
                                </div>
                              </div>
                            )}
                            {quiz.passing_score && (
                              <div className="flex items-center gap-2 text-sm">
                                <Target className="h-4 w-4 text-slate-400" />
                                <div>
                                  <p className="text-xs text-slate-500">Pass Score</p>
                                  <p className="font-semibold text-slate-900">{quiz.passing_score}%</p>
                                </div>
                              </div>
                            )}
                            {quiz.difficulty && (
                              <div className="flex items-center gap-2 text-sm">
                                <BarChart3 className="h-4 w-4 text-slate-400" />
                                <div>
                                  <p className="text-xs text-slate-500">Difficulty</p>
                                  <Badge variant="outline" className={`text-xs ${getDifficultyColor(quiz.difficulty)}`}>
                                    {quiz.difficulty}
                                  </Badge>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                            <span className="truncate">{quiz.course.name}</span>
                            {quiz.type && (
                              <Badge variant="outline" className="text-xs">
                                {quiz.type}
                              </Badge>
                            )}
                          </div>

                          <Button
                            onClick={() => handleStartQuiz(quiz.id)}
                            className="w-full h-11 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium"
                            size="lg"
                          >
                            {submission?.status === "submitted" && submission?.percentage !== null ? (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                View Results
                              </>
                            ) : submission?.status === "submitted" && submission?.percentage === null ? (
                              <>
                                <Clock className="h-4 w-4 mr-2" />
                                Pending Grade
                              </>
                            ) : submission?.status === "in_progress" ? (
                              <>
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Resume Quiz
                              </>
                            ) : (
                              <>
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Start Quiz
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredQuizzes.map((quiz) => {
                    const submissionStatus = getSubmissionStatus(quiz.id);
                    const submission = getQuizSubmission(quiz.id);
                    
                    return (
                      <Card
                        key={quiz.id}
                        className="border-2 border-slate-200 shadow-lg hover:shadow-xl hover:border-purple-300 transition-all duration-300"
                      >
                        <CardContent className="p-6">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                              <Brain className="h-6 w-6 text-white" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {quiz.course.code}
                                </Badge>
                                {submissionStatus && (
                                  <Badge variant="outline" className={`text-xs ${submissionStatus.color}`}>
                                    {submissionStatus.label}
                                  </Badge>
                                )}
                                <h3 className="font-semibold text-lg text-slate-900 truncate">
                                  {quiz.title}
                                </h3>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-2">
                                <span className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  {quiz.total_questions || 0} questions
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {quiz.time_limit_minutes || 0} min
                                </span>
                                {quiz.difficulty && (
                                  <Badge variant="outline" className={getDifficultyColor(quiz.difficulty)}>
                                    {quiz.difficulty}
                                  </Badge>
                                )}
                                <span className="text-slate-500">
                                  {quiz.course.name}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 w-full sm:w-auto">
                              {submissionStatus?.score && (
                                <div className="text-right">
                                  <p className="text-xs text-slate-500">Score</p>
                                  <p className="text-xl font-bold text-green-600">{submissionStatus.score}</p>
                                </div>
                              )}
                              
                              <Button
                                onClick={() => handleStartQuiz(quiz.id)}
                                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white min-w-[140px]"
                              >
                                {submission?.status === "submitted" ? (
                                  <>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Results
                                  </>
                                ) : submission?.status === "in_progress" ? (
                                  <>
                                    <PlayCircle className="h-4 w-4 mr-2" />
                                    Resume
                                  </>
                                ) : (
                                  <>
                                    <PlayCircle className="h-4 w-4 mr-2" />
                                    Start Quiz
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* By Course View */}
            <TabsContent value="by-course" className="space-y-8">
              {Array.from(quizzesByCourse.entries()).map(([courseId, courseQuizzes]) => {
                const course = courseQuizzes[0].course;
                return (
                  <Card key={courseId} className="border-2 border-slate-200 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-slate-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <CardTitle className="text-xl font-bold text-slate-900">{course.name}</CardTitle>
                            <Badge variant="outline" className="font-medium">
                              {course.code}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">
                            {courseQuizzes.length} quiz{courseQuizzes.length !== 1 ? 'zes' : ''} available
                          </p>
                        </div>
                        <GraduationCap className="h-8 w-8 text-purple-600" />
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {courseQuizzes.map((quiz) => {
                          const submissionStatus = getSubmissionStatus(quiz.id);
                          const submission = getQuizSubmission(quiz.id);
                          
                          return (
                            <div
                              key={quiz.id}
                              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white border-2 border-slate-200 rounded-lg hover:border-purple-300 transition-colors group"
                            >
                              <div className="flex items-start gap-4 flex-1 mb-4 sm:mb-0">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                                  <Brain className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <h4 className="font-semibold text-slate-900 group-hover:text-purple-600 transition-colors">
                                      {quiz.title}
                                    </h4>
                                    {submissionStatus && (
                                      <Badge variant="outline" className={`text-xs ${submissionStatus.color}`}>
                                        {submissionStatus.label}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                                    {quiz.total_questions && (
                                      <span className="flex items-center gap-1">
                                        <FileText className="h-3 w-3" />
                                        {quiz.total_questions} questions
                                      </span>
                                    )}
                                    {quiz.time_limit_minutes && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {quiz.time_limit_minutes} min
                                      </span>
                                    )}
                                    {quiz.difficulty && (
                                      <Badge variant="outline" className={getDifficultyColor(quiz.difficulty)}>
                                        {quiz.difficulty}
                                      </Badge>
                                    )}
                                    {quiz.type && (
                                      <Badge variant="outline" className="text-xs">
                                        {quiz.type}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4 w-full sm:w-auto">
                                {submissionStatus?.score && (
                                  <div className="text-right">
                                    <p className="text-xs text-slate-500">Score</p>
                                    <p className="text-lg font-bold text-green-600">{submissionStatus.score}</p>
                                  </div>
                                )}
                                
                                <Button
                                  onClick={() => handleStartQuiz(quiz.id)}
                                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white min-w-[140px]"
                                >
                                  {submission?.status === "submitted" ? (
                                    <>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Results
                                    </>
                                  ) : submission?.status === "in_progress" ? (
                                    <>
                                      <PlayCircle className="h-4 w-4 mr-2" />
                                      Resume
                                    </>
                                  ) : (
                                    <>
                                      <PlayCircle className="h-4 w-4 mr-2" />
                                      Start Quiz
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
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