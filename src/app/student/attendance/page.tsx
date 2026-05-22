/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
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
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  Clock,
  Calendar as CalendarIcon,
  AlertTriangle,
  BookOpen,
  TrendingDown,
  Info,
} from "lucide-react";

// Mock data for student's registered courses
const registeredCourses = [
  {
    id: "CS101",
    name: "Introduction to Programming",
    instructor: "Dr. Sarah Johnson",
    totalClasses: 45,
    attended: 43,
    absent: 2,
    late: 0,
    percentage: 95.6,
    credits: 3,
    requiredPercentage: 75,
  },
  {
    id: "MATH201",
    name: "Advanced Mathematics",
    instructor: "Prof. Michael Chen",
    totalClasses: 40,
    attended: 28,
    absent: 10,
    late: 2,
    percentage: 70.0,
    credits: 4,
    requiredPercentage: 75,
  },
  {
    id: "PHY101",
    name: "Physics Fundamentals",
    instructor: "Dr. Emily Williams",
    totalClasses: 38,
    attended: 35,
    absent: 2,
    late: 1,
    percentage: 92.1,
    credits: 3,
    requiredPercentage: 75,
  },
  {
    id: "CHEM101",
    name: "Chemistry Lab",
    instructor: "Dr. Robert Martinez",
    totalClasses: 30,
    attended: 22,
    absent: 7,
    late: 1,
    percentage: 73.3,
    credits: 2,
    requiredPercentage: 75,
  },
];

// Mock data for recent attendance records
const recentAttendance = [
  {
    id: "1",
    course: "Introduction to Programming",
    date: "2024-12-09",
    time: "09:00 AM",
    status: "present",
  },
  {
    id: "2",
    course: "Advanced Mathematics",
    date: "2024-12-09",
    time: "11:00 AM",
    status: "present",
  },
  {
    id: "3",
    course: "Physics Fundamentals",
    date: "2024-12-08",
    time: "02:00 PM",
    status: "present",
  },
  {
    id: "4",
    course: "Chemistry Lab",
    date: "2024-12-08",
    time: "03:30 PM",
    status: "absent",
  },
  {
    id: "5",
    course: "Introduction to Programming",
    date: "2024-12-06",
    time: "09:00 AM",
    status: "present",
  },
  {
    id: "6",
    course: "Advanced Mathematics",
    date: "2024-12-06",
    time: "11:00 AM",
    status: "late",
  },
];

export default function StudentAttendancePage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  // Calculate overall statistics
  const totalClasses = registeredCourses.reduce(
    (sum, course) => sum + course.totalClasses,
    0,
  );
  const totalAttended = registeredCourses.reduce(
    (sum, course) => sum + course.attended,
    0,
  );
  const totalAbsent = registeredCourses.reduce(
    (sum, course) => sum + course.absent,
    0,
  );
  const totalLate = registeredCourses.reduce(
    (sum, course) => sum + course.late,
    0,
  );
  const overallPercentage = (totalAttended / totalClasses) * 100;

  // Identify courses with attendance warnings
  const warningCourses = registeredCourses.filter(
    (course) => course.percentage < 75,
  );
  const criticalCourses = registeredCourses.filter(
    (course) => course.percentage < course.requiredPercentage,
  );

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
  };

  const getStatusColor = (percentage: number, required: number) => {
    if (percentage >= required + 10)
      return "text-green-600 bg-green-50 border-green-200";
    if (percentage >= required)
      return "text-blue-600 bg-blue-50 border-blue-200";
    if (percentage >= required - 5)
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Attendance</h1>
        <p className="text-gray-500 mt-1">
          Track your class attendance and stay compliant
        </p>
      </div>

      {/* Attendance Warnings */}
      {criticalCourses.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertTitle className="text-red-900 font-semibold">
            Attendance Warning!
          </AlertTitle>
          <AlertDescription className="text-red-800">
            You have {criticalCourses.length} course
            {criticalCourses.length > 1 ? "s" : ""} below the required
            attendance threshold (75%). You may not be eligible to sit for the
            exam if attendance drops further.
            <div className="mt-2 space-y-1">
              {criticalCourses.map((course) => (
                <div key={course.id} className="font-medium">
                  • {course.name}: {course.percentage.toFixed(1)}% (Need{" "}
                  {course.requiredPercentage}%)
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {warningCourses.length > 0 && criticalCourses.length === 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <Info className="h-5 w-5 text-yellow-600" />
          <AlertTitle className="text-yellow-900 font-semibold">
            Low Attendance Notice
          </AlertTitle>
          <AlertDescription className="text-yellow-800">
            {warningCourses.length} course
            {warningCourses.length > 1 ? "s are" : " is"} approaching the
            minimum attendance requirement. Please attend regularly to avoid
            being barred from exams.
          </AlertDescription>
        </Alert>
      )}

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-blue-100 rounded-xl mr-4">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {overallPercentage.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500">Overall Attendance</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-green-100 rounded-xl mr-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalAttended}</p>
              <p className="text-sm text-gray-500">Classes Attended</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-red-100 rounded-xl mr-4">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalAbsent}</p>
              <p className="text-sm text-gray-500">Classes Missed</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-yellow-100 rounded-xl mr-4">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalLate}</p>
              <p className="text-sm text-gray-500">Late Arrivals</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Registered Courses */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="mr-2 h-5 w-5" />
            Registered Courses
          </CardTitle>
          <CardDescription>
            Your current semester courses and attendance status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {registeredCourses.map((course) => (
              <div
                key={course.id}
                className={`border-2 rounded-xl p-5 transition-all cursor-pointer hover:shadow-md ${
                  selectedCourse === course.id ? "ring-2 ring-blue-500" : ""
                } ${getStatusColor(
                  course.percentage,
                  course.requiredPercentage,
                )}`}
                onClick={() =>
                  setSelectedCourse(
                    selectedCourse === course.id ? null : course.id,
                  )
                }
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{course.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {course.id}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {course.credits} Credits
                      </Badge>
                    </div>
                    <p className="text-sm opacity-80">{course.instructor}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {course.percentage.toFixed(1)}%
                    </p>
                    {course.percentage < course.requiredPercentage && (
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingDown className="h-4 w-4" />
                        <span className="text-xs font-medium">
                          Below Required
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Progress value={course.percentage} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" /> {course.attended}{" "}
                      Present
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" /> {course.late} Late
                    </span>
                    <span className="flex items-center gap-1">
                      <XCircle className="h-4 w-4" /> {course.absent} Absent
                    </span>
                    <span className="font-medium">
                      {course.totalClasses} Total Classes
                    </span>
                  </div>
                </div>

                {selectedCourse === course.id && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-white bg-opacity-50 p-3 rounded-lg">
                        <p className="text-xs opacity-70 mb-1">
                          Classes Remaining
                        </p>
                        <p className="font-semibold text-lg">
                          {Math.max(0, 50 - course.totalClasses)}
                        </p>
                      </div>
                      <div className="bg-white bg-opacity-50 p-3 rounded-lg">
                        <p className="text-xs opacity-70 mb-1">
                          Required Percentage
                        </p>
                        <p className="font-semibold text-lg">
                          {course.requiredPercentage}%
                        </p>
                      </div>
                      <div className="bg-white bg-opacity-50 p-3 rounded-lg">
                        <p className="text-xs opacity-70 mb-1">
                          Classes Can Miss
                        </p>
                        <p className="font-semibold text-lg">
                          {Math.max(
                            0,
                            Math.floor(
                              50 * (1 - course.requiredPercentage / 100) -
                                course.absent,
                            ),
                          )}
                        </p>
                      </div>
                      <div className="bg-white bg-opacity-50 p-3 rounded-lg">
                        <p className="text-xs opacity-70 mb-1">Status</p>
                        <p className="font-semibold text-lg">
                          {course.percentage >= course.requiredPercentage + 10
                            ? "Excellent"
                            : course.percentage >= course.requiredPercentage
                              ? "Good"
                              : course.percentage >=
                                  course.requiredPercentage - 5
                                ? "Warning"
                                : "Critical"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarIcon className="mr-2 h-5 w-5" />
              Recent Attendance
            </CardTitle>
            <CardDescription>
              Your latest class attendance records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAttendance.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-lg ${
                        record.status === "present"
                          ? "bg-green-100"
                          : record.status === "absent"
                            ? "bg-red-100"
                            : "bg-yellow-100"
                      }`}
                    >
                      {record.status === "present" ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : record.status === "absent" ? (
                        <XCircle className="h-4 w-4 text-red-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{record.course}</p>
                      <p className="text-xs text-gray-500">
                        {record.date} • {record.time}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      record.status === "present"
                        ? "default"
                        : record.status === "absent"
                          ? "destructive"
                          : "secondary"
                    }
                    className="capitalize"
                  >
                    {record.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Attendance Calendar */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Attendance Calendar</CardTitle>
            <CardDescription>
              View your attendance history by date
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              className="rounded-md border"
            />
            <div className="mt-4 p-4 bg-gray-50 rounded-xl">
              <h4 className="font-medium mb-3 text-sm">Legend:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Present</span>
                  </div>
                  <span className="text-xs text-gray-500">Full attendance</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                    <span>Late</span>
                  </div>
                  <span className="text-xs text-gray-500">Arrived late</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span>Absent</span>
                  </div>
                  <span className="text-xs text-gray-500">Did not attend</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Tips */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-900">
            <Info className="mr-2 h-5 w-5" />
            Attendance Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-blue-900">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>
                Minimum 75% attendance is required to be eligible for semester
                exams
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>
                Medical leaves require proper documentation to be submitted
                within 3 days
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>
                Late arrivals beyond 15 minutes may be marked as absent at
                instructor's discretion
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>
                Contact your instructor immediately if you notice any
                discrepancy in attendance records
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
