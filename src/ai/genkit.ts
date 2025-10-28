import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.error("CRITICAL ERROR: GOOGLE_API_KEY is not set in the environment variables. Please check your .env file.");
  throw new Error("GOOGLE_API_KEY is not set in the environment variables. Pegasus v1 requires this key to function.");
}

const googleAiPlugin = googleAI({ apiKey });

export const ai = genkit({
  plugins: [googleAiPlugin],
  model: 'googleai/gemini-2.0-flash', 
});
