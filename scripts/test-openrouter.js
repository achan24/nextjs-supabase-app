const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Prefer .env.local if it exists, otherwise fallback to .env
const envLocalPath = path.resolve(__dirname, '../.env.local');
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log('Loaded environment variables from .env.local');
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('Loaded environment variables from .env');
} else {
  console.warn('No .env.local or .env file found.');
}

const OpenAI = require('openai');

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    'X-Title': 'Guardian Angel',
  },
});

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY is missing!');
    process.exit(1);
  }
  try {
    const completion = await openai.chat.completions.create({
      model: 'openai/gpt-oss-20b:free',
      messages: [
        { role: 'user', content: 'Hello! Can you confirm you are working?' }
      ],
      max_tokens: 100,
    });
    console.log('AI Response:', completion.choices[0].message.content);
  } catch (error) {
    console.error('OpenRouter API test failed:', error);
    process.exit(1);
  }
}

main();
