/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
  User,
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

export default function AdminQuizGradingPage() {
  const router = useRouter();
  const params = useParams();
  
  // Fixed: Extract quizId from params correctly
  // This should match your folder structure: app/admin/quizzes/[id]/grading/page.tsx
  const quizId = (params?.id as string) || "";

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithStudent[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithStudent | null>(null);
  const [gradingDialogOpen, setGradingDialogOpen] = useState(false);
  const [grading, setGrading] = useState(false);

  // Grading form state
  const [manualScore, setManualScore] = useState<number>(0);
  const [teacherNotes, setTeacherNotes] = useState<string>("");

  // Ensure component is mounted before running any client-side code
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only run on client side after mount
    if (!mounted) return;
    
    console.log("=== GRADING PAGE DEBUG ===");
    console.log("Params object:", params);
    console.log("Extracted quizId:", quizId);
    console.log("Window pathname:", window.location.pathname);
    
    if (quizId && quizId !== "") {
      loadQuizData();
    } else {
      console.error("No quizId found in params");
      setLoading(false);
      toast.error("Quiz ID is missing from the URL");
    }
  }, [quizId, mounted]);

  const loadQuizData = async () => {
    try {
      setLoading(true);

      console.log("Loading quiz data for quizId:", quizId);

      // Get quiz details with course info
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("id, title, course_id, total_questions, passing_score")
        .eq("id", quizId)
        .single();

      if (quizError) {
        console.error("Quiz query error:", quizError);
        throw quizError;
      }
      
      console.log("Quiz data loaded:", quizData);
      setQuiz(quizData);

      // Get course details if course_id exists
      if (quizData.course_id && quizData.course_id !== "") {
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("id, name, code")
          .eq("id", quizData.course_id)
          .single();

        if (!courseError && courseData) {
          console.log("Course data loaded:", courseData);
          setCourse(courseData);
        } else {
          console.warn("Could not load course:", courseError);
        }
      }

      // Get quiz questions
      const { data: questionsData, error: questionsError } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("question_order", { ascending: true });

      if (questionsError) {
        console.error("Questions query error:", questionsError);
        throw questionsError;
      }
      
      console.log("Questions loaded:", questionsData?.length || 0);
      setQuestions(questionsData || []);

      // Get all submissions for this quiz
      const { data: submissionsData, error: submissionsError } = await supabase
        .from("quiz_submissions")
        .select("*")
        .eq("quiz_id", quizId)
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false });

      if (submissionsError) {
        console.error("Submissions query error:", submissionsError);
        throw submissionsError;
      }

      console.log("Submissions loaded:", submissionsData?.length || 0);

      // Get student details for each submission
      if (submissionsData && submissionsData.length > 0) {
        const studentIds = submissionsData.map(s => s.student_id);
        
        const { data: studentsData, error: studentsError } = await supabase
          .from("users")
          .select("id, full_name, email")
          .in("id", studentIds);

        if (studentsError) {
          console.error("Students query error:", studentsError);
          throw studentsError;
        }

        console.log("Students loaded:", studentsData?.length || 0);

        // Combine submissions with student data
        const enrichedSubmissions = submissionsData.map(submission => ({
          ...submission,
          student: studentsData?.find(s => s.id === submission.student_id) || {
            id: submission.student_id,
            full_name: "Unknown Student",
            email: "N/A",
          },
        }));

        setSubmissions(enrichedSubmissions);
      } else {
        setSubmissions([]);
      }

      console.log("Quiz data loading complete");

    } catch (err: any) {
      console.error("Error loading quiz data:", err);
      toast.error(err?.message || "Failed to load quiz data");
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

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in");
        return;
      }

      const totalScore = selectedSubmission.total_score || 0;
      const finalScore = manualScore;
      const percentage = totalScore > 0 ? Math.round((finalScore / totalScore) * 100) : 0;

      // Update submission with grades
      const { error: updateError } = await supabase
        .from("quiz_submissions")
        .update({
          manual_score: manualScore,
          percentage: percentage,
          teacher_notes: teacherNotes || null,
          graded_by: user.id,
          graded_at: new Date().toISOString(),
        })
        .eq("id", selectedSubmission.id);

      if (updateError) throw updateError;

      toast.success("Quiz graded successfully!");
      setGradingDialogOpen(false);
      loadQuizData(); // Reload to get updated data

    } catch (err: any) {
      console.error("Error grading submission:", err);
      toast.error(err?.message || "Failed to grade submission");
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

    if (question.question_type === "multiple_choice") {
      return userAnswer === question.correct_answer;
    }

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
      const passed = quiz?.passing_score ? submission.percentage >= quiz.passing_score : false;
      return (
        <Badge className={passed ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"}>
          Graded - {submission.percentage}%
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
        Pending Review
      </Badge>
    );
  };

  const handleBackNavigation = () => {
    // Navigate back to quiz view
    router.push(`/admin/quizzes/${quizId}`);
  };

  // Don't render anything until mounted (prevents SSR issues)
  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto" />
          <div>
            <p className="text-lg text-slate-600 font-medium">Loading submissions...</p>
            <p className="text-sm text-slate-500 mt-2">
              {quizId ? `Quiz ID: ${quizId}` : "Checking route parameters..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <div>
                <CardTitle>Quiz Not Found</CardTitle>
                <CardDescription className="mt-1">
                  {quizId ? "This quiz doesn't exist or you don't have permission to view it." : "Quiz ID is missing from the URL"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => router.push("/admin/quizzes")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                All Quizzes
              </Button>
              <Button onClick={() => router.push("/admin")}>
                Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackNavigation}
                className="text-white hover:bg-white/20 mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Quiz
              </Button>
              <h1 className="text-3xl font-bold mb-2">Grade Quiz Submissions</h1>
              <p className="text-purple-100">{quiz.title}</p>
              {course && (
                <button
                  onClick={() => router.push(`/admin/courses/${course.id}`)}
                  className="text-sm text-purple-100 hover:text-white flex items-center gap-1 mt-1"
                >
                  <BookOpen className="h-3 w-3" />
                  {course.code} - {course.name}
                </button>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-purple-100">Total Submissions</p>
              <p className="text-3xl font-bold">{submissions.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
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
                  <p className="text-2xl font-bold text-slate-900">{submissions.length}</p>
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
                  <p className="text-2xl font-bold text-slate-900">
                    {submissions.filter(s => s.percentage === null).length}
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
                  <p className="text-2xl font-bold text-slate-900">
                    {submissions.filter(s => s.percentage !== null).length}
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
                  <p className="text-2xl font-bold text-slate-900">
                    {submissions.filter(s => s.percentage !== null).length > 0
                      ? Math.round(
                          submissions
                            .filter(s => s.percentage !== null)
                            .reduce((sum, s) => sum + (s.percentage || 0), 0) /
                            submissions.filter(s => s.percentage !== null).length
                        )
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submissions Table */}
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
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  No Submissions Yet
                </h3>
                <p className="text-slate-500">
                  Students haven't submitted this quiz yet
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
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-purple-600" />
                          </div>
                          {submission.student.full_name}
                        </div>
                      </TableCell>
                      <TableCell>{submission.student.email}</TableCell>
                      <TableCell>
                        {submission.submitted_at
                          ? new Date(submission.submitted_at).toLocaleString()
                          : "N/A"}
                      </TableCell>
                      <TableCell>{formatTime(submission.time_spent_seconds)}</TableCell>
                      <TableCell>{getStatusBadge(submission)}</TableCell>
                      <TableCell>
                        {submission.percentage !== null ? (
                          <span className="font-semibold">
                            {submission.manual_score || submission.auto_score || 0}/{submission.total_score}
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
                          {submission.percentage !== null ? "View & Edit" : "Grade"}
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

      {/* Grading Dialog */}
      <Dialog open={gradingDialogOpen} onOpenChange={setGradingDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>Grade Quiz Submission</DialogTitle>
            <DialogDescription>
              Review student answers and assign a final grade
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              {/* Student Info */}
              <Card className="bg-slate-50">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Student</p>
                      <p className="font-semibold text-slate-900">
                        {selectedSubmission.student.full_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Email</p>
                      <p className="font-semibold text-slate-900">
                        {selectedSubmission.student.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Submitted</p>
                      <p className="font-semibold text-slate-900">
                        {selectedSubmission.submitted_at
                          ? new Date(selectedSubmission.submitted_at).toLocaleString()
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Time Spent</p>
                      <p className="font-semibold text-slate-900">
                        {formatTime(selectedSubmission.time_spent_seconds)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Answers Review */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Student Answers</h3>
                <div className="space-y-4">
                  {questions.map((question, index) => {
                    const userAnswer = getUserAnswer(question.id);
                    const isCorrect = isCorrectAnswer(question);

                    return (
                      <Card
                        key={question.id}
                        className={`${
                          question.question_type === "multiple_choice"
                            ? isCorrect
                              ? "border-green-200 bg-green-50"
                              : userAnswer
                              ? "border-red-200 bg-red-50"
                              : "border-slate-200"
                            : "border-blue-200 bg-blue-50"
                        }`}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3 mb-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                question.question_type === "multiple_choice"
                                  ? isCorrect
                                    ? "bg-green-500 text-white"
                                    : userAnswer
                                    ? "bg-red-500 text-white"
                                    : "bg-slate-400 text-white"
                                  : "bg-blue-500 text-white"
                              }`}
                            >
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <p className="font-medium text-slate-900">
                                  {question.question_text}
                                </p>
                                <Badge variant="outline">
                                  {question.points} pts
                                </Badge>
                              </div>

                              <div className="space-y-2 mt-3">
                                <p className="text-sm text-slate-600">
                                  <span className="font-semibold">Type:</span>{" "}
                                  {question.question_type}
                                </p>

                                {question.question_type === "multiple_choice" && (
                                  <>
                                    <p className="text-sm text-slate-600">
                                      <span className="font-semibold">Student Answer:</span>{" "}
                                      {userAnswer || "No answer provided"}
                                    </p>
                                    <p className="text-sm text-green-700">
                                      <span className="font-semibold">Correct Answer:</span>{" "}
                                      {question.correct_answer}
                                    </p>
                                  </>
                                )}

                                {(question.question_type === "short_answer" ||
                                  question.question_type === "essay") && (
                                  <div className="mt-2">
                                    <p className="text-sm font-semibold text-slate-700 mb-1">
                                      Student Response:
                                    </p>
                                    <div className="p-3 bg-white border rounded-lg">
                                      <p className="text-sm text-slate-900">
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

              {/* Grading Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Grade Assignment</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="auto_score">Auto Score (MCQ)</Label>
                    <Input
                      id="auto_score"
                      type="number"
                      value={selectedSubmission.auto_score || 0}
                      disabled
                      className="bg-slate-100"
                    />
                  </div>

                  <div>
                    <Label htmlFor="total_score">Total Possible Points</Label>
                    <Input
                      id="total_score"
                      type="number"
                      value={selectedSubmission.total_score || 0}
                      disabled
                      className="bg-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="manual_score">
                    Final Score (Auto + Manual) *
                  </Label>
                  <Input
                    id="manual_score"
                    type="number"
                    min="0"
                    max={selectedSubmission.total_score || 100}
                    value={manualScore}
                    onChange={(e) => setManualScore(Number(e.target.value))}
                    placeholder="Enter final score"
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    Percentage:{" "}
                    {selectedSubmission.total_score
                      ? Math.round((manualScore / selectedSubmission.total_score) * 100)
                      : 0}
                    %
                  </p>
                </div>

                <div>
                  <Label htmlFor="teacher_notes">Feedback (Optional)</Label>
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
              className="bg-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGradeSubmission}
              disabled={grading}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {grading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Grade
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}