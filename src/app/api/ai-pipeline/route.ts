import { NextRequest, NextResponse } from 'next/server';

interface PipelineStep {
  id: string;
  type: 'system' | 'context' | 'user' | 'assistant';
  content: string;
  metadata?: {
    tokens?: number;
    role?: string;
    template?: string;
    variables?: Record<string, any>;
  };
}

interface PipelineRequest {
  steps: PipelineStep[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

interface PipelineResponse {
  success: boolean;
  steps: PipelineStep[];
  metadata: {
    totalTokens: number;
    processingTime: number;
    model: string;
    cost?: number;
  };
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check if OpenRouter API key is configured
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    const { steps, model = 'openai/gpt-4o-mini', temperature = 0.7, maxTokens = 1000, stream = false }: PipelineRequest = await request.json();

    if (!steps || !Array.isArray(steps)) {
      return NextResponse.json(
        { error: 'Pipeline steps array is required' },
        { status: 400 }
      );
    }

    // Filter out system and context steps for the actual API call
    const conversationSteps = steps.filter(step => step.type === 'user' || step.type === 'assistant');
    
    // Build the messages array for the API
    const messages: any[] = steps.map(step => ({
      role: step.type === 'user' ? 'user' : 'assistant',
      content: step.content
    }));

    // Add system message if present
    const systemStep = steps.find(step => step.type === 'system');
    if (systemStep) {
      messages.unshift({
        role: 'system',
        content: systemStep.content
      });
    }

    const startTime = Date.now();

    if (stream) {
      // Handle streaming response
      const { default: OpenAI } = await import('openai');
      
      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
        defaultHeaders: {
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
          "X-Title": "Guardian Angel AI Pipeline",
        },
      });

      const stream = await openai.chat.completions.create({
        model: model,
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature,
        stream: true,
      });

      // Create a readable stream with metadata
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            let fullContent = '';
            let tokenCount = 0;

            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                fullContent += content;
                tokenCount += content.split(' ').length; // Rough token estimation
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ 
                  content,
                  tokenCount,
                  timestamp: Date.now()
                })}\n\n`));
              }
            }

            // Send final metadata
            const processingTime = Date.now() - startTime;
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
              metadata: {
                totalTokens: tokenCount,
                processingTime,
                model,
                fullContent
              }
            })}\n\n`));
            
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

    } else {
      // Handle non-streaming response
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
          'X-Title': 'Guardian Angel AI Pipeline',
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          max_tokens: maxTokens,
          temperature: temperature,
          stream: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get AI response');
      }

      const data = await response.json();
      const processingTime = Date.now() - startTime;

      // Create the assistant response step
      const assistantStep: PipelineStep = {
        id: 'assistant-' + Date.now(),
        type: 'assistant',
        content: data.choices[0].message.content,
        metadata: {
          role: 'assistant',
          tokens: data.usage?.completion_tokens || 0,
        }
      };

      // Add the assistant step to the pipeline
      const updatedSteps = [...steps, assistantStep];

      const pipelineResponse: PipelineResponse = {
        success: true,
        steps: updatedSteps,
        metadata: {
          totalTokens: data.usage?.total_tokens || 0,
          processingTime,
          model,
          cost: data.usage?.total_tokens ? (data.usage.total_tokens * 0.00001) : undefined, // Rough cost estimation
        }
      };

      return NextResponse.json(pipelineResponse);

    }

  } catch (error) {
    console.error('AI Pipeline API Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process pipeline',
        steps: [],
        metadata: {
          totalTokens: 0,
          processingTime: 0,
          model: 'unknown'
        }
      },
      { status: 500 }
    );
  }
}

