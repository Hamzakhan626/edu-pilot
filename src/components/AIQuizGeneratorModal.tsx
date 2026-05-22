/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  Loader2, 
  Upload, 
  FileText, 
  X, 
  Copy, 
  Check,
  Download,
  Settings,
  ListChecks,
  AlertCircle,
  Zap,
  Brain,
  Target,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/auth';
import { toast } from 'sonner';

interface GeneratedQuestion {
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer' | 'essay';
  options: string[];
  correct_answer: string;
  points: number;
  explanation?: string;
}

interface GeneratedQuiz {
  title: string;
  description: string;
  difficulty: string;
  total_questions: number;
  passing_score: number;
  time_limit_minutes: number;
  questions: GeneratedQuestion[];
}

interface AIQuizGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseName: string;
  courseDescription?: string | null;
  onQuizGenerated: (quiz: any) => void;
}

export default function AIQuizGeneratorModal({ 
  open, 
  onOpenChange, 
  courseId,
  courseName,
  courseDescription,
  onQuizGenerated
}: AIQuizGeneratorModalProps) {
  const [creationMode, setCreationMode] = useState<'ai' | 'upload'>('ai');
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState('medium');
  const [quizType, setQuizType] = useState('Quick Quiz');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuiz | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'application/json',
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/markdown'
    ];

    if (!validTypes.includes(file.type)) {
      setUploadError('Please upload JSON, TXT, PDF, DOCX, DOC, or MD files');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    setUploadedFile(file);
    setUploadError(null);
  };

  const handleUploadQuiz = async () => {
    if (!uploadedFile || !topic.trim()) {
      setUploadError('Please provide a quiz title and upload a file');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('quizId', 'temp-upload');

      const response = await fetch('/api/upload-quiz-file', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload file');
      }

      const { parsedQuestions, message } = await response.json();

      if (parsedQuestions && parsedQuestions.length > 0) {
        const quiz: GeneratedQuiz = {
          title: topic,
          description: `Quiz generated from uploaded file: ${uploadedFile.name}`,
          difficulty: 'medium',
          total_questions: parsedQuestions.length,
          passing_score: 70,
          time_limit_minutes: 30,
          questions: parsedQuestions.map((q: any) => ({
            question_text: q.question_text || 'Question',
            question_type: q.question_type || 'multiple_choice',
            options: q.options || [],
            correct_answer: q.correct_answer || '',
            points: q.points || 1,
            explanation: q.explanation
          }))
        };

        setGeneratedQuiz(quiz);
        setActiveTab('preview');
        toast.success(message || `Loaded ${parsedQuestions.length} questions from file`);
      } else {
        throw new Error('No questions could be parsed from the file');
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const generateQuizWithAI = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a quiz topic');
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    if (!apiKey || apiKey.includes('your_actual')) {
      toast.error('⚠️ Groq API key not configured!\n\nPlease:\n1. Get an API key from https://console.groq.com\n2. Add it to your .env.local file\n3. Restart your dev server');
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { 
              role: 'system', 
              content: `You are an expert quiz creator and educator. Generate a comprehensive quiz in JSON format.

CRITICAL: Return ONLY valid JSON. No explanations, no markdown, just JSON.

Required JSON structure:
{
  "title": "Quiz title",
  "description": "Brief description",
  "difficulty": "easy/medium/hard",
  "total_questions": number,
  "passing_score": 70,
  "time_limit_minutes": 30,
  "questions": [
    {
      "question_text": "The question",
      "question_type": "multiple_choice/short_answer/essay",
      "options": ["A", "B", "C", "D"] // only for multiple_choice
      "correct_answer": "The correct answer",
      "points": 1,
      "explanation": "Why this is correct (optional)"
    }
  ]
}

Quiz requirements:
1. Mix of question types (multiple choice, short answer, essay)
2. Clear, unambiguous questions
3. Realistic and plausible options for multiple choice
4. Varying difficulty based on requested level
5. Educational and relevant to the topic
6. Include explanations where helpful
7. Ensure all questions are answerable with the provided information

Format options for multiple choice as A, B, C, D with clear distinctions.`
            },
            { 
              role: 'user', 
              content: `Create a quiz about "${topic}" for the course "${courseName}".
${courseDescription ? `Course description: ${courseDescription}` : ''}

Quiz specifications:
- Number of questions: ${numQuestions}
- Difficulty level: ${difficulty}
- Quiz type: ${quizType}
- Include a mix of question types
- Make it educational and assessment-focused
- Ensure questions are clear and test understanding

${customPrompt ? `Additional instructions: ${customPrompt}` : ''}

Return a complete, valid JSON object with the quiz structure.`
            }
          ],
          temperature: 0.7,
          max_tokens: 8000,
          top_p: 0.9,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      let parsed;
      try {
        // Clean the response
        const cleanedContent = content
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
        
        parsed = JSON.parse(cleanedContent);
      } catch (parseError) {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not parse AI response as JSON');
        }
      }

      // Validate and set the generated quiz
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Invalid quiz format: missing questions array');
      }

      const quiz: GeneratedQuiz = {
        title: parsed.title || `Quiz: ${topic}`,
        description: parsed.description || `Quiz about ${topic} for ${courseName}`,
        difficulty: parsed.difficulty || difficulty,
        total_questions: parsed.total_questions || numQuestions,
        passing_score: parsed.passing_score || 70,
        time_limit_minutes: parsed.time_limit_minutes || 30,
        questions: parsed.questions.map((q: any, index: number) => ({
          question_text: q.question_text || `Question ${index + 1}`,
          question_type: q.question_type || 'multiple_choice',
          options: q.options || (q.question_type === 'multiple_choice' ? ['Option A', 'Option B', 'Option C', 'Option D'] : []),
          correct_answer: q.correct_answer || '',
          points: q.points || 1,
          explanation: q.explanation
        }))
      };

      setGeneratedQuiz(quiz);
      setActiveTab('preview');
      toast.success(`Successfully generated quiz with ${quiz.questions.length} questions`);

    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(`Failed to generate quiz: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

const handleSaveQuiz = async () => {
  if (!generatedQuiz || !courseId) {
    toast.error('No quiz to save');
    return;
  }

  setGenerating(true);

  try {
    console.log('=== SAVE QUIZ DEBUG START ===');
    console.log('Course ID:', courseId);
    
    // Get the current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('User fetch error:', userError);
      throw new Error(`Failed to get user: ${userError.message}`);
    }
    
    const userId = userData?.user?.id;
    console.log('Current user ID:', userId);

    if (!userId) {
      throw new Error('User not authenticated');
    }

    console.log('Quiz data to insert:', {
      course_id: courseId,
      title: generatedQuiz.title,
      total_questions: generatedQuiz.questions?.length || 0,
      created_by: userId
    });

    // Create the quiz using course_id (not class_id)
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        course_id: courseId, // ✅ Using course_id instead of class_id
        title: generatedQuiz.title,
        description: generatedQuiz.description,
        type: quizType,
        difficulty: generatedQuiz.difficulty,
        total_questions: generatedQuiz.questions?.length || 0,
        passing_score: generatedQuiz.passing_score || 70,
        time_limit_minutes: generatedQuiz.time_limit_minutes || 30,
        allow_late_submission: false,
        show_results: true,
        shuffle_questions: false,
        status: 'draft',
        section: null,
        created_by: userId
      })
      .select()
      .single();

    if (quizError) {
      console.error('=== QUIZ INSERT ERROR ===');
      console.error('Error code:', quizError.code);
      console.error('Error message:', quizError.message);
      console.error('Error details:', quizError.details);
      
      // Check for specific error types
      if (quizError.code === '23503') {
        throw new Error(`Foreign key error: The course "${courseId}" does not exist.`);
      } else if (quizError.code === '23505') {
        throw new Error('A quiz with this information already exists.');
      } else if (quizError.code === '42501') {
        throw new Error('Permission denied: Check your RLS policies.');
      } else {
        throw new Error(`Database error: ${quizError.message} (Code: ${quizError.code})`);
      }
    }

    if (!quiz) {
      throw new Error('Quiz was not created - no data returned');
    }

    console.log('Quiz created successfully:', quiz.id);

    // Prepare questions for insertion
    const questionsToInsert = (generatedQuiz.questions || []).map((q, index) => {
      let options = [];
      if (q.question_type === 'multiple_choice') {
        if (Array.isArray(q.options)) {
          options = q.options;
        } else if (typeof q.options === 'string') {
          try {
            options = JSON.parse(q.options);
          } catch {
            options = [q.options];
          }
        } else {
          options = ['Option A', 'Option B', 'Option C', 'Option D'];
        }
      }

      return {
        quiz_id: quiz.id,
        question_text: q.question_text || `Question ${index + 1}`,
        question_type: q.question_type || 'multiple_choice',
        options: options,
        correct_answer: q.correct_answer || '',
        points: q.points || 1,
        question_order: index + 1
      };
    });

    console.log('Inserting questions:', questionsToInsert.length);

    if (questionsToInsert.length === 0) {
      throw new Error('No questions to insert');
    }

    // Insert questions
    const { data: insertedQuestions, error: questionsError } = await supabase
      .from('quiz_questions')
      .insert(questionsToInsert)
      .select();

    if (questionsError) {
      console.error('=== QUESTIONS INSERT ERROR ===');
      console.error('Error code:', questionsError.code);
      console.error('Error message:', questionsError.message);
      
      // Rollback: Delete the quiz if questions fail to insert
      console.log('Rolling back quiz creation...');
      await supabase.from('quizzes').delete().eq('id', quiz.id);
      
      throw new Error(`Failed to insert questions: ${questionsError.message}`);
    }

    console.log('Questions inserted successfully:', insertedQuestions?.length || 0);
    console.log('=== SAVE QUIZ DEBUG END ===');

    toast.success(`Quiz "${generatedQuiz.title}" saved successfully with ${questionsToInsert.length} questions`);
    onQuizGenerated(quiz);
    handleClose();

  } catch (error) {
    console.error('=== FULL SAVE ERROR ===');
    console.error('Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to save quiz: Unknown error occurred';
    toast.error(errorMessage);
  } finally {
    setGenerating(false);
  }
};

  const handleCopy = () => {
    if (generatedQuiz) {
      navigator.clipboard.writeText(JSON.stringify(generatedQuiz, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!generatedQuiz) return;
    
    const filename = `${generatedQuiz.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-quiz.json`;
    const blob = new Blob([JSON.stringify(generatedQuiz, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setCreationMode('ai');
    setTopic('');
    setNumQuestions(10);
    setDifficulty('medium');
    setQuizType('Quick Quiz');
    setCustomPrompt('');
    setGeneratedQuiz(null);
    setCopied(false);
    setActiveTab('preview');
    setUploadedFile(null);
    setUploadError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-6 w-6 text-blue-600" />
            Generate Quiz with AI
          </DialogTitle>
          <DialogDescription>
            Create a comprehensive quiz for {courseName} using AI or upload from files
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-[calc(90vh-180px)]">
            <div className="space-y-6 py-4">
              {!generatedQuiz ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setCreationMode('ai')}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        creationMode === 'ai'
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                      }`}
                    >
                      <Sparkles className={`h-8 w-8 mx-auto mb-3 ${creationMode === 'ai' ? 'text-blue-600' : 'text-slate-400'}`} />
                      <h3 className="font-semibold text-slate-900 mb-1">AI Generation</h3>
                      <p className="text-sm text-slate-600">Let AI create a complete quiz</p>
                    </button>
                    
                    <button
                      onClick={() => setCreationMode('upload')}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        creationMode === 'upload'
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                      }`}
                    >
                      <Upload className={`h-8 w-8 mx-auto mb-3 ${creationMode === 'upload' ? 'text-blue-600' : 'text-slate-400'}`} />
                      <h3 className="font-semibold text-slate-900 mb-1">Upload File</h3>
                      <p className="text-sm text-slate-600">Upload quiz questions from files</p>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="topic" className="text-base font-semibold">
                        Quiz Topic / Title *
                      </Label>
                      <Input
                        id="topic"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g., Introduction to Python, Database Fundamentals, Calculus Basics"
                        className="bg-white border-slate-300"
                        disabled={generating || uploading}
                      />
                    </div>

                    {creationMode === 'ai' ? (
                      <>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="numQuestions">Number of Questions</Label>
                            <Select 
                              value={numQuestions.toString()} 
                              onValueChange={(value) => setNumQuestions(parseInt(value))}
                              disabled={generating}
                            >
                              <SelectTrigger id="numQuestions">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="5">5 questions</SelectItem>
                                <SelectItem value="10">10 questions</SelectItem>
                                <SelectItem value="15">15 questions</SelectItem>
                                <SelectItem value="20">20 questions</SelectItem>
                                <SelectItem value="25">25 questions</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="difficulty">Difficulty</Label>
                            <Select 
                              value={difficulty} 
                              onValueChange={setDifficulty}
                              disabled={generating}
                            >
                              <SelectTrigger id="difficulty">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="easy">Easy</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="hard">Hard</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="quizType">Quiz Type</Label>
                            <Select 
                              value={quizType} 
                              onValueChange={setQuizType}
                              disabled={generating}
                            >
                              <SelectTrigger id="quizType">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Quick Quiz">Quick Quiz</SelectItem>
                                <SelectItem value="Exam">Exam</SelectItem>
                                <SelectItem value="Practice Test">Practice Test</SelectItem>
                                <SelectItem value="Assessment">Assessment</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            Advanced Options (Optional)
                          </Label>
                          <Textarea
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            placeholder="Custom instructions for the AI (e.g., 'Focus on practical examples', 'Include coding questions', etc.)"
                            className="min-h-[80px]"
                            disabled={generating}
                          />
                        </div>

                        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                          <CardContent className="p-6">
                            <p className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                              <Brain className="h-5 w-5" />
                              What You'll Get
                            </p>
                            <div className="grid md:grid-cols-2 gap-4">
                              <ul className="space-y-2 text-sm text-blue-800">
                                <li className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <span>Complete quiz with title and description</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <span>Mix of question types</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <span>Multiple choice with clear options</span>
                                </li>
                              </ul>
                              <ul className="space-y-2 text-sm text-blue-800">
                                <li className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <span>Correct answers with explanations</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <span>Difficulty-adjusted questions</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <span>Ready to save and use</span>
                                </li>
                              </ul>
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    ) : (
                      <>
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                            uploadedFile
                              ? 'border-green-400 bg-green-50'
                              : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/30'
                          }`}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json,.txt,.pdf,.docx,.doc,.md"
                            onChange={handleFileSelect}
                            className="hidden"
                            disabled={uploading}
                          />
                          
                          {uploadedFile ? (
                            <div className="space-y-3">
                              <FileText className="h-12 w-12 mx-auto text-green-600" />
                              <div>
                                <p className="font-semibold text-slate-900">{uploadedFile.name}</p>
                                <p className="text-sm text-slate-600">
                                  {(uploadedFile.size / 1024).toFixed(2)} KB
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUploadedFile(null);
                                }}
                                className="bg-white"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Remove
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <Upload className="h-12 w-12 mx-auto text-slate-400" />
                              <div>
                                <p className="font-semibold text-slate-900 mb-1">
                                  Click to upload or drag and drop
                                </p>
                                <p className="text-sm text-slate-600">
                                  JSON, TXT, PDF, DOCX, DOC, or MD (max 10MB)
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {uploadError && (
                          <Alert className="border-red-200 bg-red-50">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800">
                              {uploadError}
                            </AlertDescription>
                          </Alert>
                        )}

                        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
                          <CardContent className="p-6">
                            <p className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                              <FileText className="h-5 w-5" />
                              Supported File Formats
                            </p>
                            <ul className="space-y-2 text-sm text-indigo-800">
                              <li className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-indigo-600 mt-0.5" />
                                <span><strong>JSON</strong> - Structured quiz data with questions array</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-indigo-600 mt-0.5" />
                                <span><strong>TXT/MD</strong> - Plain text with questions and answers</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-indigo-600 mt-0.5" />
                                <span><strong>PDF/DOCX/DOC</strong> - Document files with questions</span>
                              </li>
                            </ul>
                          </CardContent>
                        </Card>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col">
                  <div className="flex items-center justify-between border-b pb-4 mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900">{generatedQuiz.title}</h3>
                      <p className="text-sm text-slate-600 mt-1">{generatedQuiz.description}</p>
                      <div className="flex gap-6 mt-3 text-sm">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {generatedQuiz.difficulty}
                        </Badge>
                        <span className="text-slate-500 flex items-center gap-1">
                          <ListChecks className="h-4 w-4" />
                          {generatedQuiz.total_questions} questions
                        </span>
                        <span className="text-slate-500 flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          Pass: {generatedQuiz.passing_score}%
                        </span>
                        <span className="text-slate-500 flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {generatedQuiz.time_limit_minutes} min
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCopy} 
                        className="bg-white border-slate-300 hover:bg-slate-50"
                        title="Copy quiz JSON"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 mr-1 text-green-600" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDownload} 
                        className="bg-white border-slate-300 hover:bg-slate-50"
                        title="Download as JSON"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setGeneratedQuiz(null)} 
                        className="bg-white border-slate-300 hover:bg-slate-50"
                        title="Generate another quiz"
                      >
                        <X className="h-4 w-4 mr-1" />
                        New
                      </Button>
                    </div>
                  </div>

                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-100">
                      <TabsTrigger value="preview" className="data-[state=active]:bg-white data-[state=active]:text-blue-700">
                        📋 Quiz Preview
                      </TabsTrigger>
                      <TabsTrigger value="json" className="data-[state=active]:bg-white data-[state=active]:text-blue-700">
                        📝 Raw JSON
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="preview" className="mt-4">
                      <ScrollArea className="h-[500px] rounded-lg border border-slate-200 bg-white">
                        <div className="p-6 space-y-6">
                          {generatedQuiz.questions.map((question, index) => (
                            <Card key={index} className="border-slate-200">
                              <CardContent className="pt-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="bg-slate-50">
                                      Question {index + 1} ({question.points} point{question.points !== 1 ? 's' : ''})
                                    </Badge>
                                    <Badge variant="outline">
                                      {question.question_type.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <p className="font-medium text-slate-900">{question.question_text}</p>

                                  {question.question_type === 'multiple_choice' && question.options && (
                                    <div className="space-y-2">
                                      <p className="text-sm font-medium text-slate-700">Options:</p>
                                      <ul className="space-y-2">
                                        {question.options.map((option, optIndex) => (
                                          <li 
                                            key={optIndex}
                                            className={`p-3 rounded border ${option === question.correct_answer ? 'border-green-300 bg-green-50' : 'border-slate-200'}`}
                                          >
                                            <div className="flex items-center gap-2">
                                              <div className={`h-6 w-6 rounded-full flex items-center justify-center ${option === question.correct_answer ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                                                {String.fromCharCode(65 + optIndex)}
                                              </div>
                                              <span className={option === question.correct_answer ? 'font-medium text-green-900' : 'text-slate-700'}>
                                                {option}
                                              </span>
                                              {option === question.correct_answer && (
                                                <Badge className="ml-auto bg-green-100 text-green-800">Correct</Badge>
                                              )}
                                            </div>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {(question.question_type === 'short_answer' || question.question_type === 'essay') && (
                                    <div className="space-y-2">
                                      <p className="text-sm font-medium text-slate-700">Expected Answer:</p>
                                      <div className="p-3 bg-slate-50 rounded border border-slate-200">
                                        <p className="text-slate-700">{question.correct_answer}</p>
                                      </div>
                                    </div>
                                  )}

                                  {question.explanation && (
                                    <div className="space-y-2">
                                      <p className="text-sm font-medium text-slate-700">Explanation:</p>
                                      <div className="p-3 bg-blue-50 rounded border border-blue-200">
                                        <p className="text-sm text-blue-800">{question.explanation}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="json" className="mt-4">
                      <ScrollArea className="h-[500px] rounded-lg border border-slate-200 bg-slate-50">
                        <div className="p-6">
                          <pre className="text-sm whitespace-pre-wrap font-mono text-slate-700">
                            {JSON.stringify(generatedQuiz, null, 2)}
                          </pre>
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          {!generatedQuiz ? (
            <>
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="bg-white border-slate-300 hover:bg-slate-50"
              >
                Cancel
              </Button>
              {creationMode === 'ai' ? (
                <Button
                  onClick={generateQuizWithAI}
                  disabled={generating || !topic.trim()}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-8"
                  size="lg"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Generating quiz...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Generate with AI
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleUploadQuiz}
                  disabled={uploading || !topic.trim() || !uploadedFile}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-8"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 mr-2" />
                      Upload & Process
                    </>
                  )}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => setGeneratedQuiz(null)}
                className="bg-white border-slate-300 hover:bg-slate-50"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Another
              </Button>
              <Button
                onClick={handleSaveQuiz}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-8"
                size="lg"
                disabled={generating}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Saving quiz...
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5 mr-2" />
                    Save Quiz to Course
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}