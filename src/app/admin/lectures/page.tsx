/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Users,
  Clock,
  Video,
  FileText,
  Image,
  Calendar,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Download,
  Upload,
  Play,
  Pause,
  BarChart3
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

// Mock data for courses and lectures
const courses = [
  { id: '1', code: 'MATH101', name: 'Calculus I', teacher: 'Dr. Ahmed Khan', section: 'A', students: 45 },
  { id: '2', code: 'CS101', name: 'Programming Fundamentals', teacher: 'Prof. Hassan Raza', section: 'B', students: 50 },
  { id: '3', code: 'CS201', name: 'Data Structures', teacher: 'Dr. Sara Ali', section: 'A', students: 42 },
  { id: '4', code: 'ENG101', name: 'English Composition', teacher: 'Prof. Fatima Malik', section: 'C', students: 38 }
];

const lectures = [
  {
    id: '1',
    courseId: '1',
    courseCode: 'MATH101',
    courseName: 'Calculus I',
    module: 'Module 1: Derivatives',
    title: 'Introduction to Derivatives',
    description: 'Understanding the concept of derivatives and their applications',
    duration: 45,
    type: 'video',
    status: 'published',
    createdBy: 'Dr. Ahmed Khan',
    createdAt: '2024-12-01',
    views: 125,
    completionRate: 85,
    attachments: 3
  },
  {
    id: '2',
    courseId: '1',
    courseCode: 'MATH101',
    courseName: 'Calculus I',
    module: 'Module 1: Derivatives',
    title: 'Chain Rule and Product Rule',
    description: 'Advanced techniques for finding derivatives',
    duration: 35,
    type: 'video',
    status: 'published',
    createdBy: 'Dr. Ahmed Khan',
    createdAt: '2024-12-03',
    views: 98,
    completionRate: 78,
    attachments: 2
  },
  {
    id: '3',
    courseId: '2',
    courseCode: 'CS101',
    courseName: 'Programming Fundamentals',
    module: 'Module 2: Functions',
    title: 'Function Basics in C++',
    description: 'Learn how to write and use functions effectively',
    duration: 40,
    type: 'presentation',
    status: 'published',
    createdBy: 'Prof. Hassan Raza',
    createdAt: '2024-12-05',
    views: 142,
    completionRate: 92,
    attachments: 5
  },
  {
    id: '4',
    courseId: '2',
    courseCode: 'CS101',
    courseName: 'Programming Fundamentals',
    module: 'Module 3: Arrays',
    title: 'Working with Arrays',
    description: 'Understanding arrays and their manipulation',
    duration: 30,
    type: 'document',
    status: 'draft',
    createdBy: 'Prof. Hassan Raza',
    createdAt: '2024-12-10',
    views: 0,
    completionRate: 0,
    attachments: 1
  },
  {
    id: '5',
    courseId: '3',
    courseCode: 'CS201',
    courseName: 'Data Structures',
    module: 'Module 1: Linked Lists',
    title: 'Introduction to Linked Lists',
    description: 'Basic concepts and implementation of linked lists',
    duration: 50,
    type: 'video',
    status: 'published',
    createdBy: 'Dr. Sara Ali',
    createdAt: '2024-12-08',
    views: 87,
    completionRate: 72,
    attachments: 4
  }
];

export default function AdminLecturesPage() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'lectures' | 'create' | 'edit'>('dashboard');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [selectedLecture, setSelectedLecture] = useState<any>(null);

  // Stats
  const totalLectures = lectures.length;
  const publishedLectures = lectures.filter(l => l.status === 'published').length;
  const draftLectures = lectures.filter(l => l.status === 'draft').length;
  const totalViews = lectures.reduce((sum, l) => sum + l.views, 0);
  const avgCompletionRate = Math.round(lectures.reduce((sum, l) => sum + l.completionRate, 0) / lectures.length);

  const filteredLectures = lectures.filter(lecture => {
    const matchesSearch = lecture.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lecture.courseCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || lecture.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleViewLectures = (course: any) => {
    setSelectedCourse(course);
    setCurrentView('lectures');
  };

  const handleCreateLecture = () => {
    setCurrentView('create');
  };

  const handleEditLecture = (lecture: any) => {
    setSelectedLecture(lecture);
    setCurrentView('edit');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedCourse(null);
    setSelectedLecture(null);
  };

  // Create/Edit Lecture Form
  if (currentView === 'create' || currentView === 'edit') {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={handleBackToDashboard} size="sm">
            <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
            Back
          </Button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="text-2xl font-bold text-gray-900">
            {currentView === 'create' ? 'Create New Lecture' : 'Edit Lecture'}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Lecture Details</CardTitle>
                <CardDescription>Fill in the lecture information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="course">Course</Label>
                    <select 
                      id="course" 
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select course</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.code} - {course.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="module">Module</Label>
                    <Input id="module" placeholder="e.g., Module 1: Introduction" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Lecture Title</Label>
                  <Input 
                    id="title" 
                    placeholder="Enter lecture title"
                    defaultValue={selectedLecture?.title}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Brief description of the lecture content"
                    rows={3}
                    defaultValue={selectedLecture?.description}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input 
                      id="duration" 
                      type="number" 
                      placeholder="45"
                      defaultValue={selectedLecture?.duration}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Content Type</Label>
                    <select 
                      id="type" 
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue={selectedLecture?.type}
                    >
                      <option value="video">Video</option>
                      <option value="presentation">Presentation</option>
                      <option value="document">Document</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Learning Outcomes</Label>
                  <Textarea 
                    placeholder="Enter key learning outcomes (one per line)"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Content & Media</CardTitle>
                <CardDescription>Upload lecture materials</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    Video, PDF, PowerPoint (Max 500MB)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Additional Attachments</Label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-blue-400 transition-colors cursor-pointer">
                    <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-600">Upload supporting materials</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Publishing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select 
                    id="status" 
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={selectedLecture?.status || 'draft'}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduledDate">Schedule Date (Optional)</Label>
                  <Input id="scheduledDate" type="datetime-local" />
                </div>

                <div className="pt-4 border-t space-y-2">
                  <Button className="w-full">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save & Publish
                  </Button>
                  <Button variant="outline" className="w-full">
                    Save as Draft
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-blue-50">
              <CardContent className="p-4">
                <h4 className="font-semibold text-sm mb-2 text-blue-900">💡 Tips</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Keep micro-lectures between 2-5 minutes</li>
                  <li>• Use clear learning outcomes</li>
                  <li>• Add relevant attachments</li>
                  <li>• Preview before publishing</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Lectures List View
  if (currentView === 'lectures' && selectedCourse) {
    const courseLectures = lectures.filter(l => l.courseId === selectedCourse.id);
    
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={handleBackToDashboard} size="sm">
              <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
              Back
            </Button>
            <div className="h-6 w-px bg-gray-300"></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedCourse.code} - {selectedCourse.name}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {selectedCourse.teacher} • Section {selectedCourse.section}
              </p>
            </div>
          </div>
          <Button onClick={handleCreateLecture}>
            <Plus className="h-4 w-4 mr-2" />
            Create Lecture
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg">
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-blue-100 rounded-xl mr-4">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{courseLectures.length}</p>
                <p className="text-sm text-gray-500">Total Lectures</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-green-100 rounded-xl mr-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {courseLectures.filter(l => l.status === 'published').length}
                </p>
                <p className="text-sm text-gray-500">Published</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-orange-100 rounded-xl mr-4">
                <Eye className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {courseLectures.reduce((sum, l) => sum + l.views, 0)}
                </p>
                <p className="text-sm text-gray-500">Total Views</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-purple-100 rounded-xl mr-4">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Math.round(courseLectures.reduce((sum, l) => sum + l.completionRate, 0) / courseLectures.length)}%
                </p>
                <p className="text-sm text-gray-500">Avg Completion</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Lectures</CardTitle>
                <CardDescription>Manage course lectures and materials</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {courseLectures.map((lecture) => (
                <div 
                  key={lecture.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      lecture.type === 'video' ? 'bg-red-100' :
                      lecture.type === 'presentation' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      {lecture.type === 'video' ? <Video className="h-6 w-6 text-red-600" /> :
                       lecture.type === 'presentation' ? <Play className="h-6 w-6 text-blue-600" /> :
                       <FileText className="h-6 w-6 text-green-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold">{lecture.title}</h3>
                        <Badge variant={lecture.status === 'published' ? 'default' : 'secondary'}>
                          {lecture.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{lecture.module}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {lecture.duration} min
                        </span>
                        <span className="flex items-center">
                          <Eye className="h-3 w-3 mr-1" />
                          {lecture.views} views
                        </span>
                        <span className="flex items-center">
                          <FileText className="h-3 w-3 mr-1" />
                          {lecture.attachments} files
                        </span>
                        <span className="flex items-center">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {lecture.completionRate}% completion
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEditLecture(lecture)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
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

  // Main Dashboard
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lectures Management</h1>
          <p className="text-gray-500 mt-1">Manage all lectures across courses</p>
        </div>
        <Button onClick={handleCreateLecture}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Lecture
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-blue-100 rounded-xl mr-4">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalLectures}</p>
              <p className="text-sm text-gray-500">Total Lectures</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-green-100 rounded-xl mr-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{publishedLectures}</p>
              <p className="text-sm text-gray-500">Published</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-orange-100 rounded-xl mr-4">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{draftLectures}</p>
              <p className="text-sm text-gray-500">Drafts</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-purple-100 rounded-xl mr-4">
              <Eye className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalViews}</p>
              <p className="text-sm text-gray-500">Total Views</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-indigo-100 rounded-xl mr-4">
              <TrendingUp className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgCompletionRate}%</p>
              <p className="text-sm text-gray-500">Avg Completion</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>All Courses</CardTitle>
          <CardDescription>Select a course to manage its lectures</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {courses.map((course) => {
              const courseLectureCount = lectures.filter(l => l.courseId === course.id).length;
              const publishedCount = lectures.filter(l => l.courseId === course.id && l.status === 'published').length;
              
              return (
                <Card 
                  key={course.id}
                  className="border-2 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => handleViewLectures(course)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                            <BookOpen className="h-5 w-5 text-blue-600" />
                          </div>
                          <Badge variant="outline">{course.code}</Badge>
                        </div>
                        <h3 className="text-lg font-semibold mb-1">{course.name}</h3>
                        <p className="text-sm text-gray-500">Section {course.section}</p>
                        <p className="text-xs text-gray-400 mt-1">{course.teacher}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-4 border-t">
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600">{courseLectureCount}</div>
                        <div className="text-xs text-gray-500">Lectures</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-600">{publishedCount}</div>
                        <div className="text-xs text-gray-500">Published</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-purple-600">{course.students}</div>
                        <div className="text-xs text-gray-500">Students</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Lectures</CardTitle>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lectures.slice(0, 5).map((lecture) => (
                <div key={lecture.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      lecture.type === 'video' ? 'bg-red-100' :
                      lecture.type === 'presentation' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      {lecture.type === 'video' ? <Video className="h-5 w-5 text-red-600" /> :
                       lecture.type === 'presentation' ? <Play className="h-5 w-5 text-blue-600" /> :
                       <FileText className="h-5 w-5 text-green-600" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{lecture.title}</p>
                      <p className="text-xs text-gray-500">{lecture.courseCode} - {lecture.courseName}</p>
                    </div>
                  </div>
                  <Badge variant={lecture.status === 'published' ? 'default' : 'secondary'}>
                    {lecture.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span>Performance Analytics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-green-900">High Engagement Rate</span>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-sm text-green-700">
                  Average lecture completion rate is {avgCompletionRate}%
                </p>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Content Published</span>
                  <span className="font-semibold text-blue-600">
                    {publishedLectures}/{totalLectures}
                  </span>
                </div>
                <Progress value={(publishedLectures / totalLectures) * 100} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Overall Engagement</span>
                  <span className="font-semibold text-purple-600">{avgCompletionRate}%</span>
                </div>
                <Progress value={avgCompletionRate} className="h-2" />
              </div>

              <div className="pt-4 border-t">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{totalViews}</p>
                    <p className="text-xs text-gray-500">Total Views</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {courses.reduce((sum, c) => sum + c.students, 0)}
                    </p>
                    <p className="text-xs text-gray-500">Total Students</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Lectures</CardTitle>
              <CardDescription>Browse and manage all lectures across courses</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search lectures..." 
                  className="pl-10 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select 
                className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredLectures.map((lecture) => (
              <div 
                key={lecture.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    lecture.type === 'video' ? 'bg-red-100' :
                    lecture.type === 'presentation' ? 'bg-blue-100' : 'bg-green-100'
                  }`}>
                    {lecture.type === 'video' ? <Video className="h-6 w-6 text-red-600" /> :
                     lecture.type === 'presentation' ? <Play className="h-6 w-6 text-blue-600" /> :
                     <FileText className="h-6 w-6 text-green-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold">{lecture.title}</h3>
                      <Badge variant={lecture.status === 'published' ? 'default' : 'secondary'}>
                        {lecture.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {lecture.courseCode} - {lecture.courseName} • {lecture.module}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {lecture.duration} min
                      </span>
                      <span className="flex items-center">
                        <Eye className="h-3 w-3 mr-1" />
                        {lecture.views} views
                      </span>
                      <span className="flex items-center">
                        <FileText className="h-3 w-3 mr-1" />
                        {lecture.attachments} files
                      </span>
                      <span className="flex items-center">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {lecture.completionRate}% completion
                      </span>
                      <span className="flex items-center text-gray-400">
                        By {lecture.createdBy}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEditLecture(lecture)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Content Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="flex items-center">
                    <Video className="h-4 w-4 mr-2 text-red-600" />
                    Videos
                  </span>
                  <span className="font-semibold">
                    {lectures.filter(l => l.type === 'video').length}
                  </span>
                </div>
                <Progress 
                  value={(lectures.filter(l => l.type === 'video').length / lectures.length) * 100} 
                  className="h-2" 
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="flex items-center">
                    <Play className="h-4 w-4 mr-2 text-blue-600" />
                    Presentations
                  </span>
                  <span className="font-semibold">
                    {lectures.filter(l => l.type === 'presentation').length}
                  </span>
                </div>
                <Progress 
                  value={(lectures.filter(l => l.type === 'presentation').length / lectures.length) * 100} 
                  className="h-2" 
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-green-600" />
                    Documents
                  </span>
                  <span className="font-semibold">
                    {lectures.filter(l => l.type === 'document').length}
                  </span>
                </div>
                <Progress 
                  value={(lectures.filter(l => l.type === 'document').length / lectures.length) * 100} 
                  className="h-2" 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Top Instructors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'Dr. Ahmed Khan', lectures: 2, views: 223 },
                { name: 'Prof. Hassan Raza', lectures: 2, views: 142 },
                { name: 'Dr. Sara Ali', lectures: 1, views: 87 }
              ].map((instructor, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-100 text-gray-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{instructor.name}</p>
                      <p className="text-xs text-gray-500">{instructor.lectures} lectures</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-blue-600">{instructor.views}</p>
                    <p className="text-xs text-gray-500">views</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 pb-3 border-b">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">New lecture published</p>
                  <p className="text-xs text-gray-500 truncate">
                    Function Basics in C++ by Prof. Hassan Raza
                  </p>
                  <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 pb-3 border-b">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Edit className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Lecture updated</p>
                  <p className="text-xs text-gray-500 truncate">
                    Chain Rule edited by Dr. Ahmed Khan
                  </p>
                  <p className="text-xs text-gray-400 mt-1">5 hours ago</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Upload className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Draft created</p>
                  <p className="text-xs text-gray-500 truncate">
                    Working with Arrays by Prof. Hassan Raza
                  </p>
                  <p className="text-xs text-gray-400 mt-1">1 day ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Engagement Trends</CardTitle>
            <CardDescription>Last 7 days performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                  <div key={day} className="text-center">
                    <div 
                      className="h-20 bg-blue-100 rounded-lg mb-1 flex items-end justify-center pb-2"
                      style={{ 
                        height: `${40 + Math.random() * 60}px`,
                        backgroundColor: `rgba(59, 130, 246, ${0.3 + Math.random() * 0.5})`
                      }}
                    >
                      <span className="text-xs font-semibold text-blue-900">
                        {Math.floor(50 + Math.random() * 50)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{day}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">452</p>
                  <p className="text-xs text-gray-500">Total Views</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">83%</p>
                  <p className="text-xs text-gray-500">Avg Completion</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">+12%</p>
                  <p className="text-xs text-gray-500">Growth</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>System Insights</CardTitle>
            <CardDescription>Platform health and recommendations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-green-900 mb-1">
                    High Quality Content
                  </p>
                  <p className="text-xs text-green-700">
                    {avgCompletionRate}% average completion rate indicates excellent content quality
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-3">
                <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-blue-900 mb-1">
                    Growing Engagement
                  </p>
                  <p className="text-xs text-blue-700">
                    Lecture views increased by 15% compared to last week
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-orange-900 mb-1">
                    Pending Review
                  </p>
                  <p className="text-xs text-orange-700">
                    {draftLectures} draft lectures waiting to be published
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-start space-x-3">
                <Users className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-purple-900 mb-1">
                    Active Learning
                  </p>
                  <p className="text-xs text-purple-700">
                    {courses.reduce((sum, c) => sum + c.students, 0)} students actively engaged with lectures
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2">📊 Generate Reports</h3>
              <p className="text-white/90 mb-4">
                Export detailed analytics and insights for institutional review
              </p>
              <div className="flex items-center space-x-3">
                <Button variant="secondary">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
                <Button variant="outline" className="bg-white/10 text-white border-white/30 hover:bg-white/20">
                  View Analytics
                </Button>
              </div>
            </div>
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-2">
                <BarChart3 className="h-12 w-12 text-white" />
              </div>
              <p className="text-sm text-white/80">Real-time Data</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}