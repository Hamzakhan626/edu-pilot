'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calender';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock,
  TrendingUp,
  Calendar as CalendarIcon,
  UserCheck
} from 'lucide-react';
import { mockAttendance, mockStudents } from '@/lib/mock-data';
import { getCurrentUser } from '@/lib/auth';
import type { UserRole } from '@/lib/auth';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole; // ← was 'student' | 'teacher' | 'admin', now uses the full UserRole from auth
}

interface AttendanceRecord {
  id: string;
  class: string;
  date: string;
  time: string;
  status: 'present' | 'absent' | 'late';
}

interface Student {
  id: string;
  name: string;
  email: string;
  attendance: number;
}

export default function AttendancePage() {
  const [user, setUser] = useState<User | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser({
        id:    currentUser.id,
        name:  currentUser.name,
        email: currentUser.email,
        role:  currentUser.role,
      });
    } else {
      setUser(null);
    }
  }, []);

  if (!user) return <div>Loading...</div>;

  // Transform mock data to include required id field
  const attendanceRecords: AttendanceRecord[] = mockAttendance.map((record, index) => ({
    id: `attendance-${index}`,
    class: record.class,
    date: record.date,
    time: record.time,
    status: record.status as 'present' | 'absent' | 'late'
  }));

  const students: Student[] = mockStudents;

  const presentCount = attendanceRecords.filter(a => a.status === 'present').length;
  const absentCount = attendanceRecords.filter(a => a.status === 'absent').length;
  const totalClasses = attendanceRecords.length;
  const attendanceRate = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
  };

  // Student View
  if (user.role === 'student') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-500 mt-1">Track your class attendance and compliance</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg">
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-green-100 rounded-xl mr-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{attendanceRate.toFixed(1)}%</p>
                <p className="text-sm text-gray-500">Overall Rate</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-blue-100 rounded-xl mr-4">
                <UserCheck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{presentCount}</p>
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
                <p className="text-2xl font-bold">{absentCount}</p>
                <p className="text-sm text-gray-500">Classes Missed</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-purple-100 rounded-xl mr-4">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalClasses}</p>
                <p className="text-sm text-gray-500">Total Classes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance History */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarIcon className="mr-2 h-5 w-5" />
                Recent Attendance
              </CardTitle>
              <CardDescription>Your attendance record for recent classes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {attendanceRecords.slice(0, 6).map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        record.status === 'present' ? 'bg-green-100' : 
                        record.status === 'absent' ? 'bg-red-100' : 'bg-yellow-100'
                      }`}>
                        {record.status === 'present' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : record.status === 'absent' ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{record.class}</p>
                        <p className="text-sm text-gray-500">{record.date} • {record.time}</p>
                      </div>
                    </div>
                    <Badge variant={
                      record.status === 'present' ? 'default' : 
                      record.status === 'absent' ? 'destructive' : 'secondary'
                    }>
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
              <CardDescription>View your attendance by date</CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                className="rounded-md border"
              />
              <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                <h4 className="font-medium mb-2">Legend:</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Present</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span>Absent</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                    <span>Late</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Compliance Score */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Compliance Score
            </CardTitle>
            <CardDescription>Your attendance performance by subject</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {['Advanced Mathematics', 'Physics Fundamentals', 'Chemistry Lab'].map((subject, index) => {
                const rate = [95, 87, 92][index];
                return (
                  <div key={`subject-${index}`} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{subject}</span>
                      <span>{rate}%</span>
                    </div>
                    <Progress value={rate} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Teacher/Admin View
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-gray-500 mt-1">Track and manage student attendance</p>
        </div>
        <Button>
          <Users className="mr-2 h-4 w-4" />
          Take Attendance
        </Button>
      </div>

      {/* Class Attendance Overview */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Today&apos;s Classes</CardTitle>
          <CardDescription>Mark attendance for your classes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {students.map((student) => (
              <div key={student.id} className="flex items-center justify-between p-4 border rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="font-medium text-sm">
                      {student.name.split(' ').map((n: string) => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-gray-500">Current attendance: {student.attendance}%</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <XCircle className="h-4 w-4 text-red-600" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}