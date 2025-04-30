import { createClient } from './supabase';

interface AIResponse {
  content: string;
  error?: string;
}

interface UserContext {
  tasks: any[];
  completionRate: number;
  focusTime: number;
  commonPatterns: any[];
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function getAIResponse(
  message: string,
  context: UserContext,
  userId: string,
  previousMessages: { role: string; content: string }[] = []
): Promise<AIResponse> {
  if (!process.env.NEXT_PUBLIC_OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key is not configured');
  }

  try {
    // Format the context into a more natural language form
    const contextPrompt = `
Current user context:
- Task completion rate: ${context.completionRate.toFixed(1)}%
- Total focus time: ${Math.floor(context.focusTime / 3600)}h ${Math.floor((context.focusTime % 3600) / 60)}m
- Active tasks: ${context.tasks.filter(t => t.status !== 'completed').length}
- Recent tasks: ${context.tasks.slice(0, 3).map(t => t.title).join(', ')}
`;

    const systemPrompt = `You are Guardian Angel, an AI assistant specifically designed to help adults with ADHD manage their tasks and time more effectively. Your responses should be:
1. Clear and concise
2. Structured and easy to follow
3. Encouraging and supportive
4. Focused on practical, actionable advice
5. Mindful of ADHD challenges like time blindness, task initiation, and maintaining focus

Use the provided context to personalize your responses. When suggesting strategies, consider the user's task completion patterns and focus time data.`;

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
          ...previousMessages,
          { role: 'user', content: message }
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
    return {
      content: data.choices[0].message.content
    };
  } catch (error) {
    console.error('Error getting AI response:', error);
    return {
      content: '',
      error: error instanceof Error ? error.message : 'Failed to get AI response'
    };
  }
}

export async function saveConversation(
  userId: string,
  messages: { role: string; content: string; timestamp: Date }[]
): Promise<void> {
  const supabase = createClient();
  
  try {
    const { error } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: userId,
        messages: messages,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error saving conversation:', error);
    throw error;
  }
} 