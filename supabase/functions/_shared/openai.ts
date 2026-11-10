// Configuración común para llamar a OpenAI (Responses API) desde las Edge Functions.

export const OPENAI_URL = 'https://api.openai.com/v1/responses';
export const OPENAI_MODEL = 'gpt-6.1-terra';

export function openaiHeaders(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
}

interface OpenAIResponse {
  output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>;
}

// En la respuesta cruda el texto está en output[] -> message -> content[] -> output_text
export function extractOutputText(response: OpenAIResponse): string {
  return (response.output ?? [])
    .filter(item => item.type === 'message')
    .flatMap(item => item.content ?? [])
    .filter(part => part.type === 'output_text')
    .map(part => part.text ?? '')
    .join('');
}
