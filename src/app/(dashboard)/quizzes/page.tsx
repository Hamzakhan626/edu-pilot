/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  Brain, 
  Clock, 
  Trophy, 
  Target, 
  CheckCircle,
  AlertCircle,
  Flame,
  Play
} from 'lucide-react';
import { mockQuizzes } from '@/lib/mock-data';
import { getCurrentUser } from '@/lib/auth';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correct: number;
}

interface Quiz {
  id: string;
  title: string;
  class: string;
  date: string;
  duration: number;
  questions: number | Question[];
  score?: number;
  streak: number;
  status: 'upcoming' | 'completed';
}

interface ActiveQuiz {
  id: string;
  title: string;
  questions: Question[];
}

const sampleQuiz: ActiveQuiz = {
  id: '1',
  title: 'Derivatives and Integration',
  questions: [
    {
      id: '1',
      question: 'What is the derivative of x²?',
      options: ['x', '2x', 'x²', '2'],
      correct: 1
    },
    {
      id: '2',
      question: 'What is the integral of 2x?',
      options: ['x²', 'x² + C', '2x²', '2x + C'],
      correct: 1
    }
  ]
};

export default function QuizzesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [quizStarted, setQuizStarted] = useState<boolean>(false);
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  // Type assertion for mock data
  const quizzes: Quiz[] = mockQuizzes as Quiz[];

  const upcomingQuizzes = quizzes.filter((q: Quiz) => q.status === 'upcoming');
  const completedQuizzes = quizzes.filter((q: Quiz) => q.status === 'completed');

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(sampleQuiz);
    setQuizStarted(true);
    setCurrentQuestion(0);
    setSelectedAnswer('');
  };

  const handleNextQuestion = () => {
    if (activeQuiz && currentQuestion < activeQuiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer('');
    } else {
      setQuizCompleted(true);
    }
  };

  if (!user) return <div>Loading...</div>;

  // Quiz Taking Interface
  if (quizStarted && activeQuiz && !quizCompleted) {
    const question = activeQuiz.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / activeQuiz.questions.length) * 100;

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Quiz Header */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{activeQuiz.title}</CardTitle>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>15:30</span>
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white">
                  Question {currentQuestion + 1} of {activeQuiz.questions.length}
                </Badge>
              </div>
            </div>
            <Progress value={progress} className="mt-4 bg-white/20" />
          </CardHeader>
        </Card>

        {/* Question Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">{question.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
              {question.options.map((option: string, index: number) => (
                <div key={index} className="flex items-center space-x-3 p-4 border rounded-xl hover:bg-gray-50 transition-colors">
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer font-medium">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="flex justify-between items-center pt-6">
              <Button variant="outline" onClick={() => setQuizStarted(false)}>
                Exit Quiz
              </Button>
              <Button 
                onClick={handleNextQuestion} 
                disabled={!selectedAnswer}
                className="px-8"
              >
                {currentQuestion < activeQuiz.questions.length - 1 ? 'Next Question' : 'Submit Quiz'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Quiz Completed
  if (quizCompleted) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Quiz Completed!</h1>
            <p className="text-lg text-gray-600 mb-6">
              Great job! You&apos;ve maintained your learning streak.
            </p>
            <div className="flex justify-center space-x-8 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">85%</div>
                <div className="text-gray-500">Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">13</div>
                <div className="text-gray-500">Streak</div>
              </div>
            </div>
            <Button onClick={() => window.location.reload()} className="px-8">
              Back to Quizzes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Quizzes Page
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quizzes</h1>
          <p className="text-gray-500 mt-1">Test your knowledge and maintain your streak</p>
        </div>
        {user.role === 'teacher' && (
          <Button>
            <Brain className="mr-2 h-4 w-4" />
            Create Quiz
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-orange-100 rounded-xl mr-4">
              <Flame className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">12</p>
              <p className="text-sm text-gray-500">Current Streak</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-green-100 rounded-xl mr-4">
              <Target className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">87%</p>
              <p className="text-sm text-gray-500">Average Score</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-blue-100 rounded-xl mr-4">
              <Brain className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{upcomingQuizzes.length}</p>
              <p className="text-sm text-gray-500">Upcoming</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-purple-100 rounded-xl mr-4">
              <CheckCircle className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedQuizzes.length}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Quizzes */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Upcoming Quizzes</h2>
          {upcomingQuizzes.map((quiz: Quiz) => (
            <Card key={quiz.id} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{quiz.title}</h3>
                    <p className="text-sm text-gray-500">{quiz.class}</p>
                  </div>
                  <Badge variant="outline">
                    {new Date(quiz.date).toLocaleDateString()}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {quiz.duration} min
                  </span>
                  <span className="flex items-center">
                    <Brain className="h-4 w-4 mr-1" />
                    {Array.isArray(quiz.questions) ? quiz.questions.length : quiz.questions} questions
                  </span>
                  <span className="flex items-center">
                    <Flame className="h-4 w-4 mr-1" />
                    Streak: {quiz.streak}
                  </span>
                </div>

                <Button onClick={() => startQuiz(quiz)} className="w-full">
                  <Play className="mr-2 h-4 w-4" />
                  Start Quiz
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Completed Quizzes */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Results</h2>
          {completedQuizzes.map((quiz: Quiz) => (
            <Card key={quiz.id} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{quiz.title}</h3>
                    <p className="text-sm text-gray-500">{quiz.class}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">{quiz.score}%</div>
                    <Badge variant="default">Completed</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Performance</span>
                    <span>{quiz.score}%</span>
                  </div>
                  <Progress value={quiz.score} className="h-2" />
                  <p className="text-xs text-gray-500 flex items-center">
                    <Flame className="h-3 w-3 mr-1 text-orange-500" />
                    Streak maintained: +{quiz.streak} days
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}