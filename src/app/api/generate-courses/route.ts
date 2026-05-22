// app/api/generate-courses/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}` // Server-side only
    },
    body: JSON.stringify(body)
  });
  
  const data = await response.json();
  return NextResponse.json(data);
}