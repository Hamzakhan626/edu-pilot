/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { extname } from 'path';
import mammoth from 'mammoth';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for server-side operations
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const quizId = formData.get('quizId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!quizId) {
      return NextResponse.json(
        { error: 'No quiz ID provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/json',
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/markdown'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload JSON, TXT, PDF, DOCX, DOC, or MD files.' },
        { status: 400 }
      );
    }

    // Check file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    let extractedText = '';
    let parsedQuestions = [];

    // Extract text based on file type
    if (file.type === 'application/json') {
      try {
        const jsonContent = JSON.parse(buffer.toString());
        
        // Validate JSON structure
        if (Array.isArray(jsonContent)) {
          // Array of questions
          parsedQuestions = jsonContent;
          extractedText = JSON.stringify(jsonContent, null, 2);
        } else if (jsonContent.questions && Array.isArray(jsonContent.questions)) {
          // Object with questions array
          parsedQuestions = jsonContent.questions;
          extractedText = JSON.stringify(jsonContent, null, 2);
        } else {
          throw new Error('Invalid JSON structure. Expected array of questions or object with "questions" array.');
        }
      } catch (error: any) {
        return NextResponse.json(
          { error: `Invalid JSON: ${error.message}` },
          { status: 400 }
        );
      }
    } else if (file.type.includes('word') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // DOCX/DOC file
      try {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
        
        // Simple parsing for questions
        parsedQuestions = parseTextToQuestions(extractedText);
      } catch (error: any) {
        return NextResponse.json(
          { error: `Failed to process Word document: ${error.message}` },
          { status: 400 }
        );
      }
    } else if (file.type === 'application/pdf') {
      // PDF file - in a real app, you'd use a PDF parsing library
      extractedText = '[PDF content extraction would require additional libraries]';
      parsedQuestions = parseTextToQuestions(extractedText);
    } else {
      // TXT, MD, or other text files
      extractedText = buffer.toString();
      parsedQuestions = parseTextToQuestions(extractedText);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `quiz-${quizId}-${timestamp}-${originalName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('quiz-files')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('quiz-files')
      .getPublicUrl(fileName);

    const fileUrl = urlData.publicUrl;

    return NextResponse.json({
      success: true,
      fileUrl,
      extractedText,
      parsedQuestions,
      originalFileName: file.name,
      message: `Successfully processed ${parsedQuestions.length} questions from file`
    });

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}

// Helper function to parse text into questions
function parseTextToQuestions(text: string): any[] {
  const questions = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  let currentQuestion: any = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for question indicators
    if (line.match(/^\d+[\.\)]\s/) || line.match(/^Q\d*[:\.]\s/i) || !currentQuestion) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }
      
      currentQuestion = {
        question_text: line.replace(/^(Q\d*[:\.]\s*|\d+[\.\)]\s*)/i, ''),
        question_type: 'multiple_choice',
        options: [],
        correct_answer: '',
        points: 1,
        explanation: ''
      };
    } 
    // Look for options (A, B, C, D or 1, 2, 3, 4)
    else if (line.match(/^[A-D][\.\)]\s/i) || line.match(/^[1-4][\.\)]\s/)) {
      const optionText = line.replace(/^[A-D1-4][\.\)]\s*/i, '');
      currentQuestion.options.push(optionText);
      
      // Check if this is the correct answer (marked with * or (correct))
      if (line.includes('*') || line.toLowerCase().includes('(correct)')) {
        currentQuestion.correct_answer = optionText.replace(/\*\s*$/, '').replace(/\s*\(correct\)/i, '').trim();
      }
    }
    // Look for correct answer indicator
    else if (line.toLowerCase().startsWith('answer:') || line.toLowerCase().startsWith('correct:')) {
      currentQuestion.correct_answer = line.replace(/^(answer|correct):\s*/i, '').trim();
    }
    // Look for explanation
    else if (line.toLowerCase().startsWith('explanation:')) {
      currentQuestion.explanation = line.replace(/^explanation:\s*/i, '').trim();
    }
    // Add to question text for multi-line questions
    else if (currentQuestion && !currentQuestion.question_text.includes('\n')) {
      currentQuestion.question_text += '\n' + line;
    }
  }
  
  if (currentQuestion) {
    questions.push(currentQuestion);
  }
  
  return questions;
}