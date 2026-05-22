/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Calendar,
  FileText,
  Trophy,
  BarChart3,
  GraduationCap,
  User,
  Bell,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  DollarSign,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Child {
  id: string;
  name: string;
  grade: string;
  class: string;
  avatar: string;
  rollNumber: string;
  semester: string;
  courses: Course[];
  overallGPA: number;
  attendance: {
    present: number;
    total: number;
    percentage: number;
  };
  upcomingEvents: Event[];
  recentActivity: Activity[];
  fees: {
    total: number;
    paid: number;
    pending: number;
    dueDate: string;
  };
}

interface Course {
  id: string;
  name: string;
  code: string;
  instructor: string;
  grade: number;
  attendance: number;
  progress: number;
  recentTest?: {
    name: string;
    score: number;
    maxScore: number;
    date: string;
  };
  upcomingAssignment?: {
    title: string;
    dueDate: string;
  };
}

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  type: "exam" | "meeting" | "event" | "assignment";
  description: string;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  icon: string;
}

export default function ParentProgramPage() {
  const [selectedChild, setSelectedChild] = useState<string>("child1");
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  const children: Child[] = [
    {
      id: "child1",
      name: "Ahmed Ali",
      grade: "Grade 10",
      class: "Section A",
      avatar: "AA",
      rollNumber: "2024-CS-101",
      semester: "Fall 2024",
      overallGPA: 3.75,
      attendance: {
        present: 88,
        total: 95,
        percentage: 92.6,
      },
      fees: {
        total: 50000,
        paid: 35000,
        pending: 15000,
        dueDate: "Dec 31, 2024",
      },
      courses: [
        {
          id: "c1",
          name: "Mathematics",
          code: "MATH301",
          instructor: "Prof. Sarah Ahmed",
          grade: 88,
          attendance: 95,
          progress: 75,
          recentTest: {
            name: "Midterm Exam",
            score: 44,
            maxScore: 50,
            date: "Nov 28, 2024",
          },
          upcomingAssignment: {
            title: "Calculus Problem Set",
            dueDate: "Dec 15, 2024",
          },
        },
        {
          id: "c2",
          name: "Physics",
          code: "PHY302",
          instructor: "Dr. Hassan Khan",
          grade: 82,
          attendance: 88,
          progress: 68,
          recentTest: {
            name: "Chapter 5 Quiz",
            score: 18,
            maxScore: 20,
            date: "Dec 2, 2024",
          },
        },
        {
          id: "c3",
          name: "Computer Science",
          code: "CS301",
          instructor: "Dr. Ahmed Khan",
          grade: 92,
          attendance: 96,
          progress: 82,
          recentTest: {
            name: "Programming Test",
            score: 48,
            maxScore: 50,
            date: "Dec 5, 2024",
          },
          upcomingAssignment: {
            title: "Web Development Project",
            dueDate: "Dec 20, 2024",
          },
        },
        {
          id: "c4",
          name: "English Literature",
          code: "ENG301",
          instructor: "Ms. Fatima Noor",
          grade: 78,
          attendance: 92,
          progress: 70,
          upcomingAssignment: {
            title: "Essay on Shakespeare",
            dueDate: "Dec 18, 2024",
          },
        },
      ],
      upcomingEvents: [
        {
          id: "e1",
          title: "Parent-Teacher Meeting",
          date: "Dec 15, 2024",
          time: "2:00 PM",
          type: "meeting",
          description: "Discussion about Ahmed's progress and performance",
        },
        {
          id: "e2",
          title: "Final Exams Begin",
          date: "Dec 20, 2024",
          time: "9:00 AM",
          type: "exam",
          description: "Final examinations start for all subjects",
        },
        {
          id: "e3",
          title: "Science Fair",
          date: "Dec 22, 2024",
          time: "10:00 AM",
          type: "event",
          description: "Annual science exhibition and competition",
        },
      ],
      recentActivity: [
        {
          id: "a1",
          type: "test",
          description: "Scored 96% in Computer Science Programming Test",
          timestamp: "2 days ago",
          icon: "trophy",
        },
        {
          id: "a2",
          type: "assignment",
          description: "Submitted Physics Lab Report",
          timestamp: "3 days ago",
          icon: "file",
        },
        {
          id: "a3",
          type: "attendance",
          description: "Perfect attendance this week",
          timestamp: "5 days ago",
          icon: "check",
        },
      ],
    },
    {
      id: "child2",
      name: "Fatima Ali",
      grade: "Grade 7",
      class: "Section B",
      avatar: "FA",
      rollNumber: "2024-GS-205",
      semester: "Fall 2024",
      overallGPA: 3.92,
      attendance: {
        present: 92,
        total: 95,
        percentage: 96.8,
      },
      fees: {
        total: 40000,
        paid: 40000,
        pending: 0,
        dueDate: "",
      },
      courses: [
        {
          id: "c5",
          name: "Mathematics",
          code: "MATH201",
          instructor: "Ms. Aisha Malik",
          grade: 95,
          attendance: 98,
          progress: 85,
          recentTest: {
            name: "Algebra Test",
            score: 48,
            maxScore: 50,
            date: "Dec 1, 2024",
          },
        },
        {
          id: "c6",
          name: "Science",
          code: "SCI201",
          instructor: "Mr. Usman Ali",
          grade: 91,
          attendance: 95,
          progress: 80,
          recentTest: {
            name: "Biology Quiz",
            score: 19,
            maxScore: 20,
            date: "Nov 30, 2024",
          },
        },
        {
          id: "c7",
          name: "English",
          code: "ENG201",
          instructor: "Ms. Sara Ahmed",
          grade: 88,
          attendance: 97,
          progress: 78,
          upcomingAssignment: {
            title: "Book Report",
            dueDate: "Dec 16, 2024",
          },
        },
      ],
      upcomingEvents: [
        {
          id: "e4",
          title: "Art Exhibition",
          date: "Dec 18, 2024",
          time: "11:00 AM",
          type: "event",
          description: "Annual student art showcase",
        },
      ],
      recentActivity: [
        {
          id: "a4",
          type: "achievement",
          description: "Won 1st place in Math Olympiad",
          timestamp: "1 week ago",
          icon: "trophy",
        },
      ],
    },
  ];

  const currentChild = children.find((child) => child.id === selectedChild)!;

  const toggleCourse = (courseId: string) => {
    setExpandedCourse(expandedCourse === courseId ? null : courseId);
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 85) return "text-green-600 dark:text-green-400";
    if (grade >= 70) return "text-blue-600 dark:text-blue-400";
    if (grade >= 60) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-green-500";
    if (progress >= 50) return "bg-blue-500";
    return "bg-amber-500";
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "exam":
        return <FileText className="w-4 h-4" />;
      case "meeting":
        return <Users className="w-4 h-4" />;
      case "event":
        return <Calendar className="w-4 h-4" />;
      case "assignment":
        return <BookOpen className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "exam":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400";
      case "meeting":
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400";
      case "event":
        return "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400";
      case "assignment":
        return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400";
      default:
        return "bg-muted border-border text-foreground";
    }
  };

  const averageGrade =
    currentChild.courses.reduce((sum, c) => sum + c.grade, 0) /
    currentChild.courses.length;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl">
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
              {children.map((child) => (
                <SelectItem key={child.id} value={child.id}>
                  {child.name} - {child.grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Student Info Card */}
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold">
                  {currentChild.avatar}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {currentChild.name}
                  </h2>
                  <p className="text-muted-foreground">
                    {currentChild.grade} • {currentChild.class}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Roll No: {currentChild.rollNumber}
                  </p>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Overall GPA
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {currentChild.overallGPA.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Attendance
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {currentChild.attendance.percentage.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Semester</p>
                  <p className="text-lg font-semibold text-foreground">
                    {currentChild.semester}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Total Courses
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {currentChild.courses.length}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-green-600" />
                    <p className="text-xs text-green-600">All active</p>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Excellent performance
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <Trophy className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Attendance Rate
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {currentChild.attendance.percentage.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentChild.attendance.present}/
                    {currentChild.attendance.total} days
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                  <CheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Fee Status
                  </p>
                  <p
                    className={`text-3xl font-bold ${
                      currentChild.fees.pending > 0
                        ? "text-amber-600"
                        : "text-green-600"
                    }`}
                  >
                    {currentChild.fees.pending > 0
                      ? `₨${currentChild.fees.pending.toLocaleString()}`
                      : "Paid"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentChild.fees.pending > 0
                      ? `Due: ${currentChild.fees.dueDate}`
                      : "All cleared"}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-full ${
                    currentChild.fees.pending > 0
                      ? "bg-amber-100 dark:bg-amber-900/20"
                      : "bg-green-100 dark:bg-green-900/20"
                  }`}
                >
                  <DollarSign
                    className={`w-6 h-6 ${
                      currentChild.fees.pending > 0
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-green-600 dark:text-green-400"
                    }`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Courses */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-foreground mb-4">
              Current Courses
            </h2>
            {currentChild.courses.map((course) => {
              const isExpanded = expandedCourse === course.id;

              return (
                <Card
                  key={course.id}
                  className="hover:shadow-lg transition-all cursor-pointer"
                >
                  <CardHeader onClick={() => toggleCourse(course.id)}>
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <Badge variant="outline" className="text-sm">
                            {course.code}
                          </Badge>
                          <h3 className="text-lg font-bold text-foreground">
                            {course.name}
                          </h3>
                          <Badge
                            className={`${
                              course.grade >= 85
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : course.grade >= 70
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                            }`}
                          >
                            {course.grade}%
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{course.instructor}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            <span>{course.attendance}% Attendance</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <ArrowRight
                          className={`w-4 h-4 transition-transform ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                        />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 pb-4">
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Course Progress
                        </span>
                        <span className="font-semibold text-foreground">
                          {course.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${getProgressColor(
                            course.progress
                          )}`}
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="space-y-4 mt-6 pt-6 border-t">
                        {/* Recent Test */}
                        {course.recentTest && (
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-foreground mb-1">
                                  Recent Test: {course.recentTest.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {course.recentTest.date}
                                </p>
                              </div>
                              <div className="text-right">
                                <p
                                  className={`text-2xl font-bold ${getGradeColor(
                                    (course.recentTest.score /
                                      course.recentTest.maxScore) *
                                      100
                                  )}`}
                                >
                                  {course.recentTest.score}/
                                  {course.recentTest.maxScore}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {(
                                    (course.recentTest.score /
                                      course.recentTest.maxScore) *
                                    100
                                  ).toFixed(1)}
                                  %
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Upcoming Assignment */}
                        {course.upcomingAssignment && (
                          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                              <div className="flex-1">
                                <p className="font-medium text-foreground">
                                  {course.upcomingAssignment.title}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Due: {course.upcomingAssignment.dueDate}
                                </p>
                              </div>
                              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                Pending
                              </Badge>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button variant="outline" className="flex-1 gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Message Teacher
                          </Button>
                          <Button variant="outline" className="flex-1 gap-2">
                            <BarChart3 className="w-4 h-4" />
                            View Full Report
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Upcoming Events
                </h3>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentChild.upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 rounded-lg border ${getEventColor(
                      event.type
                    )}`}
                  >
                    <div className="flex items-start gap-3">
                      {getEventIcon(event.type)}
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-1">
                          {event.title}
                        </p>
                        <p className="text-xs opacity-80 mb-1">
                          {event.date} at {event.time}
                        </p>
                        <p className="text-xs opacity-70">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Recent Activity
                </h3>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentChild.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0"
                  >
                    <div className="p-2 bg-muted rounded-full">
                      {activity.icon === "trophy" && (
                        <Trophy className="w-4 h-4 text-amber-600" />
                      )}
                      {activity.icon === "file" && (
                        <FileText className="w-4 h-4 text-blue-600" />
                      )}
                      {activity.icon === "check" && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-bold text-foreground">
                  Quick Actions
                </h3>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Contact Teachers
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Download Reports
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  Pay Fees
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Request Meeting
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
