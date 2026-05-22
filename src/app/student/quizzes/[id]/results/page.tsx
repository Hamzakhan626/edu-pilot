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
  Brain,
  Loader2,
  Trophy,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Home,
  RotateCcw,
  Clock,
  Target,
  Award,
  BookMarked,
  TrendingUp,
  Calendar,
  FileText,
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
};

type Quiz = {
  id: string;
  title: string;
  description: string | null;
  total_questions: number | null;
  passing_score: number | null;
  time_limit_minutes: number | null;
  show_results: boolean | null;
  course_id: string;
};

type Course = {
  id: string;
  name: string;
  code: string;
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

export default function StudentQuizResultsPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params?.id as string;

  const [submission, setSubmission] = useState<QuizSubmission | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (quizId) {
      loadResultsData();
    }
  }, [quizId]);

  const loadResultsData = async () => {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to view results");
        router.push("/login");
        return;
      }
      setCurrentUser(user);

      // Get quiz submission
      const { data: submissionData, error: submissionError } = await supabase
        .from("quiz_submissions")
        .select("*")
        .eq("quiz_id", quizId)
        .eq("student_id", user.id)
        .single();

      if (submissionError || !submissionData) {
        toast.error("No submission found for this quiz");
        router.push("/student/quizzes");
        return;
      }

      setSubmission(submissionData);

      // Get quiz details
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", quizId)
        .single();

      if (quizError) throw quizError;
      setQuiz(quizData);

      // Get course details
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("id, name, code")
        .eq("id", quizData.course_id)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Get questions
      const { data: questionsData, error: questionsError } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("question_order", { ascending: true });

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);
    } catch (err: any) {
      console.error("Error loading results:", err);
      toast.error(err?.message || "Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getUserAnswer = (questionId: string) => {
    if (!submission?.answers) return null;
    return submission.answers[questionId] || null;
  };

  const isCorrect = (question: Question) => {
    const userAnswer = getUserAnswer(question.id);
    if (!userAnswer) return false;

    if (question.question_type === "multiple_choice") {
      return userAnswer === question.correct_answer;
    }

    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-lg text-slate-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!submission || !quiz || !course) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Results Not Found</h3>
            <p className="text-slate-600 mb-4">
              We couldn't find your quiz results. Please try again.
            </p>
            <Button onClick={() => router.push("/student/quizzes")}>
              Back to Quizzes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const score = submission.auto_score || submission.manual_score || 0;
  const totalScore = submission.total_score || 0;
  const percentage = submission.percentage || 0;
  const passed = quiz.passing_score ? percentage >= quiz.passing_score : false;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div
        className={`${passed ? "bg-gradient-to-r from-green-600 to-emerald-600" : "bg-gradient-to-r from-orange-600 to-red-600"} text-white`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
              {passed ? (
                <Trophy className="h-10 w-10" />
              ) : (
                <AlertCircle className="h-10 w-10" />
              )}
            </div>
            <h1 className="text-3xl font-bold mb-2">
              {passed ? "Congratulations!" : "Quiz Completed"}
            </h1>
            <p className="text-lg opacity-90">
              {passed ? "You passed the quiz!" : "Keep practicing!"}
            </p>
          </div>
        </div>
      </div>

      {/* Score Card */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12">
        <Card className="border-0 shadow-2xl mb-8">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 mb-4">
                <div className="text-center">
                  <p className="text-5xl font-bold text-purple-600">
                    {Math.round(percentage)}
                  </p>
                  <p className="text-sm text-purple-600 font-semibold">%</p>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {quiz.title}
              </h2>
              <div className="flex items-center justify-center gap-2 text-slate-600">
                <BookMarked className="h-4 w-4" />
                <span>
                  {course.name} ({course.code})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Award className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-slate-600 mb-1">Score</p>
                <p className="text-2xl font-bold text-slate-900">
                  {score}/{totalScore}
                </p>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Target className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-slate-600 mb-1">Percentage</p>
                <p className="text-2xl font-bold text-slate-900">
                  {Math.round(percentage)}%
                </p>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <FileText className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-slate-600 mb-1">Questions</p>
                <p className="text-2xl font-bold text-slate-900">
                  {questions.length}
                </p>
              </div>

              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <p className="text-sm text-slate-600 mb-1">Time Spent</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatTime(submission.time_spent_seconds)}
                </p>
              </div>
            </div>

            {quiz.passing_score && (
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-600">
                    Passing Score: {quiz.passing_score}%
                  </span>
                  <span
                    className={`font-semibold ${passed ? "text-green-600" : "text-red-600"}`}
                  >
                    {passed ? "Passed" : "Not Passed"}
                  </span>
                </div>
                <Progress value={percentage} className="h-3" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Answers Review */}
          <div className="lg:col-span-2 space-y-6">
            {quiz.show_results && questions.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    Answer Review
                  </CardTitle>
                  <CardDescription>
                    Review your answers and see which questions you got right
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {questions.map((question, index) => {
                    const userAnswer = getUserAnswer(question.id);
                    const correct = isCorrect(question);

                    return (
                      <div
                        key={question.id}
                        className={`p-4 rounded-lg border-2 ${
                          correct
                            ? "border-green-200 bg-green-50"
                            : userAnswer
                              ? "border-red-200 bg-red-50"
                              : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              correct
                                ? "bg-green-500 text-white"
                                : userAnswer
                                  ? "bg-red-500 text-white"
                                  : "bg-slate-400 text-white"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <p className="font-medium text-slate-900">
                                {question.question_text}
                              </p>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {correct ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                ) : userAnswer ? (
                                  <XCircle className="h-5 w-5 text-red-600" />
                                ) : (
                                  <AlertCircle className="h-5 w-5 text-slate-400" />
                                )}
                                <Badge variant="outline" className="ml-2">
                                  {question.points} pts
                                </Badge>
                              </div>
                            </div>

                            {question.question_type === "multiple_choice" && (
                              <div className="space-y-2 mt-3">
                                {Array.isArray(question.options) &&
                                  question.options.map(
                                    (option: string, idx: number) => {
                                      const isUserAnswer =
                                        userAnswer === option;
                                      const isCorrectAnswer =
                                        question.correct_answer === option;

                                      return (
                                        <div
                                          key={idx}
                                          className={`p-2 rounded border ${
                                            isCorrectAnswer
                                              ? "border-green-500 bg-green-100"
                                              : isUserAnswer
                                                ? "border-red-500 bg-red-100"
                                                : "border-slate-200 bg-white"
                                          }`}
                                        >
                                          <div className="flex items-center gap-2">
                                            {isCorrectAnswer && (
                                              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                            )}
                                            {isUserAnswer &&
                                              !isCorrectAnswer && (
                                                <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                                              )}
                                            <span className="text-sm">
                                              {option}
                                            </span>
                                            {isUserAnswer && (
                                              <Badge
                                                variant="outline"
                                                className="ml-auto text-xs"
                                              >
                                                Your Answer
                                              </Badge>
                                            )}
                                            {isCorrectAnswer &&
                                              !isUserAnswer && (
                                                <Badge
                                                  variant="outline"
                                                  className="ml-auto text-xs bg-green-50 text-green-700 border-green-200"
                                                >
                                                  Correct Answer
                                                </Badge>
                                              )}
                                          </div>
                                        </div>
                                      );
                                    },
                                  )}
                              </div>
                            )}

                            {!userAnswer && (
                              <p className="text-sm text-slate-500 mt-2">
                                No answer provided
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {!quiz.show_results && (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                  <AlertCircle className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Answer Review Not Available
                  </h3>
                  <p className="text-slate-600">
                    The instructor has chosen not to show the answers for this
                    quiz.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Submission Info */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Submission Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Submitted</p>
                    <p className="font-medium text-slate-900">
                      {submission.submitted_at
                        ? new Date(submission.submitted_at).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Started</p>
                    <p className="font-medium text-slate-900">
                      {new Date(submission.started_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {submission.teacher_notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-slate-500 mb-1">
                        Teacher's Notes
                      </p>
                      <p className="text-sm text-slate-700">
                        {submission.teacher_notes}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6 space-y-3">
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Link href="/student/quizzes">
                    <Home className="h-4 w-4 mr-2" />
                    Back to Quizzes
                  </Link>
                </Button>

                <Button asChild variant="outline" className="w-full">
                  <Link href="/student/programs">
                    <BookMarked className="h-4 w-4 mr-2" />
                    My Courses
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Performance Summary */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <TrendingUp className="h-10 w-10 text-purple-600 mx-auto mb-3" />
                  <h4 className="font-semibold text-slate-900 mb-2">
                    {passed ? "Great Job!" : "Keep Practicing!"}
                  </h4>
                  <p className="text-sm text-slate-600">
                    {passed
                      ? "You've successfully passed this quiz. Keep up the excellent work!"
                      : "Review the material and try again. You're making progress!"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
