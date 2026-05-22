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
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  CheckCircle,
  Trophy,
  Flame,
  TrendingUp,
  AlertCircle,
  DollarSign,
  Calendar,
  Award,
  Target,
  Download,
} from "lucide-react";

// Static parent/student data
interface Child {
  id: string;
  name: string;
  program: string;
  semester: string;
  profilePic: string;
}

interface Course {
  name: string;
  code: string;
  progress: number;
  grade: string;
}

interface Activity {
  action: string;
  subject: string;
  score?: string;
  time: string;
}

interface Event {
  type: string;
  subject: string;
  title: string;
  date: string;
}

interface Fees {
  total: number;
  paid: number;
  due: number;
  dueDate: string | null;
}

interface StudentData {
  dailyStreak: number;
  accuracyStreak: number;
  totalPoints: number;
  completedLectures: number;
  totalLectures: number;
  attendance: number;
  avgCompletion: number;
  courses: Course[];
  recentActivity: Activity[];
  upcomingEvents: Event[];
  fees: Fees;
}

const children: Child[] = [
  {
    id: "1",
    name: "Ahmed Hassan",
    program: "Computer Science",
    semester: "Semester 2",
    profilePic: "AH",
  },
  {
    id: "2",
    name: "Sara Hassan",
    program: "Mathematics",
    semester: "Semester 1",
    profilePic: "SH",
  },
];

const studentDetails: Record<string, StudentData> = {
  "1": {
    dailyStreak: 7,
    accuracyStreak: 12,
    totalPoints: 450,
    completedLectures: 18,
    totalLectures: 25,
    attendance: 92,
    avgCompletion: 87,
    courses: [
      { name: "Data Structures", code: "CS201", progress: 72, grade: "B+" },
      { name: "OOP", code: "CS202", progress: 85, grade: "A-" },
      { name: "Calculus II", code: "MATH201", progress: 60, grade: "B" },
    ],
    recentActivity: [
      {
        action: "Completed lecture",
        subject: "Binary Trees",
        time: "2 hours ago",
      },
      {
        action: "Quiz completed",
        subject: "OOP Concepts",
        score: "9/10",
        time: "1 day ago",
      },
      {
        action: "Assignment submitted",
        subject: "Linked Lists",
        time: "2 days ago",
      },
    ],
    upcomingEvents: [
      {
        type: "quiz",
        subject: "CS201",
        title: "Mid-term Quiz",
        date: "Tomorrow, 2:00 PM",
      },
      {
        type: "assignment",
        subject: "MATH201",
        title: "Integration Problems",
        date: "Dec 20",
      },
    ],
    fees: {
      total: 50000,
      paid: 30000,
      due: 20000,
      dueDate: "Jan 15, 2025",
    },
  },
  "2": {
    dailyStreak: 14,
    accuracyStreak: 20,
    totalPoints: 680,
    completedLectures: 22,
    totalLectures: 28,
    attendance: 96,
    avgCompletion: 93,
    courses: [
      { name: "Calculus I", code: "MATH101", progress: 88, grade: "A" },
      { name: "Linear Algebra", code: "MATH102", progress: 82, grade: "A-" },
      { name: "Statistics", code: "STAT101", progress: 90, grade: "A" },
    ],
    recentActivity: [
      {
        action: "Completed lecture",
        subject: "Matrix Operations",
        time: "1 hour ago",
      },
      {
        action: "Quiz completed",
        subject: "Derivatives",
        score: "10/10",
        time: "3 hours ago",
      },
      { action: "Badge earned", subject: "14-Day Streak", time: "Today" },
    ],
    upcomingEvents: [
      { type: "exam", subject: "MATH101", title: "Final Exam", date: "Dec 22" },
    ],
    fees: {
      total: 50000,
      paid: 50000,
      due: 0,
      dueDate: null,
    },
  },
};

export default function ParentDashboardPage() {
  const [selectedChild, setSelectedChild] = useState<Child>(children[0]);
  const data = studentDetails[selectedChild.id];

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Parent Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor your children&apos;s academic progress
            </p>
          </div>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </div>

        {/* Child Selector */}
        <div className="flex space-x-4">
          {children.map((child) => (
            <Card
              key={child.id}
              className={`cursor-pointer transition-all ${
                selectedChild.id === child.id
                  ? "border-2 border-blue-500 shadow-lg"
                  : "border hover:border-blue-300"
              }`}
              onClick={() => setSelectedChild(child)}
            >
              <CardContent className="p-4 flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                  {child.profilePic}
                </div>
                <div>
                  <p className="font-semibold">{child.name}</p>
                  <p className="text-xs text-gray-500">{child.program}</p>
                  <p className="text-xs text-gray-400">{child.semester}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="border-0 shadow-lg">
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-orange-100 rounded-xl mr-4">
                <Flame className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.dailyStreak}</p>
                <p className="text-sm text-gray-500">Day Streak</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-blue-100 rounded-xl mr-4">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {data.completedLectures}/{data.totalLectures}
                </p>
                <p className="text-sm text-gray-500">Lectures</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-green-100 rounded-xl mr-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.attendance}%</p>
                <p className="text-sm text-gray-500">Attendance</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-purple-100 rounded-xl mr-4">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.avgCompletion}%</p>
                <p className="text-sm text-gray-500">Avg Score</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-yellow-100 rounded-xl mr-4">
                <Trophy className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.totalPoints}</p>
                <p className="text-sm text-gray-500">Points</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Progress */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Course Performance</CardTitle>
                <CardDescription>
                  Current semester progress and grades
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.courses.map((course, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold">{course.name}</h3>
                          <p className="text-sm text-gray-500">{course.code}</p>
                        </div>
                        <Badge className="bg-blue-600">{course.grade}</Badge>
                      </div>
                      <Progress value={course.progress} className="h-2 mb-2" />
                      <p className="text-sm text-gray-600">
                        {course.progress}% completed
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest learning activities and achievements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.recentActivity.map((activity, idx) => (
                    <div
                      key={idx}
                      className="flex items-start space-x-3 pb-3 border-b last:border-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        {activity.action.includes("completed") ? (
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                        ) : activity.action.includes("Quiz") ? (
                          <Target className="h-4 w-4 text-green-600" />
                        ) : (
                          <Award className="h-4 w-4 text-purple-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-gray-600">
                          {activity.subject}{" "}
                          {activity.score && `• Score: ${activity.score}`}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Fee Status */}
            <Card
              className={`border-0 shadow-lg ${
                data.fees.due > 0 ? "bg-orange-50" : "bg-green-50"
              }`}
            >
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign
                    className={`h-5 w-5 ${
                      data.fees.due > 0 ? "text-orange-600" : "text-green-600"
                    }`}
                  />
                  <span>Fee Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Fee</span>
                    <span className="font-semibold">
                      PKR {data.fees.total.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Paid</span>
                    <span className="font-semibold text-green-600">
                      PKR {data.fees.paid.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Due</span>
                    <span
                      className={`font-semibold ${
                        data.fees.due > 0 ? "text-orange-600" : "text-green-600"
                      }`}
                    >
                      PKR {data.fees.due.toLocaleString()}
                    </span>
                  </div>
                  {data.fees.due > 0 && (
                    <>
                      <Progress
                        value={(data.fees.paid / data.fees.total) * 100}
                        className="h-2"
                      />
                      <p className="text-xs text-orange-700">
                        Due Date: {data.fees.dueDate}
                      </p>
                      <Button className="w-full bg-orange-600 hover:bg-orange-700">
                        Pay Now
                      </Button>
                    </>
                  )}
                  {data.fees.due === 0 && (
                    <div className="text-center py-2">
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-green-700">
                        All fees paid
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                  <span>Upcoming</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.upcomingEvents.map((event, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-indigo-50 rounded-lg border border-indigo-200"
                    >
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-indigo-600 mt-0.5" />
                        <div>
                          <p className="font-semibold text-sm text-indigo-900">
                            {event.title}
                          </p>
                          <p className="text-xs text-indigo-700">
                            {event.subject}
                          </p>
                          <p className="text-xs text-indigo-600 mt-1">
                            {event.date}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Summary */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <Award className="h-10 w-10 mb-3" />
                <h3 className="text-xl font-bold mb-2">
                  {data.avgCompletion >= 90
                    ? "Excellent!"
                    : data.avgCompletion >= 75
                    ? "Great Progress!"
                    : "Keep Going!"}
                </h3>
                <p className="text-white/90 text-sm mb-4">
                  {selectedChild.name} is performing{" "}
                  {data.avgCompletion >= 90 ? "exceptionally" : "well"} with{" "}
                  {data.dailyStreak} days of consistent study.
                </p>
                {data.attendance < 85 && (
                  <div className="flex items-start space-x-2 mt-3 pt-3 border-t border-white/20">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <p className="text-xs text-white/90">
                      Attendance needs attention
                    </p>
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
