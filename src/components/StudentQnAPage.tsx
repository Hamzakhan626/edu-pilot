/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Loader2, 
  Sparkles, 
  User, 
  Bot, 
  BookOpen, 
  History,
  Trash2,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  GraduationCap,
  Lightbulb,
  Code,
  Calculator,
  Globe,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  subject?: string;
  helpful?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages: Message[];
  subject: string;
}

const SUBJECTS = [
  { value: 'general', label: 'General', icon: Globe },
  { value: 'mathematics', label: 'Mathematics', icon: Calculator },
  { value: 'programming', label: 'Programming', icon: Code },
  { value: 'science', label: 'Science', icon: Lightbulb },
  { value: 'literature', label: 'Literature', icon: BookOpen },
  { value: 'history', label: 'History', icon: GraduationCap },
];

const SUGGESTED_QUESTIONS = [
  "Explain the concept of derivatives in calculus",
  "What's the difference between REST and GraphQL?",
  "How does photosynthesis work?",
  "Can you explain the French Revolution?",
  "Help me understand object-oriented programming",
  "What are the laws of thermodynamics?",
];

export function StudentQnAPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load conversations from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('student_qna_conversations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Convert string timestamps back to Date objects
        const withDates = parsed.map((conv: any) => ({
          ...conv,
          timestamp: new Date(conv.timestamp),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setConversations(withDates);
      } catch (e) {
        console.error('Failed to load conversations:', e);
      }
    }
  }, []);

  // Save conversations to localStorage
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('student_qna_conversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputMessage]);

  const generateId = () => crypto.randomUUID();

  const startNewConversation = () => {
    setCurrentConversation(null);
    setMessages([]);
    setInputMessage('');
    setSelectedSubject('general');
  };

  const saveConversation = (messagesToSave: Message[], subject: string) => {
    if (messagesToSave.length === 0) return;

    const firstUserMessage = messagesToSave.find(m => m.role === 'user');
    const title = firstUserMessage 
      ? firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
      : 'New Conversation';

    const conversation: Conversation = {
      id: currentConversation?.id || generateId(),
      title,
      lastMessage: messagesToSave[messagesToSave.length - 1].content.slice(0, 100),
      timestamp: new Date(),
      messages: messagesToSave,
      subject
    };

    setConversations(prev => {
      const existing = prev.findIndex(c => c.id === conversation.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = conversation;
        return updated;
      }
      return [conversation, ...prev];
    });

    setCurrentConversation(conversation);
  };

  const loadConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation);
    setMessages(conversation.messages);
    setSelectedSubject(conversation.subject);
    setSidebarOpen(false);
  };

  const deleteConversation = (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (currentConversation?.id === id) {
      startNewConversation();
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
      subject: selectedSubject
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
      if (!apiKey) {
        throw new Error('API key not configured');
      }

      const systemPrompt = `You are an expert educational AI assistant dedicated to helping students learn and understand complex topics. Your role is to:

1. **Be Patient and Supportive**: Explain concepts clearly and be willing to rephrase or provide alternative explanations.

2. **Be Accurate and Thorough**: Provide detailed, accurate information with examples when helpful.

3. **Encourage Learning**: Ask guiding questions, provide study tips, and encourage deeper understanding.

4. **Adapt to the Student's Level**: Based on the subject matter, adjust your explanations to be appropriate for the student's apparent knowledge level.

5. **Include Practical Examples**: When applicable, include real-world applications, code snippets, or visual descriptions.

6. **Cite Sources**: Mention when information comes from established academic sources or widely accepted principles.

7. **Handle Different Subjects Appropriately**:
   - **Mathematics**: Show step-by-step solutions, explain formulas
   - **Programming**: Provide code examples with explanations
   - **Science**: Explain mechanisms, include relevant equations
   - **Humanities**: Provide historical/contextual background
   - **General**: Give comprehensive, well-structured answers

Current subject focus: ${selectedSubject}

Format responses with:
- Clear headings and structure
- Bullet points for lists
- **Bold** for key terms
- \`code\` for technical terms or code
- Step-by-step breakdowns for complex problems

If a question is unclear, ask for clarification. If you're not sure about something, be honest about limitations.`;

      const conversationHistory = updatedMessages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

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
            ...conversationHistory
          ],
          temperature: 0.7,
          max_tokens: 4000,
          top_p: 0.9
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: data.choices[0].message.content,
        timestamp: new Date(),
        subject: selectedSubject
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      saveConversation(finalMessages, selectedSubject);

    } catch (error: any) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: `I apologize, but I encountered an error: ${error.message}. Please try again or check your API configuration.`,
        timestamp: new Date(),
        subject: selectedSubject
      };
      
      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      saveConversation(finalMessages, selectedSubject);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const markHelpful = (messageId: string, helpful: boolean) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, helpful } : msg
    ));
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderMessageContent = (content: string) => {
    // Simple markdown rendering
    return content
      .replace(/```(\w+)?\n([\s\S]+?)```/g, '<pre class="bg-gray-800 text-gray-100 p-3 rounded my-2 overflow-x-auto"><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
      .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-gray">
        {/* Sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Conversation History
              </SheetTitle>
              <SheetDescription>
                Your previous Q&A sessions
              </SheetDescription>
            </SheetHeader>
            
            <div className="p-4">
              <Button 
                onClick={startNewConversation}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 mb-4"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                New Question
              </Button>

              <ScrollArea className="h-[calc(100vh-180px)]">
                <div className="space-y-2">
                  {conversations.map((conv) => {
                    const SubjectIcon = SUBJECTS.find(s => s.value === conv.subject)?.icon || Globe;
                    return (
                      <Card
                        key={conv.id}
                        className={`p-3 cursor-pointer hover:bg-gray dark:hover:bg-gray transition-colors ${
                          currentConversation?.id === conv.id ? 'border-blue-500 border-2' : ''
                        }`}
                        onClick={() => loadConversation(conv)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-1">
                              <SubjectIcon className="h-3 w-3 text-gray-500" />
                              <p className="font-medium text-sm truncate">{conv.title}</p>
                            </div>
                            <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                            <p className="text-xs text-gray-400 mt-1">{formatTimestamp(conv.timestamp)}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversation(conv.id);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                  
                  {conversations.length === 0 && (
                    <div className="text-center py-8">
                      <MessageSquare className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">No conversations yet</p>
                      <p className="text-xs text-gray-400">Start asking questions!</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </SheetContent>
        </Sheet>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-white dark:bg-gray border-b px-4 py-3">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden"
                >
                  <History className="h-5 w-5" />
                </Button>
                
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="font-semibold text-lg">AI Learning Assistant</h1>
                    <p className="text-xs text-gray-500">Ask any educational question</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((subject) => {
                      const Icon = subject.icon;
                      return (
                        <SelectItem key={subject.value} value={subject.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {subject.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startNewConversation}
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center mx-auto mb-6">
                    <Bot className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">How can I help you learn today?</h2>
                  <p className="text-gray-500 mb-8">
                    Ask me anything about {SUBJECTS.find(s => s.value === selectedSubject)?.label.toLowerCase()} or any other subject!
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                    {SUGGESTED_QUESTIONS.map((question, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="justify-start h-auto py-3 px-4 text-left"
                        onClick={() => setInputMessage(question)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{question}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.role === 'assistant' && (
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600">
                            <Bot className="h-4 w-4 text-white" />
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className={`group relative max-w-[80%] ${message.role === 'user' ? 'order-1' : ''}`}>
                        <Card className={`p-4 ${
                          message.role === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white dark:bg-gray'
                        }`}>
                          <div 
                            className={`prose prose-sm max-w-none ${
                              message.role === 'user' ? 'text-white' : ''
                            }`}
                            dangerouslySetInnerHTML={{ 
                              __html: renderMessageContent(message.content)
                            }}
                          />
                          
                          <div className={`flex items-center justify-between mt-2 text-xs ${
                            message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            <span>{formatTimestamp(message.timestamp)}</span>
                            
                            {message.role === 'assistant' && (
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => copyToClipboard(message.content, message.id)}
                                    >
                                      {copiedId === message.id ? (
                                        <Check className="h-3 w-3" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Copy response</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={`h-6 w-6 p-0 ${
                                        message.helpful === true ? 'text-green-600' : ''
                                      }`}
                                      onClick={() => markHelpful(message.id, true)}
                                    >
                                      <ThumbsUp className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Helpful</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={`h-6 w-6 p-0 ${
                                        message.helpful === false ? 'text-red-600' : ''
                                      }`}
                                      onClick={() => markHelpful(message.id, false)}
                                    >
                                      <ThumbsDown className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Not helpful</TooltipContent>
                                </Tooltip>
                              </div>
                            )}
                          </div>
                        </Card>
                      </div>

                      {message.role === 'user' && (
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="bg-gray-300 dark:bg-gray-600">
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600">
                          <Bot className="h-4 w-4 text-white" />
                        </AvatarFallback>
                      </Avatar>
                      <Card className="p-4">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-gray-500">Thinking...</span>
                        </div>
                      </Card>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t bg-white dark:bg-gray p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={`Ask a question about ${SUBJECTS.find(s => s.value === selectedSubject)?.label.toLowerCase()}...`}
                    className="min-h-[44px] max-h-[200px] resize-none pr-10"
                    disabled={isLoading}
                  />
                  {inputMessage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-2 h-6 w-6 p-0"
                      onClick={() => setInputMessage('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="h-auto bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Press Enter to send, Shift + Enter for new line
              </p>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}