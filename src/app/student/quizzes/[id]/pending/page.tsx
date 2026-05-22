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

import {
  Loader2,
  Clock,
  CheckCircle2,
  Home,
  BookMarked,
  Calendar,
  AlertCircle,
} from "lucide-react";

type QuizSubmission = {
  id: string;
  submitted_at: string | null;
  time_spent_seconds: number | null;
  percentage: number | null;
  status: string;
};

type Quiz = {
  id: string;
  title: string;
  course_id: string;
};

type Course = {
  id: string;
  name: string;
  code: string;
};

export default function StudentQuizPendingPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params?.id as string;

  const [submission, setSubmission] = useState<QuizSubmission | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (quizId) {
      loadData();
      // Check every 10 seconds if results are ready
      const interval = setInterval(checkIfGraded, 10000);
      return () => clearInterval(interval);
    }
  }, [quizId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Get submission
      const { data: submissionData, error: submissionError } = await supabase
        .from("quiz_submissions")
        .select("*")
        .eq("quiz_id", quizId)
        .eq("student_id", user.id)
        .single();

      if (submissionError || !submissionData) {
        toast.error("No submission found");
        router.push("/student/quizzes");
        return;
      }

      setSubmission(submissionData);

      // If already graded, redirect to results
      if (submissionData.percentage !== null) {
        router.push(`/student/quizzes/${quizId}/results`);
        return;
      }

      // Get quiz
      const { data: quizData } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", quizId)
        .single();

      setQuiz(quizData);

      // Get course
      if (quizData) {
        const { data: courseData } = await supabase
          .from("courses")
          .select("id, name, code")
          .eq("id", quizData.course_id)
          .single();

        setCourse(courseData);
      }
    } catch (err: any) {
      console.error("Error loading data:", err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const checkIfGraded = async () => {
    if (checking) return;
    
    try {
      setChecking(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: submissionData } = await supabase
        .from("quiz_submissions")
        .select("percentage, status")
        .eq("quiz_id", quizId)
        .eq("student_id", user.id)
        .single();

      if (submissionData && submissionData.percentage !== null) {
        toast.success("Your quiz has been graded!");
        router.push(`/student/quizzes/${quizId}/results`);
      }
    } catch (err) {
      console.error("Error checking grading status:", err);
    } finally {
      setChecking(false);
    }
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-lg text-slate-600">Loading...</p>
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
            <h3 className="text-xl font-semibold mb-2">Submission Not Found</h3>
            <Button onClick={() => router.push("/student/quizzes")}>
              Back to Quizzes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-10 w-10 animate-pulse" />
            </div>
            <h1 className="text-3xl font-bold mb-2">
              Quiz Submitted Successfully!
            </h1>
            <p className="text-lg opacity-90">
              Waiting for your instructor to grade your submission
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="border-0 shadow-2xl">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-100 mb-4">
                <CheckCircle2 className="h-12 w-12 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{quiz.title}</h2>
              <div className="flex items-center justify-center gap-2 text-slate-600">
                <BookMarked className="h-4 w-4" />
                <span>{course.name} ({course.code})</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <div className="flex items-start gap-3">
                <Clock className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    Your quiz is being reviewed
                  </h3>
                  <p className="text-blue-800 text-sm">
                    Your instructor will review your answers and provide a grade soon. 
                    You'll be able to see your results once the grading is complete.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="text-center p-6 bg-slate-50 rounded-lg">
                <Calendar className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-600 mb-1">Submitted On</p>
                <p className="text-lg font-semibold text-slate-900">
                  {submission.submitted_at
                    ? new Date(submission.submitted_at).toLocaleString()
                    : "N/A"}
                </p>
              </div>

              <div className="text-center p-6 bg-slate-50 rounded-lg">
                <Clock className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-600 mb-1">Time Spent</p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatTime(submission.time_spent_seconds)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={checkIfGraded}
                disabled={checking}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {checking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Check if Results are Ready
                  </>
                )}
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full bg-white"
              >
                <Link href="/student/quizzes">
                  <Home className="h-4 w-4 mr-2" />
                  Back to Quizzes
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full bg-white"
              >
                <Link href="/student/programs">
                  <BookMarked className="h-4 w-4 mr-2" />
                  My Courses
                </Link>
              </Button>
            </div>

            <div className="mt-8 pt-6 border-t text-center">
              <p className="text-sm text-slate-500">
                This page will automatically redirect once your quiz is graded
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Auto-checking every 10 seconds
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}