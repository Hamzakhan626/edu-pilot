/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Ensure this runs in Node.js runtime, not Edge
export const runtime = 'nodejs';

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅ Set' : '❌ Missing');
}

// Initialize Supabase client
const supabase = createClient(
  supabaseUrl || '',
  supabaseKey || ''
);

export async function POST(request: NextRequest) {
  try {
    // Check environment variables first
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { 
          error: 'Server configuration error: Supabase credentials not configured',
          details: 'Please add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env.local file'
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const courseId = formData.get('courseId') as string;
    const fileName = formData.get('fileName') as string;

    if (!file || !courseId) {
      return NextResponse.json(
        { error: 'File and courseId are required' },
        { status: 400 }
      );
    }

    console.log('📤 Processing upload:', fileName);

    // Generate unique file path
    const timestamp = Date.now();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${courseId}/${timestamp}_${safeFileName}`;

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('lesson-files')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('lesson-files')
      .getPublicUrl(filePath);

    const fileUrl = urlData.publicUrl;

    // Extract text based on file type
    let extractedText = '';
    
    try {
      const fileType = file.type;
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      
      console.log('📄 File type:', fileType, '| Extension:', fileExtension);
      
      if (fileType === 'text/plain' || fileExtension === 'txt') {
        extractedText = await file.text();
      } else if (fileType === 'text/markdown' || fileExtension === 'md') {
        extractedText = await file.text();
      } else if (fileType === 'application/pdf' || fileExtension === 'pdf') {
        extractedText = await extractPDFTextSimple(file);
      } else if (
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileExtension === 'docx'
      ) {
        extractedText = await extractDocxText(file);
      } else if (
        fileType === 'application/msword' ||
        fileExtension === 'doc'
      ) {
        extractedText = `File uploaded: ${fileName}\n\nContent extraction for .doc files requires specialized libraries.`;
      } else {
        extractedText = `File uploaded: ${fileName}\n\nContent extraction not supported for this file type.`;
      }
    } catch (extractError) {
      console.error('Text extraction error:', extractError);
      extractedText = `File uploaded: ${fileName}\n\nUnable to extract text content.`;
    }

    console.log('✅ Upload successful:', filePath);

    return NextResponse.json({
      success: true,
      fileUrl,
      extractedText,
      filePath
    });

  } catch (error: any) {
    console.error('Upload handler error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

async function extractPDFTextSimple(file: File): Promise<string> {
  return `PDF File: ${file.name}\n\nPDF content extraction requires additional setup.\n\nFor full PDF text extraction, consider:\n1. Using a cloud service (Google Cloud Vision, AWS Textract)\n2. Setting up a separate microservice with pdf-parse\n3. Using an external API for PDF processing`;
}

async function extractDocxText(file: File): Promise<string> {
  try {
    // Dynamic import to ensure it works in Node.js environment
    const mammoth = (await import('mammoth')).default;
    const buffer = await file.arrayBuffer();
    
    // Convert ArrayBuffer to Buffer
    const nodeBuffer = Buffer.from(buffer);
    
    const result = await mammoth.extractRawText({ 
      buffer: nodeBuffer 
    });
    
    if (result.value && result.value.trim()) {
      return result.value;
    } else {
      return `Document: ${file.name}\n\nDocument content extracted (may be minimal text).`;
    }
  } catch (error) {
    console.error('DOCX extraction error:', error);
    return `Document: ${file.name}\n\nUnable to extract detailed content. Consider converting to PDF or plain text.`;
  }
}