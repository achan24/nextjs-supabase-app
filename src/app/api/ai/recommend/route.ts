import { NextResponse } from 'next/server';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface Task {
  title: string;
  status: string;
}

interface Context {
  type: 'all' | 'task' | 'focus' | 'pattern' | 'strategy';
  tasks: Task[];
  completionRate: number;
  focusTime: number;
  commonPatterns: any[];
}

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: 'OpenRouter API key is not configured' },
      { status: 500 }
    );
  }

  try {
    const context: Context = await request.json();

    const systemPrompt = `You are Guardian Angel, an AI assistant specifically designed to help adults with ADHD manage their tasks and time more effectively. Based on the provided context, generate structured recommendations in the following categories:

1. Task Prioritization: Specific advice on which tasks to focus on and how to organize them
2. Focus Time: Recommendations for optimal work periods and break scheduling
3. Work Patterns: Insights into the user's productivity patterns and suggestions for improvement
4. ADHD Strategies: Specific coping strategies and techniques tailored to ADHD challenges

Each recommendation should be:
- Clear and concise
- Specific and immediately actionable
- Based on the user's patterns and data
- Encouraging and supportive
- Mindful of ADHD challenges

Format your response as a JSON object with the following structure:
{
  "taskRecommendation": "...",
  "focusRecommendation": "...",
  "patternRecommendation": "...",
  "strategyRecommendation": "..."
}`;

    const contextPrompt = `
Current user context:
- Task completion rate: ${context.completionRate.toFixed(1)}%
- Total focus time: ${Math.floor(context.focusTime / 3600)}h ${Math.floor((context.focusTime % 3600) / 60)}m
- Active tasks: ${context.tasks.filter((t: Task) => t.status !== 'completed').length}
- Recent tasks: ${context.tasks.slice(0, 3).map((t: Task) => t.title).join(', ')}
`;

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`,
        'HTTP-Referer': `${process.env.NEXT_PUBLIC_APP_URL}`,
        'X-Title': 'Guardian Angel ADHD Assistant'
      },
      body: JSON.stringify({
        model: 'deepseek-ai/deepseek-coder-33b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'system', content: contextPrompt },
          { role: 'user', content: 'Please provide recommendations based on my current context.' }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.9,
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get AI response');
    }

    const data = await response.json();
    let recommendations;
    try {
      recommendations = JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error('Failed to parse AI response as JSON:', error);
      recommendations = {
        taskRecommendation: data.choices[0].message.content,
        focusRecommendation: "Unable to generate focus recommendations at this time.",
        patternRecommendation: "Unable to generate pattern insights at this time.",
        strategyRecommendation: "Unable to generate strategy recommendations at this time."
      };
    }

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('Error getting AI recommendation:', error);
    return NextResponse.json(
      { error: 'Failed to get AI recommendation' },
      { status: 500 }
    );
  }
} 