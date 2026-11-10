// Copia los prompts de Nova a las Edge Functions de OpenAI, porque Deno no puede
// importar desde src/. Después de cambiar un prompt:
//   npm run sync:edge-prompts
//   y vuelve a desplegar la función correspondiente.
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const COPIES = [
  ['src/constants/summaryPrompt.ts', 'supabase/functions/generate-summary-openai/summaryPrompt.ts'],
  ['src/constants/systemInstructions.ts', 'supabase/functions/chat-openai/systemInstructions.ts'],
];
const IMPORT_LINE = "import { type Language } from '../types';";

for (const [from, to] of COPIES) {
  const source = readFileSync(new URL(from, root), 'utf8');
  if (!source.includes(IMPORT_LINE)) {
    throw new Error(`${from}: no encontré la línea "${IMPORT_LINE}"`);
  }
  const header = `// GENERADO desde ${from} con "npm run sync:edge-prompts". No lo edites aquí.\n`;
  writeFileSync(new URL(to, root), header + source.replace(IMPORT_LINE, "export type Language = 'es' | 'en';"));
  console.log(`✓ ${from} -> ${to}`);
}
