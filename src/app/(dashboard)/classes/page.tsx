/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  BookOpen, 
  Users, 
  Clock, 
  Play,
  CheckCircle,
  Calendar,
  Trophy,
  MessageSquare,
  ClipboardList,
  Brain
} from 'lucide-react';
import { mockClasses } from '@/lib/mock-data';
import { getCurrentUser } from '@/lib/auth';
import type { UserRole } from '@/lib/auth';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole; // ← fixed: was 'student' | 'teacher' | 'admin'
}

interface ClassItem {
  id: string;
  name: string;
  teacher: string;
  students: number;
  progress: number;
  color: string;
}

interface Lesson {
  id: string;
  title: string;
  duration: string;
  status: 'completed' | 'current' | 'upcoming';
}

interface Quiz {
  id: string;
  title: string;
  score: number | null;
  maxScore: number;
  status: 'completed' | 'upcoming';
  date?: string;
}

interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'submitted';
}

const mockLessons: Lesson[] = [
  { id: '1', title: 'Introduction to Derivatives', duration: '45 min', status: 'completed' },
  { id: '2', title: 'Chain Rule', duration: '30 min', status: 'completed' },
  { id: '3', title: 'Integration Basics', duration: '50 min', status: 'current' },
  { id: '4', title: 'Integration by Parts', duration: '40 min', status: 'upcoming' }
];

const mockClassQuizzes: Quiz[] = [
  { id: '1', title: 'Derivatives Quiz', score: 85, maxScore: 100, status: 'completed' },
  { id: '2', title: 'Integration Test', score: null, maxScore: 100, status: 'upcoming', date: '2025-01-20' }
];

const mockClassAssignments: Assignment[] = [
  { id: '1', title: 'Problem Set 1', dueDate: '2025-01-25', status: 'pending' },
  { id: '2', title: 'Calculus Project', dueDate: '2025-01-30', status: 'submitted' }
];

export default function ClassesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassItem>(mockClasses[0]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Classes</h1>
          <p className="text-gray-500 mt-1">Manage your classes and course content</p>
        </div>
        {user.role === 'teacher' && (
          <Button>
            <BookOpen className="mr-2 h-4 w-4" />
            Create New Class
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Class List */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="font-semibold text-gray-900 mb-4">Your Classes</h2>
          {mockClasses.map((classItem: ClassItem) => (
            <Card 
              key={classItem.id}
              className={`cursor-pointer border-2 transition-colors ${
                selectedClass.id === classItem.id 
                  ? 'border-primary shadow-lg' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedClass(classItem)}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${classItem.color}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{classItem.name}</p>
                    <p className="text-xs text-gray-500">{classItem.students} students</p>
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={classItem.progress} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1">{classItem.progress}% complete</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Class Details */}
        <div className="lg:col-span-3">
          <Card className="border-0 shadow-lg mb-6">
            <CardHeader className={`${selectedClass.color} text-white rounded-t-lg`}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{selectedClass.name}</CardTitle>
                  <CardDescription className="text-white/80">
                    Teacher: {selectedClass.teacher}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{selectedClass.students}</div>
                  <div className="text-white/80 text-sm">Students</div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Class Tabs */}
          <Tabs defaultValue="lessons" className="space-y-6">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="lessons" className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Lessons</span>
              </TabsTrigger>
              <TabsTrigger value="quizzes" className="flex items-center space-x-2">
                <Brain className="h-4 w-4" />
                <span className="hidden sm:inline">Quizzes</span>
              </TabsTrigger>
              <TabsTrigger value="assignments" className="flex items-center space-x-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Assignments</span>
              </TabsTrigger>
              <TabsTrigger value="attendance" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Attendance</span>
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Chat</span>
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="flex items-center space-x-2">
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">Leaderboard</span>
              </TabsTrigger>
            </TabsList>

            {/* Lessons Tab */}
            <TabsContent value="lessons" className="space-y-4">
              {mockLessons.map((lesson) => (
                <Card key={lesson.id} className="border-0 shadow-lg">
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl ${
                        lesson.status === 'completed' ? 'bg-green-100' :
                        lesson.status === 'current' ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        {lesson.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Play className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{lesson.title}</h3>
                        <p className="text-sm text-gray-500 flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {lesson.duration}
                        </p>
                      </div>
                    </div>
                    <Badge variant={
                      lesson.status === 'completed' ? 'default' :
                      lesson.status === 'current' ? 'secondary' : 'outline'
                    }>
                      {lesson.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Quizzes Tab */}
            <TabsContent value="quizzes" className="space-y-4">
              {mockClassQuizzes.map((quiz) => (
                <Card key={quiz.id} className="border-0 shadow-lg">
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-purple-100 rounded-xl">
                        <Brain className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{quiz.title}</h3>
                        {quiz.score !== null ? (
                          <p className="text-sm text-gray-500">Score: {quiz.score}/{quiz.maxScore}</p>
                        ) : (
                          <p className="text-sm text-gray-500">Due: {quiz.date}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {quiz.status === 'completed' ? (
                        <Badge variant="default">Completed</Badge>
                      ) : (
                        <Button>Take Quiz</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Assignments Tab */}
            <TabsContent value="assignments" className="space-y-4">
              {mockClassAssignments.map((assignment) => (
                <Card key={assignment.id} className="border-0 shadow-lg">
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-orange-100 rounded-xl">
                        <ClipboardList className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{assignment.title}</h3>
                        <p className="text-sm text-gray-500">Due: {assignment.dueDate}</p>
                      </div>
                    </div>
                    <Badge variant={assignment.status === 'submitted' ? 'default' : 'destructive'}>
                      {assignment.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="attendance">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Attendance tracking coming soon</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="chat">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Class chat coming soon</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="leaderboard">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Leaderboard coming soon</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}