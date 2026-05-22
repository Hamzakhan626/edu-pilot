/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/auth";
import { toast } from "sonner";
import { getCurrentUser, User } from "@/lib/auth";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import {
  Loader2,
  Eye,
  CheckCircle2,
  Clock,
  Calendar,
  FileText,
  Save,
  XCircle,
  Award,
  AlertCircle,
  ArrowLeft,
  BookOpen,
} from "lucide-react";

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
  status: string;
  teacher_notes: string | null;
  graded_by: string | null;
  graded_at: string | null;
};

type Student = {
  id: string;
  full_name: string;
  email: string;
};

type Question = {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  correct_answer: string;
  points: number;
  question_order: number;
};

type Quiz = {
  id: string;
  title: string;
  course_id: string;
  total_questions: number | null;
  passing_score: number | null;
};

type Course = {
  id: string;
  name: string;
  code: string;
};

type SubmissionWithStudent = QuizSubmission & {
  student: Student;
};

export default function HoDQuizGradingPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = (params?.id as string) || "";

  const [user, setUser] = useState<User | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithStudent[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionWithStudent | null>(null);
  const [gradingDialogOpen, setGradingDialogOpen] = useState(false);
  const [grading, setGrading] = useState(false);
  const [manualScore, setManualScore] = useState<number>(0);
  const [teacherNotes, setTeacherNotes] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

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
        loadData(dept.id);
      });
  }, [quizId, mounted]);

  const loadData = async (deptId: string) => {
    try {
      setLoading(true);
      setError(null);

      // 1. Get quiz
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("id, title, course_id, total_questions, passing_score")
        .eq("id", quizId)
        .single();
      if (quizError || !quizData) {
        setError("Quiz not found");
        setLoading(false);
        return;
      }

      // 2. Verify course -> program -> department
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

      const { data: prog } = await supabase
        .from("programs")
        .select("department_id")
        .eq("id", courseData.program_id)
        .single();
      if (!prog || prog.department_id !== deptId) {
        setError("Access denied");
        setLoading(false);
        return;
      }

      setQuiz(quizData);
      setCourse(courseData);

      // 3. Questions
      const { data: qData } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("question_order");
      setQuestions(qData || []);

      // 4. Submissions with students
      const { data: submissionsData } = await supabase
        .from("quiz_submissions")
        .select("*")
        .eq("quiz_id", quizId)
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false });

      if (submissionsData && submissionsData.length > 0) {
        const studentIds = submissionsData.map((s) => s.student_id);
        const { data: studentsData } = await supabase
          .from("users")
          .select("id, full_name, email")
          .in("id", studentIds);

        const enriched = submissionsData.map((sub) => ({
          ...sub,
          student: studentsData?.find((s) => s.id === sub.student_id) || {
            id: sub.student_id,
            full_name: "Unknown",
            email: "N/A",
          },
        }));
        setSubmissions(enriched);
      } else {
        setSubmissions([]);
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewSubmission = (submission: SubmissionWithStudent) => {
    setSelectedSubmission(submission);
    setManualScore(submission.manual_score || submission.auto_score || 0);
    setTeacherNotes(submission.teacher_notes || "");
    setGradingDialogOpen(true);
  };

  const handleGradeSubmission = async () => {
    if (!selectedSubmission) return;
    try {
      setGrading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      const totalScore = selectedSubmission.total_score || 0;
      const percentage =
        totalScore > 0 ? Math.round((manualScore / totalScore) * 100) : 0;

      const { error } = await supabase
        .from("quiz_submissions")
        .update({
          manual_score: manualScore,
          percentage,
          teacher_notes: teacherNotes || null,
          graded_by: user.id,
          graded_at: new Date().toISOString(),
        })
        .eq("id", selectedSubmission.id);

      if (error) throw error;
      toast.success("Graded successfully!");
      setGradingDialogOpen(false);
      loadData(departmentId!);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGrading(false);
    }
  };

  const getUserAnswer = (questionId: string) => {
    if (!selectedSubmission?.answers) return null;
    return selectedSubmission.answers[questionId] || null;
  };

  const isCorrectAnswer = (question: Question) => {
    const userAnswer = getUserAnswer(question.id);
    if (!userAnswer) return false;
    if (question.question_type === "multiple_choice")
      return userAnswer === question.correct_answer;
    return false;
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusBadge = (submission: SubmissionWithStudent) => {
    if (submission.percentage !== null) {
      const passed = quiz?.passing_score
        ? submission.percentage >= quiz.passing_score
        : false;
      return (
        <Badge
          className={
            passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }
        >
          Graded - {submission.percentage}%
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-100 text-yellow-800">Pending Review</Badge>
    );
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
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <CardTitle className="text-center">Error</CardTitle>
            <CardDescription className="text-center">{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-2">
            <Button onClick={() => router.push("/hod/quizzes")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Quizzes
            </Button>
            <Button onClick={() => router.push("/hod/programs")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Programs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/hod/quizzes/${quizId}`)}
                className="text-white hover:bg-white/20 mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Quiz
              </Button>
              <h1 className="text-3xl font-bold mb-2">Grade Submissions</h1>
              <p className="text-purple-100">{quiz.title}</p>
              {course && (
                <p className="text-sm text-purple-100 flex items-center gap-1 mt-1">
                  <BookOpen className="h-3 w-3" /> {course.code} - {course.name}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-purple-100">Total Submissions</p>
              <p className="text-3xl font-bold">{submissions.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total</p>
                  <p className="text-2xl font-bold">{submissions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pending</p>
                  <p className="text-2xl font-bold">
                    {submissions.filter((s) => s.percentage === null).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Graded</p>
                  <p className="text-2xl font-bold">
                    {submissions.filter((s) => s.percentage !== null).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Award className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Avg Score</p>
                  <p className="text-2xl font-bold">
                    {submissions.filter((s) => s.percentage !== null).length > 0
                      ? Math.round(
                          submissions
                            .filter((s) => s.percentage !== null)
                            .reduce((sum, s) => sum + (s.percentage || 0), 0) /
                            submissions.filter((s) => s.percentage !== null)
                              .length,
                        )
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Student Submissions</CardTitle>
            <CardDescription>
              Review and grade student quiz submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold">No Submissions Yet</h3>
                <p className="text-slate-500">
                  Students haven't submitted this quiz yet.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Time Spent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center"></div>
                          {submission.student.full_name}
                        </div>
                      </TableCell>
                      <TableCell>{submission.student.email}</TableCell>
                      <TableCell>
                        {submission.submitted_at
                          ? new Date(submission.submitted_at).toLocaleString()
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {formatTime(submission.time_spent_seconds)}
                      </TableCell>
                      <TableCell>{getStatusBadge(submission)}</TableCell>
                      <TableCell>
                        {submission.percentage !== null ? (
                          <span className="font-semibold">
                            {submission.manual_score ||
                              submission.auto_score ||
                              0}
                            /{submission.total_score}
                          </span>
                        ) : (
                          <span className="text-slate-400">Not graded</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleViewSubmission(submission)}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {submission.percentage !== null
                            ? "View & Edit"
                            : "Grade"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grading Dialog (same as admin) */}
      <Dialog open={gradingDialogOpen} onOpenChange={setGradingDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>Grade Submission</DialogTitle>
            <DialogDescription>
              Review student answers and assign a final grade
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-6">
              <Card className="bg-slate-50">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Student</p>
                      <p className="font-semibold">
                        {selectedSubmission.student.full_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Email</p>
                      <p className="font-semibold">
                        {selectedSubmission.student.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Submitted</p>
                      <p className="font-semibold">
                        {selectedSubmission.submitted_at
                          ? new Date(
                              selectedSubmission.submitted_at,
                            ).toLocaleString()
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Time Spent</p>
                      <p className="font-semibold">
                        {formatTime(selectedSubmission.time_spent_seconds)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div>
                <h3 className="text-lg font-semibold mb-4">Student Answers</h3>
                <div className="space-y-4">
                  {questions.map((question, index) => {
                    const userAnswer = getUserAnswer(question.id);
                    const isCorrect = isCorrectAnswer(question);
                    return (
                      <Card
                        key={question.id}
                        className={`${question.question_type === "multiple_choice" ? (isCorrect ? "border-green-200 bg-green-50" : userAnswer ? "border-red-200 bg-red-50" : "border-slate-200") : "border-blue-200 bg-blue-50"}`}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3 mb-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${question.question_type === "multiple_choice" ? (isCorrect ? "bg-green-500 text-white" : userAnswer ? "bg-red-500 text-white" : "bg-slate-400 text-white") : "bg-blue-500 text-white"}`}
                            >
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <p className="font-medium">
                                  {question.question_text}
                                </p>
                                <Badge variant="outline">
                                  {question.points} pts
                                </Badge>
                              </div>
                              <div className="space-y-2 mt-3">
                                <p className="text-sm">
                                  <span className="font-semibold">Type:</span>{" "}
                                  {question.question_type}
                                </p>
                                {question.question_type ===
                                  "multiple_choice" && (
                                  <>
                                    <p className="text-sm">
                                      <span className="font-semibold">
                                        Student Answer:
                                      </span>{" "}
                                      {userAnswer || "No answer"}
                                    </p>
                                    <p className="text-sm text-green-700">
                                      <span className="font-semibold">
                                        Correct Answer:
                                      </span>{" "}
                                      {question.correct_answer}
                                    </p>
                                  </>
                                )}
                                {(question.question_type === "short_answer" ||
                                  question.question_type === "essay") && (
                                  <div className="mt-2">
                                    <p className="text-sm font-semibold">
                                      Student Response:
                                    </p>
                                    <div className="p-3 bg-white border rounded-lg">
                                      <p className="text-sm">
                                        {userAnswer || "No answer provided"}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Grade Assignment</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Auto Score (MCQ)</Label>
                    <Input
                      type="number"
                      value={selectedSubmission.auto_score || 0}
                      disabled
                      className="bg-slate-100"
                    />
                  </div>
                  <div>
                    <Label>Total Possible Points</Label>
                    <Input
                      type="number"
                      value={selectedSubmission.total_score || 0}
                      disabled
                      className="bg-slate-100"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="manual_score">Final Score *</Label>
                  <Input
                    id="manual_score"
                    type="number"
                    min="0"
                    max={selectedSubmission.total_score || 100}
                    value={manualScore}
                    onChange={(e) => setManualScore(Number(e.target.value))}
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    Percentage:{" "}
                    {selectedSubmission.total_score
                      ? Math.round(
                          (manualScore / selectedSubmission.total_score) * 100,
                        )
                      : 0}
                    %
                  </p>
                </div>
                <div>
                  <Label htmlFor="teacher_notes">Feedback</Label>
                  <Textarea
                    id="teacher_notes"
                    value={teacherNotes}
                    onChange={(e) => setTeacherNotes(e.target.value)}
                    placeholder="Add feedback for the student..."
                    rows={4}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGradingDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGradeSubmission}
              disabled={grading}
              className="bg-gradient-to-r from-green-600 to-emerald-600"
            >
              {grading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" /> Save Grade
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
