/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// File location: app/admin/quizzes/[id]/page.tsx

import React, { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

import {
  ArrowLeft,
  Edit,
  Copy,
  Eye,
  BarChart,
  Users,
  Clock,
  Calendar,
  CheckCircle,
  ListChecks,
  Timer,
  FileText,
  Zap,
  Settings,
  Share2,
  Download,
  Printer,
  ExternalLink,
  ChevronRight,
  Award,
  Target,
  AlertCircle,
  Loader2,
  Sparkles,
  BookOpen,
  GraduationCap,
  RefreshCw,
  AlertTriangle,
  Home,
} from "lucide-react";

type Quiz = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  total_questions: number;
  passing_score: number;
  time_limit_minutes: number | null;
  type: string;
  difficulty: string;
  scheduled_at: string | null;
  status: "draft" | "published" | "completed" | "cancelled";
  allow_late_submission: boolean;
  show_results: boolean;
  shuffle_questions: boolean;
  created_by: string | null;
  section: string | null;
  created_at: string;
  updated_at: string;
};

type QuizQuestion = {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: "multiple_choice" | "short_answer" | "essay";
  options: any;
  correct_answer: string | null;
  points: number;
  question_order: number;
};

type QuizSubmission = {
  id: string;
  student_id: string;
  status: string;
  percentage: number | null;
};

export default function ViewQuizPage() {
  const params = useParams();
  const router = useRouter();
  
  // Simplified param extraction
  const quizId = (params?.id as string) || null;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [course, setCourse] = useState<any>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState({
    averageScore: 0,
    completionRate: 0,
    totalSubmissions: 0,
    pendingGrading: 0,
  });

  // Ensure component is mounted before running any client-side code
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only run on client side after mount
    if (!mounted) return;
    
    const loadData = async () => {
      // Debug logging
      console.log("=== ROUTE DEBUG ===");
      console.log("Params object:", params);
      console.log("Extracted quizId:", quizId);
      console.log("Window pathname:", window.location.pathname);

      if (!quizId) {
        console.error("No quiz ID available");
        setError("No quiz ID provided. Please check the URL.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log("Loading quiz with ID:", quizId);

        // Load quiz details
        const { data: quizData, error: quizError } = await supabase
          .from("quizzes")
          .select("*")
          .eq("id", quizId)
          .single();

        if (quizError) {
          console.error("Quiz query error:", quizError);
          
          if (quizError.code === "PGRST116") {
            setError("Quiz not found. It may have been deleted.");
          } else if (quizError.code === "42P01") {
            setError("The quizzes table doesn't exist. Please run migrations.");
          } else {
            setError(quizError.message || "Failed to load quiz");
          }
          setLoading(false);
          return;
        }

        if (!quizData) {
          setError("Quiz not found");
          setLoading(false);
          return;
        }

        console.log("Quiz loaded successfully:", quizData);
        setQuiz(quizData);

        // Load course details (non-blocking)
        if (quizData.course_id) {
          try {
            const { data: courseData } = await supabase
              .from("courses")
              .select("*")
              .eq("id", quizData.course_id)
              .single();

            if (courseData) {
              setCourse(courseData);
            }
          } catch (err) {
            console.warn("Could not load course details:", err);
          }
        }

        // Load questions (non-blocking)
        try {
          const { data: questionsData } = await supabase
            .from("quiz_questions")
            .select("*")
            .eq("quiz_id", quizId)
            .order("question_order");

          setQuestions(questionsData || []);
        } catch (err) {
          console.warn("Could not load questions:", err);
          setQuestions([]);
        }

        // Load submissions and calculate stats (non-blocking)
        try {
          const { data: submissionsData } = await supabase
            .from("quiz_submissions")
            .select("id, student_id, status, percentage")
            .eq("quiz_id", quizId);

          if (submissionsData) {
            setSubmissions(submissionsData);

            // Calculate stats
            const gradedSubmissions = submissionsData.filter(
              (s) => s.percentage !== null
            );
            const pendingGrading = submissionsData.filter(
              (s) => s.percentage === null && s.status === "submitted"
            );

            const averageScore =
              gradedSubmissions.length > 0
                ? gradedSubmissions.reduce((acc, s) => acc + (s.percentage || 0), 0) /
                  gradedSubmissions.length
                : 0;

            const completionRate =
              submissionsData.length > 0
                ? (gradedSubmissions.length / submissionsData.length) * 100
                : 0;

            setStats({
              averageScore: Math.round(averageScore * 100) / 100,
              completionRate: Math.round(completionRate * 100) / 100,
              totalSubmissions: submissionsData.length,
              pendingGrading: pendingGrading.length,
            });
          }
        } catch (err) {
          console.warn("Could not load submissions:", err);
          setStats({
            averageScore: 0,
            completionRate: 0,
            totalSubmissions: 0,
            pendingGrading: 0,
          });
        }
      } catch (err: any) {
        console.error("Error loading quiz data:", err);
        setError(err?.message || "Failed to load quiz data");
        toast.error(err?.message || "Failed to load quiz data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [quizId, params, mounted]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            Draft
          </Badge>
        );
      case "published":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Published
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="secondary" className="bg-blue-50 text-blue-700">
            Completed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive" className="bg-red-50 text-red-700">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Easy
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Medium
          </Badge>
        );
      case "hard":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">Hard</Badge>
        );
      default:
        return <Badge variant="outline">{difficulty}</Badge>;
    }
  };

  const handleCopyQuizLink = () => {
    if (!quiz) return;
    // Student-facing quiz link
    const quizLink = `${window.location.origin}/student/quiz/${quiz.id}`;
    navigator.clipboard.writeText(quizLink);
    toast.success("Quiz link copied to clipboard!");
  };

  const handleGradeSubmissions = () => {
    if (!quiz) return;
    router.push(`/admin/quizzes/${quiz.id}/grading`);
  };

  const handlePreviewQuiz = () => {
    if (!quiz) return;
    // Open student-facing quiz page in new tab
    window.open(`/student/quiz/${quiz.id}`, "_blank");
  };

  // Don't render anything until mounted (prevents SSR issues)
  if (!mounted) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto" />
          <div>
            <p className="text-slate-900 font-medium">Loading quiz details...</p>
            <p className="text-slate-500 text-sm mt-1">
              {quizId ? `Quiz ID: ${quizId}` : "Checking route parameters..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !quiz) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <CardTitle>Failed to Load Quiz</CardTitle>
                <CardDescription className="mt-2">
                  {error || "The quiz you're looking for doesn't exist."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!quizId && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-amber-900 mb-1">
                        Routing Issue Detected
                      </h4>
                      <p className="text-sm text-amber-700 mb-2">
                        The quiz ID is missing from the URL.
                      </p>
                      <div className="bg-amber-100 p-3 rounded text-xs font-mono mb-2">
                        <div>Expected folder: <strong>app/admin/quizzes/[id]/page.tsx</strong></div>
                        <div className="mt-1">Current URL: <strong>{window.location.pathname}</strong></div>
                        <div className="mt-1">Params received: <strong>{JSON.stringify(params)}</strong></div>
                      </div>
                      <p className="text-sm text-amber-700">
                        Make sure your file is in the correct folder and you're navigating with: <code className="bg-amber-100 px-1 rounded">router.push(`/admin/quizzes/$&#123;id&#125;`)</code>
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => window.location.reload()} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Page
                </Button>
                <Button onClick={() => router.push("/admin/quizzes")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Quizzes
                </Button>
                <Button onClick={() => router.push("/admin")} variant="outline">
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
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
                onClick={() => router.push("/admin/quizzes")}
                className="hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {quiz.title}
                </h1>
                {course && (
                  <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                    <BookOpen className="h-4 w-4" />
                    {course.name} • {course.code}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleCopyQuizLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button
                size="sm"
                onClick={() => router.push(`/admin/quizzes/${quizId}/edit`)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Quiz
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Quiz Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quiz Info Card */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">
                      Quiz Details
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {quiz.description || "No description provided"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(quiz.status)}
                    {getDifficultyBadge(quiz.difficulty)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-2">
                        Quiz Type
                      </h3>
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-purple-600" />
                        <span className="font-medium capitalize">
                          {quiz.type.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-2">
                        Total Questions
                      </h3>
                      <div className="flex items-center gap-2">
                        <ListChecks className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">{questions.length}</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-2">
                        Passing Score
                      </h3>
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-green-600" />
                        <span className="font-medium">
                          {quiz.passing_score}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {quiz.time_limit_minutes && (
                      <div>
                        <h3 className="text-sm font-medium text-slate-500 mb-2">
                          Time Limit
                        </h3>
                        <div className="flex items-center gap-2">
                          <Timer className="h-5 w-5 text-orange-600" />
                          <span className="font-medium">
                            {quiz.time_limit_minutes} minutes
                          </span>
                        </div>
                      </div>
                    )}

                    {quiz.scheduled_at && (
                      <div>
                        <h3 className="text-sm font-medium text-slate-500 mb-2">
                          Scheduled For
                        </h3>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-indigo-600" />
                          <span className="font-medium">
                            {new Date(quiz.scheduled_at).toLocaleDateString(
                              "en-US",
                              {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </span>
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-2">
                        Settings
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-slate-400" />
                          <span className="text-sm">
                            {quiz.shuffle_questions
                              ? "Questions shuffled"
                              : "Questions in order"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-slate-400" />
                          <span className="text-sm">
                            {quiz.show_results
                              ? "Results shown"
                              : "Results hidden"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span className="text-sm">
                            {quiz.allow_late_submission
                              ? "Late submissions allowed"
                              : "No late submissions"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-slate-200 pt-6">
                <div className="w-full flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleGradeSubmissions}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <GraduationCap className="h-4 w-4 mr-2" />
                    Grade Submissions ({stats.totalSubmissions})
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handlePreviewQuiz}
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Preview Quiz
                  </Button>
                </div>
              </CardFooter>
            </Card>

            {/* Questions Section */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-900">
                  Questions ({questions.length})
                </CardTitle>
                <CardDescription>
                  Review the questions included in this quiz
                </CardDescription>
              </CardHeader>
              <CardContent>
                {questions.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">
                      No questions yet
                    </h3>
                    <p className="text-slate-500 mb-6">
                      Add questions to this quiz to make it complete.
                    </p>
                    <Button
                      onClick={() =>
                        router.push(`/admin/quizzes/${quizId}/edit`)
                      }
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Add Questions
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((question, index) => (
                      <div
                        key={question.id}
                        className="border border-slate-200 rounded-lg p-4 hover:border-purple-200 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant="outline" className="bg-slate-100">
                                Question {index + 1}
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {question.question_type.replace("_", " ")}
                              </Badge>
                              <Badge className="bg-blue-100 text-blue-800">
                                {question.points} point
                                {question.points !== 1 ? "s" : ""}
                              </Badge>
                            </div>
                            <h4 className="font-medium text-slate-900 mb-2">
                              {question.question_text}
                            </h4>

                            {question.question_type === "multiple_choice" && (
                              <div className="mt-4">
                                <h5 className="text-sm font-medium text-slate-700 mb-2">
                                  Options:
                                </h5>
                                <div className="space-y-2">
                                  {Array.isArray(question.options) &&
                                    question.options.map(
                                      (option: string, idx: number) => (
                                        <div
                                          key={idx}
                                          className={`flex items-center gap-2 p-2 rounded ${
                                            option === question.correct_answer
                                              ? "bg-green-50 border border-green-200"
                                              : "bg-slate-50"
                                          }`}
                                        >
                                          <div
                                            className={`w-6 h-6 rounded flex items-center justify-center ${
                                              option === question.correct_answer
                                                ? "bg-green-100 text-green-700"
                                                : "bg-slate-100 text-slate-600"
                                            }`}
                                          >
                                            {String.fromCharCode(65 + idx)}
                                          </div>
                                          <span className="text-sm">
                                            {option}
                                          </span>
                                          {option ===
                                            question.correct_answer && (
                                            <Badge className="ml-auto bg-green-100 text-green-800">
                                              Correct
                                            </Badge>
                                          )}
                                        </div>
                                      )
                                    )}
                                </div>
                              </div>
                            )}

                            {(question.question_type === "essay" ||
                              question.question_type === "short_answer") && (
                              <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                                <p className="text-sm text-yellow-700 font-medium">
                                  {question.question_type === "essay"
                                    ? "Essay"
                                    : "Short answer"}{" "}
                                  question - requires manual grading
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Stats & Actions */}
          <div className="space-y-8">
            {/* Stats Card */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Quiz Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">
                      Average Score
                    </span>
                    <span className="font-bold text-slate-900">
                      {stats.averageScore}%
                    </span>
                  </div>
                  <Progress value={stats.averageScore} className="h-2" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">
                      Completion Rate
                    </span>
                    <span className="font-bold text-slate-900">
                      {stats.completionRate}%
                    </span>
                  </div>
                  <Progress value={stats.completionRate} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 mb-1">
                      {stats.totalSubmissions}
                    </div>
                    <div className="text-xs text-slate-600">Submissions</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="text-2xl font-bold text-yellow-600 mb-1">
                      {stats.pendingGrading}
                    </div>
                    <div className="text-xs text-slate-600">Pending</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start hover:bg-purple-50 hover:text-purple-700"
                  onClick={() => router.push(`/admin/quizzes/${quizId}/edit`)}
                >
                  <Edit className="h-4 w-4 mr-3" />
                  Edit Quiz Details
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start hover:bg-blue-50 hover:text-blue-700"
                  onClick={handleGradeSubmissions}
                >
                  <GraduationCap className="h-4 w-4 mr-3" />
                  Grade Submissions
                  {stats.pendingGrading > 0 && (
                    <Badge className="ml-auto bg-yellow-100 text-yellow-800">
                      {stats.pendingGrading}
                    </Badge>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start hover:bg-green-50 hover:text-green-700"
                  onClick={handleCopyQuizLink}
                >
                  <Share2 className="h-4 w-4 mr-3" />
                  Share Quiz Link
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start hover:bg-orange-50 hover:text-orange-700"
                  onClick={() => {
                    toast.info("Export functionality coming soon!");
                  }}
                >
                  <Download className="h-4 w-4 mr-3" />
                  Export Results
                </Button>
              </CardContent>
            </Card>

            {/* Quiz Info */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Quiz Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Quiz ID</span>
                  <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                    {quiz.id}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Created</span>
                  <span className="text-sm font-medium">
                    {new Date(quiz.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Last Updated</span>
                  <span className="text-sm font-medium">
                    {new Date(quiz.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Status</span>
                  {getStatusBadge(quiz.status)}
                </div>
                {quiz.section && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Section</span>
                    <Badge variant="outline">{quiz.section}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}