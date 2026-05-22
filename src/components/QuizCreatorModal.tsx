/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import {
  Plus,
  X,
  Loader2,
  Upload,
  FileText,
  Check,
  Settings,
  Clock,
  ListChecks,
  Calendar,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/auth";
import { toast } from "sonner";
import { Separator } from "./ui/separator";

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: "multiple_choice" | "short_answer" | "essay";
  options: string[];
  correct_answer: string;
  points: number;
  question_order: number;
}

interface QuizCreatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseName: string;
  onQuizCreated: (quiz: any) => void;
}

export default function QuizCreatorModal({
  open,
  onOpenChange,
  courseId,
  courseName,
  onQuizCreated,
}: QuizCreatorModalProps) {
  const [activeTab, setActiveTab] = useState("details");
  const [loading, setLoading] = useState(false);

  // Quiz Details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("Quick Quiz");
  const [difficulty, setDifficulty] = useState("medium");
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [passingScore, setPassingScore] = useState(70);
  const [timeLimit, setTimeLimit] = useState<number | null>(30);

  // Settings
  const [allowLateSubmission, setAllowLateSubmission] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);

  // Questions
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileQuestions, setFileQuestions] = useState<any[]>([]);

  const handleCreateQuiz = async () => {
    if (!title.trim()) {
      toast.error("Please enter a quiz title");
      return;
    }

    if (questions.length === 0 && fileQuestions.length === 0) {
      toast.error("Please add at least one question to the quiz");
      return;
    }

    setLoading(true);

    try {
      console.log("Creating quiz for courseId:", courseId);

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      // Create the quiz using course_id (not class_id)
      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          course_id: courseId, // ✅ Using course_id instead of class_id
          title: title.trim(),
          description: description.trim() || null,
          type,
          difficulty,
          total_questions: questions.length + fileQuestions.length,
          passing_score: passingScore,
          time_limit_minutes: timeLimit,
          allow_late_submission: allowLateSubmission,
          show_results: showResults,
          shuffle_questions: shuffleQuestions,
          status: "draft",
          section: null,
          created_by: user.id,
        })
        .select()
        .single();

      if (quizError) {
        console.error("Quiz insert error:", {
          error: quizError,
          courseId,
        });
        throw new Error(`Failed to create quiz: ${quizError.message}`);
      }

      console.log("Quiz created successfully:", quiz.id);

      // Combine manual and file questions
      const allQuestions = [...questions, ...fileQuestions].map((q, index) => ({
        quiz_id: quiz.id,
        question_text: q.question_text,
        question_type: q.question_type || "multiple_choice",
        options: q.options || [],
        correct_answer: q.correct_answer || "",
        points: q.points || 1,
        question_order: index + 1,
      }));

      console.log("Inserting questions:", allQuestions.length);

      // Insert all questions
      const { error: questionsError } = await supabase
        .from("quiz_questions")
        .insert(allQuestions);

      if (questionsError) {
        console.error("Questions insert error:", questionsError);

        // Delete the quiz if questions fail to insert
        await supabase.from("quizzes").delete().eq("id", quiz.id);

        throw new Error(`Failed to add questions: ${questionsError.message}`);
      }

      console.log("Quiz and questions saved successfully");
      toast.success(
        `Quiz "${title}" created successfully with ${allQuestions.length} questions`,
      );
      onQuizCreated(quiz);
      handleClose();
    } catch (error: any) {
      console.error("Create quiz error:", error);
      toast.error(error.message || "Failed to create quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFile = async (file: File) => {
    setUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("quizId", "temp"); // We'll use a temp ID for parsing

      const response = await fetch("/api/upload-quiz-file", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process file");
      }

      const { parsedQuestions, message } = await response.json();

      if (parsedQuestions && parsedQuestions.length > 0) {
        setFileQuestions(parsedQuestions);
        toast.success(
          message || `Processed ${parsedQuestions.length} questions from file`,
        );
      } else {
        toast.warning("No questions could be parsed from the file");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleAddQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: crypto.randomUUID(),
      question_text: "",
      question_type: "multiple_choice",
      options: ["", "", "", ""],
      correct_answer: "",
      points: 1,
      question_order: questions.length + 1,
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleQuestionChange = (id: string, field: string, value: any) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, [field]: value } : q)),
    );
  };

  const handleOptionChange = (
    questionId: string,
    optionIndex: number,
    value: string,
  ) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const newOptions = [...q.options];
          newOptions[optionIndex] = value;
          return { ...q, options: newOptions };
        }
        return q;
      }),
    );
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleClose = () => {
    setActiveTab("details");
    setTitle("");
    setDescription("");
    setType("Quick Quiz");
    setDifficulty("medium");
    setTotalQuestions(10);
    setPassingScore(70);
    setTimeLimit(30);
    setAllowLateSubmission(false);
    setShowResults(true);
    setShuffleQuestions(false);
    setQuestions([]);
    setFileQuestions([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ListChecks className="h-6 w-6 text-blue-600" />
            Create New Quiz
          </DialogTitle>
          <DialogDescription>Add a new quiz to {courseName}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="details">Quiz Details</TabsTrigger>
            <TabsTrigger value="questions">
              Questions ({questions.length + fileQuestions.length})
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Quiz Details Tab */}
          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Quiz Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Mid-term Exam, Chapter 1 Quiz, Final Assessment"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this quiz covers, instructions, or special notes..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Quiz Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Quick Quiz">Quick Quiz</SelectItem>
                      <SelectItem value="Exam">Exam</SelectItem>
                      <SelectItem value="Practice Test">
                        Practice Test
                      </SelectItem>
                      <SelectItem value="Assignment">Assignment</SelectItem>
                      <SelectItem value="Pop Quiz">Pop Quiz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
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
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalQuestions">Number of Questions</Label>
                  <Input
                    id="totalQuestions"
                    type="number"
                    min="1"
                    max="100"
                    value={totalQuestions}
                    onChange={(e) =>
                      setTotalQuestions(parseInt(e.target.value) || 10)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passingScore">Passing Score (%)</Label>
                  <Input
                    id="passingScore"
                    type="number"
                    min="0"
                    max="100"
                    value={passingScore}
                    onChange={(e) =>
                      setPassingScore(parseInt(e.target.value) || 70)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeLimit">
                    Time Limit (minutes, optional)
                  </Label>
                  <Input
                    id="timeLimit"
                    type="number"
                    min="1"
                    value={timeLimit || ""}
                    onChange={(e) =>
                      setTimeLimit(
                        e.target.value ? parseInt(e.target.value) : null,
                      )
                    }
                    placeholder="No limit"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Quiz Questions</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      document.getElementById("file-upload")?.click()
                    }
                    disabled={uploadingFile}
                  >
                    {uploadingFile ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload Questions
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".json,.txt,.pdf,.docx,.doc,.md"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadFile(file);
                    }}
                    className="hidden"
                  />
                  <Button size="sm" onClick={handleAddQuestion}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                </div>
              </div>

              {fileQuestions.length > 0 && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-800">
                          {fileQuestions.length} questions loaded from file
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className="bg-white text-green-700"
                      >
                        Ready to use
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {questions.length === 0 && fileQuestions.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                  <ListChecks className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                  <p className="text-slate-500 mb-2">No questions added yet</p>
                  <p className="text-sm text-slate-400 mb-4">
                    Add questions manually or upload from a file
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {questions.map((question, index) => (
                    <Card key={question.id} className="border-slate-200">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-slate-50">
                              Question {index + 1}
                            </Badge>
                            <Badge variant="outline">
                              {question.question_type.replace("_", " ")}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveQuestion(question.id)}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label>Question Text</Label>
                            <Textarea
                              value={question.question_text}
                              onChange={(e) =>
                                handleQuestionChange(
                                  question.id,
                                  "question_text",
                                  e.target.value,
                                )
                              }
                              placeholder="Enter the question..."
                              rows={2}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Question Type</Label>
                              <Select
                                value={question.question_type}
                                onValueChange={(value: any) =>
                                  handleQuestionChange(
                                    question.id,
                                    "question_type",
                                    value,
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="multiple_choice">
                                    Multiple Choice
                                  </SelectItem>
                                  <SelectItem value="short_answer">
                                    Short Answer
                                  </SelectItem>
                                  <SelectItem value="essay">Essay</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Points</Label>
                              <Input
                                type="number"
                                min="1"
                                value={question.points}
                                onChange={(e) =>
                                  handleQuestionChange(
                                    question.id,
                                    "points",
                                    parseInt(e.target.value) || 1,
                                  )
                                }
                              />
                            </div>
                          </div>

                          {question.question_type === "multiple_choice" && (
                            <div className="space-y-3">
                              <Label>Options</Label>
                              {question.options.map((option, optIndex) => (
                                <div
                                  key={optIndex}
                                  className="flex items-center gap-2"
                                >
                                  <Input
                                    value={option}
                                    onChange={(e) =>
                                      handleOptionChange(
                                        question.id,
                                        optIndex,
                                        e.target.value,
                                      )
                                    }
                                    placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                                  />
                                  <Button
                                    type="button"
                                    variant={
                                      question.correct_answer === option
                                        ? "default"
                                        : "outline"
                                    }
                                    size="sm"
                                    onClick={() =>
                                      handleQuestionChange(
                                        question.id,
                                        "correct_answer",
                                        option,
                                      )
                                    }
                                    className="whitespace-nowrap"
                                  >
                                    {question.correct_answer === option ? (
                                      <>
                                        <Check className="h-3 w-3 mr-1" />
                                        Correct
                                      </>
                                    ) : (
                                      "Mark Correct"
                                    )}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}

                          {(question.question_type === "short_answer" ||
                            question.question_type === "essay") && (
                            <div className="space-y-2">
                              <Label>Correct Answer / Sample Answer</Label>
                              <Textarea
                                value={question.correct_answer}
                                onChange={(e) =>
                                  handleQuestionChange(
                                    question.id,
                                    "correct_answer",
                                    e.target.value,
                                  )
                                }
                                placeholder="Enter the expected answer..."
                                rows={
                                  question.question_type === "essay" ? 4 : 2
                                }
                              />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Allow Late Submission</Label>
                  <p className="text-sm text-slate-500">
                    Students can submit after the deadline
                  </p>
                </div>
                <Switch
                  checked={allowLateSubmission}
                  onCheckedChange={setAllowLateSubmission}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Show Results to Students</Label>
                  <p className="text-sm text-slate-500">
                    Students can see their scores and answers
                  </p>
                </div>
                <Switch
                  checked={showResults}
                  onCheckedChange={setShowResults}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Shuffle Questions</Label>
                  <p className="text-sm text-slate-500">
                    Questions appear in random order for each student
                  </p>
                </div>
                <Switch
                  checked={shuffleQuestions}
                  onCheckedChange={setShuffleQuestions}
                />
              </div>

              <Separator />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Quiz Settings Summary
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>
                    •{" "}
                    {allowLateSubmission
                      ? "Late submissions allowed"
                      : "No late submissions"}
                  </li>
                  <li>
                    •{" "}
                    {showResults
                      ? "Results visible to students"
                      : "Results hidden from students"}
                  </li>
                  <li>
                    •{" "}
                    {shuffleQuestions
                      ? "Questions shuffled"
                      : "Questions in fixed order"}
                  </li>
                  <li>• Passing score: {passingScore}%</li>
                  {timeLimit && <li>• Time limit: {timeLimit} minutes</li>}
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            {activeTab === "details" && (
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            )}
            {activeTab !== "details" && (
              <Button
                variant="outline"
                onClick={() => {
                  const tabs = ["details", "questions", "settings"];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1]);
                }}
              >
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {activeTab !== "settings" && (
              <Button
                variant="outline"
                onClick={() => {
                  const tabs = ["details", "questions", "settings"];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex < tabs.length - 1)
                    setActiveTab(tabs[currentIndex + 1]);
                }}
              >
                Next
              </Button>
            )}

            {activeTab === "settings" && (
              <Button
                onClick={handleCreateQuiz}
                disabled={loading || !title.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Quiz...
                  </>
                ) : (
                  <>
                    <ListChecks className="h-4 w-4 mr-2" />
                    Create Quiz
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
