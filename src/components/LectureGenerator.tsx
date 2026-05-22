/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { BookOpen, Loader2, Download, Copy, Check, Sparkles, Save } from 'lucide-react';
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
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface LectureContent {
  markdown: string;
  metadata: {
    topic: string;
    duration: string;
    level: string;
    generatedAt: string;
  };
}

interface LectureGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId?: string;
  courseName?: string;
  courseDescription?: string;
  onLessonSaved?: () => void;
}

export function LectureGeneratorModal({ 
  open, 
  onOpenChange, 
  courseId,
  courseName,
  courseDescription,
  onLessonSaved
}: LectureGeneratorModalProps) {
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('60');
  const [level, setLevel] = useState('intermediate');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<LectureContent | null>(null);
  const [copied, setCopied] = useState(false);

  const generateLecture = async () => {
    if (!topic.trim()) {
      alert('Please enter a lecture topic');
      return;
    }

    if (!courseName) {
      alert('Please select a course first');
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    if (!apiKey || apiKey.includes('your_actual')) {
      alert('⚠️ Groq API key not configured!\n\nPlease:\n1. Get an API key from https://console.groq.com\n2. Add it to your .env.local file:\n   NEXT_PUBLIC_GROQ_API_KEY=your_key_here\n3. Restart your dev server');
      return;
    }

    setGenerating(true);

    try {
      const timestamp = new Date().toISOString();

      const systemPrompt = `You are an expert university lecturer and curriculum designer. Generate comprehensive, well-structured lecture content in Markdown format.

The lecture should include:
1. **Title and Metadata** - Course name, topic, duration, difficulty level
2. **Learning Objectives** - 3-5 specific, measurable learning goals
3. **Prerequisites** - What students should already know
4. **Lecture Outline** - Detailed timeline with timestamps
5. **Core Content** - Main concepts with:
   - Clear explanations
   - Real-world examples
   - Code snippets (if technical topic)
   - Diagrams/visual descriptions
6. **Interactive Activities** - Exercises, discussions, or demos during the lecture
7. **Practice Problems** - 3-5 problems for students to solve
8. **Summary** - Key takeaways and main points recap
9. **Homework/Assignment** - Work to be completed after the lecture
10. **Additional Resources** - Links, books, videos for further learning

Format the response in clean Markdown with:
- Proper headers (# ## ###)
- Bullet points and numbered lists
- Code blocks with syntax highlighting
- Tables where appropriate
- Bold and italic text for emphasis

Make the content engaging, practical, and academically rigorous.`;

      const userPrompt = `Generate a comprehensive lecture plan for:

**Course:** ${courseName}
${courseDescription ? `**Course Description:** ${courseDescription}` : ''}

**Lecture Topic:** ${topic}
**Duration:** ${duration} minutes
**Difficulty Level:** ${level}

Please create a detailed, engaging lecture that covers this topic thoroughly. Include practical examples, real-world applications, and interactive elements to keep students engaged.

${duration === '60' ? 'This is a standard 1-hour lecture.' : duration === '90' ? 'This is an extended 90-minute session with more depth.' : 'Adjust content to fit the time available.'}

[Generated at: ${timestamp}]`;

      console.log('🔵 Generating lecture for:', courseName);
      console.log('📝 Topic:', topic);

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 8000,
          top_p: 0.9
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error:', errorData);
        
        if (response.status === 401) {
          throw new Error('Invalid API Key. Please check your Groq API key in .env.local');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        } else {
          throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
        }
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      console.log('✅ Lecture generated successfully');

      setGeneratedContent({
        markdown: content,
        metadata: {
          topic,
          duration,
          level,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error('❌ Generation error:', error);
      alert(`Failed to generate lecture: ${error.message}\n\nPlease check:\n1. Your Groq API key is valid\n2. You have internet connection\n3. Check browser console for details`);
    } finally {
      setGenerating(false);
    }
  };

const handleSave = async () => {
  if (!generatedContent || !courseId) {
    alert('Missing required data to save');
    return;
  }

  setSaving(true);

  try {
    console.log('💾 Starting save process...');

    // Generate ALWAYS-UNIQUE slug using UUID + timestamp
    // This ensures no conflicts even with same topic
    const uniqueId = crypto.randomUUID();
    const timestamp = Date.now();
    const baseSlug = topic
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100); // Shorter to leave room for unique parts
    
    // Format: topic-UUID-timestamp (always unique!)
    const slug = `${baseSlug}-${uniqueId}-${timestamp}`.slice(0, 255);

    console.log('Generated slug:', slug);

    // Validate duration
    const durationMinutes = parseInt(generatedContent.metadata.duration);
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
      throw new Error(`Invalid duration: ${generatedContent.metadata.duration}`);
    }

    // Insert WITHOUT order_number - trigger handles it
    const { data: insertedLesson, error: insertError } = await supabase
      .from('lessons')
      .insert({
        course_id: courseId,
        title: topic.trim().slice(0, 255),
        description: `${generatedContent.metadata.level} level lecture (${generatedContent.metadata.duration} minutes)`,
        content: generatedContent.markdown,
        slug: slug, // Now always unique!
        // order_number set by trigger automatically
        duration_minutes: durationMinutes,
        is_published: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      throw insertError;
    }

    console.log('✅ SUCCESS!');
    console.log('   Lesson ID:', insertedLesson.id);
    console.log('   Order number:', insertedLesson.order_number);
    console.log('   Slug:', insertedLesson.slug);
    
    alert('✅ Lecture saved successfully!');
    
    if (onLessonSaved) onLessonSaved();
    handleClose();

  } catch (error: any) {
    console.error('❌ SAVE FAILED:', error);
    
    let userMessage = error?.message || 'Unknown error occurred';
    
    if (error?.code === '23505') {
      // This should never happen now, but just in case
      userMessage = 'Unexpected duplicate entry. Please try again.';
    }
    
    alert(`❌ Failed to save lecture:\n\n${userMessage}`);
  } finally {
    setSaving(false);
  }
};


  const handleCopy = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!generatedContent) return;

    const filename = `${courseName?.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${topic.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
    const blob = new Blob([generatedContent.markdown], { type: 'text/markdown' });
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
    setTopic('');
    setDuration('60');
    setLevel('intermediate');
    setGeneratedContent(null);
    setCopied(false);
    onOpenChange(false);
  };

  // Simple markdown to HTML converter for preview
  const renderMarkdown = (markdown: string) => {
    return markdown
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
      .replace(/```(\w+)?\n([\s\S]+?)```/g, '<pre class="bg-gray-100 p-3 rounded my-2 overflow-x-auto"><code>$2</code></pre>')
      .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple-600" />
            Generate Lecture Plan with AI
          </DialogTitle>
          <DialogDescription>
            Create a comprehensive lecture plan for: <strong>{courseName || 'your course'}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {!generatedContent ? (
            <div className="space-y-4 py-4">
              {!courseName && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
                  <p className="font-medium text-yellow-900">⚠️ No course selected</p>
                  <p className="text-yellow-800">Please select a course from your courses list first, then click the "Generate Lecture" button.</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="topic">Lecture Topic *</Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Introduction to Recursion, Database Normalization, Shakespeare's Sonnets"
                />
                <p className="text-xs text-slate-500">
                  What specific topic will this lecture cover?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Lecture Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger id="duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes (1 hour)</SelectItem>
                      <SelectItem value="90">90 minutes (1.5 hours)</SelectItem>
                      <SelectItem value="120">120 minutes (2 hours)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="level">Difficulty Level</Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger id="level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <p className="font-medium text-blue-900 mb-2">📚 The lecture plan will include:</p>
                <ul className="list-disc list-inside text-blue-800 space-y-1">
                  <li>Learning objectives and prerequisites</li>
                  <li>Detailed timeline with timestamps</li>
                  <li>Core content with examples and explanations</li>
                  <li>Interactive activities and discussions</li>
                  <li>Practice problems and assignments</li>
                  <li>Additional resources for students</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={generateLecture}
                  disabled={generating || !courseName}
                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Lecture Plan
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{courseName}</h3>
                  <p className="text-sm text-slate-600">{generatedContent.metadata.topic}</p>
                  <p className="text-xs text-slate-500">
                    {generatedContent.metadata.duration} min • {generatedContent.metadata.level}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGeneratedContent(null)}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    New Lecture
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving || !courseId}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save to Course
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="markdown">Markdown</TabsTrigger>
                </TabsList>
                
                <TabsContent value="preview" className="mt-4">
                  <Card className="p-6 max-h-[500px] overflow-y-auto">
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ 
                        __html: renderMarkdown(generatedContent.markdown)
                      }}
                    />
                  </Card>
                </TabsContent>
                
                <TabsContent value="markdown" className="mt-4">
                  <Card className="p-6 max-h-[500px] overflow-y-auto bg-slate-50">
                    <pre className="text-xs whitespace-pre-wrap font-mono">
                      {generatedContent.markdown}
                    </pre>
                  </Card>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}