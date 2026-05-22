/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Users,
  Clock,
  Video,
  FileText,
  Image as ImageIcon,
  Calendar,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Download,
  Upload,
  Play,
  BarChart3,
  Sparkles,
  Lightbulb,
  Star,
  MessageSquare,
  Share2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';


interface Lecture {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  module: string;
  title: string;
  description: string;
  duration: number;
  type: string;
  status: string;
  createdAt: string;
  views: number;
  completionRate: number;
  avgQuizScore: number;
  attachments: number;
  studentFeedback: number;
  contentUrl?: string;
  learningOutcomes?: string[];
  tags?: string[];
}

interface Course {
  id: string;
  code: string;
  name: string;
  section: string;
  students: number;
  lecturesCount: number;
  upcomingClass: string;
}

// Mock data for teacher's courses
const teacherCourses = [
  { 
    id: '1', 
    code: 'MATH101', 
    name: 'Calculus I', 
    section: 'A', 
    students: 45,
    lecturesCount: 12,
    upcomingClass: '2024-12-15T10:00:00'
  },
  { 
    id: '2', 
    code: 'MATH102', 
    name: 'Calculus II', 
    section: 'B', 
    students: 38,
    lecturesCount: 10,
    upcomingClass: '2024-12-16T14:00:00'
  }
];

const myLectures = [
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
    createdAt: '2024-12-01',
    views: 125,
    completionRate: 85,
    avgQuizScore: 82,
    attachments: 3,
    studentFeedback: 4.5
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
    createdAt: '2024-12-03',
    views: 98,
    completionRate: 78,
    avgQuizScore: 75,
    attachments: 2,
    studentFeedback: 4.2
  },
  {
    id: '3',
    courseId: '1',
    courseCode: 'MATH101',
    courseName: 'Calculus I',
    module: 'Module 2: Integration',
    title: 'Introduction to Integration',
    description: 'Basic concepts of integration and antiderivatives',
    duration: 40,
    type: 'presentation',
    status: 'draft',
    createdAt: '2024-12-10',
    views: 0,
    completionRate: 0,
    avgQuizScore: 0,
    attachments: 1,
    studentFeedback: 0
  },
  {
    id: '4',
    courseId: '2',
    courseCode: 'MATH102',
    courseName: 'Calculus II',
    module: 'Module 1: Advanced Integration',
    title: 'Integration by Parts',
    description: 'Learn the technique of integration by parts',
    duration: 50,
    type: 'video',
    status: 'published',
    createdAt: '2024-12-08',
    views: 87,
    completionRate: 72,
    avgQuizScore: 78,
    attachments: 4,
    studentFeedback: 4.7
  }
];

export default function TeacherLecturesPage() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'course-lectures' | 'create' | 'edit' | 'ai-assistant'>('dashboard');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedLecture, setSelectedLecture] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  
const [teacherCourses, setTeacherCourses] = useState<Course[]>([]);
const [myLectures, setMyLectures] = useState<Lecture[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [currentUser, setCurrentUser] = useState<any>(null);

  // Stats
  const totalLectures = myLectures.length;
  const publishedLectures = myLectures.filter(l => l.status === 'published').length;
  const draftLectures = myLectures.filter(l => l.status === 'draft').length;
  const totalViews = myLectures.reduce((sum, l) => sum + l.views, 0);
  const avgCompletionRate = Math.round(
    myLectures.filter(l => l.status === 'published').reduce((sum, l) => sum + l.completionRate, 0) / 
    publishedLectures
  );

  const handleViewCourseLectures = (course: any) => {
    setSelectedCourse(course);
    setCurrentView('course-lectures');
  };

  const handleCreateLecture = () => {
    setCurrentView('create');
  };

  const handleEditLecture = (lecture: any) => {
    setSelectedLecture(lecture);
    setCurrentView('edit');
  };

  const handleAIAssistant = () => {
    setCurrentView('ai-assistant');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedCourse(null);
    setSelectedLecture(null);
  };

  const fetchTeacherData = async () => {
  try {
    setLoading(true);
    setError(null);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) {
      setError('No authenticated user found');
      return;
    }

    setCurrentUser(user);

    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select(`id, code, name, section, created_at`)
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    if (coursesError) throw coursesError;

    const coursesWithEnrollments = await Promise.all(
      (coursesData || []).map(async (course) => {
        const { count } = await supabase
          .from('enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id);

        return {
          id: course.id,
          code: course.code,
          name: course.name,
          section: course.section || 'A',
          students: count || 0,
          lecturesCount: 0,
          upcomingClass: new Date().toISOString()
        };
      })
    );

    setTeacherCourses(coursesWithEnrollments);

    const { data: lecturesData, error: lecturesError } = await supabase
      .from('lectures')
      .select(`
        id,
        course_id,
        title,
        description,
        module_name,
        duration_minutes,
        content_type,
        status,
        content_url,
        learning_outcomes,
        tags,
        average_rating,
        created_at,
        courses ( id, code, name, teacher_id )
      `)
      .eq('courses.teacher_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (lecturesError) throw lecturesError;

    const lecturesWithAnalytics = await Promise.all(
      (lecturesData || []).map(async (lecture) => {
        const { data: analyticsData } = await supabase
          .from('lecture_analytics')
          .select('total_views, avg_completion_rate, avg_quiz_score')
          .eq('lecture_id', lecture.id)
          .single();

        return {
          id: lecture.id,
          courseId: lecture.course_id,
          courseCode: lecture.courses[0].code,
          courseName: lecture.courses[0].name,
          module: lecture.module_name || 'General',
          title: lecture.title,
          description: lecture.description || '',
          duration: lecture.duration_minutes || 0,
          type: lecture.content_type || 'video',
          status: lecture.status,
          createdAt: lecture.created_at,
          views: analyticsData?.total_views || 0,
          completionRate: analyticsData?.avg_completion_rate || 0,
          avgQuizScore: analyticsData?.avg_quiz_score || 0,
          attachments: 0,
          studentFeedback: lecture.average_rating || 0,
          contentUrl: lecture.content_url || '',
          learningOutcomes: lecture.learning_outcomes || [],
          tags: lecture.tags || []
        };
      })
    );

    setMyLectures(lecturesWithAnalytics);

    setTeacherCourses(prev =>
      prev.map(course => ({
        ...course,
        lecturesCount: lecturesWithAnalytics.filter(l => l.courseId === course.id).length
      }))
    );

  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
useEffect(() => {
  fetchTeacherData();
}, []);


  // AI Assistant View
  if (currentView === 'ai-assistant') {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={handleBackToDashboard} size="sm">
            <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
            Back
          </Button>
          <div className="h-6 w-px bg-gray-300"></div>
          <div className="flex items-center space-x-2">
            <Sparkles className="h-6 w-6 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">AI Lecture Assistant</h1>
          </div>
        </div>

        <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-white/20 rounded-xl">
                <Sparkles className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-1">Generate Lectures with AI</h2>
                <p className="text-white/90 text-sm">
                  Let AI help you create lecture outlines, slides, and quiz questions instantly
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>What would you like to create?</CardTitle>
                <CardDescription>Choose a template or describe what you need</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card className="border-2 hover:border-purple-500 cursor-pointer transition-all group">
                    <CardContent className="p-4 text-center">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-200 transition-colors">
                        <FileText className="h-6 w-6 text-purple-600" />
                      </div>
                      <p className="font-semibold text-sm">Lecture Outline</p>
                      <p className="text-xs text-gray-500 mt-1">Generate structured content</p>
                    </CardContent>
                  </Card>

                  <Card className="border-2 hover:border-blue-500 cursor-pointer transition-all group">
                    <CardContent className="p-4 text-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-200 transition-colors">
                        <Play className="h-6 w-6 text-blue-600" />
                      </div>
                      <p className="font-semibold text-sm">Presentation</p>
                      <p className="text-xs text-gray-500 mt-1">Create slide decks</p>
                    </CardContent>
                  </Card>

                  <Card className="border-2 hover:border-green-500 cursor-pointer transition-all group">
                    <CardContent className="p-4 text-center">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-green-200 transition-colors">
                        <MessageSquare className="h-6 w-6 text-green-600" />
                      </div>
                      <p className="font-semibold text-sm">Quiz Questions</p>
                      <p className="text-xs text-gray-500 mt-1">Auto-generate assessments</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="topic">Lecture Topic</Label>
                  <Input 
                    id="topic" 
                    placeholder="e.g., Introduction to Derivatives"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="objectives">Learning Objectives</Label>
                  <Textarea 
                    id="objectives" 
                    placeholder="What should students learn from this lecture?"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea 
                    id="notes" 
                    placeholder="Any specific points to cover or context to include..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Upload Reference Material (Optional)</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-500 transition-colors cursor-pointer">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Upload textbook chapters, notes, or PDFs</p>
                  </div>
                </div>

                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Lecture Content
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">AI Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Lightbulb className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Smart Content</p>
                    <p className="text-xs text-gray-600">Structured, pedagogically sound outlines</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Slide Generation</p>
                    <p className="text-xs text-gray-600">Ready-to-use presentation slides</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Quiz Creation</p>
                    <p className="text-xs text-gray-600">Auto-generate assessment questions</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Star className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Quality Assurance</p>
                    <p className="text-xs text-gray-600">Accuracy and safety filters</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-blue-50">
              <CardContent className="p-4">
                <h4 className="font-semibold text-sm mb-2 text-blue-900">💡 Pro Tips</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Be specific about learning objectives</li>
                  <li>• Upload reference materials for better context</li>
                  <li>• Review and customize AI-generated content</li>
                  <li>• Save time on routine lecture prep</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Recent AI Generations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-gray-500 p-4 border rounded-lg">
                  <p className="font-medium mb-1">Integration Techniques</p>
                  <p className="text-xs text-gray-400">Generated 2 days ago</p>
                </div>
                <div className="text-sm text-gray-500 p-4 border rounded-lg">
                  <p className="font-medium mb-1">Limits and Continuity</p>
                  <p className="text-xs text-gray-400">Generated 5 days ago</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Create/Edit Lecture Form
  if (currentView === 'create' || currentView === 'edit') {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
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
          <Button variant="outline" onClick={handleAIAssistant}>
            <Sparkles className="h-4 w-4 mr-2" />
            Use AI Assistant
          </Button>
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
                      {teacherCourses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.code} - {course.name} (Section {course.section})
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

            <Card className="border-0 shadow-lg bg-purple-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-2 mb-3">
                  <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm mb-1 text-purple-900">Need Help?</h4>
                    <p className="text-xs text-purple-700 mb-2">Let AI assist you in creating lecture content</p>
                    <Button variant="outline" size="sm" className="text-xs" onClick={handleAIAssistant}>
                      Open AI Assistant
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-blue-50">
              <CardContent className="p-4">
                <h4 className="font-semibold text-sm mb-2 text-blue-900">💡 Best Practices</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Keep micro-lectures between 2-5 minutes</li>
                  <li>• Use clear learning outcomes</li>
                  <li>• Add relevant attachments</li>
                  <li>• Include quick quiz for engagement</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Course Lectures View
  if (currentView === 'course-lectures' && selectedCourse) {
    const courseLectures = myLectures.filter(l => l.courseId === selectedCourse.id);
    
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
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  {selectedCourse.code} - {selectedCourse.name}
                </h1>
                <Badge variant="outline">Section {selectedCourse.section}</Badge>
              </div>
              <p className="text-gray-500 text-sm mt-1">{selectedCourse.students} students enrolled</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleAIAssistant}>
              <Sparkles className="h-4 w-4 mr-2" />
              AI Assistant
            </Button>
            <Button onClick={handleCreateLecture}>
              <Plus className="h-4 w-4 mr-2" />
              New Lecture
            </Button>
          </div>
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
                  {Math.round(courseLectures.filter(l => l.status === 'published').reduce((sum, l) => sum + l.completionRate, 0) / courseLectures.filter(l => l.status === 'published').length)}%
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
                <CardTitle>My Lectures</CardTitle>
                <CardDescription>Manage your course lectures</CardDescription>
              </div>
              <div className="flex space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    placeholder="Search lectures..." 
                    className="pl-10 w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
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
                        {lecture.status === 'published' && lecture.studentFeedback > 4 && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            <Star className="h-3 w-3 mr-1" />
                            {lecture.studentFeedback}
                          </Badge>
                        )}
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
                          <Users className="h-3 w-3 mr-1" />
                          {lecture.completionRate}% completed
                        </span>
                        {lecture.status === 'published' && (
                          <span className="flex items-center">
                            <BarChart3 className="h-3 w-3 mr-1" />
                            Avg: {lecture.avgQuizScore}%
                          </span>
                        )}
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
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span>Student Engagement</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Average Completion Rate</span>
                  <span className="font-semibold text-blue-600">
                    {Math.round(courseLectures.filter(l => l.status === 'published').reduce((sum, l) => sum + l.completionRate, 0) / courseLectures.filter(l => l.status === 'published').length)}%
                  </span>
                </div>
                <Progress value={Math.round(courseLectures.filter(l => l.status === 'published').reduce((sum, l) => sum + l.completionRate, 0) / courseLectures.filter(l => l.status === 'published').length)} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Average Quiz Score</span>
                  <span className="font-semibold text-green-600">
                    {Math.round(courseLectures.filter(l => l.status === 'published').reduce((sum, l) => sum + l.avgQuizScore, 0) / courseLectures.filter(l => l.status === 'published').length)}%
                  </span>
                </div>
                <Progress value={Math.round(courseLectures.filter(l => l.status === 'published').reduce((sum, l) => sum + l.avgQuizScore, 0) / courseLectures.filter(l => l.status === 'published').length)} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Student Satisfaction</span>
                  <span className="font-semibold text-purple-600">4.5/5.0</span>
                </div>
                <Progress value={90} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span>Top Performing Lectures</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {courseLectures
                  .filter(l => l.status === 'published')
                  .sort((a, b) => b.completionRate - a.completionRate)
                  .slice(0, 3)
                  .map((lecture, index) => (
                    <div key={lecture.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{lecture.title}</p>
                          <p className="text-xs text-gray-500">{lecture.views} views</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-green-600">{lecture.completionRate}%</p>
                        <p className="text-xs text-gray-500">completion</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Lectures</h1>
          <p className="text-gray-500 mt-1">Create, manage, and track your course content</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleAIAssistant}>
            <Sparkles className="h-4 w-4 mr-2" />
            AI Assistant
          </Button>
          <Button onClick={handleCreateLecture}>
            <Plus className="h-4 w-4 mr-2" />
            Create Lecture
          </Button>
        </div>
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

      <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-500 to-blue-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-white/20 rounded-xl">
                <Sparkles className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Try AI Lecture Assistant</h3>
                <p className="text-white/90 text-sm">
                  Generate lecture outlines, slides, and quiz questions in minutes
                </p>
              </div>
            </div>
            <Button variant="secondary" onClick={handleAIAssistant}>
              Get Started
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>My Courses</CardTitle>
          <CardDescription>Select a course to manage its lectures</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teacherCourses.map((course) => {
              const courseLectureCount = myLectures.filter(l => l.courseId === course.id).length;
              const publishedCount = myLectures.filter(l => l.courseId === course.id && l.status === 'published').length;
              
              return (
                <Card 
                  key={course.id}
                  className="border-2 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => handleViewCourseLectures(course)}
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
                        <p className="text-xs text-gray-400 mt-1 flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Next class: {new Date(course.upcomingClass).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
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
            <CardTitle>Recent Lectures</CardTitle>
            <CardDescription>Your latest created content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myLectures.slice(0, 5).map((lecture) => (
                <div key={lecture.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
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
                  <div className="flex items-center space-x-2">
                    <Badge variant={lecture.status === 'published' ? 'default' : 'secondary'}>
                      {lecture.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span>Quick Stats</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-green-900">Excellent Engagement!</span>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-sm text-green-700">
                  Your lectures have an average completion rate of {avgCompletionRate}%
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
                  <span>Student Satisfaction</span>
                  <span className="font-semibold text-purple-600">4.5/5.0</span>
                </div>
                <Progress value={90} className="h-2" />
              </div>

              <div className="pt-4 border-t">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{totalViews}</p>
                    <p className="text-xs text-gray-500">Total Views</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {Math.round(myLectures.filter(l => l.status === 'published').reduce((sum, l) => sum + l.avgQuizScore, 0) / publishedLectures)}%
                    </p>
                    <p className="text-xs text-gray-500">Avg Quiz Score</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}