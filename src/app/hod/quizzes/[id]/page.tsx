/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
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
  Settings,
  Share2,
  Download,
  ExternalLink,
  Target,
  AlertCircle,
  Loader2,
  GraduationCap,
  RefreshCw,
  AlertTriangle,
  Home,
  BookOpen,
} from "lucide-react";
import { getCurrentUser, User } from "@/lib/auth";

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

export default function HoDViewQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = (params?.id as string) || null;

  const [user, setUser] = useState<User | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [course, setCourse] = useState<any>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [stats, setStats] = useState({
    averageScore: 0,
    completionRate: 0,
    totalSubmissions: 0,
    pendingGrading: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !quizId) return;

    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setUser(currentUser);

    supabase
      .from("departments")
      .select("id")
      .eq("hod_id", currentUser.id)
      .single()
      .then(({ data: dept }) => {
        if (!dept) {
          setError("No department assigned");
          setLoading(false);
          return;
        }
        setDepartmentId(dept.id);
        loadQuiz(dept.id);
      });
  }, [quizId, mounted]);

  const loadQuiz = async (deptId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", quizId)
        .single();

      if (quizError || !quizData) {
        setError("Quiz not found");
        setLoading(false);
        return;
      }

      const { data: courseData } = await supabase
        .from("courses")
        .select("id, name, code, program_id")
        .eq("id", quizData.course_id)
        .single();

      if (!courseData) {
        setError("Course not found");
        setLoading(false);
        return;
      }

      const { data: programData } = await supabase
        .from("programs")
        .select("department_id")
        .eq("id", courseData.program_id)
        .single();

      if (!programData || programData.department_id !== deptId) {
        setError("You do not have access to this quiz");
        setLoading(false);
        return;
      }

      setQuiz(quizData);
      setCourse(courseData);

      // Load questions
      const { data: questionsData } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("question_order");

      setQuestions(questionsData || []);

      // Load submissions stats
      const { data: submissions } = await supabase
        .from("quiz_submissions")
        .select("id, student_id, status, percentage")
        .eq("quiz_id", quizId);

      if (submissions) {
        const graded = submissions.filter((s) => s.percentage !== null);
        const pending = submissions.filter((s) => s.percentage === null && s.status === "submitted");
        const avg = graded.length > 0 ? graded.reduce((acc, s) => acc + (s.percentage || 0), 0) / graded.length : 0;
        setStats({
          averageScore: Math.round(avg * 100) / 100,
          completionRate: submissions.length > 0 ? Math.round((graded.length / submissions.length) * 100) : 0,
          totalSubmissions: submissions.length,
          pendingGrading: pending.length,
        });
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!quiz) return;
    navigator.clipboard.writeText(`${window.location.origin}/student/quiz/${quiz.id}`);
    toast.success("Link copied");
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: "bg-yellow-50 text-yellow-700 border-yellow-200",
      published: "bg-green-100 text-green-800 border-green-200",
      completed: "bg-blue-100 text-blue-800 border-blue-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
    };
    return <Badge variant="outline" className={map[status] || ""}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const getDifficultyBadge = (difficulty: string) => {
    const map: Record<string, string> = {
      easy: "bg-green-100 text-green-800 border-green-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      hard: "bg-red-100 text-red-800 border-red-200",
    };
    return <Badge variant="outline" className={map[difficulty] || ""}>{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</Badge>;
  };

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card>
          <CardHeader>
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            <CardTitle className="text-center">Error</CardTitle>
            <CardDescription className="text-center">{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-2">
            <Button onClick={() => router.push("/hod/quizzes")}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Quizzes</Button>
            <Button onClick={() => router.push("/hod/programs")}><Home className="mr-2 h-4 w-4" /> Programs</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push("/hod/quizzes")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Quizzes
              </Button>
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{quiz.title}</h1>
                {course && (
                  <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                    <BookOpen className="h-4 w-4" /> {course.name} • {course.code}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                <Copy className="h-4 w-4 mr-2" /> Copy Link
              </Button>
              <Button
                size="sm"
                onClick={() => router.push(`/hod/quizzes/${quizId}/edit`)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Edit className="h-4 w-4 mr-2" /> Edit Quiz
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold">Quiz Details</CardTitle>
                    <CardDescription className="mt-2">{quiz.description || "No description"}</CardDescription>
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
                      <h3 className="text-sm font-medium text-slate-500 mb-2">Quiz Type</h3>
                      <p className="font-medium capitalize">{quiz.type.replace("_", " ")}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-2">Total Questions</h3>
                      <p className="font-medium">{questions.length}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-2">Passing Score</h3>
                      <p className="font-medium">{quiz.passing_score}%</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {quiz.time_limit_minutes && (
                      <div>
                        <h3 className="text-sm font-medium text-slate-500 mb-2">Time Limit</h3>
                        <p className="font-medium">{quiz.time_limit_minutes} minutes</p>
                      </div>
                    )}
                    {quiz.scheduled_at && (
                      <div>
                        <h3 className="text-sm font-medium text-slate-500 mb-2">Scheduled For</h3>
                        <p className="font-medium">{new Date(quiz.scheduled_at).toLocaleDateString("en-US", {
                          weekday: "long", year: "numeric", month: "long", day: "numeric",
                        })}</p>
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-2">Settings</h3>
                      <div className="space-y-1 text-sm">
                        <p>{quiz.shuffle_questions ? "Shuffled" : "In order"}, {quiz.show_results ? "Results shown" : "Results hidden"}</p>
                        <p>{quiz.allow_late_submission ? "Late submissions allowed" : "No late submissions"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6">
                <div className="w-full flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => router.push(`/hod/quizzes/${quizId}/grading`)}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <GraduationCap className="h-4 w-4 mr-2" />
                    Grade Submissions ({stats.totalSubmissions})
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => window.open(`/student/quiz/${quizId}`, "_blank")}>
                    <ExternalLink className="h-4 w-4 mr-2" /> Preview
                  </Button>
                </div>
              </CardFooter>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Questions ({questions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {questions.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p>No questions added yet.</p>
                    <Button
                      onClick={() => router.push(`/hod/quizzes/${quizId}/edit`)}
                      className="mt-4"
                    >
                      <Edit className="h-4 w-4 mr-2" /> Add Questions
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((q, idx) => (
                      <div key={q.id} className="border rounded-lg p-4 hover:border-purple-200">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline">Q{idx + 1}</Badge>
                          <Badge variant="outline" className="capitalize">{q.question_type.replace("_", " ")}</Badge>
                          <Badge className="bg-blue-100 text-blue-800">{q.points} pts</Badge>
                        </div>
                        <p className="font-medium mb-2">{q.question_text}</p>
                        {q.question_type === "multiple_choice" && Array.isArray(q.options) && (
                          <div className="space-y-2 mt-2">
                            {q.options.map((opt: string, oi: number) => (
                              <div
                                key={oi}
                                className={`flex items-center gap-2 p-2 rounded ${
                                  opt === q.correct_answer ? "bg-green-50 border border-green-200" : "bg-slate-50"
                                }`}
                              >
                                <span className="font-mono">{String.fromCharCode(65 + oi)}.</span>
                                <span>{opt}</span>
                                {opt === q.correct_answer && <Badge className="ml-auto bg-green-100 text-green-800">Correct</Badge>}
                              </div>
                            ))}
                          </div>
                        )}
                        {(q.question_type === "essay" || q.question_type === "short_answer") && (
                          <div className="p-3 bg-yellow-50 rounded border border-yellow-200 text-sm text-yellow-700">
                            {q.question_type === "essay" ? "Essay" : "Short answer"} question – requires manual grading
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Average Score</span>
                    <span className="font-bold">{stats.averageScore}%</span>
                  </div>
                  <Progress value={stats.averageScore} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Completion Rate</span>
                    <span className="font-bold">{stats.completionRate}%</span>
                  </div>
                  <Progress value={stats.completionRate} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{stats.totalSubmissions}</div>
                    <div className="text-xs">Submissions</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{stats.pendingGrading}</div>
                    <div className="text-xs">Pending</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" onClick={() => router.push(`/hod/quizzes/${quizId}/edit`)}>
                  <Edit className="h-4 w-4 mr-3" /> Edit Quiz
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => router.push(`/hod/quizzes/${quizId}/grading`)}>
                  <GraduationCap className="h-4 w-4 mr-3" /> Grade Submissions
                  {stats.pendingGrading > 0 && <Badge className="ml-auto bg-yellow-100 text-yellow-800">{stats.pendingGrading}</Badge>}
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleCopyLink}>
                  <Share2 className="h-4 w-4 mr-3" /> Copy Link
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Quiz Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span>ID</span><code className="bg-slate-100 px-2 py-0.5 rounded text-xs">{quiz.id}</code></div>
                <div className="flex justify-between"><span>Created</span><span>{new Date(quiz.created_at).toLocaleDateString()}</span></div>
                <div className="flex justify-between"><span>Updated</span><span>{new Date(quiz.updated_at).toLocaleDateString()}</span></div>
                <div className="flex justify-between"><span>Status</span>{getStatusBadge(quiz.status)}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}