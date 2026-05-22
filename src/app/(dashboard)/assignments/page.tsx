/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Clock, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  ClipboardList,
  Star,
  BookOpen,
  FileText,
  X
} from 'lucide-react';

// Mock data for demonstration
const mockAssignments = [
  {
    id: '1',
    title: 'React Component Assignment',
    class: 'Web Development',
    dueDate: '2025-09-25',
    status: 'pending',
    points: 100,
    submitted: false,
  },
  {
    id: '2',
    title: 'Database Design Project',
    class: 'Database Systems',
    dueDate: '2025-09-20',
    status: 'submitted',
    points: 150,
    submitted: true,
  },
  {
    id: '3',
    title: 'Algorithm Analysis',
    class: 'Data Structures',
    dueDate: '2025-09-15',
    status: 'graded',
    points: 120,
    submitted: true,
    grade: 85,
  }
];

const mockUser = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'student'
};

// Simple type definitions
type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type Assignment = {
  id: string;
  title: string;
  class: string;
  dueDate: string;
  status: string;
  points: number;
  submitted: boolean;
  grade?: number;
};

export default function AssignmentsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading user data
    const timer = setTimeout(() => {
      setUser(mockUser);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Helper function to calculate days left safely
  const getDaysLeft = (dueDate: string): number => {
    try {
      const due = new Date(dueDate);
      const now = new Date();
      const diffTime = due.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (error) {
      return 0;
    }
  };

  // Helper function to format date safely
  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Filter assignments safely
  const pendingAssignments = Array.isArray(mockAssignments) 
    ? mockAssignments.filter(a => !a.submitted && !a.grade)
    : [];
  const submittedAssignments = Array.isArray(mockAssignments)
    ? mockAssignments.filter(a => a.submitted && !a.grade)
    : [];
  const completedAssignments = Array.isArray(mockAssignments)
    ? mockAssignments.filter(a => a.grade !== undefined)
    : [];

  const [uploadedFiles, setUploadedFiles] = useState<{[key: string]: File[]}>({});
  const [submissionNotes, setSubmissionNotes] = useState<{[key: string]: string}>({});

  const handleSubmitStart = (assignmentId: string) => {
    setSubmittingAssignmentId(assignmentId);
  };

  const handleSubmitCancel = () => {
    setSubmittingAssignmentId(null);
  };

  const handleFileUpload = (assignmentId: string, files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files);
      setUploadedFiles(prev => ({
        ...prev,
        [assignmentId]: [...(prev[assignmentId] || []), ...fileArray]
      }));
    }
  };

  const handleRemoveFile = (assignmentId: string, fileIndex: number) => {
    setUploadedFiles(prev => ({
      ...prev,
      [assignmentId]: prev[assignmentId]?.filter((_, index) => index !== fileIndex) || []
    }));
  };

  const handleNotesChange = (assignmentId: string, notes: string) => {
    setSubmissionNotes(prev => ({
      ...prev,
      [assignmentId]: notes
    }));
  };

  const handleSubmitAssignment = (assignmentId: string) => {
    // Handle actual submission logic here
    const files = uploadedFiles[assignmentId] || [];
    const notes = submissionNotes[assignmentId] || '';
    
    console.log('Submitting assignment:', assignmentId);
    console.log('Files:', files);
    console.log('Notes:', notes);
    
    // Reset state after submission
    setSubmittingAssignmentId(null);
    setUploadedFiles(prev => ({ ...prev, [assignmentId]: [] }));
    setSubmissionNotes(prev => ({ ...prev, [assignmentId]: '' }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-500">Unable to load user information</p>
        </div>
      </div>
    );
  }

  const isTeacherOrAdmin = user.role === 'teacher' || user.role === 'admin';

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Assignments</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">Track and manage your assignments</p>
        </div>
        {isTeacherOrAdmin && (
          <Button className="w-full md:w-auto mt-2 md:mt-0">
            <ClipboardList className="mr-2 h-4 w-4" />
            Create Assignment
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-4 sm:p-6">
            <div className="p-2 sm:p-3 bg-orange-100 rounded-xl mr-3 sm:mr-4">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold">{pendingAssignments.length}</p>
              <p className="text-xs sm:text-sm text-gray-500">Pending</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-4 sm:p-6">
            <div className="p-2 sm:p-3 bg-blue-100 rounded-xl mr-3 sm:mr-4">
              <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold">{submittedAssignments.length}</p>
              <p className="text-xs sm:text-sm text-gray-500">Submitted</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-4 sm:p-6">
            <div className="p-2 sm:p-3 bg-green-100 rounded-xl mr-3 sm:mr-4">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold">{completedAssignments.length}</p>
              <p className="text-xs sm:text-sm text-gray-500">Graded</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignment Tabs */}
      <Tabs defaultValue="pending" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="text-xs sm:text-sm">
            Pending ({pendingAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="submitted" className="text-xs sm:text-sm">
            Submitted ({submittedAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="graded" className="text-xs sm:text-sm">
            Graded ({completedAssignments.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Assignments */}
        <TabsContent value="pending" className="space-y-4">
          {pendingAssignments.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="text-center p-6 sm:p-8">
                <ClipboardList className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                <p className="text-gray-500 text-sm sm:text-base">No pending assignments</p>
              </CardContent>
            </Card>
          ) : (
            pendingAssignments.map((assignment) => {
              const daysLeft = getDaysLeft(assignment.dueDate);
              const isSubmitting = submittingAssignmentId === assignment.id;
              
              return (
                <Card key={assignment.id} className="border-0 shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                      <div className="space-y-1">
                        <CardTitle className="text-lg sm:text-xl">{assignment.title}</CardTitle>
                        <CardDescription className="flex items-center">
                          <BookOpen className="h-4 w-4 mr-1" />
                          {assignment.class}
                        </CardDescription>
                      </div>
                      <Badge 
                        variant={daysLeft <= 1 ? "destructive" : "secondary"}
                        className="w-fit"
                      >
                        Due {formatDate(assignment.dueDate)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 text-sm">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                          {formatDate(assignment.dueDate)}
                        </span>
                        <span className="flex items-center">
                          <Star className="h-4 w-4 mr-1 text-gray-500" />
                          {assignment.points} points
                        </span>
                      </div>
                      <div className={`flex items-center space-x-2 ${daysLeft <= 1 ? 'text-red-600' : 'text-orange-600'}`}>
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">
                          {daysLeft > 0 
                            ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
                            : daysLeft === 0 
                              ? 'Due today'
                              : `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} overdue`
                          }
                        </span>
                      </div>
                    </div>

                    {isSubmitting ? (
                      <>
                        {/* Upload Section */}
                        <div className="border-2 border-dashed border-gray-300 rounded-lg sm:rounded-xl p-4 sm:p-6 hover:border-blue-400 transition-colors">
                          <div className="text-center">
                            <Upload className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                            <h3 className="text-base sm:text-lg font-medium mb-2">Upload your submission</h3>
                            <p className="text-gray-500 mb-4 text-sm sm:text-base">Drag and drop your files here or browse</p>
                            <input
                              type="file"
                              multiple
                              id={`file-upload-${assignment.id}`}
                              className="hidden"
                              onChange={(e) => handleFileUpload(assignment.id, e.target.files)}
                              accept=".pdf,.doc,.docx,.txt,.zip,.jpg,.png"
                            />
                            <Button 
                              onClick={() => document.getElementById(`file-upload-${assignment.id}`)?.click()}
                              size="sm"
                              className="text-xs sm:text-sm"
                            >
                              Choose Files
                            </Button>
                          </div>
                        </div>

                        {/* Display uploaded files */}
                        {uploadedFiles[assignment.id] && uploadedFiles[assignment.id].length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm">Uploaded Files:</Label>
                            <div className="space-y-2">
                              {uploadedFiles[assignment.id].map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                                      <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium truncate">{file.name}</p>
                                      <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRemoveFile(assignment.id, index)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2 flex-shrink-0"
                                  >
                                    <X className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-3">
                          <Label htmlFor={`notes-${assignment.id}`} className="text-sm">
                            Submission Notes (Optional)
                          </Label>
                          <Textarea 
                            id={`notes-${assignment.id}`}
                            placeholder="Add any notes about your submission..."
                            className="resize-none min-h-[100px] text-sm"
                            value={submissionNotes[assignment.id] || ''}
                            onChange={(e) => handleNotesChange(assignment.id, e.target.value)}
                          />
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-2">
                          <Button 
                            variant="outline" 
                            onClick={handleSubmitCancel}
                            size="sm"
                            className="sm:px-4"
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={() => handleSubmitAssignment(assignment.id)}
                            disabled={!uploadedFiles[assignment.id] || uploadedFiles[assignment.id].length === 0}
                            size="sm"
                            className="sm:px-4"
                          >
                            Submit Assignment
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center">
                        <Button 
                          onClick={() => handleSubmitStart(assignment.id)}
                          size="lg"
                          className="w-full sm:w-auto"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Start Submission
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Submitted Assignments */}
        <TabsContent value="submitted" className="space-y-4">
          {submittedAssignments.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="text-center p-6 sm:p-8">
                <Upload className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                <p className="text-gray-500 text-sm sm:text-base">No submitted assignments</p>
              </CardContent>
            </Card>
          ) : (
            submittedAssignments.map((assignment) => (
              <Card key={assignment.id} className="border-0 shadow-lg">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className="p-2 sm:p-3 bg-blue-100 rounded-xl">
                        <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base sm:text-lg">{assignment.title}</h3>
                        <p className="text-sm text-gray-500">{assignment.class}</p>
                        <p className="text-sm text-blue-600">Submitted on time</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <Badge variant="secondary" className="mb-1 sm:mb-0">Awaiting Grade</Badge>
                      <p className="text-sm text-gray-500">{assignment.points} points</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Graded Assignments */}
        <TabsContent value="graded" className="space-y-4">
          {completedAssignments.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="text-center p-6 sm:p-8">
                <Star className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                <p className="text-gray-500 text-sm sm:text-base">No graded assignments</p>
              </CardContent>
            </Card>
          ) : (
            completedAssignments.map((assignment) => {
              const grade = assignment.grade ?? 0;
              const earnedPoints = Math.round((grade * assignment.points) / 100);
              
              return (
                <Card key={assignment.id} className="border-0 shadow-lg">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="p-2 sm:p-3 bg-green-100 rounded-xl">
                          <Star className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base sm:text-lg">{assignment.title}</h3>
                          <p className="text-sm text-gray-500">{assignment.class}</p>
                          <p className="text-sm text-green-600">
                            {grade >= 90 ? 'Excellent work!' : 
                             grade >= 80 ? 'Great work! Above average performance' :
                             grade >= 70 ? 'Good work!' :
                             grade >= 80 ? 'Satisfactory work' :
                             'Needs improvement'}
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className={`text-xl sm:text-2xl font-bold ${
                          grade >= 90 ? 'text-green-600' :
                          grade >= 80 ? 'text-blue-600' :
                          grade >= 70 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {grade}%
                        </div>
                        <p className="text-sm text-gray-500">{earnedPoints}/{assignment.points} points</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}