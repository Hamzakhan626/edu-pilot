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
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  Save,
  X,
  Plus,
  Trash2,
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
  
  const courseId = params?.id as string;
  const quizId = params?.quizid as string;

  console.log("Route Parameters:", { courseId, quizId, allParams: params });

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [course, setCourse] = useState<any>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    averageScore: 0,
    completionRate: 0,
    totalSubmissions: 0,
    pendingGrading: 0,
  });

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuiz, setEditedQuiz] = useState<Quiz | null>(null);
  const [saving, setSaving] = useState(false);

  // Question editing state
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [newQuestion, setNewQuestion] = useState({
    question_text: "",
    question_type: "multiple_choice" as "multiple_choice" | "short_answer" | "essay",
    options: [""],
    correct_answer: "",
    points: 1,
  });

  const loadData = async () => {
    console.log("Starting loadData with:", { courseId, quizId });
    
    if (!quizId) {
      const errorMsg = `Quiz ID is undefined. Parameters: ${JSON.stringify(params)}`;
      console.error(errorMsg);
      setError(errorMsg);
      setLoading(false);
      toast.error("Quiz ID not found in URL");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("Querying Supabase for quiz ID:", quizId);

      // Load quiz details
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", quizId)
        .single();

      if (quizError) {
        console.error("Supabase quiz query error:", quizError);
        throw new Error(`Failed to load quiz: ${quizError.message}`);
      }
      
      if (!quizData) {
        throw new Error(`Quiz with ID "${quizId}" not found in database`);
      }
      
      console.log("Quiz loaded successfully:", quizData);
      setQuiz(quizData);
      setEditedQuiz(quizData);

      // Load course details
      const courseIdToLoad = quizData.course_id || courseId;
      if (courseIdToLoad) {
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("*")
          .eq("id", courseIdToLoad)
          .single();

        if (courseError) {
          console.warn("Could not load course:", courseError);
        } else {
          setCourse(courseData);
          console.log("Course loaded:", courseData);
        }
      }

      // Load questions
      const { data: questionsData, error: questionsError } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("question_order");

      if (questionsError) {
        console.warn("Could not load questions:", questionsError);
        setQuestions([]);
      } else {
        setQuestions(questionsData || []);
        console.log(`Loaded ${questionsData?.length || 0} questions`);
      }

      // Load submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from("quiz_submissions")
        .select("id, student_id, status, percentage")
        .eq("quiz_id", quizId);

      if (submissionsError) {
        console.warn("Could not load submissions:", submissionsError);
        setSubmissions([]);
      } else {
        setSubmissions(submissionsData || []);
        console.log(`Loaded ${submissionsData?.length || 0} submissions`);

        // Calculate stats
        const gradedSubmissions =
          submissionsData?.filter((s) => s.percentage !== null) || [];
        const pendingGrading =
          submissionsData?.filter((s) => s.percentage === null && s.status === "submitted") || [];
        
        const averageScore =
          gradedSubmissions.length > 0
            ? gradedSubmissions.reduce(
                (acc, s) => acc + (s.percentage || 0),
                0,
              ) / gradedSubmissions.length
            : 0;

        const completionRate =
          submissionsData?.length > 0
            ? (gradedSubmissions.length / submissionsData.length) * 100
            : 0;

        setStats({
          averageScore: Math.round(averageScore * 100) / 100,
          completionRate: Math.round(completionRate * 100) / 100,
          totalSubmissions: submissionsData?.length || 0,
          pendingGrading: pendingGrading.length,
        });
      }
      
      console.log("Data loading completed successfully");
      
    } catch (err: any) {
      console.error("Error in loadData:", err);
      const errorMsg = err?.message || "Failed to load quiz data";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
      console.log("Loading state set to false");
    }
  };

  useEffect(() => {
    console.log("useEffect triggered, quizId:", quizId);
    if (quizId) {
      console.log("Calling loadData...");
      void loadData();
    } else {
      console.log("quizId is falsy, setting error");
      setError("Quiz ID not found in URL parameters");
      setLoading(false);
    }
  }, [quizId]);

  // Quiz editing functions
  const handleSaveQuiz = async () => {
    if (!editedQuiz) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("quizzes")
        .update({
          title: editedQuiz.title,
          description: editedQuiz.description,
          passing_score: editedQuiz.passing_score,
          time_limit_minutes: editedQuiz.time_limit_minutes,
          difficulty: editedQuiz.difficulty,
          type: editedQuiz.type,
          status: editedQuiz.status,
          allow_late_submission: editedQuiz.allow_late_submission,
          show_results: editedQuiz.show_results,
          shuffle_questions: editedQuiz.shuffle_questions,
          section: editedQuiz.section,
          scheduled_at: editedQuiz.scheduled_at,
        })
        .eq("id", quizId);

      if (error) throw error;

      setQuiz(editedQuiz);
      setIsEditing(false);
      toast.success("Quiz updated successfully!");
    } catch (err: any) {
      console.error("Error saving quiz:", err);
      toast.error(err?.message || "Failed to update quiz");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedQuiz(quiz);
    setIsEditing(false);
    setEditingQuestion(null);
  };

  const handleAddOption = () => {
    setNewQuestion({
      ...newQuestion,
      options: [...newQuestion.options, ""]
    });
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = [...newQuestion.options];
    newOptions.splice(index, 1);
    setNewQuestion({
      ...newQuestion,
      options: newOptions,
      correct_answer: newQuestion.correct_answer === newOptions[index] ? "" : newQuestion.correct_answer
    });
  };

  const handleUpdateOption = (index: number, value: string) => {
    const newOptions = [...newQuestion.options];
    newOptions[index] = value;
    setNewQuestion({
      ...newQuestion,
      options: newOptions
    });
  };

  const handleSaveQuestion = async () => {
    if (!quiz) return;

    try {
      const { error } = await supabase
        .from("quiz_questions")
        .insert({
          quiz_id: quiz.id,
          question_text: newQuestion.question_text,
          question_type: newQuestion.question_type,
          options: newQuestion.question_type === "multiple_choice" ? newQuestion.options : null,
          correct_answer: newQuestion.correct_answer || null,
          points: newQuestion.points,
          question_order: questions.length + 1,
        });

      if (error) throw error;

      toast.success("Question added successfully!");
      setNewQuestion({
        question_text: "",
        question_type: "multiple_choice",
        options: [""],
        correct_answer: "",
        points: 1,
      });
      await loadData(); // Reload questions
    } catch (err: any) {
      console.error("Error adding question:", err);
      toast.error(err?.message || "Failed to add question");
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const { error } = await supabase
        .from("quiz_questions")
        .delete()
        .eq("id", questionId);

      if (error) throw error;

      toast.success("Question deleted successfully!");
      await loadData(); // Reload questions
    } catch (err: any) {
      console.error("Error deleting question:", err);
      toast.error(err?.message || "Failed to delete question");
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

  const handleCopyQuizLink = () => {
    if (!quiz) return;
    const quizLink = `${window.location.origin}/quiz/${quiz.id}`;
    navigator.clipboard.writeText(quizLink);
    toast.success("Quiz link copied to clipboard!");
  };

  const handleGradeSubmissions = () => {
    if (!quiz || !courseId) return;
    router.push(`/admin/courses/${courseId}/quizzes/${quiz.id}/grading`);
  };

  const handlePreviewQuiz = () => {
    if (!quiz) return;
    window.open(`/admin/courses/${quiz.course_id}/quizzes/${quiz.id}/preview`, "_blank");
  };

  const handleBack = () => {
    if (courseId) {
      router.push(`/admin/courses/${courseId}/quizzes`);
    } else {
      router.push("/admin/courses");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-4" />
        <p className="text-slate-600">Loading quiz...</p>
        <div className="text-sm text-slate-500 mt-2 space-y-1">
          <p>Course ID: {courseId || "Not found"}</p>
          <p>Quiz ID: {quizId || "Not found"}</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">
          {error || "Quiz not found"}
        </h1>
        <p className="text-slate-600 mb-6 text-center">
          There was an error loading the quiz.
        </p>
        <div className="bg-slate-50 p-4 rounded-lg mb-6 max-w-md">
          <p className="text-sm font-medium text-slate-700 mb-2">Debug Info:</p>
          <pre className="text-xs text-slate-600 bg-white p-2 rounded">
            {JSON.stringify({
              courseId,
              quizId,
              hasQuiz: !!quiz,
              allParams: params,
            }, null, 2)}
          </pre>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {courseId ? "Quizzes" : "Courses"}
          </Button>
          <Button variant="outline" onClick={() => void loadData()}>
            <Loader2 className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
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
                onClick={handleBack}
                className="hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {isEditing ? "Edit Quiz" : quiz.title}
                </h1>
                {course && (
                  <p className="text-sm text-slate-600 flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    {course.name} • {course.code}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveQuiz}
                    disabled={saving}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Quiz
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Quiz Details & Questions */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quiz Info Card - Editable when in edit mode */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">
                      {isEditing ? "Edit Quiz Details" : "Quiz Details"}
                    </CardTitle>
                    <CardDescription>
                      {isEditing ? "Update quiz information below" : quiz.description || "No description provided"}
                    </CardDescription>
                  </div>
                  {!isEditing && (
                    <div className="flex items-center gap-2">
                      {getStatusBadge(quiz.status)}
                      {getDifficultyBadge(quiz.difficulty)}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditing && editedQuiz ? (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="quiz-title">Quiz Title</Label>
                        <Input
                          id="quiz-title"
                          value={editedQuiz.title}
                          onChange={(e) => setEditedQuiz({...editedQuiz, title: e.target.value})}
                          placeholder="Enter quiz title"
                        />
                      </div>

                      <div>
                        <Label htmlFor="quiz-description">Description</Label>
                        <Textarea
                          id="quiz-description"
                          value={editedQuiz.description || ""}
                          onChange={(e) => setEditedQuiz({...editedQuiz, description: e.target.value})}
                          placeholder="Enter quiz description"
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="quiz-type">Quiz Type</Label>
                          <Select
                            value={editedQuiz.type}
                            onValueChange={(value) => setEditedQuiz({...editedQuiz, type: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="exam">Exam</SelectItem>
                              <SelectItem value="quiz">Quiz</SelectItem>
                              <SelectItem value="assignment">Assignment</SelectItem>
                              <SelectItem value="practice">Practice</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="quiz-difficulty">Difficulty</Label>
                          <Select
                            value={editedQuiz.difficulty}
                            onValueChange={(value) => setEditedQuiz({...editedQuiz, difficulty: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select difficulty" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="passing-score">Passing Score (%)</Label>
                          <Input
                            id="passing-score"
                            type="number"
                            min="0"
                            max="100"
                            value={editedQuiz.passing_score}
                            onChange={(e) => setEditedQuiz({...editedQuiz, passing_score: parseInt(e.target.value)})}
                          />
                        </div>

                        <div>
                          <Label htmlFor="time-limit">Time Limit (minutes)</Label>
                          <Input
                            id="time-limit"
                            type="number"
                            min="0"
                            value={editedQuiz.time_limit_minutes || ""}
                            onChange={(e) => setEditedQuiz({...editedQuiz, time_limit_minutes: e.target.value ? parseInt(e.target.value) : null})}
                            placeholder="No limit"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="quiz-status">Status</Label>
                          <Select
                            value={editedQuiz.status}
                            onValueChange={(value: any) => setEditedQuiz({...editedQuiz, status: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="quiz-section">Section</Label>
                          <Input
                            id="quiz-section"
                            value={editedQuiz.section || ""}
                            onChange={(e) => setEditedQuiz({...editedQuiz, section: e.target.value})}
                            placeholder="e.g., Chapter 1, Midterm, etc."
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label>Quiz Settings</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="shuffle-questions"
                            checked={editedQuiz.shuffle_questions}
                            onChange={(e) => setEditedQuiz({...editedQuiz, shuffle_questions: e.target.checked})}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <Label htmlFor="shuffle-questions" className="text-sm">
                            Shuffle Questions
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="show-results"
                            checked={editedQuiz.show_results}
                            onChange={(e) => setEditedQuiz({...editedQuiz, show_results: e.target.checked})}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <Label htmlFor="show-results" className="text-sm">
                            Show Results to Students
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="allow-late"
                            checked={editedQuiz.allow_late_submission}
                            onChange={(e) => setEditedQuiz({...editedQuiz, allow_late_submission: e.target.checked})}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <Label htmlFor="allow-late" className="text-sm">
                            Allow Late Submissions
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-slate-500 mb-2">
                          Quiz Type
                        </h3>
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-purple-600" />
                          <span className="font-medium capitalize">
                            {quiz.type}
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
                                },
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
                )}
              </CardContent>
              {!isEditing && (
                <CardFooter className="border-t border-slate-200 pt-6">
                  <div className="w-full flex flex-col sm:flex-row gap-3">
                    <Button onClick={handleGradeSubmissions} className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                      <GraduationCap className="h-4 w-4 mr-2" />
                      Grade Submissions ({stats.totalSubmissions})
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handlePreviewQuiz}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview Quiz
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>

            {/* Questions Section with Add Question Form */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">
                      Questions ({questions.length})
                    </CardTitle>
                    <CardDescription>
                      {isEditing ? "Add or edit questions for this quiz" : "Review the questions included in this quiz"}
                    </CardDescription>
                  </div>
                  {isEditing && (
                    <Button
                      size="sm"
                      onClick={() => setEditingQuestion(null)}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Question
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-6">
                    {/* Add Question Form */}
                    {!editingQuestion && (
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="question-text">Question Text</Label>
                            <Textarea
                              id="question-text"
                              value={newQuestion.question_text}
                              onChange={(e) => setNewQuestion({...newQuestion, question_text: e.target.value})}
                              placeholder="Enter your question here..."
                              rows={3}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="question-type">Question Type</Label>
                              <Select
                                value={newQuestion.question_type}
                                onValueChange={(value: any) => setNewQuestion({...newQuestion, question_type: value, options: value === "multiple_choice" ? [""] : [], correct_answer: ""})}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                  <SelectItem value="short_answer">Short Answer</SelectItem>
                                  <SelectItem value="essay">Essay</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label htmlFor="question-points">Points</Label>
                              <Input
                                id="question-points"
                                type="number"
                                min="1"
                                value={newQuestion.points}
                                onChange={(e) => setNewQuestion({...newQuestion, points: parseInt(e.target.value) || 1})}
                              />
                            </div>
                          </div>

                          {/* Multiple Choice Options */}
                          {newQuestion.question_type === "multiple_choice" && (
                            <div className="space-y-4">
                              <Label>Options</Label>
                              {newQuestion.options.map((option, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <Input
                                    value={option}
                                    onChange={(e) => handleUpdateOption(index, e.target.value)}
                                    placeholder={`Option ${index + 1}`}
                                  />
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="radio"
                                      id={`correct-${index}`}
                                      name="correct-answer"
                                      checked={newQuestion.correct_answer === option}
                                      onChange={() => setNewQuestion({...newQuestion, correct_answer: option})}
                                      className="h-4 w-4"
                                    />
                                    <Label htmlFor={`correct-${index}`} className="text-sm">
                                      Correct
                                    </Label>
                                  </div>
                                  {newQuestion.options.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveOption(index)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddOption}
                                className="w-full"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Option
                              </Button>
                            </div>
                          )}

                          {/* Short Answer/Essay Correct Answer */}
                          {(newQuestion.question_type === "short_answer" || newQuestion.question_type === "essay") && (
                            <div>
                              <Label htmlFor="correct-answer">
                                {newQuestion.question_type === "short_answer" ? "Expected Answer (Optional)" : "Grading Notes (Optional)"}
                              </Label>
                              <Textarea
                                id="correct-answer"
                                value={newQuestion.correct_answer}
                                onChange={(e) => setNewQuestion({...newQuestion, correct_answer: e.target.value})}
                                placeholder={
                                  newQuestion.question_type === "short_answer" 
                                    ? "Enter the expected answer..."
                                    : "Add grading notes for this essay question..."
                                }
                                rows={3}
                              />
                            </div>
                          )}

                          <Button
                            onClick={handleSaveQuestion}
                            disabled={!newQuestion.question_text.trim()}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Add Question
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Existing Questions List */}
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteQuestion(question.id)}
                                  className="ml-auto text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
                                        ),
                                      )}
                                  </div>
                                </div>
                              )}

                              {(question.question_type === "essay" || question.question_type === "short_answer") && (
                                <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                                  <p className="text-sm text-yellow-700 font-medium">
                                    {question.question_type === "essay" ? "Essay" : "Short answer"} question - requires manual grading
                                  </p>
                                  {question.question_type === "short_answer" && question.correct_answer && (
                                    <p className="text-sm text-yellow-600 mt-1">
                                      <strong>Expected answer:</strong> {question.correct_answer}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : questions.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">
                      No questions yet
                    </h3>
                    <p className="text-slate-500 mb-6">
                      Add questions to this quiz to make it complete.
                    </p>
                    <Button
                      onClick={() => setIsEditing(true)}
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
                                      ),
                                    )}
                                </div>
                              </div>
                            )}

                            {(question.question_type === "essay" || question.question_type === "short_answer") && (
                              <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                                <p className="text-sm text-yellow-700 font-medium">
                                  {question.question_type === "essay" ? "Essay" : "Short answer"} question - requires manual grading
                                </p>
                                {question.question_type === "short_answer" && question.correct_answer && (
                                  <p className="text-sm text-yellow-600 mt-1">
                                    <strong>Expected answer:</strong> {question.correct_answer}
                                  </p>
                                )}
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
                {!isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      className="w-full justify-start hover:bg-purple-50 hover:text-purple-700"
                      onClick={() => setIsEditing(true)}
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

                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="w-full justify-start hover:bg-green-50 hover:text-green-700"
                      onClick={handleSaveQuiz}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-3 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-3" />
                      )}
                      Save Quiz Changes
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start hover:bg-red-50 hover:text-red-700"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-4 w-4 mr-3" />
                      Cancel Editing
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start hover:bg-blue-50 hover:text-blue-700"
                      onClick={() => setEditingQuestion(null)}
                    >
                      <Plus className="h-4 w-4 mr-3" />
                      Add New Question
                    </Button>
                  </>
                )}
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