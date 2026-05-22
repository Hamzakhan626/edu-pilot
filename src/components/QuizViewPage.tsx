/* eslint-disable react/no-unescaped-entities */
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

import {
  ArrowLeft,
  Loader2,
  FileText,
  Clock,
  Award,
  Target,
  AlertCircle,
  Eye,
  Info,
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
  status: string;
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

export default function QuizPreviewPage() {
  const params = useParams();
  const router = useRouter();
  
  // FIX: Use quizid (lowercase) to match the folder name [quizid]
  const quizId = params?.quizid as string; // Changed from quizId to quizid
  
  // Also get courseId for navigation
  const courseId = params?.id as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQuizData = async () => {
    console.log("QuizPreviewPage: Loading quiz with ID:", quizId);
    
    if (!quizId) {
      const errorMsg = "Quiz ID is missing";
      console.error(errorMsg);
      setError(errorMsg);
      setLoading(false);
      toast.error(errorMsg);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load quiz details
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", quizId)
        .single();

      if (quizError) {
        console.error("Quiz query error:", quizError);
        throw new Error(`Failed to load quiz: ${quizError.message}`);
      }
      
      if (!quizData) {
        throw new Error(`Quiz with ID "${quizId}" not found`);
      }
      
      setQuiz(quizData);
      console.log("Quiz loaded:", quizData);

      // Load questions
      const { data: questionsData, error: questionsError } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("question_order");

      if (questionsError) {
        console.error("Questions query error:", questionsError);
        setQuestions([]);
      } else {
        setQuestions(questionsData || []);
        console.log(`Loaded ${questionsData?.length || 0} questions`);
      }
    } catch (err: any) {
      console.error("Error in loadQuizData:", err);
      const errorMsg = err?.message || "Failed to load quiz";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("QuizPreviewPage useEffect, quizId:", quizId);
    if (quizId) {
      void loadQuizData();
    } else {
      setError("Quiz ID not found in URL");
      setLoading(false);
    }
  }, [quizId]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800 border-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "hard":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const handleBack = () => {
    if (courseId) {
      router.push(`/admin/courses/${courseId}/quizzes/${quizId}`);
    } else {
      router.push("/admin/courses");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-4" />
        <p className="text-slate-600">Loading quiz preview...</p>
        <p className="text-sm text-slate-500 mt-2">Quiz ID: {quizId || "Not found"}</p>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {error || "Quiz not found"}
        </h1>
        <p className="text-slate-600 mb-6">
          The quiz you're looking for doesn't exist or there was an error loading it.
        </p>
        <div className="flex gap-3">
          <Button onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button variant="outline" onClick={() => void loadQuizData()}>
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quiz
            </Button>

            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
              <Eye className="h-3 w-3 mr-1" />
              Preview Mode
            </Badge>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {quiz.title}
            </h1>
            {quiz.description && (
              <p className="text-slate-600 mb-4">{quiz.description}</p>
            )}
            <div className="flex items-center justify-center gap-3">
              <Badge
                variant="outline"
                className={getDifficultyColor(quiz.difficulty)}
              >
                {quiz.difficulty}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {quiz.type}
              </Badge>
            </div>
          </div>
        </div>
      </div>


      {/* Quiz Stats */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 pt-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Questions</p>
                  <p className="text-xl font-bold text-slate-900">
                    {questions.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Passing Score</p>
                  <p className="text-xl font-bold text-slate-900">
                    {quiz.passing_score}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Time Limit</p>
                  <p className="text-xl font-bold text-slate-900">
                    {quiz.time_limit_minutes
                      ? `${quiz.time_limit_minutes} min`
                      : "No limit"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Questions */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {questions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No Questions Added
              </h3>
              <p className="text-slate-500">
                This quiz doesn't have any questions yet. Add questions to make
                it complete.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {questions.map((question, index) => (
              <Card key={question.id} className="border-slate-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge
                          variant="outline"
                          className="bg-purple-50 text-purple-700 border-purple-200"
                        >
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
                      <CardTitle className="text-lg font-semibold text-slate-900">
                        {question.question_text}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {question.question_type === "multiple_choice" && (
                    <RadioGroup disabled className="space-y-3">
                      {Array.isArray(question.options) &&
                        question.options.map((option: string, idx: number) => (
                          <div
                            key={idx}
                            className={`flex items-center space-x-3 p-3 rounded-lg border ${
                              option === question.correct_answer
                                ? "bg-green-50 border-green-200"
                                : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            <RadioGroupItem
                              value={option}
                              id={`q${question.id}-option${idx}`}
                            />
                            <Label
                              htmlFor={`q${question.id}-option${idx}`}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {String.fromCharCode(65 + idx)}.
                                </span>
                                <span>{option}</span>
                                {option === question.correct_answer && (
                                  <Badge className="ml-auto bg-green-100 text-green-800 border-green-200">
                                    Correct Answer
                                  </Badge>
                                )}
                              </div>
                            </Label>
                          </div>
                        ))}
                    </RadioGroup>
                  )}

                  {question.question_type === "short_answer" && (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Student will type their short answer here..."
                        disabled
                        className="min-h-[100px]"
                      />
                      {question.correct_answer && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-sm font-medium text-green-900 mb-1">
                            Expected Answer:
                          </p>
                          <p className="text-sm text-green-800">
                            {question.correct_answer}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {question.question_type === "essay" && (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Student will type their essay answer here..."
                        disabled
                        className="min-h-[200px]"
                      />
                      <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-700">
                          <strong>Note:</strong> Essay questions require manual
                          grading by the teacher.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      {questions.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-4">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Preview Mode - No submissions will be recorded
              </div>
              <Button
                onClick={handleBack}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                Exit Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}