'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const GenerateImageInputSchema = z.object({
  prompt: z.string().describe('The prompt to send to the Gemini API for image generation.'),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "The generated image as a data URI. Format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

export async function generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
  console.log('[PegasusAI GeminiImage] generateImage flow invoked with prompt:', input.prompt.substring(0, 50) + "...");
  try {
    return await generateImageFlow(input);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[PegasusAI GeminiImage] Server Action generateImage caught error:', err.message, err.stack);
    if (err.message.startsWith('Image Gen (Gemini):')) {
        throw err;
    }
    throw new Error(`Image Gen (Gemini): ${err.message.substring(0, 200)}`);
  }
}

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlowGemini',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async (input) => {
    console.log('[PegasusAI GeminiImage] generateImageFlow (Genkit internal) started.');
    let imageDataUri = '';
    try {
      const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: input.prompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ],
        },
      });

      if (media && media.url) {
        imageDataUri = media.url;
        console.log('[PegasusAI GeminiImage] Successfully generated image data URI.');
      } else {
        console.warn('[PegasusAI GeminiImage] API returned no media URL. Prompt:', input.prompt.substring(0,50) + "...");
        throw new Error('Image Gen (Gemini): The API reported that no image could be generated (no media URL). This might be due to prompt content, safety filters, or other API-side reasons.');
      }

      return { imageDataUri };

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[PegasusAI GeminiImage] Error in generateImageFlow:', err.message, err.stack, 'Prompt:', input.prompt.substring(0,50) + "...");

      if (err.message.startsWith('Image Gen (Gemini):')) {
          throw err; 
      }
      
      if (err.message.includes('GoogleGenerativeAI Error') || err.message.includes('Error fetching from')) {
        const match = err.message.match(/\[\d{3}.*?\]:(.*)/);
        const detailedMessage = match && match[1] ? match[1].trim() : err.message;
        throw new Error(`Image Gen (Gemini): API Error - ${detailedMessage.substring(0,150)}`);
      }
      
      throw new Error(`Image Gen (Gemini): Internal flow error - ${err.message.substring(0,150)}`);
    }
  }
);
