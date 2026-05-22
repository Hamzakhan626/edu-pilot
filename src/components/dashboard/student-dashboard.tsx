/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Flame, Clock, BookOpen, Target, CreditCard, CheckCircle, AlertCircle, Brain, TrendingUp, Zap } from 'lucide-react';
import { mockAssignments, mockQuizzes, mockAttendance, mockFees } from '@/lib/mock-data';

export function StudentDashboard() {
  const upcomingTasks = mockAssignments.filter(a => a.status === 'pending').slice(0, 3);
  const attendanceRate = (mockAttendance.filter(a => a.status === 'present').length / mockAttendance.length) * 100;
  
  const masteryTopics = [
    { name: 'Mathematics', mastery: 78 },
    { name: 'Physics', mastery: 65 },
    { name: 'Chemistry', mastery: 82 },
  ];

  const recommendedLesson = {
    title: 'Advanced Calculus - Integration',
    course: 'Mathematics',
    estimatedTime: '15 mins',
    difficulty: 'Intermediate'
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome back, Alex! 🎓</h1>
        <p className="text-blue-100">Ready to continue your learning journey?</p>
      </div>

      {/* Quick Stats - Student Focus */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-orange-100 rounded-xl mr-4">
              <Flame className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">12</p>
              <p className="text-sm text-gray-500">Day Streak</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-green-100 rounded-xl mr-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{attendanceRate.toFixed(0)}%</p>
              <p className="text-sm text-gray-500">Attendance</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-blue-100 rounded-xl mr-4">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{upcomingTasks.length}</p>
              <p className="text-sm text-gray-500">Pending Tasks</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-purple-100 rounded-xl mr-4">
              <CreditCard className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">Rs{mockFees.pending.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Fees Due</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recommended Lesson for Student */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
              Recommended For You
            </CardTitle>
            <CardDescription>Based on your learning progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-4 rounded-xl">
              <h3 className="text-lg font-semibold mb-2">{recommendedLesson.title}</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline">{recommendedLesson.course}</Badge>
                <Badge variant="outline" className="bg-blue-50">{recommendedLesson.estimatedTime}</Badge>
                <Badge variant="outline" className="bg-amber-50">{recommendedLesson.difficulty}</Badge>
              </div>
              <Button className="w-full">Start Learning</Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Quiz */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="mr-2 h-5 w-5 text-yellow-600" />
              Daily Challenge
            </CardTitle>
            <CardDescription>Maintain your streak with today's quiz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Today's Quiz</h3>
              <p className="text-gray-600 mb-4">5 questions • 3 minutes</p>
              <Button className="w-full">Start Quiz</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="mr-2 h-5 w-5" />
            Topic Mastery
          </CardTitle>
          <CardDescription>Your learning progress across subjects</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {masteryTopics.map((topic) => (
            <div key={topic.name}>
              <div className="flex justify-between mb-2">
                <p className="font-medium text-sm">{topic.name}</p>
                <p className="text-sm font-semibold text-blue-600">{topic.mastery}%</p>
              </div>
              <Progress value={topic.mastery} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Tasks */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Upcoming Tasks
            </CardTitle>
            <CardDescription>Don't miss these important deadlines</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-gray-500">{task.class}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {new Date(task.dueDate).toLocaleDateString()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="mr-2 h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest academic activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Submitted Lab Report</p>
                  <p className="text-sm text-gray-500">Physics • 2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Brain className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Completed Quiz</p>
                  <p className="text-sm text-gray-500">Mathematics • 1 day ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">Attended Class</p>
                  <p className="text-sm text-gray-500">Chemistry • 1 day ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="mr-2 h-5 w-5 text-yellow-600" />
            Achievements & Badges
          </CardTitle>
          <CardDescription>Your recent accomplishments and milestones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {['Early Bird', 'Quiz Master', 'Perfect Week'].map((badge) => (
              <div key={badge} className="text-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Trophy className="h-6 w-6 text-yellow-600" />
                </div>
                <p className="font-medium text-sm">{badge}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
