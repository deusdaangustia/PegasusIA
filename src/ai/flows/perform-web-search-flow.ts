'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const WebSearchResultItemSchema = z.object({
  title: z.string().describe('The title of the search result.'),
  link: z.string().url().describe('The URL link to the search result.'),
  snippet: z.string().describe('A brief snippet or description of the search result content.'),
});
export type WebSearchResultItem = z.infer<typeof WebSearchResultItemSchema>;

const PerformWebSearchInputSchema = z.object({
  query: z.string().describe('The search query to look up on the web.'),
});
export type PerformWebSearchInput = z.infer<typeof PerformWebSearchInputSchema>;

const PerformWebSearchOutputSchema = z.object({
  summary: z.string().describe('A summary of the findings from the web search.'),
  results: z.array(WebSearchResultItemSchema).describe('A list of web search results with title, link, and snippet.'),
});
export type PerformWebSearchOutput = z.infer<typeof PerformWebSearchOutputSchema>;

const searchTheWebAppTool = ai.defineTool(
  {
    name: 'searchTheWebAppTool',
    description: 'Searches the web for information related to the user query and returns a list of relevant search results.',
    inputSchema: z.object({ query: z.string() }),
    outputSchema: z.array(WebSearchResultItemSchema),
  },
  async ({ query }: { query: string }) => {
    console.log(`[PegasusAI WebSearchTool] Tool invoked. Mock searching for: "${query.substring(0, 50)}..."`);
    await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 800));

    if (query.toLowerCase().includes("simulate_tool_error")) {
      console.warn('[PegasusAI WebSearchTool] Simulating tool error.');
      throw new Error("Simulated error from web search tool.");
    }
    if (query.toLowerCase().includes("simulate_no_results")) {
      console.log('[PegasusAI WebSearchTool] Simulating no results.');
      return [];
    }

    const mockResults: WebSearchResultItem[] = [
      { title: `Understanding "${query}" - Example.com`, link: `https://example.com/search?q=${encodeURIComponent(query)}&source=1`, snippet: `Detailed analysis and information regarding "${query}". This mock result provides an overview from Example.com.` },
      { title: `"${query}" News and Updates - FictionalNews`, link: `https://fictionalnews.example/articles/${encodeURIComponent(query.replace(/\s+/g, '-').toLowerCase())}`, snippet: `Latest (mock) news and discussions surrounding "${query}". Stay updated with FictionalNews.` },
      { title: `Community Forum on "${query}" - OurCommunity.example`, link: `https://ourcommunity.example/forum/t/${Math.floor(Math.random()*10000)}`, snippet: `User discussions, opinions, and experiences related to "${query}" on OurCommunity.example.` },
    ];
    console.log(`[PegasusAI WebSearchTool] Mock search returning ${mockResults.length} results.`);
    return mockResults;
  }
);

const webSearchPrompt = ai.definePrompt({
  name: 'webSearchPrompt',
  input: { schema: PerformWebSearchInputSchema },
  output: { schema: PerformWebSearchOutputSchema },
  tools: [searchTheWebAppTool],
  prompt: `You are a helpful research assistant. The user wants to find information about: "{{{query}}}".

First, use the "searchTheWebAppTool" to search the web for relevant information about the user's query: "{{{query}}}".

After receiving the search results from the tool, analyze them.
Then, provide a concise summary of the key information found.
Finally, list all the search results provided by the tool, including their titles, links, and snippets, in the 'results' field of your output.

Ensure your output strictly adheres to the following JSON structure for 'summary' and 'results'. Do not add any conversational text outside this structure.
Output:
`,
});

const performWebSearchFlow = ai.defineFlow(
  {
    name: 'performWebSearchFlow',
    inputSchema: PerformWebSearchInputSchema,
    outputSchema: PerformWebSearchOutputSchema,
  },
  async (input) => {
    console.log(`[PegasusAI WebSearchFlow] Flow invoked with query: "${input.query.substring(0, 50)}..."`);
    try {
      const { output } = await webSearchPrompt(input);
      if (!output) {
        console.error('[PegasusAI WebSearchFlow] Web search prompt did not return an output.');
        throw new Error('Web search prompt failed to produce an output.');
      }
       if (!output.summary && (!output.results || output.results.length === 0)) {
        console.warn('[PegasusAI WebSearchFlow] Web search output is empty (no summary and no results). This might indicate the tool found nothing or the LLM failed to process tool output.');
        return {
          summary: "Não foi possível encontrar ou resumir informações para a sua pesquisa.",
          results: []
        };
      }
      console.log(`[PegasusAI WebSearchFlow] Successfully processed web search. Summary (first 50): "${output.summary?.substring(0,50)}...". Results count: ${output.results?.length}`);
      return output;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.error('[PegasusAI WebSearchFlow] Error during web search flow execution:', err.message, err.stack);
      if (err.message.includes('ToolExecutionError') || err.message.includes('searchTheWebAppTool') || err.message.includes('Simulated error')) {
        throw new Error(`Web Search: Erro ao executar a ferramenta de busca: ${err.message.substring(0,150)}`);
      }
      throw new Error(`Web Search: Erro interno no fluxo de busca: ${err.message.substring(0,150)}`);
    }
  }
);

export async function performWebSearch(input: PerformWebSearchInput): Promise<PerformWebSearchOutput> {
  console.log(`[PegasusAI WebSearch] Server action 'performWebSearch' invoked with query: "${input.query.substring(0,50)}..."`);
  try {
    return await performWebSearchFlow(input);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[PegasusAI WebSearch] Server Action performWebSearch caught error:', err.message, err.stack);
    if (err.message.startsWith('Web Search:')) {
      throw err;
    }
    throw new Error(`Web Search: ${err.message.substring(0, 200)}`);
  }
}
