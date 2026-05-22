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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  AlertTriangle,
  BookOpen,
  TrendingDown,
  Info,
  User,
  GraduationCap,
} from "lucide-react";

// Mock data for student information
const studentInfo = {
  name: "Alex Johnson",
  studentId: "STU-2024-001",
  grade: "10th Grade",
  section: "A",
  rollNumber: "15",
};

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

export default function ParentAttendancePage() {
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  // Calculate overall statistics
  const totalClasses = registeredCourses.reduce(
    (sum, course) => sum + course.totalClasses,
    0
  );
  const totalAttended = registeredCourses.reduce(
    (sum, course) => sum + course.attended,
    0
  );
  const totalAbsent = registeredCourses.reduce(
    (sum, course) => sum + course.absent,
    0
  );
  const totalLate = registeredCourses.reduce(
    (sum, course) => sum + course.late,
    0
  );
  const overallPercentage = (totalAttended / totalClasses) * 100;

  // Identify courses with attendance warnings
  const warningCourses = registeredCourses.filter(
    (course) => course.percentage < 75
  );
  const criticalCourses = registeredCourses.filter(
    (course) => course.percentage < course.requiredPercentage
  );

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
        <h1 className="text-3xl font-bold text-gray-900">
          Student Attendance Overview
        </h1>
        <p className="text-gray-500 mt-1">
          Monitor your child's class attendance and academic compliance
        </p>
      </div>

      {/* Student Information Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center text-indigo-900">
            <User className="mr-2 h-5 w-5" />
            Student Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white bg-opacity-70 p-4 rounded-xl">
              <p className="text-xs text-indigo-700 font-medium mb-1">
                Student Name
              </p>
              <p className="font-semibold text-indigo-900">{studentInfo.name}</p>
            </div>
            <div className="bg-white bg-opacity-70 p-4 rounded-xl">
              <p className="text-xs text-indigo-700 font-medium mb-1">
                Student ID
              </p>
              <p className="font-semibold text-indigo-900">
                {studentInfo.studentId}
              </p>
            </div>
            <div className="bg-white bg-opacity-70 p-4 rounded-xl">
              <p className="text-xs text-indigo-700 font-medium mb-1">Grade</p>
              <p className="font-semibold text-indigo-900">{studentInfo.grade}</p>
            </div>
            <div className="bg-white bg-opacity-70 p-4 rounded-xl">
              <p className="text-xs text-indigo-700 font-medium mb-1">Section</p>
              <p className="font-semibold text-indigo-900">
                {studentInfo.section}
              </p>
            </div>
            <div className="bg-white bg-opacity-70 p-4 rounded-xl">
              <p className="text-xs text-indigo-700 font-medium mb-1">
                Roll Number
              </p>
              <p className="font-semibold text-indigo-900">
                {studentInfo.rollNumber}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Warnings */}
      {criticalCourses.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertTitle className="text-red-900 font-semibold">
            Attendance Alert - Immediate Action Required!
          </AlertTitle>
          <AlertDescription className="text-red-800">
            Your child has {criticalCourses.length} course
            {criticalCourses.length > 1 ? "s" : ""} below the required
            attendance threshold (75%). They may not be eligible to sit for the
            exam if attendance is not improved.
            <div className="mt-2 space-y-1">
              {criticalCourses.map((course) => (
                <div key={course.id} className="font-medium">
                  • {course.name}: {course.percentage.toFixed(1)}% (Requires{" "}
                  {course.requiredPercentage}%)
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm">
              Please ensure your child attends all remaining classes. Contact
              the respective instructors if there are any discrepancies.
            </p>
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
            Your child's attendance in {warningCourses.length} course
            {warningCourses.length > 1 ? "s is" : " is"} approaching the
            minimum requirement. Please encourage regular attendance to avoid
            exam eligibility issues.
          </AlertDescription>
        </Alert>
      )}

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-blue-100 rounded-xl mr-4">
              <GraduationCap className="h-6 w-6 text-blue-600" />
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
            Course-wise Attendance
          </CardTitle>
          <CardDescription>
            Detailed attendance breakdown for each registered course
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
                  course.requiredPercentage
                )}`}
                onClick={() =>
                  setSelectedCourse(
                    selectedCourse === course.id ? null : course.id
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
                          Allowable Absences Left
                        </p>
                        <p className="font-semibold text-lg">
                          {Math.max(
                            0,
                            Math.floor(
                              50 * (1 - course.requiredPercentage / 100) -
                                course.absent
                            )
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
                            : course.percentage >= course.requiredPercentage - 5
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

      {/* Recent Attendance */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Recent Attendance History
          </CardTitle>
          <CardDescription>
            Latest class attendance records for your child
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentAttendance.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
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
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : record.status === "absent" ? (
                      <XCircle className="h-5 w-5 text-red-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{record.course}</p>
                    <p className="text-sm text-gray-500">
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
                  className="capitalize text-sm px-3 py-1"
                >
                  {record.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Important Information */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-900">
            <Info className="mr-2 h-5 w-5" />
            Important Attendance Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-blue-900">
            <li className="flex items-start">
              <span className="mr-2 font-bold">•</span>
              <span>
                A minimum of 75% attendance is mandatory for exam eligibility
                in all courses
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 font-bold">•</span>
              <span>
                Medical leave documentation must be submitted to the school
                office within 3 days
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 font-bold">•</span>
              <span>
                Late arrivals beyond 15 minutes may be marked as absent at the
                instructor's discretion
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 font-bold">•</span>
              <span>
                If you notice any discrepancies in attendance records, please
                contact the respective course instructor or school
                administration immediately
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 font-bold">•</span>
              <span>
                Regular monitoring of attendance helps ensure your child remains
                on track for academic success
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}