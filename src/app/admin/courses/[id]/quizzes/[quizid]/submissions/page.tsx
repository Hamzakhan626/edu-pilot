/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import {
  ArrowLeft,
  Loader2,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  Award,
  FileText,
  Download,
  BarChart,
  AlertCircle,
  Edit,
  Save,
  X,
  ChevronDown,
  ChevronUp,
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
  status: "in_progress" | "submitted" | "graded";
  teacher_notes: string | null;
  graded_by: string | null;
  graded_at: string | null;
  student: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  quiz: {
    id: string;
    title: string;
    total_questions: number;
    passing_score: number;
  };
};

type QuizResponse = {
  id: string;
  submission_id: string;
  question_id: string;
  student_answer: string | null;
  is_correct: boolean | null;
  points_earned: number | null;
  teacher_feedback: string | null;
  created_at: string;
  question: {
    id: string;
    question_text: string;
    question_type: string;
    correct_answer: string;
    points: number;
    options: any;
  };
};

type GradingData = {
  submissionId: string;
  responses: {
    [key: string]: {
      points: number;
      feedback: string;
      isCorrect: boolean;
    };
  };
  teacherNotes: string;
  manualScore: number;
};

export default function QuizSubmissionsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;
  const quizId = params?.quizId as string;

  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Grading modal states
  const [gradingSubmission, setGradingSubmission] =
    useState<QuizSubmission | null>(null);
  const [responses, setResponses] = useState<QuizResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [savingGrade, setSavingGrade] = useState(false);

  const [gradingData, setGradingData] = useState<GradingData>({
    submissionId: "",
    responses: {},
    teacherNotes: "",
    manualScore: 0,
  });

  const [expandedResponses, setExpandedResponses] = useState<Set<string>>(
    new Set(),
  );

  const loadSubmissions = async () => {
    try {
      setLoading(true);

      // Get submissions with student and quiz data
      const { data: submissionsData, error: submissionsError } = await supabase
        .from("quiz_submissions")
        .select(
          `
          *,
          student:student_id (
            id,
            email,
            full_name,
            avatar_url
          ),
          quiz:quiz_id (
            id,
            title,
            total_questions,
            passing_score
          )
        `,
        )
        .eq("quiz_id", quizId)
        .order("submitted_at", { ascending: false });

      if (submissionsError) {
        console.error("Submissions query error:", submissionsError);
        throw submissionsError;
      }

      console.log("Submissions loaded:", submissionsData);
      setSubmissions(submissionsData || []);
    } catch (err: any) {
      console.error("Load submissions error:", err);
      toast.error(err?.message || "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissionResponses = async (submissionId: string) => {
    try {
      setLoadingResponses(true);

      const { data: responsesData, error: responsesError } = await supabase
        .from("quiz_responses")
        .select(
          `
          *,
          question:question_id (
            id,
            question_text,
            question_type,
            correct_answer,
            points,
            options
          )
        `,
        )
        .eq("submission_id", submissionId);

      if (responsesError) {
        console.error("Responses query error:", responsesError);
        throw responsesError;
      }

      console.log("Responses loaded:", responsesData);
      setResponses(responsesData || []);

      // Initialize grading data
      const initialData: GradingData = {
        submissionId,
        responses: {},
        teacherNotes: gradingSubmission?.teacher_notes || "",
        manualScore: gradingSubmission?.manual_score || 0,
      };

      responsesData?.forEach((response) => {
        initialData.responses[response.id] = {
          points: response.points_earned || 0,
          feedback: response.teacher_feedback || "",
          isCorrect: response.is_correct || false,
        };
      });

      setGradingData(initialData);
    } catch (err: any) {
      console.error("Load responses error:", err);
      toast.error(err?.message || "Failed to load responses");
    } finally {
      setLoadingResponses(false);
    }
  };

  useEffect(() => {
    if (quizId) {
      void loadSubmissions();
    }
  }, [quizId]);

  useEffect(() => {
    if (gradingSubmission) {
      void loadSubmissionResponses(gradingSubmission.id);
    }
  }, [gradingSubmission]);

  const handleOpenGrading = (submission: QuizSubmission) => {
    setGradingSubmission(submission);
  };

  const handleCloseGrading = () => {
    setGradingSubmission(null);
    setResponses([]);
    setGradingData({
      submissionId: "",
      responses: {},
      teacherNotes: "",
      manualScore: 0,
    });
    setExpandedResponses(new Set());
  };

  const handleUpdateResponseGrade = (
    responseId: string,
    field: "points" | "feedback" | "isCorrect",
    value: any,
  ) => {
    setGradingData((prev) => ({
      ...prev,
      responses: {
        ...prev.responses,
        [responseId]: {
          ...prev.responses[responseId],
          [field]: value,
        },
      },
    }));

    // Recalculate manual score
    if (field === "points") {
      const totalPoints = Object.values({
        ...gradingData.responses,
        [responseId]: {
          ...gradingData.responses[responseId],
          points: value,
        },
      }).reduce((sum, r) => sum + (r.points || 0), 0);

      setGradingData((prev) => ({
        ...prev,
        manualScore: totalPoints,
      }));
    }
  };

  const handleSaveGrading = async () => {
    if (!gradingSubmission) return;

    try {
      setSavingGrade(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Calculate total score and percentage
      const totalScore = gradingData.manualScore;
      const maxScore =
        responses.reduce((sum, r) => sum + (r.question.points || 0), 0) || 100;
      const percentage = (totalScore / maxScore) * 100;

      // Update submission
      const { error: submissionError } = await supabase
        .from("quiz_submissions")
        .update({
          manual_score: totalScore,
          total_score: totalScore,
          percentage: percentage,
          status: "graded",
          teacher_notes: gradingData.teacherNotes,
          graded_by: user.id,
          graded_at: new Date().toISOString(),
        })
        .eq("id", gradingSubmission.id);

      if (submissionError) throw submissionError;

      // Update individual responses
      const responseUpdates = Object.entries(gradingData.responses).map(
        ([responseId, data]) => ({
          id: responseId,
          points_earned: data.points,
          is_correct: data.isCorrect,
          teacher_feedback: data.feedback,
        }),
      );

      for (const update of responseUpdates) {
        const { error: responseError } = await supabase
          .from("quiz_responses")
          .update({
            points_earned: update.points_earned,
            is_correct: update.is_correct,
            teacher_feedback: update.teacher_feedback,
          })
          .eq("id", update.id);

        if (responseError) {
          console.error("Error updating response:", responseError);
        }
      }

      toast.success("Grading saved successfully");
      handleCloseGrading();
      await loadSubmissions();
    } catch (err: any) {
      console.error("Save grading error:", err);
      toast.error(err?.message || "Failed to save grading");
    } finally {
      setSavingGrade(false);
    }
  };

  const toggleResponseExpanded = (responseId: string) => {
    setExpandedResponses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(responseId)) {
        newSet.delete(responseId);
      } else {
        newSet.add(responseId);
      }
      return newSet;
    });
  };

  const filteredSubmissions = useMemo(() => {
    const q = search.toLowerCase().trim();
    return submissions.filter((submission) => {
      const matchesSearch =
        !q ||
        submission.student.full_name?.toLowerCase().includes(q) ||
        submission.student.email.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" || submission.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [submissions, search, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "graded":
        return "bg-green-100 text-green-800 border-green-200";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getScoreColor = (percentage: number | null) => {
    if (percentage === null) return "text-slate-400";
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const stats = useMemo(() => {
    const total = submissions.length;
    const submitted = submissions.filter((s) => s.status === "submitted").length;
    const graded = submissions.filter((s) => s.status === "graded").length;
    const inProgress = submissions.filter((s) => s.status === "in_progress")
      .length;

    const avgScore =
      graded > 0
        ? submissions
            .filter((s) => s.status === "graded" && s.percentage !== null)
            .reduce((sum, s) => sum + (s.percentage || 0), 0) / graded
        : 0;

    return {
      total,
      submitted,
      graded,
      inProgress,
      avgScore: Math.round(avgScore * 10) / 10,
    };
  }, [submissions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
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
                onClick={() =>
                  router.push(`/admin/courses/${courseId}/quizzes`)
                }
                className="hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Quizzes
              </Button>
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Quiz Submissions
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  {submissions[0]?.quiz?.title || "Loading..."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(`/admin/courses/${courseId}/quizzes/analytics`)
                }
              >
                <BarChart className="h-4 w-4 mr-2" />
                Analytics
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.total}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pending</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.submitted}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Graded</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.graded}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">In Progress</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.inProgress}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Award className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Avg Score</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.avgScore}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by student name or email..."
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="graded">Graded</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Submissions List */}
        {filteredSubmissions.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-6" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No submissions found
            </h3>
            <p className="text-slate-500">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Students haven't submitted this quiz yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* List Header */}
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-slate-500">
                <div className="col-span-3">Student</div>
                <div className="col-span-2">Submitted</div>
                <div className="col-span-2">Time Spent</div>
                <div className="col-span-2">Score</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>
            </div>

            {/* Submissions */}
            {filteredSubmissions.map((submission) => (
              <Card key={submission.id} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Student Info */}
                    <div className="col-span-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                          {submission.student.full_name
                            ?.charAt(0)
                            .toUpperCase() ||
                            submission.student.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900">
                            {submission.student.full_name || "No Name"}
                          </h4>
                          <p className="text-sm text-slate-500">
                            {submission.student.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Submitted Date */}
                    <div className="col-span-2">
                      {submission.submitted_at ? (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="h-4 w-4" />
                          <div>
                            <p className="text-sm">
                              {new Date(
                                submission.submitted_at,
                              ).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-slate-400">
                              {new Date(
                                submission.submitted_at,
                              ).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">
                          Not submitted
                        </span>
                      )}
                    </div>

                    {/* Time Spent */}
                    <div className="col-span-2">
                      {submission.time_spent_seconds ? (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">
                            {Math.floor(submission.time_spent_seconds / 60)} min{" "}
                            {submission.time_spent_seconds % 60} sec
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </div>

                    {/* Score */}
                    <div className="col-span-2">
                      {submission.percentage !== null ? (
                        <div>
                          <p
                            className={`text-2xl font-bold ${getScoreColor(submission.percentage)}`}
                          >
                            {submission.percentage.toFixed(1)}%
                          </p>
                          <p className="text-xs text-slate-500">
                            {submission.total_score} /{" "}
                            {submission.quiz.total_questions * 10}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">
                          Not graded
                        </span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      <Badge
                        className={getStatusColor(submission.status)}
                        variant="outline"
                      >
                        {submission.status === "in_progress"
                          ? "In Progress"
                          : submission.status.charAt(0).toUpperCase() +
                            submission.status.slice(1)}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex justify-end">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenGrading(submission)}
                              disabled={submission.status === "in_progress"}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {submission.status === "graded"
                                ? "Review"
                                : "Grade"}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {submission.status === "graded"
                              ? "Review grading"
                              : "Grade submission"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Grading Modal */}
      <Dialog open={!!gradingSubmission} onOpenChange={handleCloseGrading}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Grade Submission -{" "}
              {gradingSubmission?.student.full_name ||
                gradingSubmission?.student.email}
            </DialogTitle>
            <DialogDescription>
              Review and grade the student's quiz responses
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            {loadingResponses ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            ) : (
              <>
                {/* Summary Card */}
                <Card className="border-slate-200">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-4 gap-6">
                      <div>
                        <p className="text-sm text-slate-500 mb-1">
                          Total Questions
                        </p>
                        <p className="text-2xl font-bold text-slate-900">
                          {responses.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 mb-1">
                          Current Score
                        </p>
                        <p className="text-2xl font-bold text-purple-600">
                          {gradingData.manualScore}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 mb-1">
                          Max Score
                        </p>
                        <p className="text-2xl font-bold text-slate-900">
                          {responses.reduce(
                            (sum, r) => sum + (r.question.points || 0),
                            0,
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 mb-1">
                          Percentage
                        </p>
                        <p
                          className={`text-2xl font-bold ${getScoreColor(
                            (gradingData.manualScore /
                              responses.reduce(
                                (sum, r) => sum + (r.question.points || 0),
                                0,
                              )) *
                              100,
                          )}`}
                        >
                          {(
                            (gradingData.manualScore /
                              responses.reduce(
                                (sum, r) => sum + (r.question.points || 0),
                                0,
                              )) *
                            100
                          ).toFixed(1)}
                          %
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Responses */}
                <div className="space-y-4">
                  {responses.map((response, index) => {
                    const isExpanded = expandedResponses.has(response.id);
                    const gradeData =
                      gradingData.responses[response.id] || {};

                    return (
                      <Card key={response.id} className="border-slate-200">
                        <CardContent className="p-6">
                          {/* Question Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Badge
                                  variant="outline"
                                  className="bg-purple-50 text-purple-700 border-purple-200"
                                >
                                  Question {index + 1}
                                </Badge>
                                <Badge variant="outline">
                                  {response.question.question_type}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="bg-blue-50 text-blue-700 border-blue-200"
                                >
                                  {response.question.points} points
                                </Badge>
                              </div>
                              <p className="text-slate-900 font-medium">
                                {response.question.question_text}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleResponseExpanded(response.id)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>

                          {isExpanded && (
                            <>
                              <Separator className="my-4" />

                              {/* Student Answer */}
                              <div className="space-y-4">
                                <div>
                                  <Label className="text-sm font-medium text-slate-700">
                                    Student Answer
                                  </Label>
                                  <div className="mt-2 p-4 bg-slate-50 rounded-lg">
                                    <p className="text-slate-900">
                                      {response.student_answer || "No answer"}
                                    </p>
                                  </div>
                                </div>

                                {/* Correct Answer */}
                                <div>
                                  <Label className="text-sm font-medium text-slate-700">
                                    Correct Answer
                                  </Label>
                                  <div className="mt-2 p-4 bg-green-50 rounded-lg border border-green-200">
                                    <p className="text-green-900">
                                      {response.question.correct_answer}
                                    </p>
                                  </div>
                                </div>

                                <Separator />

                                {/* Grading Controls */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor={`points-${response.id}`}>
                                      Points Earned
                                    </Label>
                                    <Input
                                      id={`points-${response.id}`}
                                      type="number"
                                      min="0"
                                      max={response.question.points}
                                      value={gradeData.points || 0}
                                      onChange={(e) =>
                                        handleUpdateResponseGrade(
                                          response.id,
                                          "points",
                                          parseInt(e.target.value) || 0,
                                        )
                                      }
                                      className="mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`correct-${response.id}`}>
                                      Mark as Correct
                                    </Label>
                                    <Select
                                      value={
                                        gradeData.isCorrect
                                          ? "correct"
                                          : "incorrect"
                                      }
                                      onValueChange={(value) =>
                                        handleUpdateResponseGrade(
                                          response.id,
                                          "isCorrect",
                                          value === "correct",
                                        )
                                      }
                                    >
                                      <SelectTrigger className="mt-1">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="correct">
                                          ✓ Correct
                                        </SelectItem>
                                        <SelectItem value="incorrect">
                                          ✗ Incorrect
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div>
                                  <Label htmlFor={`feedback-${response.id}`}>
                                    Teacher Feedback
                                  </Label>
                                  <Textarea
                                    id={`feedback-${response.id}`}
                                    value={gradeData.feedback || ""}
                                    onChange={(e) =>
                                      handleUpdateResponseGrade(
                                        response.id,
                                        "feedback",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Add feedback for the student..."
                                    className="mt-1"
                                    rows={3}
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Overall Notes */}
                <Card className="border-slate-200">
                  <CardContent className="p-6">
                    <Label htmlFor="teacher-notes" className="text-base">
                      Overall Teacher Notes
                    </Label>
                    <Textarea
                      id="teacher-notes"
                      value={gradingData.teacherNotes}
                      onChange={(e) =>
                        setGradingData((prev) => ({
                          ...prev,
                          teacherNotes: e.target.value,
                        }))
                      }
                      placeholder="Add overall feedback about the submission..."
                      className="mt-2"
                      rows={4}
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={handleCloseGrading}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSaveGrading}
              disabled={savingGrade || loadingResponses}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {savingGrade ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Grading
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}