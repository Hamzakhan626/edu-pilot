/* eslint-disable react/no-unescaped-entities */
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  BookOpen,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  MessageCircle,
  Calendar,
  Award,
  Eye,
  Bell,
  Target,
  Flame,
  GraduationCap,
  FileText,
  Activity,
} from "lucide-react";

// Mock data for parent dashboard
const parentData = {
  name: "Mrs. Fatima Khan",
  email: "fatima.khan@email.com",
  children: [
    {
      id: 1,
      name: "Ayesha Khan",
      studentId: "STU-2023-045",
      program: "BS Computer Science",
      semester: "3rd Semester",
      section: "A",
      attendance: 94,
      avgGrade: 88.5,
      cgpa: 3.45,
      streak: 15,
      atRisk: false,
      recentActivity: "2 hours ago",
      totalCourses: 5,
      completedAssignments: 28,
      pendingAssignments: 3,
    },
    {
      id: 2,
      name: "Ali Khan",
      studentId: "STU-2024-112",
      program: "BS Business Administration",
      semester: "1st Semester",
      section: "B",
      attendance: 85,
      avgGrade: 78.2,
      cgpa: 2.95,
      streak: 5,
      atRisk: true,
      recentActivity: "1 day ago",
      totalCourses: 6,
      completedAssignments: 18,
      pendingAssignments: 5,
    },
  ],
};

const performanceData = [
  { subject: "Data Structures", ayesha: 92, ali: 75 },
  { subject: "Calculus", ayesha: 88, ali: 78 },
  { subject: "Physics", ayesha: 90, ali: 82 },
  { subject: "English", ayesha: 85, ali: 80 },
  { subject: "Database", ayesha: 87, ali: 76 },
];

const attendanceData = [
  { month: "Aug", ayesha: 95, ali: 88 },
  { month: "Sep", ayesha: 96, ali: 84 },
  { month: "Oct", ayesha: 94, ali: 86 },
  { month: "Nov", ayesha: 93, ali: 85 },
  { month: "Dec", ayesha: 94, ali: 85 },
];

const feeData = [
  { name: "Paid", value: 70, color: "#22C55E" },
  { name: "Pending", value: 25, color: "#F59E0B" },
  { name: "Overdue", value: 5, color: "#EF4444" },
];

const upcomingEvents = [
  {
    id: 1,
    title: "Final Exams Start",
    date: "2025-12-20",
    child: "Both",
    type: "exam",
    priority: "high",
  },
  {
    id: 2,
    title: "Assignment Submission",
    date: "2025-12-10",
    child: "Ayesha",
    type: "assignment",
    priority: "high",
  },
  {
    id: 3,
    title: "Parent-Teacher Meeting",
    date: "2025-12-15",
    child: "Ali",
    type: "meeting",
    priority: "medium",
  },
  {
    id: 4,
    title: "Career Fair",
    date: "2025-12-18",
    child: "Both",
    type: "event",
    priority: "low",
  },
];

const recentActivities = [
  {
    id: 1,
    child: "Ayesha",
    action: "Submitted assignment",
    subject: "Data Structures Project",
    time: "2 hours ago",
    type: "submission",
    score: 92,
  },
  {
    id: 2,
    child: "Ali",
    action: "Completed quiz",
    subject: "Business Management",
    time: "1 day ago",
    type: "quiz",
    score: 78,
  },
  {
    id: 3,
    child: "Ayesha",
    action: "Attended lecture",
    subject: "Database Systems",
    time: "1 day ago",
    type: "attendance",
    score: null,
  },
  {
    id: 4,
    child: "Ali",
    action: "Received grade",
    subject: "Marketing Basics",
    time: "2 days ago",
    type: "grade",
    score: 80,
  },
  {
    id: 5,
    child: "Ayesha",
    action: "Earned badge",
    subject: "15-Day Streak Achievement",
    time: "3 days ago",
    type: "achievement",
    score: null,
  },
];

const notifications = [
  {
    id: 1,
    message: "Ali has 3 pending assignments due this week",
    type: "warning",
    time: "1 hour ago",
  },
  {
    id: 2,
    message: "Ayesha earned a 15-day streak badge",
    type: "success",
    time: "3 hours ago",
  },
  {
    id: 3,
    message: "Fee payment reminder: Due in 5 days",
    type: "info",
    time: "1 day ago",
  },
];

export default function ParentDashboard() {
  const [showAllActivities, setShowAllActivities] = useState(false);

  const totalChildren = parentData.children.length;
  const atRiskChildren = parentData.children.filter(
    (child) => child.atRisk
  ).length;
  const avgAttendance =
    parentData.children.reduce((acc, child) => acc + child.attendance, 0) /
    totalChildren;
  const avgGrade =
    parentData.children.reduce((acc, child) => acc + child.avgGrade, 0) /
    totalChildren;

  const getEventColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "submission":
        return <BookOpen className="h-3.5 w-3.5 text-green-600" />;
      case "quiz":
        return <Award className="h-3.5 w-3.5 text-blue-600" />;
      case "grade":
        return <TrendingUp className="h-3.5 w-3.5 text-purple-600" />;
      case "attendance":
        return <CheckCircle className="h-3.5 w-3.5 text-teal-600" />;
      case "achievement":
        return <Flame className="h-3.5 w-3.5 text-orange-600" />;
      default:
        return <Activity className="h-3.5 w-3.5 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "warning":
        return "bg-orange-50 border-orange-200";
      case "success":
        return "bg-green-50 border-green-200";
      case "info":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="space-y-4">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-4 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold mb-1">
              Welcome back, {parentData.name}! 👨‍👩‍👧‍👦
            </h1>
            <p className="text-sm text-blue-100">
              Monitor your children's academic progress and activities
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="bg-white/20 hover:bg-white/30 text-white border-0"
          >
            <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
            Contact Teachers
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalChildren}</p>
            <p className="text-xs text-gray-500">Children Enrolled</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {avgAttendance.toFixed(0)}%
            </p>
            <p className="text-xs text-gray-500">Avg Attendance</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <Target className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {avgGrade.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500">Avg Performance</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{atRiskChildren}</p>
            <p className="text-xs text-gray-500">Need Attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Children Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {parentData.children.map((child) => (
          <Card key={child.id} className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                      {child.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900">
                      {child.name}
                    </h3>
                    <p className="text-xs text-gray-500">{child.studentId}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs py-0 h-5">
                        {child.program.split(" ")[0]}
                      </Badge>
                      <Badge variant="outline" className="text-xs py-0 h-5">
                        {child.semester}
                      </Badge>
                    </div>
                  </div>
                </div>
                {child.atRisk && (
                  <Badge variant="destructive" className="text-xs py-0.5">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    At Risk
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <p className="text-xs text-gray-600">CGPA</p>
                  <p className="text-sm font-bold text-blue-600">
                    {child.cgpa}
                  </p>
                </div>
                <div className="text-center p-2 bg-green-50 rounded">
                  <p className="text-xs text-gray-600">Attendance</p>
                  <p className="text-sm font-bold text-green-600">
                    {child.attendance}%
                  </p>
                </div>
                <div className="text-center p-2 bg-orange-50 rounded">
                  <p className="text-xs text-gray-600">Streak</p>
                  <p className="text-sm font-bold text-orange-600">
                    {child.streak} days
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-gray-600">
                    <BookOpen className="h-3 w-3 inline mr-1" />
                    {child.totalCourses} courses
                  </span>
                  <span className="text-gray-600">
                    <FileText className="h-3 w-3 inline mr-1" />
                    {child.pendingAssignments} pending
                  </span>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Performance Chart */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Academic Performance
            </CardTitle>
            <CardDescription className="text-xs">
              Subject-wise comparison
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar
                  dataKey="ayesha"
                  fill="#3B82F6"
                  name="Ayesha"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="ali"
                  fill="#10B981"
                  name="Ali"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Attendance Trend */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Attendance Trend
            </CardTitle>
            <CardDescription className="text-xs">
              Monthly attendance tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="ayesha"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Ayesha"
                />
                <Line
                  type="monotone"
                  dataKey="ali"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Ali"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Notifications & Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Notifications */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Recent Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3 rounded-lg border ${getNotificationColor(
                  notif.type
                )}`}
              >
                <p className="text-xs font-medium text-gray-900">
                  {notif.message}
                </p>
                <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start justify-between p-2 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-900">
                    {event.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {event.child} •{" "}
                    {new Date(event.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs py-0 h-5 ${getEventColor(
                    event.priority
                  )}`}
                >
                  {event.type}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Activities
              </CardTitle>
              <CardDescription className="text-xs">
                Latest updates from your children
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowAllActivities(!showAllActivities)}
              variant="outline"
              size="sm"
              className="h-7 text-xs"
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              {showAllActivities ? "Show Less" : "View All"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {(showAllActivities
            ? recentActivities
            : recentActivities.slice(0, 3)
          ).map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors border"
            >
              <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">
                  <span className="text-blue-600">{activity.child}</span>{" "}
                  {activity.action}
                </p>
                <p className="text-xs text-gray-600 truncate">
                  {activity.subject}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                {activity.score && (
                  <p className="text-xs font-semibold text-green-600">
                    {activity.score}%
                  </p>
                )}
                <p className="text-xs text-gray-400">{activity.time}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            <GraduationCap className="h-6 w-6 mx-auto mb-2" />
            <h3 className="text-sm font-semibold mb-1">View Reports</h3>
            <p className="text-xs text-blue-100">Detailed analytics</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-500 to-green-600 text-white cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            <MessageCircle className="h-6 w-6 mx-auto mb-2" />
            <h3 className="text-sm font-semibold mb-1">Message Teachers</h3>
            <p className="text-xs text-green-100">Quick contact</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-500 to-orange-600 text-white cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 mx-auto mb-2" />
            <h3 className="text-sm font-semibold mb-1">Pay Fees</h3>
            <p className="text-xs text-orange-100">Secure payment</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-500 to-purple-600 text-white cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            <Calendar className="h-6 w-6 mx-auto mb-2" />
            <h3 className="text-sm font-semibold mb-1">Schedule Meeting</h3>
            <p className="text-xs text-purple-100">Book appointment</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
