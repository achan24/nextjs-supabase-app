import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Check if OpenRouter API key is configured
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Dynamically import OpenAI to avoid build-time issues
    const { default: OpenAI } = await import('openai');
    
    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "Guardian Angel",
      },
    });

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: "openai/gpt-oss-20b:free",
      messages: messages,
      max_tokens: 4000,
      temperature: 0.7,
      stream: true,
    });

    // Create a readable stream
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('AI Chat API Error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    );
  }
}
