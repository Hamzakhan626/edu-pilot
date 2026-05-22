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
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  Brain,
  Loader2,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  Trophy,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  Info,
  BookMarked,
} from "lucide-react";
import { Input } from "@/components/ui/input";

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
  show_results: boolean | null;
  shuffle_questions: boolean | null;
  created_at: string;
};

type Course = {
  id: string;
  name: string;
  code: string;
};

type Question = {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "multiple_answer" | "short_answer" | "essay";
  options: string[];
  correct_answer: string | string[];
  points: number;
  order_number: number;
};

type Answer = {
  questionId: string;
  answer: string | string[];
};

export default function StudentQuizAttemptPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params?.id as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string | string[]>>(new Map());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (quizId) {
      loadQuizData();
    }
  }, [quizId]);

  useEffect(() => {
    if (quizStarted && timeRemaining !== null && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [quizStarted, timeRemaining]);

  const loadQuizData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to take quizzes");
        router.push("/login");
        return;
      }
      setCurrentUser(user);

      // Get quiz details
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", quizId)
        .single();

      if (quizError) throw quizError;
      if (!quizData) {
        toast.error("Quiz not found");
        router.push("/student/quizzes");
        return;
      }

      setQuiz(quizData);

      // Get course details
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("id, name, code")
        .eq("id", quizData.course_id)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Check enrollment
      const { data: enrollment, error: enrollError } = await supabase
        .from("student_courses")
        .select("id")
        .eq("student_id", user.id)
        .eq("course_id", quizData.course_id)
        .single();

      if (!enrollment) {
        toast.error("You must be enrolled in this course to take this quiz");
        router.push("/student/quizzes");
        return;
      }

      // Check if already submitted
      const { data: existingSubmission, error: submissionError } = await supabase
        .from("quiz_submissions")
        .select("*")
        .eq("quiz_id", quizId)
        .eq("student_id", user.id)
        .single();

      if (existingSubmission && existingSubmission.status === "submitted") {
        toast.info("You have already submitted this quiz");
        router.push(`/student/quizzes/${quizId}/results`);
        return;
      }

      // Get quiz questions from database
      const { data: questionsData, error: questionsError } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("question_order", { ascending: true });

      if (questionsError) throw questionsError;

      if (!questionsData || questionsData.length === 0) {
        toast.error("This quiz has no questions yet");
        router.push("/student/quizzes");
        return;
      }

      // Transform questions to match component interface
      const transformedQuestions: Question[] = questionsData.map((q) => ({
        id: q.id,
        quiz_id: q.quiz_id,
        question_text: q.question_text,
        question_type: q.question_type as "multiple_choice" | "true_false" | "multiple_answer" | "short_answer" | "essay",
        options: Array.isArray(q.options) ? q.options : [],
        correct_answer: q.correct_answer || "",
        points: q.points || 1,
        order_number: q.question_order || 0,
      }));

      setQuestions(transformedQuestions);

      // Load existing submission if in progress
      if (existingSubmission && existingSubmission.status === "in_progress") {
        const savedAnswers = new Map<string, string | string[]>();
        
        // Convert the answers object to a Map with proper typing
        if (existingSubmission.answers && typeof existingSubmission.answers === 'object') {
          Object.entries(existingSubmission.answers).forEach(([key, value]) => {
            savedAnswers.set(key, value as string | string[]);
          });
        }
        
        setAnswers(savedAnswers);
        
        // Calculate time spent
        const startedAt = new Date(existingSubmission.started_at);
        const now = new Date();
        const timeSpentSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
        
        if (quizData.time_limit_minutes) {
          const remainingSeconds = (quizData.time_limit_minutes * 60) - timeSpentSeconds;
          setTimeRemaining(Math.max(0, remainingSeconds));
        }
      }

    } catch (err: any) {
      console.error("Error loading quiz:", err);
      toast.error(err?.message || "Failed to load quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    try {
      // Create or update quiz submission
      const { data: existingSubmission } = await supabase
        .from("quiz_submissions")
        .select("*")
        .eq("quiz_id", quizId)
        .eq("student_id", currentUser.id)
        .single();

      if (!existingSubmission) {
        const { error: insertError } = await supabase
          .from("quiz_submissions")
          .insert({
            quiz_id: quizId,
            student_id: currentUser.id,
            status: "in_progress",
            started_at: new Date().toISOString(),
            answers: {},
          });

        if (insertError) throw insertError;
      }

      setQuizStarted(true);
      if (quiz?.time_limit_minutes) {
        setTimeRemaining(quiz.time_limit_minutes * 60);
      }
    } catch (err: any) {
      console.error("Error starting quiz:", err);
      toast.error("Failed to start quiz. Please try again.");
    }
  };

  const handleAnswerChange = async (questionId: string, answer: string | string[]) => {
    const newAnswers = new Map(answers.set(questionId, answer));
    setAnswers(newAnswers);

    // Auto-save to database
    try {
      const answersObject = Object.fromEntries(newAnswers);
      
      const { error } = await supabase
        .from("quiz_submissions")
        .update({ answers: answersObject })
        .eq("quiz_id", quizId)
        .eq("student_id", currentUser.id);

      if (error) console.error("Error saving answer:", error);
    } catch (err) {
      console.error("Error auto-saving:", err);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleQuestionNavigation = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const handleAutoSubmit = async () => {
    toast.warning("Time's up! Submitting your quiz...");
    await handleSubmitQuiz();
  };

  const handleSubmitQuiz = async () => {
    try {
      setSubmitting(true);

      // Calculate score
      let autoScore = 0;
      let totalScore = 0;

      questions.forEach((question) => {
        totalScore += question.points;
        const userAnswer = answers.get(question.id);

        // Only auto-grade multiple choice questions
        if (question.question_type === "multiple_choice") {
          if (userAnswer === question.correct_answer) {
            autoScore += question.points;
          }
        }
      });

      const percentage = totalScore > 0 ? Math.round((autoScore / totalScore) * 100) : 0;

      // Get submission record
      const { data: submission } = await supabase
        .from("quiz_submissions")
        .select("started_at")
        .eq("quiz_id", quizId)
        .eq("student_id", currentUser.id)
        .single();

      // Calculate time spent
      let timeSpentSeconds = 0;
      if (submission?.started_at) {
        const startedAt = new Date(submission.started_at);
        const now = new Date();
        timeSpentSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
      }

      // Update quiz submission
      const { error: updateError } = await supabase
        .from("quiz_submissions")
        .update({
          submitted_at: new Date().toISOString(),
          time_spent_seconds: timeSpentSeconds,
          answers: Object.fromEntries(answers),
          auto_score: autoScore,
          total_score: totalScore,
          percentage: percentage,
          status: "submitted",
        })
        .eq("quiz_id", quizId)
        .eq("student_id", currentUser.id);

      if (updateError) throw updateError;

      toast.success("Quiz submitted successfully!");

      // Redirect to results page
      router.push(`/student/quizzes/${quizId}/results`);
    } catch (err: any) {
      console.error("Error submitting quiz:", err);
      toast.error(err?.message || "Failed to submit quiz");
    } finally {
      setSubmitting(false);
      setShowSubmitDialog(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getAnsweredCount = () => {
    return answers.size;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-lg text-slate-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz || !course) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Quiz Not Found</h3>
            <p className="text-slate-600 mb-4">
              The quiz you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push("/student/quizzes")}>
              Back to Quizzes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg">
            <div className="flex items-center gap-3 mb-3">
              <Brain className="h-8 w-8" />
              <div>
                <CardTitle className="text-2xl">{quiz.title}</CardTitle>
                <div className="flex items-center gap-2 mt-1 text-purple-100">
                  <BookMarked className="h-4 w-4" />
                  <span className="text-sm">{course.name} ({course.code})</span>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-8">
            {quiz.description && (
              <p className="text-slate-600 mb-6">{quiz.description}</p>
            )}

            <div className="space-y-4 mb-8">
              <div className="grid grid-cols-2 gap-4">
                {quiz.total_questions && (
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                    <div>
                      <p className="text-sm text-slate-600">Total Questions</p>
                      <p className="text-lg font-bold text-slate-900">{quiz.total_questions}</p>
                    </div>
                  </div>
                )}

                {quiz.time_limit_minutes && (
                  <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
                    <Clock className="h-6 w-6 text-orange-600" />
                    <div>
                      <p className="text-sm text-slate-600">Time Limit</p>
                      <p className="text-lg font-bold text-slate-900">{quiz.time_limit_minutes} minutes</p>
                    </div>
                  </div>
                )}

                {quiz.passing_score && (
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                    <Trophy className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="text-sm text-slate-600">Passing Score</p>
                      <p className="text-lg font-bold text-slate-900">{quiz.passing_score}%</p>
                    </div>
                  </div>
                )}

                {quiz.difficulty && (
                  <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
                    <Info className="h-6 w-6 text-purple-600" />
                    <div>
                      <p className="text-sm text-slate-600">Difficulty</p>
                      <p className="text-lg font-bold text-slate-900 capitalize">{quiz.difficulty}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">Instructions:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Read each question carefully before answering</li>
                    <li>You can navigate between questions using the navigation buttons</li>
                    {quiz.time_limit_minutes && (
                      <li>The quiz will auto-submit when time runs out</li>
                    )}
                    <li>Review your answers before submitting</li>
                    {quiz.show_results && (
                      <li>You will see your results immediately after submission</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push("/student/quizzes")}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleStartQuiz}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                Start Quiz
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header with Timer */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{quiz.title}</h1>
              <p className="text-sm text-purple-100">{course.name}</p>
            </div>
            
            {timeRemaining !== null && (
              <div className="flex items-center gap-3 bg-white/20 rounded-lg px-4 py-2">
                <Clock className="h-5 w-5" />
                <div>
                  <p className="text-xs text-purple-100">Time Remaining</p>
                  <p className="text-lg font-bold">{formatTime(timeRemaining)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
              <span>{getAnsweredCount()} answered</span>
            </div>
            <Progress value={progress} className="h-2 bg-white/20" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl">
                    Question {currentQuestion.order_number}
                  </CardTitle>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    {currentQuestion.points} points
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <p className="text-lg text-slate-900">{currentQuestion.question_text}</p>

                {currentQuestion.question_type === "multiple_choice" && (
                  <RadioGroup
                    value={answers.get(currentQuestion.id) as string || ""}
                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                  >
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <RadioGroupItem value={option} id={`${currentQuestion.id}-${index}`} />
                          <Label
                            htmlFor={`${currentQuestion.id}-${index}`}
                            className="flex-1 cursor-pointer"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                )}

                {currentQuestion.question_type === "short_answer" && (
                  <div className="space-y-3">
                    <Input
                      type="text"
                      placeholder="Type your answer here..."
                      value={answers.get(currentQuestion.id) as string || ""}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      className="w-full p-4 text-base"
                    />
                    <p className="text-sm text-slate-500">
                      This answer will be manually graded by your instructor
                    </p>
                  </div>
                )}

                {currentQuestion.question_type === "essay" && (
                  <div className="space-y-3">
                    <textarea
                      placeholder="Type your essay answer here..."
                      value={answers.get(currentQuestion.id) as string || ""}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      className="w-full min-h-[200px] p-4 text-base border-2 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows={8}
                    />
                    <p className="text-sm text-slate-500">
                      This essay will be manually graded by your instructor
                    </p>
                  </div>
                )}

                {currentQuestion.question_type === "true_false" && (
                  <RadioGroup
                    value={answers.get(currentQuestion.id) as string || ""}
                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                  >
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <RadioGroupItem value={option} id={`${currentQuestion.id}-${index}`} />
                          <Label
                            htmlFor={`${currentQuestion.id}-${index}`}
                            className="flex-1 cursor-pointer"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                )}

                {currentQuestion.question_type === "multiple_answer" && (
                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => {
                      const currentAnswers = (answers.get(currentQuestion.id) as string[]) || [];
                      const isChecked = currentAnswers.includes(option);

                      return (
                        <div
                          key={index}
                          className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <Checkbox
                            id={`${currentQuestion.id}-${index}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const newAnswers = checked
                                ? [...currentAnswers, option]
                                : currentAnswers.filter((a) => a !== option);
                              handleAnswerChange(currentQuestion.id, newAnswers);
                            }}
                          />
                          <Label
                            htmlFor={`${currentQuestion.id}-${index}`}
                            className="flex-1 cursor-pointer"
                          >
                            {option}
                          </Label>
                        </div>
                      );
                    })}
                    <p className="text-sm text-slate-500 mt-2">
                      Select all that apply
                    </p>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>

                  {currentQuestionIndex === questions.length - 1 ? (
                    <Button
                      onClick={() => setShowSubmitDialog(true)}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Submit Quiz
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNextQuestion}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Question Navigator */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-lg sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Question Navigator</CardTitle>
                <CardDescription>
                  {getAnsweredCount()} of {questions.length} answered
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2">
                  {questions.map((q, index) => {
                    const isAnswered = answers.has(q.id);
                    const isCurrent = index === currentQuestionIndex;

                    return (
                      <button
                        key={q.id}
                        onClick={() => handleQuestionNavigation(index)}
                        className={`aspect-square rounded-lg font-semibold text-sm transition-all ${
                          isCurrent
                            ? "bg-purple-600 text-white ring-2 ring-purple-600 ring-offset-2"
                            : isAnswered
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {index + 1}
                        {isAnswered && !isCurrent && (
                          <CheckCircle2 className="h-3 w-3 inline ml-1" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-purple-600"></div>
                    <span className="text-slate-600">Current</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-100 border border-green-200"></div>
                    <span className="text-slate-600">Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-slate-100 border border-slate-200"></div>
                    <span className="text-slate-600">Not Answered</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {getAnsweredCount()} out of {questions.length} questions.
              {getAnsweredCount() < questions.length && (
                <span className="block mt-2 text-orange-600 font-semibold">
                  Warning: You have {questions.length - getAnsweredCount()} unanswered questions.
                </span>
              )}
              <span className="block mt-2">
                Are you sure you want to submit your quiz? This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white">Review Answers</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmitQuiz}
              disabled={submitting}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Quiz
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}