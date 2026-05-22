/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
import React, { useState, useRef } from 'react';
import { Sparkles, Loader2, Download, Copy, Check, X, BookOpen, Eye, Upload, FileText, AlertCircle } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

type GeneratedLesson = {
  title: string;
  slug: string;
  description: string;
  content: string;
  order_number: number;
  duration_minutes: number;
  is_published: boolean;
  course_id: string;
  file_url?: string;
};

interface AILessonGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseName: string;
  courseDescription?: string | null;
  onLessonsGenerated: (lessons: GeneratedLesson[]) => void;
  existingLessonsCount?: number;
}

export default function AILessonGeneratorModal({ 
  open, 
  onOpenChange, 
  courseId,
  courseName,
  courseDescription,
  onLessonsGenerated,
  existingLessonsCount = 0
}: AILessonGeneratorModalProps) {
  const [creationMode, setCreationMode] = useState<'ai' | 'upload'>('ai');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('60');
  const [orderNumber, setOrderNumber] = useState(String(existingLessonsCount + 1));
  const [generating, setGenerating] = useState(false);
  const [generatedLesson, setGeneratedLesson] = useState<GeneratedLesson | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');
  const [customPrompt, setCustomPrompt] = useState('');
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const getDefaultSystemPrompt = (): string => {
    return `You are an expert university lecturer creating ONE comprehensive lesson.

CRITICAL: Return ONLY valid JSON. Use \\n for line breaks.

JSON format:
{
  "title": "Lesson Title",
  "description": "Brief 2-3 sentence overview",
  "content": "Full markdown content using \\n for newlines"
}

Create detailed educational content with these sections:
1. Learning Objectives
2. Prerequisites
3. Introduction
4. Core Concepts (3-5 major concepts with examples)
5. Practical Applications
6. Practice Exercises (5-6 exercises with solutions)
7. Knowledge Check Questions
8. Summary
9. Homework Assignment
10. Additional Resources

Make content engaging and educational. Aim for 1500-2000 words total.`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown'
    ];

    if (!validTypes.includes(file.type)) {
      setUploadError('Please upload a PDF, DOCX, DOC, TXT, or MD file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    setUploadedFile(file);
    setUploadError(null);
  };

  const handleUploadLesson = async () => {
    if (!uploadedFile || !topic.trim()) {
      setUploadError('Please provide a lesson title and upload a file');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('courseId', courseId);
      formData.append('fileName', uploadedFile.name);

      setUploadProgress(30);

      const uploadResponse = await fetch('/api/upload-lesson-file', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const { fileUrl, extractedText } = await uploadResponse.json();
      setUploadProgress(80);

      const lesson: GeneratedLesson = {
        title: topic,
        slug: generateSlug(topic),
        description: `Lesson uploaded from ${uploadedFile.name}`,
        content: extractedText || `# ${topic}\n\nLesson content from uploaded file: ${uploadedFile.name}`,
        order_number: parseInt(orderNumber) || existingLessonsCount + 1,
        duration_minutes: parseInt(duration) || 60,
        is_published: false,
        course_id: courseId,
        file_url: fileUrl
      };

      setUploadProgress(100);
      setGeneratedLesson(lesson);
      setActiveTab('preview');
      
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const generateLesson = async () => {
    if (!topic.trim()) {
      alert('Please enter a lesson topic');
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    if (!apiKey || apiKey.includes('your_actual')) {
      alert('⚠️ Groq API key not configured!\n\nPlease:\n1. Get an API key from https://console.groq.com\n2. Add it to your .env.local file:\n   NEXT_PUBLIC_GROQ_API_KEY=your_key_here\n3. Restart your dev server');
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
              content: customPrompt || getDefaultSystemPrompt()
            },
            { 
              role: 'user', 
              content: `Create a detailed lesson about "${topic}" for the course "${courseName}". 
${courseDescription ? `Course context: ${courseDescription}` : ''}
Lesson duration: ${duration} minutes.
Lesson number: ${orderNumber}.

Return a JSON object with:
1. "title": A clear lesson title
2. "description": 2-3 sentence overview
3. "content": Markdown formatted lesson with \\n for newlines

Include sections: Learning Objectives, Introduction, Core Concepts, Examples, Exercises, Summary.` 
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
        if (response.status === 401) {
          throw new Error('Invalid API Key. Please check your Groq API key');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait and try again');
        } else {
          throw new Error(`API failed: ${response.status}`);
        }
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      let parsed;
      try {
        const cleanedContent = content
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
        
        parsed = JSON.parse(cleanedContent);
      } catch (parseError) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          parsed = {
            title: `Lesson: ${topic}`,
            description: `A lesson about ${topic} for ${courseName}`,
            content: `# ${topic}\n\n${content}`
          };
        }
      }

      const safeTitle = String(parsed?.title || `Lesson: ${topic}`).trim();
      const safeDescription = String(parsed?.description || `Comprehensive lesson about ${topic}`).trim();
      
      let safeContent = '';
      if (parsed?.content) {
        if (typeof parsed.content === 'string') {
          safeContent = parsed.content.trim();
        } else if (Array.isArray(parsed.content)) {
          safeContent = parsed.content.join('\n').trim();
        } else {
          safeContent = JSON.stringify(parsed.content).trim();
        }
      } else {
        safeContent = `# ${safeTitle}\n\n## Introduction\n\nThis lesson covers the topic of ${topic}.`;
      }

      if (!safeContent.includes('\\n')) {
        safeContent = safeContent.replace(/\n/g, '\\n');
      }

      const lesson: GeneratedLesson = {
        title: safeTitle,
        slug: generateSlug(safeTitle),
        description: safeDescription,
        content: safeContent,
        order_number: parseInt(orderNumber) || existingLessonsCount + 1,
        duration_minutes: parseInt(duration) || 60,
        is_published: false,
        course_id: courseId
      };
      
      setGeneratedLesson(lesson);
      setActiveTab('preview');
    } catch (error: any) {
      alert(`Failed to generate lesson: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedLesson?.content) {
      navigator.clipboard.writeText(generatedLesson.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!generatedLesson?.content) return;
    const filename = `${generatedLesson.slug}.md`;
    const blob = new Blob([generatedLesson.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    if (!generatedLesson) return;

    try {
      if (!generatedLesson.course_id) {
        throw new Error('Missing course_id');
      }

      console.log('Saving lesson:', {
        title: generatedLesson.title,
        course_id: generatedLesson.course_id,
        order_number: generatedLesson.order_number
      });

      await onLessonsGenerated([generatedLesson]);
      handleClose();
    } catch (error: any) {
      console.error('Save error:', error);
      alert(`Failed to save lesson: ${error.message}`);
    }
  };

  const handleClose = () => {
    setCreationMode('ai');
    setTopic('');
    setDuration('60');
    setOrderNumber(String(existingLessonsCount + 1));
    setGeneratedLesson(null);
    setCopied(false);
    setActiveTab('preview');
    setCustomPrompt('');
    setUploadedFile(null);
    setUploadError(null);
    setUploadProgress(0);
    onOpenChange(false);
  };

  const renderMarkdown = (markdown: string | undefined | null): string => {
    if (!markdown) return '<p class="text-slate-500 italic">No content available.</p>';
    if (typeof markdown !== 'string') markdown = String(markdown);
    
    let contentToRender = markdown;
    if (!contentToRender.includes('\\n')) {
      contentToRender = contentToRender.replace(/\n/g, '\\n');
    }
    
    const lines = contentToRender.split('\\n');
    let html = '';
    let inCodeBlock = false;
    let codeContent = '';

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeContent = '';
        } else {
          html += `<pre class="bg-slate-900 text-slate-100 p-4 rounded-lg my-4 overflow-x-auto"><code>${escapeHtml(codeContent)}</code></pre>`;
          inCodeBlock = false;
          codeContent = '';
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent += line + '\n';
        continue;
      }

      if (line.startsWith('# ')) {
        html += `<h1 class="text-3xl font-bold mt-8 mb-4 text-slate-900">${escapeHtml(line.slice(2))}</h1>`;
      } else if (line.startsWith('## ')) {
        html += `<h2 class="text-2xl font-bold mt-6 mb-3 text-slate-800 border-b-2 border-purple-200 pb-2">${escapeHtml(line.slice(3))}</h2>`;
      } else if (line.startsWith('### ')) {
        html += `<h3 class="text-xl font-semibold mt-5 mb-2 text-purple-700">${escapeHtml(line.slice(4))}</h3>`;
      } else if (line.trim().startsWith('- ')) {
        html += `<li class="ml-6 mb-2 text-slate-700 leading-relaxed">${escapeHtml(line.trim().slice(2))}</li>`;
      } else if (/^\d+\. /.test(line.trim())) {
        html += `<li class="ml-6 mb-2 list-decimal text-slate-700 leading-relaxed">${escapeHtml(line.trim().replace(/^\d+\. /, ''))}</li>`;
      } else if (!line.trim()) {
        html += '<div class="h-3"></div>';
      } else {
        line = escapeHtml(line);
        line = line.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>');
        line = line.replace(/\*(.+?)\*/g, '<em class="italic text-slate-700">$1</em>');
        line = line.replace(/`(.+?)`/g, '<code class="bg-purple-100 px-2 py-1 rounded text-sm font-mono text-purple-800">$1</code>');
        
        html += `<p class="mb-3 text-slate-700 leading-relaxed">${line}</p>`;
      }
    }

    if (inCodeBlock) {
      html += `<pre class="bg-slate-900 text-slate-100 p-4 rounded-lg my-4 overflow-x-auto"><code>${escapeHtml(codeContent)}</code></pre>`;
    }

    return html;
  };

  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col bg-white p-0">
        <DialogHeader className="border-b pb-4 px-6 pt-6 bg-white">
          <DialogTitle className="flex items-center gap-2 text-xl text-slate-900">
            <Sparkles className="h-6 w-6 text-purple-600" />
            Create Lesson for {courseName}
          </DialogTitle>
          <DialogDescription className="text-base text-slate-600">
            Generate with AI or upload your own lesson files
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6">
          <ScrollArea className="h-[calc(90vh-180px)] pr-4">
            <div className="space-y-6 py-4">
              {!generatedLesson ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setCreationMode('ai')}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        creationMode === 'ai'
                          ? 'border-purple-500 bg-purple-50 shadow-md'
                          : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                      }`}
                    >
                      <Sparkles className={`h-8 w-8 mx-auto mb-3 ${creationMode === 'ai' ? 'text-purple-600' : 'text-slate-400'}`} />
                      <h3 className="font-semibold text-slate-900 mb-1">AI Generation</h3>
                      <p className="text-sm text-slate-600">Let AI create comprehensive lesson content</p>
                    </button>
                    
                    <button
                      onClick={() => setCreationMode('upload')}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        creationMode === 'upload'
                          ? 'border-purple-500 bg-purple-50 shadow-md'
                          : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                      }`}
                    >
                      <Upload className={`h-8 w-8 mx-auto mb-3 ${creationMode === 'upload' ? 'text-purple-600' : 'text-slate-400'}`} />
                      <h3 className="font-semibold text-slate-900 mb-1">Upload File</h3>
                      <p className="text-sm text-slate-600">Upload PDF, DOCX, or other documents</p>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="topic" className="text-base font-semibold text-slate-900">
                        Lesson Title *
                      </Label>
                      <Input
                        id="topic"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g., Introduction to Recursion, Variables in Python"
                        className="bg-white border-slate-300 text-base py-6 focus:border-purple-500 focus:ring-purple-500"
                        disabled={generating || uploading}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="duration" className="font-semibold text-slate-900">
                          Duration (minutes)
                        </Label>
                        <Select value={duration} onValueChange={setDuration} disabled={generating || uploading}>
                          <SelectTrigger id="duration" className="bg-white border-slate-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">60 minutes</SelectItem>
                            <SelectItem value="90">90 minutes</SelectItem>
                            <SelectItem value="120">120 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="order" className="font-semibold text-slate-900">
                          Lesson Number
                        </Label>
                        <Input
                          id="order"
                          type="number"
                          value={orderNumber}
                          onChange={(e) => setOrderNumber(e.target.value)}
                          min="1"
                          className="bg-white border-slate-300"
                          disabled={generating || uploading}
                        />
                      </div>
                    </div>
                  </div>

                  {creationMode === 'ai' && (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-semibold text-slate-900 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-purple-600" />
                            Advanced Options (Optional)
                          </Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCustomPrompt(getDefaultSystemPrompt())}
                            className="text-xs bg-white border-purple-200 hover:bg-purple-50 text-slate-700"
                            disabled={generating}
                          >
                            Load Default
                          </Button>
                        </div>
                        <Textarea
                          value={customPrompt}
                          onChange={(e) => setCustomPrompt(e.target.value)}
                          placeholder="Optional: Customize the AI instruction..."
                          className="min-h-[100px] bg-slate-50 border-slate-300 text-slate-700"
                          disabled={generating}
                        />
                      </div>

                      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                        <div className="p-6">
                          <p className="font-semibold text-purple-900 mb-3 flex items-center gap-2 text-lg">
                            <BookOpen className="h-5 w-5" />
                            What You'll Get
                          </p>
                          <div className="grid md:grid-cols-2 gap-4">
                            <ul className="space-y-2 text-sm text-purple-800">
                              <li className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                <span>Complete lesson structure</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                <span>Learning objectives & prerequisites</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                <span>Examples & practice exercises</span>
                              </li>
                            </ul>
                            <ul className="space-y-2 text-sm text-purple-800">
                              <li className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                <span>Markdown formatted content</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                <span>Ready-to-use material</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                <span>Preview before saving</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </Card>
                    </>
                  )}

                  {creationMode === 'upload' && (
                    <>
                      <div className="space-y-4">
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                            uploadedFile
                              ? 'border-green-400 bg-green-50'
                              : 'border-slate-300 bg-slate-50 hover:border-purple-400 hover:bg-purple-50/30'
                          }`}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.docx,.doc,.txt,.md"
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
                                  PDF, DOCX, DOC, TXT, or MD (max 10MB)
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {uploading && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm text-slate-600">
                              <span>Uploading...</span>
                              <span>{uploadProgress}%</span>
                            </div>
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-purple-600 transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {uploadError && (
                          <Alert className="border-red-200 bg-red-50">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800">
                              {uploadError}
                            </AlertDescription>
                          </Alert>
                        )}

                        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                          <div className="p-6">
                            <p className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                              <FileText className="h-5 w-5" />
                              Supported File Types
                            </p>
                            <ul className="space-y-2 text-sm text-blue-800">
                              <li className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-blue-600 mt-0.5" />
                                <span><strong>PDF</strong> - Portable Document Format</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-blue-600 mt-0.5" />
                                <span><strong>DOCX/DOC</strong> - Microsoft Word documents</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-blue-600 mt-0.5" />
                                <span><strong>TXT</strong> - Plain text files</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-blue-600 mt-0.5" />
                                <span><strong>MD</strong> - Markdown files</span>
                              </li>
                            </ul>
                          </div>
                        </Card>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex flex-col">
                  <div className="flex items-center justify-between border-b pb-4 mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900">{generatedLesson.title}</h3>
                      <p className="text-sm text-slate-600 mt-1">{generatedLesson.description}</p>
                      <div className="flex gap-6 mt-3 text-sm">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {(generatedLesson.content?.length || 0).toLocaleString()} characters
                        </span>
                        <span className="text-slate-500">⏱️ {generatedLesson.duration_minutes} min</span>
                        <span className="text-slate-500">📖 Lesson #{generatedLesson.order_number}</span>
                        {generatedLesson.file_url && (
                          <span className="text-purple-600 flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            File attached
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCopy} 
                        className="bg-white border-slate-300 hover:bg-slate-50" 
                        title="Copy markdown"
                        disabled={!generatedLesson.content}
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
                        title="Download as .md file"
                        disabled={!generatedLesson.content}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setGeneratedLesson(null)} 
                        className="bg-white border-slate-300 hover:bg-slate-50" 
                        title="Create another lesson"
                      >
                        <X className="h-4 w-4 mr-1" />
                        New
                      </Button>
                    </div>
                  </div>

                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-100">
                      <TabsTrigger value="preview" className="data-[state=active]:bg-white data-[state=active]:text-purple-700">
                        📖 Formatted Preview
                      </TabsTrigger>
                      <TabsTrigger value="markdown" className="data-[state=active]:bg-white data-[state=active]:text-purple-700">
                        📝 Raw Markdown
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="preview" className="mt-4">
                      <ScrollArea className="h-[500px] rounded-lg border border-slate-200 bg-white">
                        <div className="p-8">
                          <div 
                            className="prose prose-slate max-w-none"
                            dangerouslySetInnerHTML={{ 
                              __html: renderMarkdown(generatedLesson.content)
                            }}
                          />
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="markdown" className="mt-4">
                      <ScrollArea className="h-[500px] rounded-lg border border-slate-200 bg-slate-50">
                        <div className="p-6">
                          {generatedLesson.content ? (
                            <pre className="text-sm whitespace-pre-wrap font-mono text-slate-700">
                              {typeof generatedLesson.content === 'string' 
                                ? generatedLesson.content.replace(/\\n/g, '\n')
                                : String(generatedLesson.content)
                              }
                            </pre>
                          ) : (
                            <div className="text-center py-12">
                              <p className="text-slate-500">No markdown content available.</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="border-t border-slate-200 p-6 mt-2 bg-white">
          {!generatedLesson ? (
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={handleClose} 
                className="bg-white border-slate-300 hover:bg-slate-50" 
                disabled={generating || uploading}
              >
                Cancel
              </Button>
              {creationMode === 'ai' ? (
                <Button
                  onClick={generateLesson}
                  disabled={generating || !topic.trim()}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8 flex-1 sm:flex-none"
                  size="lg"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Generating lesson...
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
                  onClick={handleUploadLesson}
                  disabled={uploading || !topic.trim() || !uploadedFile}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-8 flex-1 sm:flex-none"
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
                      Upload Lesson
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setGeneratedLesson(null)}
                className="bg-white border-slate-300 hover:bg-slate-50"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Create Another
              </Button>
              <Button
                onClick={handleSave}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-8"
                size="lg"
                disabled={!generatedLesson.content}
              >
                <Check className="h-5 w-5 mr-2" />
                Save Lesson
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}