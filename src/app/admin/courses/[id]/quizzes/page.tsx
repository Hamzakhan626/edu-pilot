/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

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
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  ListChecks,
  Timer,
  Eye,
  Copy,
  Settings,
  CheckCircle,
  BarChart,
  Users,
  Zap,
  FileText,
  CheckSquare,
  XCircle,
  Star,
  Download,
  Send,
  FileCheck,
  Clock,
  User,
  Percent,
  Award,
  TrendingUp,
  AlertCircle,
  MoreVertical,
  ExternalLink,
} from "lucide-react";

// Import our quiz components
import QuizCreatorModal from "@/components/QuizCreatorModal";
import AIQuizGeneratorModal from "@/components/AIQuizGeneratorModal";

type Course = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  slug: string;
};

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

type QuizSubmission = {
  id: string;
  quiz_id: string;
  student_id: string;
  started_at: string;
  submitted_at: string | null;
  time_spent_seconds: number | null;
  answers: any;
  auto_score: number | null;
  manual_score: number | null;
  total_score: number | null;
  percentage: number | null;
  status: "in_progress" | "submitted" | "graded";
  teacher_notes: string | null;
  graded_by: string | null;
  graded_at: string | null;
  student?: {
    full_name: string;
    email: string;
    enrollment_number?: string;
  };
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

type QuizResponse = {
  id: string;
  submission_id: string;
  question_id: string;
  student_answer: string;
  is_correct: boolean | null;
  points_earned: number | null;
  teacher_feedback: string | null;
  question?: QuizQuestion;
};

type Student = {
  id: string;
  full_name: string;
  email: string;
  enrollment_number?: string;
};

export default function CourseQuizzesPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal States
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);

  // New states for submissions and marking
  const [activeTab, setActiveTab] = useState("quizzes");
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] =
    useState<QuizSubmission | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [submissionResponses, setSubmissionResponses] = useState<
    QuizResponse[]
  >([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [grading, setGrading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);

  // Grading state
  const [manualScores, setManualScores] = useState<Record<string, number>>({});
  const [teacherFeedbacks, setTeacherFeedbacks] = useState<
    Record<string, string>
  >({});
  const [overallNotes, setOverallNotes] = useState("");

  const loadData = async () => {
    if (!courseId) {
      toast.error("Course ID is missing");
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Load course details
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .maybeSingle();

      if (courseError) {
        toast.error(`Failed to load course: ${courseError.message}`);
        setCourse(null);
        setQuizzes([]);
        setLoading(false);
        return;
      }

      if (!courseData) {
        toast.error("Course not found");
        setCourse(null);
        setQuizzes([]);
        setLoading(false);
        return;
      }

      setCourse(courseData);

      // Load quizzes
      const { data: quizzesData, error: quizzesError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });

      if (quizzesError) {
        toast.error(`Failed to load quizzes: ${quizzesError.message}`);
        setQuizzes([]);
      } else {
        setQuizzes(quizzesData || []);
      }

      setLoading(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      toast.error(`Error: ${errorMessage}`);
      setLoading(false);
    }
  };

  const loadSubmissions = async (quizId: string) => {
    if (!quizId) return;

    setLoadingSubmissions(true);
    try {
      const { data: submissionsData, error: submissionsError } = await supabase
        .from("quiz_submissions")
        .select(
          `
          *,
          student:student_id (
            full_name,
            email,
            enrollment_number
          )
        `,
        )
        .eq("quiz_id", quizId)
        .order("submitted_at", { ascending: false });

      if (submissionsError) throw submissionsError;

      // Transform the data to include student info
      const transformedSubmissions =
        submissionsData?.map((sub) => ({
          ...sub,
          student: Array.isArray(sub.student) ? sub.student[0] : sub.student,
        })) || [];

      setSubmissions(transformedSubmissions);
    } catch (err) {
      console.error("Error loading submissions:", err);
      toast.error("Failed to load submissions");
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const loadQuizQuestions = async (quizId: string) => {
    if (!quizId) return;

    setLoadingQuestions(true);
    try {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("question_order");

      if (error) throw error;
      setQuizQuestions(data || []);
    } catch (err) {
      console.error("Error loading questions:", err);
      toast.error("Failed to load questions");
    } finally {
      setLoadingQuestions(false);
    }
  };

  const loadSubmissionResponses = async (submissionId: string) => {
    if (!submissionId) return;

    try {
      const { data, error } = await supabase
        .from("quiz_responses")
        .select(
          `
          *,
          question:question_id (*)
        `,
        )
        .eq("submission_id", submissionId);

      if (error) throw error;

      // Transform the data
      const transformedResponses =
        data?.map((res) => ({
          ...res,
          question: Array.isArray(res.question)
            ? res.question[0]
            : res.question,
        })) || [];

      setSubmissionResponses(transformedResponses);

      // Initialize grading state
      const initialManualScores: Record<string, number> = {};
      const initialFeedbacks: Record<string, string> = {};

      transformedResponses.forEach((response) => {
        if (
          response.question?.question_type === "essay" ||
          response.question?.question_type === "short_answer"
        ) {
          initialManualScores[response.id] = response.points_earned || 0;
          initialFeedbacks[response.id] = response.teacher_feedback || "";
        }
      });

      setManualScores(initialManualScores);
      setTeacherFeedbacks(initialFeedbacks);

      // Load overall notes
      const submission = submissions.find((s) => s.id === submissionId);
      setOverallNotes(submission?.teacher_notes || "");
    } catch (err) {
      console.error("Error loading responses:", err);
      toast.error("Failed to load submission responses");
    }
  };

  const loadStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, enrollment_number")
        .eq("role", "student")
        .order("full_name");

      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      console.error("Error loading students:", err);
      toast.error("Failed to load students");
    }
  };

  const handleViewSubmissions = async (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setActiveTab("submissions");
    await Promise.all([
      loadSubmissions(quiz.id),
      loadQuizQuestions(quiz.id),
      loadStudents(),
    ]);
  };

  const handleGradeSubmission = async () => {
    if (!selectedSubmission) return;

    setGrading(true);
    try {
      // Update each response with manual scores and feedback
      const responseUpdates = submissionResponses.map((response) => {
        if (
          response.question?.question_type === "essay" ||
          response.question?.question_type === "short_answer"
        ) {
          return supabase
            .from("quiz_responses")
            .update({
              points_earned: manualScores[response.id] || 0,
              teacher_feedback: teacherFeedbacks[response.id] || "",
            })
            .eq("id", response.id);
        }
        return Promise.resolve({ error: null });
      });

      // Wait for all response updates
      await Promise.all(responseUpdates);

      // Calculate total score
      const totalPossiblePoints = quizQuestions.reduce(
        (sum, q) => sum + q.points,
        0,
      );
      const totalEarnedPoints = submissionResponses.reduce((sum, response) => {
        if (
          response.question?.question_type === "essay" ||
          response.question?.question_type === "short_answer"
        ) {
          return sum + (manualScores[response.id] || 0);
        }
        return sum + (response.points_earned || 0);
      }, 0);

      const percentage =
        totalPossiblePoints > 0
          ? Math.round((totalEarnedPoints / totalPossiblePoints) * 10000) / 100
          : 0;

      // Get current user ID for grader
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Update submission
      const { error: updateError } = await supabase
        .from("quiz_submissions")
        .update({
          manual_score: totalEarnedPoints,
          total_score: totalEarnedPoints,
          percentage: percentage,
          status: "graded",
          teacher_notes: overallNotes,
          graded_by: user?.id || null,
          graded_at: new Date().toISOString(),
        })
        .eq("id", selectedSubmission.id);

      if (updateError) throw updateError;

      // Update local state
      setSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === selectedSubmission.id
            ? {
                ...sub,
                manual_score: totalEarnedPoints,
                total_score: totalEarnedPoints,
                percentage,
                status: "graded",
                teacher_notes: overallNotes,
                graded_by: user?.id || null,
                graded_at: new Date().toISOString(),
              }
            : sub,
        ),
      );

      toast.success("Submission graded successfully");
      setSelectedSubmission(null);
    } catch (err) {
      console.error("Error grading submission:", err);
      toast.error("Failed to grade submission");
    } finally {
      setGrading(false);
    }
  };

  const handleAutoGrade = async (submissionId: string) => {
    try {
      const { data: responses, error: responsesError } = await supabase
        .from("quiz_responses")
        .select(
          `
          *,
          question:question_id (*)
        `,
        )
        .eq("submission_id", submissionId);

      if (responsesError) throw responsesError;

      // Auto-grade multiple choice questions
      const autoGradedResponses = responses
        ?.map((response) => {
          if (response.question?.question_type === "multiple_choice") {
            const isCorrect =
              response.student_answer === response.question.correct_answer;
            return {
              id: response.id,
              is_correct: isCorrect,
              points_earned: isCorrect ? response.question.points : 0,
            };
          }
          return null;
        })
        .filter(Boolean);

      // Update responses
      for (const update of autoGradedResponses) {
        await supabase
          .from("quiz_responses")
          .update({
            is_correct: (update as any).is_correct,
            points_earned: (update as any).points_earned,
          })
          .eq("id", (update as any).id);
      }

      // Calculate auto score
      const autoScore = autoGradedResponses.reduce(
        (sum, response) => sum + ((response as any).points_earned || 0),
        0,
      );

      // Update submission with auto score
      await supabase
        .from("quiz_submissions")
        .update({ auto_score: autoScore })
        .eq("id", submissionId);

      // Refresh submissions
      await loadSubmissions(selectedQuiz!.id);

      toast.success("Auto-grading completed");
    } catch (err) {
      console.error("Error auto-grading:", err);
      toast.error("Failed to auto-grade");
    }
  };

  const handleCreateTestSubmission = async () => {
    if (!selectedQuiz || !students.length) return;

    // Select a random student
    const randomStudent = students[Math.floor(Math.random() * students.length)];

    try {
      // Create a test submission
      const { data: submission, error: submissionError } = await supabase
        .from("quiz_submissions")
        .insert({
          quiz_id: selectedQuiz.id,
          student_id: randomStudent.id,
          started_at: new Date().toISOString(),
          submitted_at: new Date().toISOString(),
          status: "submitted",
          answers: {},
        })
        .select()
        .single();

      if (submissionError) throw submissionError;

      // Create responses for each question
      const responses = quizQuestions.map((question) => ({
        submission_id: submission.id,
        question_id: question.id,
        student_answer:
          question.question_type === "multiple_choice"
            ? Array.isArray(question.options)
              ? question.options[0]
              : ""
            : "Test answer for grading demonstration",
        is_correct: null,
        points_earned: null,
      }));

      const { error: responsesError } = await supabase
        .from("quiz_responses")
        .insert(responses);

      if (responsesError) throw responsesError;

      // Reload submissions
      await loadSubmissions(selectedQuiz.id);
      toast.success("Test submission created successfully");
    } catch (err) {
      console.error("Error creating test submission:", err);
      toast.error("Failed to create test submission");
    }
  };

  const handleExportGrades = async () => {
    if (!selectedQuiz) return;

    try {
      const { data: submissionsData, error } = await supabase
        .from("quiz_submissions")
        .select(
          `
          *,
          student:student_id (
            full_name,
            email,
            enrollment_number
          )
        `,
        )
        .eq("quiz_id", selectedQuiz.id);

      if (error) throw error;

      // Create CSV content
      const headers = [
        "Student Name",
        "Email",
        "Enrollment Number",
        "Score",
        "Percentage",
        "Status",
        "Submitted At",
      ];
      const rows = submissionsData?.map((sub) => [
        sub.student?.full_name || "N/A",
        sub.student?.email || "N/A",
        sub.student?.enrollment_number || "N/A",
        sub.total_score || sub.auto_score || 0,
        sub.percentage || 0,
        sub.status,
        sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : "N/A",
      ]);

      const csvContent = [
        headers.join(","),
        ...(rows?.map((row) => row.join(",")) || []),
      ].join("\n");

      // Create download link
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedQuiz.title}_grades_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Grades exported successfully");
    } catch (err) {
      console.error("Error exporting grades:", err);
      toast.error("Failed to export grades");
    }
  };

  const handleCopyQuizLink = (quizId: string) => {
    const quizLink = `${window.location.origin}/quiz/${quizId}`;
    navigator.clipboard.writeText(quizLink);
    toast.success("Quiz link copied to clipboard");
  };

  const handlePreviewQuiz = (quizId: string) => {
    // Updated to use the correct route from the image structure
    window.open(`/admin/courses/${courseId}/quizzes/${quizId}`, "_blank");
  };

  useEffect(() => {
    if (courseId) {
      void loadData();
    }
  }, [courseId]);

  const handleQuizCreated = (newQuiz: any) => {
    const normalizedQuiz = {
      ...newQuiz,
      course_id: newQuiz.course_id || newQuiz.class_id || courseId,
    };
    setQuizzes((prev) => [normalizedQuiz, ...prev]);
    toast.success(`Quiz "${newQuiz.title}" created successfully`);
  };

  const handleDeleteQuiz = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this quiz? This will also delete all questions and submissions.",
      )
    )
      return;

    try {
      const { error } = await supabase.from("quizzes").delete().eq("id", id);
      if (error) throw error;

      toast.success("Quiz deleted successfully");
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      console.error("Delete quiz error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete quiz";
      toast.error(errorMessage);
    }
  };

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

  const getSubmissionStatusBadge = (status: string) => {
    switch (status) {
      case "in_progress":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            In Progress
          </Badge>
        );
      case "submitted":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Submitted
          </Badge>
        );
      case "graded":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Graded
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredQuizzes = quizzes.filter((quiz) => {
    const q = search.toLowerCase().trim();
    return (
      !q ||
      quiz.title.toLowerCase().includes(q) ||
      (quiz.description ?? "").toLowerCase().includes(q) ||
      quiz.type.toLowerCase().includes(q)
    );
  });

  // Show loading state
  if (loading && !course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-4" />
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/admin/courses/${courseId}`)}
            className="hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/admin/courses/${courseId}/lessons`)}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Lessons
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/admin/courses/${courseId}/quizzes`)}
            disabled
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            <ListChecks className="h-4 w-4 mr-2" />
            Quizzes
          </Button>
        </div>
      </div>

      {/* Course Info Card */}
      {course && (
        <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-200 rounded-full blur-3xl opacity-20 -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-200 rounded-full blur-3xl opacity-20 -ml-32 -mb-32" />

          <CardContent className="pt-8 pb-8 relative z-10">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <ListChecks className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-1">
                      {course.name} - Quizzes & Submissions
                    </h1>
                    <Badge
                      variant="outline"
                      className="text-xs bg-white/80 backdrop-blur-sm"
                    >
                      {course.code}
                    </Badge>
                  </div>
                </div>
                {course.description && (
                  <p className="text-slate-600 max-w-3xl mb-4 leading-relaxed">
                    {course.description}
                  </p>
                )}
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-3 py-2 rounded-lg">
                    <ListChecks className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-slate-700">
                      {quizzes.length}{" "}
                      {quizzes.length === 1 ? "Quiz" : "Quizzes"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-3 py-2 rounded-lg">
                    <Users className="h-4 w-4 text-indigo-600" />
                    <span className="font-medium text-slate-700">
                      {quizzes.filter((q) => q.status === "published").length}{" "}
                      Active
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-3 py-2 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-slate-700">
                      {quizzes.filter((q) => q.status === "completed").length}{" "}
                      Completed
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Quizzes and Submissions */}
      <Card className="border-0 shadow-lg bg-white">
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-1 mb-6">
              <TabsTrigger
                value="quizzes"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
              >
                <ListChecks className="h-4 w-4 mr-2" />
                Quizzes
              </TabsTrigger>
            </TabsList>

            {/* Quizzes Tab */}
            <TabsContent value="quizzes" className="space-y-6">
              {/* Create Quizzes Section */}
              {course && (
                <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-2xl opacity-10 -mr-16 -mt-16" />
                  <CardContent className="pt-6 pb-6 relative z-10">
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                            <Zap className="h-5 w-5 text-white" />
                          </div>
                          <h2 className="text-xl font-bold">Create Quizzes</h2>
                        </div>
                        <p className="text-white/90 text-sm leading-relaxed">
                          Generate quizzes with AI, upload from files, or create
                          manually. Assess student learning effectively.
                        </p>
                        <div className="flex items-center gap-2 mt-3 text-xs text-white/80">
                          <Sparkles className="h-3 w-3" />
                          <span>AI-powered generation</span>
                          <span className="text-white/40">•</span>
                          <Upload className="h-3 w-3" />
                          <span>File upload & parsing</span>
                          <span className="text-white/40">•</span>
                          <Settings className="h-3 w-3" />
                          <span>Manual creation</span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => setShowCreatorModal(true)}
                          size="lg"
                          className="bg-white/20 hover:bg-white/30 border border-white/30 backdrop-blur-sm text-white"
                        >
                          <Plus className="h-5 w-5 mr-2" />
                          Create Manually
                        </Button>
                        <Button
                          onClick={() => setShowAIModal(true)}
                          size="lg"
                          className="bg-white text-blue-600 hover:bg-white/90 shadow-lg hover:shadow-xl transition-all font-semibold px-6"
                        >
                          <Sparkles className="h-5 w-5 mr-2" />
                          Generate with AI
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Search */}
              {quizzes.length > 0 && (
                <Card className="border-0 shadow-lg bg-white">
                  <CardContent className="pt-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search quizzes by title, description, or type..."
                        className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quizzes List */}
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader className="border-b border-slate-100">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg font-semibold text-slate-900">
                        {course ? `${course.name} Quizzes` : "Quizzes"}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {filteredQuizzes.length}{" "}
                        {filteredQuizzes.length === 1 ? "quiz" : "quizzes"}
                        {search && " matching your search"}
                      </CardDescription>
                    </div>
                    {course && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCreatorModal(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          New Quiz
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {loading ? (
                    <div className="flex items-center justify-center py-12 text-slate-500">
                      <Loader2 className="h-8 w-8 animate-spin mr-3 text-blue-600" />
                      <span className="font-medium">Loading quizzes...</span>
                    </div>
                  ) : !course ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="p-4 bg-gradient-to-br from-red-100 to-pink-100 rounded-2xl mb-4">
                        <BookOpen className="h-12 w-12 text-red-600" />
                      </div>
                      <h3 className="font-semibold text-lg text-slate-900 mb-2">
                        Course Not Found
                      </h3>
                      <p className="text-sm text-slate-500 mb-6 max-w-md">
                        Unable to load the course. Please check if the course
                        exists and you have access.
                      </p>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => router.push("/admin/courses")}
                          variant="outline"
                          className="border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Back to Courses
                        </Button>
                        <Button
                          onClick={() => void loadData()}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        >
                          <Loader2 className="h-4 w-4 mr-2" />
                          Retry Loading
                        </Button>
                      </div>
                    </div>
                  ) : filteredQuizzes.length === 0 && !search ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="p-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl mb-4">
                        <ListChecks className="h-12 w-12 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-lg text-slate-900 mb-2">
                        No quizzes found
                      </h3>
                      <p className="text-sm text-slate-500 mb-6 max-w-md">
                        Create quizzes to assess student understanding. You can
                        generate them with AI, upload from files, or create
                        manually.
                      </p>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => setShowCreatorModal(true)}
                          variant="outline"
                          className="border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Manually
                        </Button>
                        <Button
                          onClick={() => setShowAIModal(true)}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate with AI
                        </Button>
                      </div>
                    </div>
                  ) : filteredQuizzes.length === 0 && search ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                      <Search className="h-12 w-12 mb-3 text-slate-400" />
                      <p className="font-medium mb-1">
                        No quizzes match your search
                      </p>
                      <p className="text-sm mb-4">
                        Try adjusting your search terms
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSearch("")}
                        className="mt-2"
                      >
                        Clear Search
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredQuizzes.map((quiz) => (
                        <Card
                          key={quiz.id}
                          className="p-5 hover:shadow-md transition-all bg-slate-50/50 hover:bg-white border border-slate-100 hover:border-blue-200"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <h3 className="font-semibold text-slate-900 text-base">
                                  {quiz.title}
                                </h3>
                                {getStatusBadge(quiz.status)}
                                {getDifficultyBadge(quiz.difficulty)}
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-white text-slate-600"
                                >
                                  {quiz.type}
                                </Badge>
                              </div>

                              {quiz.description && (
                                <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                                  {quiz.description}
                                </p>
                              )}

                              <div className="flex items-center gap-4 flex-wrap">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <ListChecks className="h-3.5 w-3.5" />
                                  <span>
                                    {quiz.total_questions || 0} questions
                                  </span>
                                </div>

                                {quiz.time_limit_minutes && (
                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Timer className="h-3.5 w-3.5" />
                                    <span>{quiz.time_limit_minutes} min</span>
                                  </div>
                                )}

                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  <span>Pass: {quiz.passing_score}%</span>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>
                                    {quiz.scheduled_at
                                      ? new Date(
                                          quiz.scheduled_at,
                                        ).toLocaleDateString()
                                      : "No schedule"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  // Updated route to match image structure
                                  router.push(
                                    `/admin/courses/${courseId}/quizzes/${quiz.id}/edit`,
                                  )
                                }
                                className="hover:bg-blue-50 hover:text-blue-600"
                                title="Edit quiz"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleViewSubmissions(quiz)}
                                className="hover:bg-green-50 hover:text-green-600"
                                title="View submissions"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  // Updated route to match image structure
                                  router.push(
                                    `/admin/courses/${courseId}/quizzes/${quiz.id}`,
                                  )
                                }
                                className="hover:bg-purple-50 hover:text-purple-600"
                                title="View quiz"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCopyQuizLink(quiz.id)}
                                className="hover:bg-yellow-50 hover:text-yellow-600"
                                title="Copy quiz link"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handlePreviewQuiz(quiz.id)}
                                className="hover:bg-orange-50 hover:text-orange-600"
                                title="Preview quiz"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="hover:bg-slate-100"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteQuiz(quiz.id)}
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Quiz
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

          
          </Tabs>
        </CardContent>
      </Card>

      {/* Modals */}
      {course && (
        <>
          <QuizCreatorModal
            open={showCreatorModal}
            onOpenChange={setShowCreatorModal}
            courseId={courseId}
            courseName={course.name}
            onQuizCreated={handleQuizCreated}
          />

          <AIQuizGeneratorModal
            open={showAIModal}
            onOpenChange={setShowAIModal}
            courseId={courseId}
            courseName={course.name}
            courseDescription={course.description || ""}
            onQuizGenerated={handleQuizCreated}
          />
        </>
      )}
    </div>
  );
}