/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  CheckCircle,
  X,
  Plus,
  Trash2,
  Brain,
  Clock,
  Target,
  FileText,
} from "lucide-react";

type AIQuizGeneratorModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  courseName: string;
  courseCode: string;
  onQuizzesGenerated: (quizzes: any[]) => void;
  existingQuizzesCount: number;
};

type GeneratedQuiz = {
  id: string;
  title: string;
  description: string;
  total_questions: number;
  passing_score: number;
  time_limit_minutes: number;
  isNew?: boolean;
};

export default function AIQuizGeneratorModal({
  open,
  onOpenChange,
  classId,
  courseName,
  courseCode,
  onQuizzesGenerated,
  existingQuizzesCount,
}: AIQuizGeneratorModalProps) {
  const [step, setStep] = useState<"config" | "generating" | "review">("config");
  const [generating, setGenerating] = useState(false);

  // Configuration state
  const [numQuizzes, setNumQuizzes] = useState("3");
  const [difficulty, setDifficulty] = useState("medium");
  const [questionsPerQuiz, setQuestionsPerQuiz] = useState("10");
  const [timeLimit, setTimeLimit] = useState("15");
  const [passingScore, setPassingScore] = useState("70");
  const [customPrompt, setCustomPrompt] = useState("");

  // Generated quizzes
  const [generatedQuizzes, setGeneratedQuizzes] = useState<GeneratedQuiz[]>([]);

  const resetModal = () => {
    setStep("config");
    setGenerating(false);
    setNumQuizzes("3");
    setDifficulty("medium");
    setQuestionsPerQuiz("10");
    setTimeLimit("15");
    setPassingScore("70");
    setCustomPrompt("");
    setGeneratedQuizzes([]);
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setStep("generating");

      const prompt = `Generate ${numQuizzes} quiz${
        parseInt(numQuizzes) > 1 ? "zes" : ""
      } for the course "${courseCode} - ${courseName}".

Difficulty level: ${difficulty}
Questions per quiz: ${questionsPerQuiz}
Time limit: ${timeLimit} minutes
Passing score: ${passingScore}%

${customPrompt ? `Additional instructions: ${customPrompt}` : ""}

Please generate diverse quiz titles and descriptions that cover different topics from this course.

Return ONLY a JSON array of quiz objects with this exact structure:
[
  {
    "title": "Quiz Title",
    "description": "Brief description of what this quiz covers",
    "total_questions": ${questionsPerQuiz},
    "passing_score": ${passingScore},
    "time_limit_minutes": ${timeLimit}
  }
]

Make each quiz unique with different topics. Return ONLY the JSON array, no other text.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate quizzes");
      }

      const data = await response.json();
      const content = data.content[0].text;

      // Clean and parse the response
      let cleanedContent = content.trim();
      cleanedContent = cleanedContent.replace(/```json\n?/g, "").replace(/```\n?/g, "");

      const quizzes = JSON.parse(cleanedContent);

      // Add IDs and mark as new
      const quizzesWithIds = quizzes.map((quiz: any, index: number) => ({
        ...quiz,
        id: `temp-${Date.now()}-${index}`,
        isNew: true,
      }));

      setGeneratedQuizzes(quizzesWithIds);
      setStep("review");
      toast.success(`Generated ${quizzes.length} quizzes successfully!`);
    } catch (err: any) {
      console.error("Generation error:", err);
      toast.error(err?.message || "Failed to generate quizzes");
      setStep("config");
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateQuiz = (index: number, field: string, value: any) => {
    setGeneratedQuizzes((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveQuiz = (index: number) => {
    setGeneratedQuizzes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddQuiz = () => {
    const newQuiz: GeneratedQuiz = {
      id: `temp-${Date.now()}`,
      title: "New Quiz",
      description: "",
      total_questions: parseInt(questionsPerQuiz),
      passing_score: parseInt(passingScore),
      time_limit_minutes: parseInt(timeLimit),
      isNew: true,
    };
    setGeneratedQuizzes((prev) => [...prev, newQuiz]);
  };

  const handleSave = async () => {
    if (generatedQuizzes.length === 0) {
      toast.error("No quizzes to save");
      return;
    }

    onQuizzesGenerated(generatedQuizzes);
    onOpenChange(false);
    resetModal();
  };

  const handleClose = () => {
    if (generatedQuizzes.length > 0) {
      if (
        !confirm(
          "You have unsaved quizzes. Are you sure you want to close without saving?"
        )
      ) {
        return;
      }
    }
    onOpenChange(false);
    resetModal();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Quiz Generator
          </DialogTitle>
          <DialogDescription>
            Generate quizzes automatically for {courseCode} - {courseName}
          </DialogDescription>
        </DialogHeader>

        {/* Configuration Step */}
        {step === "config" && (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numQuizzes">Number of Quizzes</Label>
                <Input
                  id="numQuizzes"
                  type="number"
                  min="1"
                  max="10"
                  value={numQuizzes}
                  onChange={(e) => setNumQuizzes(e.target.value)}
                  placeholder="3"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
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
                <Label htmlFor="questionsPerQuiz">Questions per Quiz</Label>
                <Input
                  id="questionsPerQuiz"
                  type="number"
                  min="5"
                  max="50"
                  value={questionsPerQuiz}
                  onChange={(e) => setQuestionsPerQuiz(e.target.value)}
                  placeholder="10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  min="5"
                  max="180"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  placeholder="15"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="passingScore">Passing Score (%)</Label>
                <Input
                  id="passingScore"
                  type="number"
                  min="0"
                  max="100"
                  value={passingScore}
                  onChange={(e) => setPassingScore(e.target.value)}
                  placeholder="70"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customPrompt">
                Additional Instructions (Optional)
              </Label>
              <Textarea
                id="customPrompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="E.g., Focus on chapters 1-3, include more practical questions, etc."
                rows={3}
              />
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                What will be generated:
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• {numQuizzes} unique quiz{parseInt(numQuizzes) > 1 ? "zes" : ""}</li>
                <li>• {questionsPerQuiz} questions each</li>
                <li>• {timeLimit} minute time limit</li>
                <li>• {passingScore}% passing score</li>
                <li>• {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} difficulty</li>
              </ul>
            </div>
          </div>
        )}

        {/* Generating Step */}
        {step === "generating" && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-purple-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <Loader2 className="h-16 w-16 text-purple-600 animate-spin relative" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Generating Quizzes...</h3>
            <p className="text-gray-500 text-center max-w-md">
              AI is creating {numQuizzes} unique quiz{parseInt(numQuizzes) > 1 ? "zes" : ""} for your course.
              This may take a moment.
            </p>
          </div>
        )}

        {/* Review Step */}
        {step === "review" && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">Generated Quizzes</h3>
                <p className="text-sm text-gray-500">
                  Review and edit the quizzes before saving
                </p>
              </div>
              <Button onClick={handleAddQuiz} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Quiz
              </Button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {generatedQuizzes.map((quiz, index) => (
                <div
                  key={quiz.id}
                  className="p-4 border rounded-lg bg-slate-50 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline">Quiz {index + 1}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveQuiz(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={quiz.title}
                      onChange={(e) =>
                        handleUpdateQuiz(index, "title", e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={quiz.description}
                      onChange={(e) =>
                        handleUpdateQuiz(index, "description", e.target.value)
                      }
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Questions</Label>
                      <Input
                        type="number"
                        value={quiz.total_questions}
                        onChange={(e) =>
                          handleUpdateQuiz(
                            index,
                            "total_questions",
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Time (min)</Label>
                      <Input
                        type="number"
                        value={quiz.time_limit_minutes}
                        onChange={(e) =>
                          handleUpdateQuiz(
                            index,
                            "time_limit_minutes",
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Pass (%)</Label>
                      <Input
                        type="number"
                        value={quiz.passing_score}
                        onChange={(e) =>
                          handleUpdateQuiz(
                            index,
                            "passing_score",
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">
                  Ready to save {generatedQuizzes.length} quiz
                  {generatedQuizzes.length !== 1 ? "zes" : ""}
                </span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "config" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={generating}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Quizzes
              </Button>
            </>
          )}

          {step === "generating" && (
            <Button disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </Button>
          )}

          {step === "review" && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("config");
                  setGeneratedQuizzes([]);
                }}
              >
                Back
              </Button>
              <Button onClick={handleSave}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Save {generatedQuizzes.length} Quiz
                {generatedQuizzes.length !== 1 ? "zes" : ""}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}