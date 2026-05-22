/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  Upload,
  CheckCircle,
  AlertCircle,
  Calendar,
  ClipboardList,
  Star,
  FileText,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Eye,
  Download,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Assignment = {
  id: string;
  title: string;
  class: string;
  dueDate: string;
  status: "pending" | "submitted" | "graded" | "overdue";
  points: number;
  submitted: boolean;
  grade?: number;
  submittedDate?: string;
  feedback?: string;
  attachments?: string[];
};

type Child = {
  id: string;
  name: string;
  grade: string;
  avatar: string;
  assignments: Assignment[];
};

// Mock data for demonstration
const mockChildren: Child[] = [
  {
    id: "1",
    name: "Ahmed Ali",
    grade: "Grade 10",
    avatar: "AA",
    assignments: [
      {
        id: "1",
        title: "Calculus Problem Set",
        class: "Mathematics",
        dueDate: "2024-12-15",
        status: "pending",
        points: 100,
        submitted: false,
      },
      {
        id: "2",
        title: "Lab Report - Electricity",
        class: "Physics",
        dueDate: "2024-12-18",
        status: "submitted",
        points: 150,
        submitted: true,
        submittedDate: "2024-12-16",
        attachments: ["physics_lab_report.pdf"],
      },
      {
        id: "3",
        title: "Web Development Project",
        class: "Computer Science",
        dueDate: "2024-12-20",
        status: "submitted",
        points: 200,
        submitted: true,
        submittedDate: "2024-12-18",
        attachments: ["project.zip", "documentation.pdf"],
      },
      {
        id: "4",
        title: "Shakespeare Essay",
        class: "English Literature",
        dueDate: "2024-12-08",
        status: "graded",
        points: 120,
        submitted: true,
        grade: 88,
        submittedDate: "2024-12-07",
        feedback:
          "Excellent analysis of the themes. Well-structured essay with strong arguments.",
        attachments: ["shakespeare_essay.pdf"],
      },
      {
        id: "5",
        title: "Programming Test",
        class: "Computer Science",
        dueDate: "2024-12-05",
        status: "graded",
        points: 100,
        submitted: true,
        grade: 96,
        submittedDate: "2024-12-05",
        feedback: "Outstanding work! Code is clean and efficient.",
      },
      {
        id: "6",
        title: "Chapter 5 Quiz",
        class: "Physics",
        dueDate: "2024-12-02",
        status: "graded",
        points: 50,
        submitted: true,
        grade: 90,
        submittedDate: "2024-12-02",
        feedback: "Great understanding of the concepts.",
      },
      {
        id: "7",
        title: "History Research Paper",
        class: "History",
        dueDate: "2024-12-10",
        status: "overdue",
        points: 150,
        submitted: false,
      },
    ],
  },
  {
    id: "2",
    name: "Fatima Ali",
    grade: "Grade 7",
    avatar: "FA",
    assignments: [
      {
        id: "8",
        title: "Book Report",
        class: "English",
        dueDate: "2024-12-16",
        status: "pending",
        points: 80,
        submitted: false,
      },
      {
        id: "9",
        title: "Algebra Test",
        class: "Mathematics",
        dueDate: "2024-12-01",
        status: "graded",
        points: 100,
        submitted: true,
        grade: 95,
        submittedDate: "2024-12-01",
        feedback:
          "Excellent work! Perfect understanding of algebraic concepts.",
      },
      {
        id: "10",
        title: "Science Project",
        class: "Science",
        dueDate: "2024-12-22",
        status: "submitted",
        points: 120,
        submitted: true,
        submittedDate: "2024-12-20",
        attachments: ["science_project.pdf", "experiment_photos.zip"],
      },
    ],
  },
];

export default function ParentAssignmentsPage() {
  const [selectedChild, setSelectedChild] = useState<string>(
    mockChildren[0].id
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const currentChild = mockChildren.find(
    (child) => child.id === selectedChild
  )!;

  const getDaysLeft = (dueDate: string): number => {
    try {
      const due = new Date(dueDate);
      const now = new Date();
      const diffTime = due.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (error) {
      return 0;
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  const pendingAssignments = currentChild.assignments.filter(
    (a) => a.status === "pending"
  );
  const overdueAssignments = currentChild.assignments.filter(
    (a) => a.status === "overdue"
  );
  const submittedAssignments = currentChild.assignments.filter(
    (a) => a.status === "submitted"
  );
  const gradedAssignments = currentChild.assignments.filter(
    (a) => a.status === "graded"
  );

  const totalPending = pendingAssignments.length + overdueAssignments.length;
  const averageGrade =
    gradedAssignments.length > 0
      ? gradedAssignments.reduce((sum, a) => sum + (a.grade || 0), 0) /
        gradedAssignments.length
      : 0;

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return "text-green-600";
    if (grade >= 80) return "text-blue-600";
    if (grade >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getGradeBgColor = (grade: number) => {
    if (grade >= 90) return "bg-green-100";
    if (grade >= 80) return "bg-blue-100";
    if (grade >= 70) return "bg-yellow-100";
    return "bg-red-100";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Assignments Overview
            </h1>
            <p className="text-muted-foreground">
              Monitor your child's assignment progress and grades
            </p>
          </div>
        </div>

        {/* Child Selector */}
        <div className="mb-6">
          <label className="text-sm font-medium text-foreground mb-2 block">
            Select Child
          </label>
          <Select value={selectedChild} onValueChange={setSelectedChild}>
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Select child" />
            </SelectTrigger>
            <SelectContent>
              {mockChildren.map((child) => (
                <SelectItem key={child.id} value={child.id}>
                  {child.name} - {child.grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Student Info Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold">
                {currentChild.avatar}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground">
                  {currentChild.name}
                </h2>
                <p className="text-muted-foreground">{currentChild.grade}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Total Assignments
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {currentChild.assignments.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All courses
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <ClipboardList className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pending</p>
                  <p className="text-3xl font-bold text-foreground">
                    {totalPending}
                  </p>
                  {overdueAssignments.length > 0 && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {overdueAssignments.length} overdue
                    </p>
                  )}
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                  <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Submitted
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {submittedAssignments.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Awaiting grades
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Average Grade
                  </p>
                  <p
                    className={`text-3xl font-bold ${getGradeColor(
                      averageGrade
                    )}`}
                  >
                    {averageGrade.toFixed(1)}%
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {averageGrade >= 85 ? (
                      <>
                        <TrendingUp className="w-3 h-3 text-green-600" />
                        <p className="text-xs text-green-600">Excellent</p>
                      </>
                    ) : averageGrade >= 70 ? (
                      <p className="text-xs text-blue-600">Good</p>
                    ) : (
                      <>
                        <TrendingDown className="w-3 h-3 text-red-600" />
                        <p className="text-xs text-red-600">Needs attention</p>
                      </>
                    )}
                  </div>
                </div>
                <div
                  className={`p-3 rounded-full ${getGradeBgColor(
                    averageGrade
                  )} dark:opacity-80`}
                >
                  <Star className={`w-6 h-6 ${getGradeColor(averageGrade)}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assignment Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="all">
              All ({currentChild.assignments.length})
            </TabsTrigger>
            <TabsTrigger value="pending">Pending ({totalPending})</TabsTrigger>
            <TabsTrigger value="submitted">
              Submitted ({submittedAssignments.length})
            </TabsTrigger>
            <TabsTrigger value="graded">
              Graded ({gradedAssignments.length})
            </TabsTrigger>
          </TabsList>

          {/* All Assignments */}
          <TabsContent value="all" className="space-y-4">
            {currentChild.assignments.length === 0 ? (
              <Card>
                <CardContent className="text-center p-8">
                  <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">No assignments found</p>
                </CardContent>
              </Card>
            ) : (
              currentChild.assignments.map((assignment) => {
                const daysLeft = getDaysLeft(assignment.dueDate);
                const isOverdue = daysLeft < 0 && !assignment.submitted;

                return (
                  <Card
                    key={assignment.id}
                    className="hover:shadow-lg transition-all"
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div
                            className={`p-3 rounded-xl ${
                              assignment.status === "graded"
                                ? "bg-green-100 dark:bg-green-900/20"
                                : assignment.status === "submitted"
                                ? "bg-blue-100 dark:bg-blue-900/20"
                                : isOverdue
                                ? "bg-red-100 dark:bg-red-900/20"
                                : "bg-orange-100 dark:bg-orange-900/20"
                            }`}
                          >
                            {assignment.status === "graded" ? (
                              <Star className="h-6 w-6 text-green-600 dark:text-green-400" />
                            ) : assignment.status === "submitted" ? (
                              <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            ) : isOverdue ? (
                              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                            ) : (
                              <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-lg text-foreground">
                                {assignment.title}
                              </h3>
                              <Badge variant="outline">
                                {assignment.class}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-2">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Due: {formatDate(assignment.dueDate)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Star className="h-4 w-4" />
                                {assignment.points} points
                              </span>
                            </div>
                            {assignment.submitted &&
                              assignment.submittedDate && (
                                <p className="text-sm text-blue-600 dark:text-blue-400">
                                  Submitted on{" "}
                                  {formatDate(assignment.submittedDate)}
                                </p>
                              )}
                            {isOverdue && (
                              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                                <AlertCircle className="h-4 w-4" />
                                Overdue by {Math.abs(daysLeft)} day
                                {Math.abs(daysLeft) === 1 ? "" : "s"}
                              </p>
                            )}
                            {!assignment.submitted && !isOverdue && (
                              <p
                                className={`text-sm ${
                                  daysLeft <= 2
                                    ? "text-red-600"
                                    : "text-orange-600"
                                }`}
                              >
                                {daysLeft > 0
                                  ? `${daysLeft} day${
                                      daysLeft === 1 ? "" : "s"
                                    } remaining`
                                  : "Due today"}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {assignment.grade !== undefined ? (
                            <div className="text-right">
                              <div
                                className={`text-3xl font-bold ${getGradeColor(
                                  assignment.grade
                                )}`}
                              >
                                {assignment.grade}%
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {Math.round(
                                  (assignment.grade * assignment.points) / 100
                                )}
                                /{assignment.points}
                              </p>
                            </div>
                          ) : (
                            <Badge
                              className={
                                assignment.status === "submitted"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                  : isOverdue
                                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                  : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                              }
                            >
                              {assignment.status === "submitted"
                                ? "Awaiting Grade"
                                : isOverdue
                                ? "Overdue"
                                : "Pending"}
                            </Badge>
                          )}
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                            {assignment.submitted && (
                              <Button variant="outline" size="sm">
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      {assignment.feedback && (
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-sm font-medium text-foreground mb-1">
                            Teacher's Feedback:
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {assignment.feedback}
                          </p>
                        </div>
                      )}
                      {assignment.attachments &&
                        assignment.attachments.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-foreground mb-2">
                              Attachments:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {assignment.attachments.map((file, index) => (
                                <Button
                                  key={index}
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                >
                                  <FileText className="h-4 w-4" />
                                  {file}
                                  <Download className="h-3 w-3" />
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Pending Assignments */}
          <TabsContent value="pending" className="space-y-4">
            {totalPending === 0 ? (
              <Card>
                <CardContent className="text-center p-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No pending assignments
                  </p>
                  <p className="text-sm text-green-600 mt-2">All caught up!</p>
                </CardContent>
              </Card>
            ) : (
              [...pendingAssignments, ...overdueAssignments].map(
                (assignment) => {
                  const daysLeft = getDaysLeft(assignment.dueDate);
                  const isOverdue = daysLeft < 0;

                  return (
                    <Card
                      key={assignment.id}
                      className={`hover:shadow-lg transition-all ${
                        isOverdue ? "border-red-200 dark:border-red-800" : ""
                      }`}
                    >
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div
                              className={`p-3 rounded-xl ${
                                isOverdue
                                  ? "bg-red-100 dark:bg-red-900/20"
                                  : "bg-orange-100 dark:bg-orange-900/20"
                              }`}
                            >
                              {isOverdue ? (
                                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                              ) : (
                                <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="font-semibold text-lg text-foreground">
                                  {assignment.title}
                                </h3>
                                <Badge variant="outline">
                                  {assignment.class}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-2">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  Due: {formatDate(assignment.dueDate)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Star className="h-4 w-4" />
                                  {assignment.points} points
                                </span>
                              </div>
                              {isOverdue ? (
                                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 font-medium">
                                  <AlertCircle className="h-4 w-4" />
                                  Overdue by {Math.abs(daysLeft)} day
                                  {Math.abs(daysLeft) === 1 ? "" : "s"}
                                </p>
                              ) : (
                                <p
                                  className={`text-sm ${
                                    daysLeft <= 2
                                      ? "text-red-600 font-medium"
                                      : "text-orange-600"
                                  }`}
                                >
                                  {daysLeft > 0
                                    ? `${daysLeft} day${
                                        daysLeft === 1 ? "" : "s"
                                      } remaining`
                                    : "Due today"}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                            <Button variant="outline" size="sm">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Remind Child
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }
              )
            )}
          </TabsContent>

          {/* Submitted Assignments */}
          <TabsContent value="submitted" className="space-y-4">
            {submittedAssignments.length === 0 ? (
              <Card>
                <CardContent className="text-center p-8">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No submitted assignments awaiting grades
                  </p>
                </CardContent>
              </Card>
            ) : (
              submittedAssignments.map((assignment) => (
                <Card
                  key={assignment.id}
                  className="hover:shadow-lg transition-all"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
                          <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-lg text-foreground">
                              {assignment.title}
                            </h3>
                            <Badge variant="outline">{assignment.class}</Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-2">
                            <span className="flex items-center gap-1">
                              <Star className="h-4 w-4" />
                              {assignment.points} points
                            </span>
                          </div>
                          <p className="text-sm text-blue-600 dark:text-blue-400">
                            Submitted on {formatDate(assignment.submittedDate!)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          Awaiting Grade
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View Submission
                        </Button>
                      </div>
                    </div>
                    {assignment.attachments &&
                      assignment.attachments.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-foreground mb-2">
                            Submitted Files:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {assignment.attachments.map((file, index) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                              >
                                <FileText className="h-4 w-4" />
                                {file}
                                <Download className="h-3 w-3" />
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Graded Assignments */}
          <TabsContent value="graded" className="space-y-4">
            {gradedAssignments.length === 0 ? (
              <Card>
                <CardContent className="text-center p-8">
                  <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No graded assignments yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              gradedAssignments.map((assignment) => {
                const earnedPoints = Math.round(
                  (assignment.grade! * assignment.points) / 100
                );

                return (
                  <Card
                    key={assignment.id}
                    className="hover:shadow-lg transition-all"
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl">
                            <Star className="h-6 w-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-lg text-foreground">
                                {assignment.title}
                              </h3>
                              <Badge variant="outline">
                                {assignment.class}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-2">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Submitted:{" "}
                                {formatDate(assignment.submittedDate!)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-right">
                            <div
                              className={`text-3xl font-bold ${getGradeColor(
                                assignment.grade!
                              )}`}
                            >
                              {assignment.grade}%
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {earnedPoints}/{assignment.points} points
                            </p>
                          </div>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </div>
                      {assignment.feedback && (
                        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-sm font-medium text-foreground mb-1">
                            Teacher's Feedback:
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {assignment.feedback}
                          </p>
                        </div>
                      )}
                      {assignment.attachments &&
                        assignment.attachments.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-foreground mb-2">
                              Submitted Files:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {assignment.attachments.map((file, index) => (
                                <Button
                                  key={index}
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                >
                                  <FileText className="h-4 w-4" />
                                  {file}
                                  <Download className="h-3 w-3" />
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
