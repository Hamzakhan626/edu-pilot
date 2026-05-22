/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/no-unescaped-entities */
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  Eye,
  Calendar,
  Clock,
  FileText,
  Sparkles,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Edit2,
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

export default function EditQuizPage() {
  const params = useParams<{ quizid: string }>();
  const router = useRouter();

  // ✅ FIXED: Extract quizid from params
  const quizId = params.quizid;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [course, setCourse] = useState<any>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "multiple_choice",
    difficulty: "medium",
    status: "draft",
    passing_score: 70,
    time_limit_minutes: null as number | null,
    scheduled_at: "",
    allow_late_submission: true,
    show_results: true,
    shuffle_questions: false,
    section: "",
  });

  const loadData = async () => {
    try {
      setLoading(true);

      // Load quiz details
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", quizId)
        .single();

      if (quizError) throw quizError;
      setQuiz(quizData);

      // Load course details
      if (quizData.course_id) {
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("*")
          .eq("id", quizData.course_id)
          .single();

        if (!courseError) {
          setCourse(courseData);
        }
      }

      // Load questions
      const { data: questionsData, error: questionsError } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("question_order");

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      // Initialize form data
      setFormData({
        title: quizData.title,
        description: quizData.description || "",
        type: quizData.type,
        difficulty: quizData.difficulty,
        status: quizData.status,
        passing_score: quizData.passing_score,
        time_limit_minutes: quizData.time_limit_minutes,
        scheduled_at: quizData.scheduled_at
          ? new Date(quizData.scheduled_at).toISOString().split("T")[0]
          : "",
        allow_late_submission: quizData.allow_late_submission,
        show_results: quizData.show_results,
        shuffle_questions: quizData.shuffle_questions,
        section: quizData.section || "",
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to load quiz data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (quizId) {
      void loadData();
    }
  }, [quizId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSave = async () => {
    if (!quiz) return;

    try {
      setSaving(true);

      const updateData: any = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        type: formData.type,
        difficulty: formData.difficulty,
        status: formData.status,
        passing_score: formData.passing_score,
        time_limit_minutes: formData.time_limit_minutes
          ? Number(formData.time_limit_minutes)
          : null,
        scheduled_at: formData.scheduled_at
          ? new Date(formData.scheduled_at).toISOString()
          : null,
        allow_late_submission: formData.allow_late_submission,
        show_results: formData.show_results,
        shuffle_questions: formData.shuffle_questions,
        section: formData.section.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("quizzes")
        .update(updateData)
        .eq("id", quizId);

      if (error) throw error;

      toast.success("Quiz updated successfully!");
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update quiz");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = () => {
    toast.info("Question editor coming soon!");
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const { error } = await supabase
        .from("quiz_questions")
        .delete()
        .eq("id", questionId);

      if (error) throw error;

      toast.success("Question deleted successfully");
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete question");
    }
  };

  const handlePublishQuiz = async () => {
    if (!quiz) return;

    try {
      const { error } = await supabase
        .from("quizzes")
        .update({ status: "published", updated_at: new Date().toISOString() })
        .eq("id", quizId);

      if (error) throw error;

      toast.success("Quiz published successfully!");
      setFormData((prev) => ({ ...prev, status: "published" }));
      setQuiz((prev) => (prev ? { ...prev, status: "published" } : null));
    } catch (err: any) {
      toast.error(err?.message || "Failed to publish quiz");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Quiz not found
        </h1>
        <p className="text-slate-600 mb-6">
          The quiz you're looking for doesn't exist.
        </p>
        <Button onClick={() => router.push(`/admin/quizzes/${quizId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quiz
        </Button>
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
                onClick={() => router.push(`/admin/quizzes/${quizId}`)}
                className="hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Quiz
              </Button>
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Edit Quiz</h1>
                <p className="text-sm text-slate-600 flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {course?.name || "Loading..."} • {quiz.title}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => router.push(`/admin/quizzes/${quizId}`)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="details">Quiz Details</TabsTrigger>
                <TabsTrigger value="questions">
                  Questions ({questions.length})
                </TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-6">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">
                      Basic Information
                    </CardTitle>
                    <CardDescription>
                      Set up the basic details of your quiz
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Quiz Title *</Label>
                      <Input
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="Enter quiz title"
                        className="text-lg"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Enter a description for the quiz"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="type">Quiz Type</Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value) =>
                            handleSelectChange("type", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="multiple_choice">
                              Multiple Choice
                            </SelectItem>
                            <SelectItem value="short_answer">
                              Short Answer
                            </SelectItem>
                            <SelectItem value="essay">Essay</SelectItem>
                            <SelectItem value="mixed">
                              Mixed Questions
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="difficulty">Difficulty Level</Label>
                        <Select
                          value={formData.difficulty}
                          onValueChange={(value) =>
                            handleSelectChange("difficulty", value)
                          }
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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="passing_score">Passing Score (%)</Label>
                        <Input
                          id="passing_score"
                          name="passing_score"
                          type="number"
                          min="0"
                          max="100"
                          value={formData.passing_score}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="time_limit_minutes">
                          Time Limit (minutes)
                        </Label>
                        <Input
                          id="time_limit_minutes"
                          name="time_limit_minutes"
                          type="number"
                          min="1"
                          placeholder="No time limit"
                          value={formData.time_limit_minutes || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFormData((prev) => ({
                              ...prev,
                              time_limit_minutes: value ? Number(value) : null,
                            }));
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="scheduled_at">
                        Scheduled Date (optional)
                      </Label>
                      <Input
                        id="scheduled_at"
                        name="scheduled_at"
                        type="date"
                        value={formData.scheduled_at}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="section">
                        Section/Category (optional)
                      </Label>
                      <Input
                        id="section"
                        name="section"
                        value={formData.section}
                        onChange={handleInputChange}
                        placeholder="e.g., Midterm, Final, Chapter 1"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Questions Tab */}
              <TabsContent value="questions" className="space-y-6">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold">
                          Quiz Questions
                        </CardTitle>
                        <CardDescription>
                          Manage questions for this quiz
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAddQuestion}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          AI Generate
                        </Button>
                        <Button size="sm" onClick={handleAddQuestion}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Question
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {questions.length === 0 ? (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-2">
                          No questions yet
                        </h3>
                        <p className="text-slate-500 mb-6">
                          Add questions to make your quiz complete. You can
                          create them manually or use AI to generate.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <Button
                            onClick={handleAddQuestion}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate with AI
                          </Button>
                          <Button variant="outline" onClick={handleAddQuestion}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Manually
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-sm text-slate-600">
                          Total Points:{" "}
                          {questions.reduce((sum, q) => sum + q.points, 0)}
                        </div>

                        {questions.map((question, index) => (
                          <Card
                            key={question.id}
                            className="border border-slate-200"
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <Badge
                                      variant="outline"
                                      className="bg-slate-100"
                                    >
                                      Question {index + 1}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className="capitalize"
                                    >
                                      {question.question_type.replace("_", " ")}
                                    </Badge>
                                    <Badge className="bg-blue-100 text-blue-800">
                                      {question.points} point
                                      {question.points !== 1 ? "s" : ""}
                                    </Badge>
                                  </div>
                                  <h4 className="font-medium text-slate-900 mb-3">
                                    {question.question_text}
                                  </h4>

                                  {question.question_type ===
                                    "multiple_choice" && (
                                    <div className="mt-3">
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
                                                  option ===
                                                  question.correct_answer
                                                    ? "bg-green-50 border border-green-200"
                                                    : "bg-slate-50"
                                                }`}
                                              >
                                                <div
                                                  className={`w-6 h-6 rounded flex items-center justify-center ${
                                                    option ===
                                                    question.correct_answer
                                                      ? "bg-green-100 text-green-700"
                                                      : "bg-slate-100 text-slate-600"
                                                  }`}
                                                >
                                                  {String.fromCharCode(
                                                    65 + idx
                                                  )}
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
                                </div>
                              </div>

                              <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAddQuestion()}
                                >
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="hover:bg-red-50 hover:text-red-600"
                                  onClick={() =>
                                    handleDeleteQuestion(question.id)
                                  }
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">
                      Quiz Settings
                    </CardTitle>
                    <CardDescription>
                      Configure additional quiz settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Shuffle Questions</Label>
                          <p className="text-sm text-slate-500">
                            Randomize the order of questions for each student
                          </p>
                        </div>
                        <Switch
                          checked={formData.shuffle_questions}
                          onCheckedChange={(checked) =>
                            handleSwitchChange("shuffle_questions", checked)
                          }
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Show Results</Label>
                          <p className="text-sm text-slate-500">
                            Allow students to see their results immediately
                            after submission
                          </p>
                        </div>
                        <Switch
                          checked={formData.show_results}
                          onCheckedChange={(checked) =>
                            handleSwitchChange("show_results", checked)
                          }
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">
                            Allow Late Submission
                          </Label>
                          <p className="text-sm text-slate-500">
                            Allow students to submit after the deadline
                          </p>
                        </div>
                        <Switch
                          checked={formData.allow_late_submission}
                          onCheckedChange={(checked) =>
                            handleSwitchChange("allow_late_submission", checked)
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Quiz Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) =>
                          handleSelectChange("status", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-slate-200 pt-6">
                    <Button
                      onClick={handlePublishQuiz}
                      disabled={formData.status === "published"}
                      className="w-full"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {formData.status === "published"
                        ? "Already Published"
                        : "Publish Quiz"}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Preview & Actions */}
          <div className="space-y-8">
            {/* Preview Card */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Eye className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Quiz Preview</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-slate-900">
                    {formData.title}
                  </h3>
                  {formData.description && (
                    <p className="text-sm text-slate-600">
                      {formData.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-50 p-2 rounded">
                    <div className="text-slate-500">Questions</div>
                    <div className="font-semibold">{questions.length}</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <div className="text-slate-500">Passing Score</div>
                    <div className="font-semibold">
                      {formData.passing_score}%
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <div className="text-slate-500">Type</div>
                    <div className="font-semibold capitalize">
                      {formData.type.replace("_", " ")}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <div className="text-slate-500">Difficulty</div>
                    <div className="font-semibold capitalize">
                      {formData.difficulty}
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(`/quiz/${quizId}`, "_blank")}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Open Preview
                </Button>
              </CardContent>
            </Card>

            {/* Actions Card */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/admin/quizzes/${quizId}`)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Discard Changes
                </Button>

                <Separator />

                <Button
                  variant="outline"
                  className="w-full hover:bg-red-50 hover:text-red-600"
                  onClick={() => {
                    if (
                      confirm(
                        "Are you sure you want to delete this quiz? This action cannot be undone."
                      )
                    ) {
                      toast.info("Delete functionality coming soon!");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Quiz
                </Button>
              </CardContent>
            </Card>

            {/* Course Info */}
            {course && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">
                    Course Info
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">
                        {course.name}
                      </h3>
                      <p className="text-sm text-slate-500">{course.code}</p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      router.push(`/admin/courses/${course.id}/quizzes`)
                    }
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Course Quizzes
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}