'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  AlertCircle,
  Clock,
  BookOpen,
  Search,
  Filter,
  Eye,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Mail,
  User
} from 'lucide-react';

type ProgramId = 'bscs' | 'bsse' | 'mscs';

interface CourseQnA {
  id: number;
  course: string;
  courseCode: string;
  programId: ProgramId;
  programName: string;
  semester: number;
  instructor: string;
  totalStudents: number;
  totalQuestions: number;
  unanswered: number;
  overdue24h: number;
  avgResponseTimeHours: number;
  lastActivity: string;
}

interface QuestionItem {
  id: string;
  course: string;
  courseCode: string;
  programName: string;
  semester: number;
  instructor: string;
  studentName: string;
  studentRoll: string;
  title: string;
  snippet: string;
  status: 'Unanswered' | 'Answered' | 'Overdue';
  createdAt: string;
  ageHours: number;
}

export default function HoDQnaManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<'all' | ProgramId>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'unanswered' | 'overdue'>('all');

  const programs = [
    { id: 'bscs', name: 'BS Computer Science' },
    { id: 'bsse', name: 'BS Software Engineering' },
    { id: 'mscs', name: 'MS Computer Science' }
  ];

  const courseQna: CourseQnA[] = [
    {
      id: 1,
      course: 'Advanced Algorithms',
      courseCode: 'CS-401',
      programId: 'bscs',
      programName: 'BS Computer Science',
      semester: 7,
      instructor: 'Dr. Sarah Johnson',
      totalStudents: 45,
      totalQuestions: 32,
      unanswered: 4,
      overdue24h: 2,
      avgResponseTimeHours: 5.2,
      lastActivity: '2 hours ago'
    },
    {
      id: 2,
      course: 'Database Systems',
      courseCode: 'CS-302',
      programId: 'bscs',
      programName: 'BS Computer Science',
      semester: 5,
      instructor: 'Prof. Michael Chen',
      totalStudents: 50,
      totalQuestions: 41,
      unanswered: 9,
      overdue24h: 5,
      avgResponseTimeHours: 9.8,
      lastActivity: '1 hour ago'
    },
    {
      id: 3,
      course: 'Web Development',
      courseCode: 'CS-205',
      programId: 'bscs',
      programName: 'BS Computer Science',
      semester: 3,
      instructor: 'Dr. Emily Rodriguez',
      totalStudents: 38,
      totalQuestions: 19,
      unanswered: 1,
      overdue24h: 0,
      avgResponseTimeHours: 3.1,
      lastActivity: 'Today'
    },
    {
      id: 4,
      course: 'Machine Learning',
      courseCode: 'CS-599',
      programId: 'mscs',
      programName: 'MS Computer Science',
      semester: 1,
      instructor: 'Dr. James Wilson',
      totalStudents: 25,
      totalQuestions: 27,
      unanswered: 8,
      overdue24h: 6,
      avgResponseTimeHours: 14.4,
      lastActivity: '3 hours ago'
    },
    {
      id: 5,
      course: 'Software Engineering',
      courseCode: 'SE-350',
      programId: 'bsse',
      programName: 'BS Software Engineering',
      semester: 6,
      instructor: 'Prof. David Brown',
      totalStudents: 35,
      totalQuestions: 22,
      unanswered: 6,
      overdue24h: 3,
      avgResponseTimeHours: 11.2,
      lastActivity: 'Yesterday'
    }
  ];

  const recentQuestions: QuestionItem[] = [
    {
      id: 'Q-2024-001',
      course: 'Database Systems',
      courseCode: 'CS-302',
      programName: 'BS Computer Science',
      semester: 5,
      instructor: 'Prof. Michael Chen',
      studentName: 'Ahmed Ali',
      studentRoll: 'BSCS-5B-15',
      title: 'Confusion about 3NF and BCNF',
      snippet: 'I am not sure when to convert a relation from 3NF to BCNF in the given example...',
      status: 'Overdue',
      createdAt: '2024-12-12 10:15',
      ageHours: 30
    },
    {
      id: 'Q-2024-002',
      course: 'Machine Learning',
      courseCode: 'CS-599',
      programName: 'MS Computer Science',
      semester: 1,
      instructor: 'Dr. James Wilson',
      studentName: 'Sara Khan',
      studentRoll: 'MSCS-1-07',
      title: 'Clarification on gradient descent update rule',
      snippet: 'In the lecture notes, the gradient update has a different sign compared to the slides...',
      status: 'Overdue',
      createdAt: '2024-12-12 09:00',
      ageHours: 32
    },
    {
      id: 'Q-2024-003',
      course: 'Advanced Algorithms',
      courseCode: 'CS-401',
      programName: 'BS Computer Science',
      semester: 7,
      instructor: 'Dr. Sarah Johnson',
      studentName: 'Hassan Malik',
      studentRoll: 'BSCS-7A-10',
      title: 'Time complexity of the divide and conquer algorithm',
      snippet: 'For the recurrence relation in the last example, is the complexity O(n log n) or O(n²)...',
      status: 'Unanswered',
      createdAt: '2024-12-13 18:10',
      ageHours: 16
    },
    {
      id: 'Q-2024-004',
      course: 'Web Development',
      courseCode: 'CS-205',
      programName: 'BS Computer Science',
      semester: 3,
      instructor: 'Dr. Emily Rodriguez',
      studentName: 'Fatima Noor',
      studentRoll: 'BSCS-3A-22',
      title: 'Issue with useEffect dependency array',
      snippet: 'When I omit the dependency array, my component re-renders infinitely...',
      status: 'Answered',
      createdAt: '2024-12-13 12:30',
      ageHours: 10
    },
    {
      id: 'Q-2024-005',
      course: 'Software Engineering',
      courseCode: 'SE-350',
      programName: 'BS Software Engineering',
      semester: 6,
      instructor: 'Prof. David Brown',
      studentName: 'Usman Shah',
      studentRoll: 'BSSE-6A-25',
      title: 'Difference between Scrum review and retrospective',
      snippet: 'In our last sprint, we combined both ceremonies; is that recommended practice...',
      status: 'Unanswered',
      createdAt: '2024-12-13 09:45',
      ageHours: 13
    }
  ];

  const totalQuestions = courseQna.reduce((sum, c) => sum + c.totalQuestions, 0);
  const totalUnanswered = courseQna.reduce((sum, c) => sum + c.unanswered, 0);
  const totalOverdue = courseQna.reduce((sum, c) => sum + c.overdue24h, 0);
  const avgResponseTime =
    courseQna.length > 0
      ? (
          courseQna.reduce((sum, c) => sum + c.avgResponseTimeHours, 0) /
          courseQna.length
        ).toFixed(1)
      : '0.0';

  const qnaStats = [
    {
      label: 'Total Questions',
      value: totalQuestions,
      icon: MessageSquare,
      color: 'blue',
      change: '+12 this week'
    },
    {
      label: 'Unanswered',
      value: totalUnanswered,
      icon: AlertCircle,
      color: 'orange',
      change: `${totalOverdue} overdue (24h+)`
    },
    {
      label: 'Avg Response Time',
      value: `${avgResponseTime}h`,
      icon: Clock,
      color: 'purple',
      change: 'Target: under 12h'
    },
    {
      label: 'Courses with Q&A',
      value: courseQna.length,
      icon: BookOpen,
      color: 'green',
      change: 'Active Q&A this term'
    }
  ];

  const getStatusBadgeClass = (status: QuestionItem['status']) => {
    switch (status) {
      case 'Overdue':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'Unanswered':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'Answered':
        return 'bg-green-50 text-green-700 border border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const filteredCourses = courseQna.filter((c) => {
    const matchesProgram =
      selectedProgram === 'all' || c.programId === selectedProgram;

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      c.course.toLowerCase().includes(q) ||
      c.courseCode.toLowerCase().includes(q) ||
      c.instructor.toLowerCase().includes(q) ||
      c.programName.toLowerCase().includes(q);

    return matchesProgram && matchesSearch;
  });

  const filteredQuestions = recentQuestions.filter((q) => {
    const matchesProgram =
      selectedProgram === 'all' ||
      q.programName.toLowerCase().includes(
        selectedProgram === 'bscs'
          ? 'computer science'
          : selectedProgram === 'bsse'
          ? 'software engineering'
          : 'ms computer science'
      );

    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'unanswered' &&
        (q.status === 'Unanswered' || q.status === 'Overdue')) ||
      (selectedStatus === 'overdue' && q.status === 'Overdue');

    const s = searchQuery.toLowerCase();
    const matchesSearch =
      !s ||
      q.title.toLowerCase().includes(s) ||
      q.course.toLowerCase().includes(s) ||
      q.courseCode.toLowerCase().includes(s) ||
      q.instructor.toLowerCase().includes(s) ||
      q.studentName.toLowerCase().includes(s) ||
      q.studentRoll.toLowerCase().includes(s);

    return matchesProgram && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-1">Q&A Management</h1>
            <p className="text-blue-100">
              Monitor student questions on lecture materials and ensure timely faculty responses
            </p>
          </div>
          <Button className="bg-white text-blue-600 hover:bg-blue-50">
            <BarChart3 className="mr-2 h-4 w-4" />
            View Q&A Analytics
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {qnaStats.map((stat, index) => {
          const Icon = stat.icon;
          const isNegative = stat.label === 'Unanswered' || stat.label === 'Avg Response Time';
          return (
            <Card key={index} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 bg-${stat.color}-100 rounded-xl`}>
                    <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                  </div>
                  {isNegative ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-sm text-gray-500 mb-2">{stat.label}</p>
                <p className={`text-xs ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Filter className="h-4 w-4 text-gray-500" />
              <span>Filter Q&A by program and question status</span>
            </div>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <select
                value={selectedProgram}
                onChange={(e) =>
                  setSelectedProgram(e.target.value as 'all' | ProgramId)
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Programs</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) =>
                  setSelectedStatus(e.target.value as 'all' | 'unanswered' | 'overdue')
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Questions</option>
                <option value="unanswered">Unanswered (incl. Overdue)</option>
                <option value="overdue">Overdue (24h+)</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by course, instructor, student, or question title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Course-level Q&A overview */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="mr-2 h-5 w-5" />
            Course Q&A Overview
          </CardTitle>
          <CardDescription>
            See which courses and instructors have the most unanswered and overdue questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCourses.map((c) => {
              const unansweredRate =
                c.totalQuestions === 0
                  ? 0
                  : Math.round((c.unanswered / c.totalQuestions) * 100);
              const overdueRate =
                c.totalQuestions === 0
                  ? 0
                  : Math.round((c.overdue24h / c.totalQuestions) * 100);

              const isRisk =
                c.unanswered > 0 || c.overdue24h > 0 || c.avgResponseTimeHours > 12;

              return (
                <div
                  key={c.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                    <div className="flex gap-4 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {c.course} ({c.courseCode})
                          </h3>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                            {c.programName} • Semester {c.semester}
                          </span>
                          {isRisk && (
                            <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Needs Attention
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          {c.instructor} • {c.totalStudents} students
                        </p>
                        <p className="text-xs text-gray-500">
                          Last activity: {c.lastActivity}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        View Course Q&A
                      </Button>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg text-sm">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Total Questions</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {c.totalQuestions}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Unanswered</p>
                      <p className="text-lg font-semibold text-orange-600">
                        {c.unanswered}{' '}
                        <span className="text-xs text-gray-500">({unansweredRate}%)</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Overdue (24h+)</p>
                      <p className="text-lg font-semibold text-red-600">
                        {c.overdue24h}{' '}
                        <span className="text-xs text-gray-500">({overdueRate}%)</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Avg Response Time</p>
                      <p
                        className={`text-lg font-semibold ${
                          c.avgResponseTimeHours <= 8
                            ? 'text-green-600'
                            : c.avgResponseTimeHours <= 12
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {c.avgResponseTimeHours.toFixed(1)}h
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredCourses.length === 0 && (
              <div className="text-center py-10">
                <BookOpen className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  No courses match the selected filters or search query.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent / critical questions */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="mr-2 h-5 w-5" />
            Recent and Critical Questions
          </CardTitle>
          <CardDescription>
            Student questions needing follow-up, especially overdue and unanswered items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredQuestions.map((q) => (
              <div
                key={q.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                  <div className="flex gap-3 flex-1">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-gray-900">
                          {q.title}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeClass(
                            q.status
                          )}`}
                        >
                          {q.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">
                        {q.course} ({q.courseCode}) • {q.programName} • Semester {q.semester}
                      </p>
                      <p className="text-xs text-gray-500 mb-1">
                        Asked by {q.studentName} ({q.studentRoll}) • {q.instructor}
                      </p>
                      <p className="text-xs text-gray-700 line-clamp-2">{q.snippet}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-start lg:items-end gap-2 text-xs text-gray-600">
                    <p>
                      Created: <span className="font-mono">{q.createdAt}</span>
                    </p>
                    <p>
                      Age:{' '}
                      <span
                        className={`font-semibold ${
                          q.ageHours >= 24 ? 'text-red-600' : 'text-gray-800'
                        }`}
                      >
                        {q.ageHours}h
                      </span>
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        Open Thread
                      </Button>
                      <Button size="sm" variant="outline">
                        <Mail className="h-4 w-4 mr-1" />
                        Remind Instructor
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredQuestions.length === 0 && (
              <div className="text-center py-10">
                <MessageSquare className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  No questions match the selected filters or search query.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
