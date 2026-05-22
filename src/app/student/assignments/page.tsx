/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Clock,
  Users,
  CheckCircle,
  Play,
  AlertCircle,
  ArrowRight,
  Filter,
  Download,
  Upload,
  FileText,
  Calendar,
  Eye,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Assignment {
  id: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  title: string;
  description: string;
  uploadedDate: string;
  dueDate: string;
  totalMarks: number;
  obtainedMarks?: number;
  status: "pending" | "submitted" | "graded" | "late";
  submittedDate?: string;
  fileUrl?: string;
  submissionFileUrl?: string;
  feedback?: string;
  semester: string;
}

export default function StudentAssignmentsPage() {
  const [selectedSemester, setSelectedSemester] = useState<string>("current");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<
    "pending" | "submitted" | "graded"
  >("pending");

  // Available semesters
  const semesters = [
    { value: "current", label: "Current Semester (Fall 2024)" },
    { value: "spring-2024", label: "Spring 2024" },
    { value: "fall-2023", label: "Fall 2023" },
    { value: "spring-2023", label: "Spring 2023" },
  ];

  // Student's enrolled courses
  const courses = [
    { id: "cs101", name: "Introduction to Web Development", code: "WEB101" },
    { id: "db201", name: "Database Design", code: "DB201" },
    { id: "react301", name: "React Advanced Patterns", code: "REACT301" },
    { id: "calc101", name: "Calculus Fundamentals", code: "CALC101" },
    { id: "linalg201", name: "Linear Algebra", code: "LINALG201" },
  ];

  // Mock assignments data
  const allAssignments: Assignment[] = [
    // Current Semester - Pending
    {
      id: "a1",
      courseId: "cs101",
      courseName: "Introduction to Web Development",
      courseCode: "WEB101",
      title: "Build a Personal Portfolio Website",
      description:
        "Create a responsive portfolio website using HTML, CSS, and JavaScript. Include at least 4 pages: Home, About, Projects, and Contact.",
      uploadedDate: "Dec 1, 2024",
      dueDate: "Dec 20, 2024",
      totalMarks: 100,
      status: "pending",
      fileUrl: "/assignments/web101-assignment3.pdf",
      semester: "current",
    },
    {
      id: "a2",
      courseId: "db201",
      courseName: "Database Design",
      courseCode: "DB201",
      title: "Design a Movie Database Schema",
      description:
        "Create a normalized database schema for a movie rental system. Include ER diagrams and SQL scripts.",
      uploadedDate: "Nov 28, 2024",
      dueDate: "Dec 18, 2024",
      totalMarks: 80,
      status: "pending",
      fileUrl: "/assignments/db201-assignment2.pdf",
      semester: "current",
    },
    {
      id: "a3",
      courseId: "react301",
      courseName: "React Advanced Patterns",
      courseCode: "REACT301",
      title: "Create a State Management System",
      description:
        "Build a custom state management solution using Context API and useReducer. Implement at least 3 different features.",
      uploadedDate: "Dec 5, 2024",
      dueDate: "Dec 25, 2024",
      totalMarks: 120,
      status: "pending",
      fileUrl: "/assignments/react301-assignment3.pdf",
      semester: "current",
    },
    // Current Semester - Submitted
    {
      id: "a4",
      courseId: "cs101",
      courseName: "Introduction to Web Development",
      courseCode: "WEB101",
      title: "CSS Grid Layout Project",
      description:
        "Create a magazine-style layout using CSS Grid. Must be responsive and work on all devices.",
      uploadedDate: "Nov 15, 2024",
      dueDate: "Dec 5, 2024",
      totalMarks: 60,
      status: "submitted",
      submittedDate: "Dec 4, 2024",
      fileUrl: "/assignments/web101-assignment2.pdf",
      submissionFileUrl: "/submissions/web101-a2-submission.zip",
      semester: "current",
    },
    {
      id: "a5",
      courseId: "linalg201",
      courseName: "Linear Algebra",
      courseCode: "LINALG201",
      title: "Matrix Transformation Project",
      description:
        "Solve 10 problems related to matrix transformations and provide detailed explanations.",
      uploadedDate: "Nov 20, 2024",
      dueDate: "Dec 22, 2024",
      totalMarks: 100,
      status: "submitted",
      submittedDate: "Dec 8, 2024",
      fileUrl: "/assignments/linalg201-assignment4.pdf",
      submissionFileUrl: "/submissions/linalg201-a4-submission.pdf",
      semester: "current",
    },
    // Current Semester - Graded
    {
      id: "a6",
      courseId: "cs101",
      courseName: "Introduction to Web Development",
      courseCode: "WEB101",
      title: "JavaScript Fundamentals Quiz",
      description:
        "Complete the online quiz covering variables, functions, arrays, and objects.",
      uploadedDate: "Nov 1, 2024",
      dueDate: "Nov 15, 2024",
      totalMarks: 50,
      obtainedMarks: 45,
      status: "graded",
      submittedDate: "Nov 14, 2024",
      fileUrl: "/assignments/web101-assignment1.pdf",
      submissionFileUrl: "/submissions/web101-a1-submission.pdf",
      feedback:
        "Excellent work! Good understanding of JavaScript concepts. Minor mistakes in array methods.",
      semester: "current",
    },
    {
      id: "a7",
      courseId: "db201",
      courseName: "Database Design",
      courseCode: "DB201",
      title: "SQL Queries Assignment",
      description:
        "Write complex SQL queries for the given database schema. Include joins, subqueries, and aggregations.",
      uploadedDate: "Oct 25, 2024",
      dueDate: "Nov 10, 2024",
      totalMarks: 70,
      obtainedMarks: 68,
      status: "graded",
      submittedDate: "Nov 9, 2024",
      fileUrl: "/assignments/db201-assignment1.pdf",
      submissionFileUrl: "/submissions/db201-a1-submission.sql",
      feedback:
        "Great work on complex queries. Watch out for optimization opportunities.",
      semester: "current",
    },
    {
      id: "a8",
      courseId: "react301",
      courseName: "React Advanced Patterns",
      courseCode: "REACT301",
      title: "Component Composition Exercise",
      description:
        "Refactor the provided code using composition patterns and custom hooks.",
      uploadedDate: "Oct 20, 2024",
      dueDate: "Nov 5, 2024",
      totalMarks: 90,
      obtainedMarks: 82,
      status: "graded",
      submittedDate: "Nov 4, 2024",
      fileUrl: "/assignments/react301-assignment1.pdf",
      submissionFileUrl: "/submissions/react301-a1-submission.zip",
      feedback:
        "Good use of composition. Could improve hook dependencies and memoization.",
      semester: "current",
    },
    // Spring 2024
    {
      id: "a9",
      courseId: "calc101",
      courseName: "Calculus Fundamentals",
      courseCode: "CALC101",
      title: "Derivatives and Applications",
      description:
        "Solve 15 problems on derivatives, limits, and real-world applications.",
      uploadedDate: "May 1, 2024",
      dueDate: "May 20, 2024",
      totalMarks: 100,
      obtainedMarks: 95,
      status: "graded",
      submittedDate: "May 18, 2024",
      fileUrl: "/assignments/calc101-final.pdf",
      submissionFileUrl: "/submissions/calc101-final-submission.pdf",
      feedback: "Outstanding performance! Perfect understanding of concepts.",
      semester: "spring-2024",
    },
    {
      id: "a10",
      courseId: "cs101",
      courseName: "Introduction to Web Development",
      courseCode: "WEB101",
      title: "HTML & CSS Basics Project",
      description:
        "Create a static website with at least 3 pages using semantic HTML and CSS.",
      uploadedDate: "Apr 10, 2024",
      dueDate: "Apr 30, 2024",
      totalMarks: 60,
      obtainedMarks: 58,
      status: "graded",
      submittedDate: "Apr 29, 2024",
      fileUrl: "/assignments/web101-spring-a1.pdf",
      submissionFileUrl: "/submissions/web101-spring-a1-submission.zip",
      feedback: "Good work on semantic HTML. Minor CSS alignment issues.",
      semester: "spring-2024",
    },
  ];

  // Filter assignments based on selections
  const filteredAssignments = allAssignments.filter((assignment) => {
    const semesterMatch =
      selectedSemester === "all" || assignment.semester === selectedSemester;
    const courseMatch =
      selectedCourse === "all" || assignment.courseId === selectedCourse;
    const statusMatch =
      assignment.status === activeTab ||
      (activeTab === "pending" && assignment.status === "late");
    return semesterMatch && courseMatch && statusMatch;
  });

  const handleFileUpload = (assignmentId: string) => {
    // Simulated file upload
    console.log(`Uploading file for assignment: ${assignmentId}`);
    alert("File upload feature will be implemented with backend integration");
  };

  const handleDownload = (fileUrl: string, fileName: string) => {
    console.log(`Downloading: ${fileName}`);
    alert(`Downloading ${fileName}...`);
  };

  // Get statistics
  const pendingCount = allAssignments.filter(
    (a) => a.status === "pending" && a.semester === selectedSemester
  ).length;
  const submittedCount = allAssignments.filter(
    (a) => a.status === "submitted" && a.semester === selectedSemester
  ).length;
  const gradedCount = allAssignments.filter(
    (a) => a.status === "graded" && a.semester === selectedSemester
  ).length;

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDueDateColor = (dueDate: string, status: string) => {
    if (status !== "pending") return "text-muted-foreground";
    const days = getDaysUntilDue(dueDate);
    if (days < 0) return "text-red-600 dark:text-red-400";
    if (days <= 3) return "text-amber-600 dark:text-amber-400";
    return "text-green-600 dark:text-green-400";
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            My Assignments
          </h1>
          <p className="text-muted-foreground">
            Track and manage all your course assignments in one place
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pending</p>
                  <p className="text-3xl font-bold text-foreground">
                    {pendingCount}
                  </p>
                </div>
                <div className="p-3 bg-amber-100 dark:bg-amber-900/20 rounded-full">
                  <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
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
                    {submittedCount}
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
                  <p className="text-sm text-muted-foreground mb-1">Graded</p>
                  <p className="text-3xl font-bold text-foreground">
                    {gradedCount}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Semester
                </label>
                <Select
                  value={selectedSemester}
                  onValueChange={setSelectedSemester}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {semesters.map((sem) => (
                      <SelectItem key={sem.value} value={sem.value}>
                        {sem.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Course
                </label>
                <Select
                  value={selectedCourse}
                  onValueChange={setSelectedCourse}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.code} - {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Assignment Status */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as any)}
          className="mb-6"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Pending ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="submitted" className="gap-2">
              <Upload className="w-4 h-4" />
              Submitted ({submittedCount})
            </TabsTrigger>
            <TabsTrigger value="graded" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Graded ({gradedCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Assignments List */}
        <div className="space-y-4">
          {filteredAssignments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-2">
                  No assignments found
                </p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters or check back later
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredAssignments.map((assignment) => {
              const daysUntil = getDaysUntilDue(assignment.dueDate);
              const isOverdue =
                daysUntil < 0 && assignment.status === "pending";

              return (
                <Card
                  key={assignment.id}
                  className={`hover:shadow-lg transition-shadow ${
                    isOverdue ? "border-red-300 dark:border-red-800" : ""
                  }`}
                >
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <Badge variant="outline">
                            {assignment.courseCode}
                          </Badge>
                          <h3 className="text-xl font-bold text-foreground">
                            {assignment.title}
                          </h3>
                          {isOverdue && (
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              Overdue
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {assignment.courseName}
                        </p>
                        <p className="text-sm text-foreground mb-4">
                          {assignment.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Assignment Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            Uploaded
                          </p>
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {assignment.uploadedDate}
                        </p>
                      </div>

                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock
                            className={`w-4 h-4 ${getDueDateColor(
                              assignment.dueDate,
                              assignment.status
                            )}`}
                          />
                          <p className="text-xs text-muted-foreground">
                            Due Date
                          </p>
                        </div>
                        <p
                          className={`text-sm font-medium ${getDueDateColor(
                            assignment.dueDate,
                            assignment.status
                          )}`}
                        >
                          {assignment.dueDate}
                        </p>
                        {assignment.status === "pending" && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {isOverdue
                              ? `${Math.abs(daysUntil)} days overdue`
                              : `${daysUntil} days left`}
                          </p>
                        )}
                      </div>

                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            Total Marks
                          </p>
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {assignment.totalMarks}
                        </p>
                      </div>

                      {assignment.obtainedMarks !== undefined && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <p className="text-xs text-green-600 dark:text-green-400">
                              Obtained
                            </p>
                          </div>
                          <p className="text-sm font-bold text-green-600 dark:text-green-400">
                            {assignment.obtainedMarks}/{assignment.totalMarks}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            {(
                              (assignment.obtainedMarks /
                                assignment.totalMarks) *
                              100
                            ).toFixed(1)}
                            %
                          </p>
                        </div>
                      )}

                      {assignment.submittedDate &&
                        !assignment.obtainedMarks && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-2 mb-1">
                              <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <p className="text-xs text-blue-600 dark:text-blue-400">
                                Submitted
                              </p>
                            </div>
                            <p className="text-sm font-medium text-foreground">
                              {assignment.submittedDate}
                            </p>
                          </div>
                        )}
                    </div>

                    {/* Feedback Section */}
                    {assignment.feedback && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
                          Teacher's Feedback:
                        </p>
                        <p className="text-sm text-foreground">
                          {assignment.feedback}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Download Assignment Question */}
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() =>
                          handleDownload(
                            assignment.fileUrl!,
                            `${assignment.courseCode}-${assignment.title}.pdf`
                          )
                        }
                      >
                        <Download className="w-4 h-4" />
                        Download Question
                      </Button>

                      {/* Upload/View Submission */}
                      {assignment.status === "pending" && (
                        <Button
                          className="flex-1 gap-2"
                          onClick={() => handleFileUpload(assignment.id)}
                        >
                          <Upload className="w-4 h-4" />
                          Upload Solution
                        </Button>
                      )}

                      {assignment.submissionFileUrl && (
                        <Button
                          variant="secondary"
                          className="flex-1 gap-2"
                          onClick={() =>
                            handleDownload(
                              assignment.submissionFileUrl!,
                              `${assignment.courseCode}-submission.pdf`
                            )
                          }
                        >
                          <Eye className="w-4 h-4" />
                          View My Submission
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
