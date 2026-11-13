// =============================================================================
// NOVA SOLO ENTREVISTA: detecta si una respuesta le dice al paciente qué hacer
// =============================================================================
// Las instrucciones ya lo prohíben, pero ante síntomas que empeoran el modelo a veces
// escribe "es importante que recibas una valoración médica pronto" o "busca atención
// urgente". Solo se revisan las frases afirmativas: una pregunta como "¿Ya te vio un
// especialista?" es parte de la entrevista y no cuenta.

const MARKER = /^\[\[TEMAS:\{.*?\}\]\]\n?/;

const REFERRAL = new RegExp([
  // Emergencias
  '\\b911\\b',
  '\\b(ve|vayas|ir|acude|acudas|acudir|llama|llames|llamar)\\b[^.!?]{0,20}\\b(urgencias|emergencias|hospital)',
  'emergency (room|services)', 'urgent care', '\\bgo to the (er|hospital)\\b',
  // Pedir valoración o atención
  'valoraci[oó]n (m[eé]dica|pronta|urgente|profesional)',
  '\\b(recibas|busques|buscar|busca|tengas|pidas|solicites|obtengas)\\b[^.!?]{0,15}\\b(valoraci[oó]n|revisi[oó]n|evaluaci[oó]n|atenci[oó]n)',
  'atenci[oó]n (m[eé]dica|urgente|inmediata|profesional)',
  'sin esperar a (la|tu) (cita|consulta)',
  'que te (revisen|valoren|eval[uú]en|atiendan|examinen)',
  'medical (attention|evaluation|assessment|care|help)',
  '\\bseek\\b[^.!?]{0,25}\\b(attention|care|help|evaluation)',
  'without waiting (for|until) (your|the) (appointment|visit)',
  'get (it|this|that|yourself|them) (checked|evaluated|looked at|examined)',
  // Mandarlo con un médico
  '\\b(consult|acud|habl|coment|platic|contact|llam|visit)[a-záéíóú]*( (lo|esto|eso))? (con|a|al) (tu |un |una |el |la |algún |alguna |otro |otra )?(m[eé]dic[oa]|doctor|profesional|especialista)',
  '\\b(see|consult|talk to|speak (to|with)|contact|call|check with|reach out to|visit)\\b (a |an |your )?(doctor|physician|provider|health ?care|specialist|medical professional)',
  // Recomendaciones
  '\\bte (recomiendo|sugiero|aconsejo)\\b', '\\bI (recommend|suggest|advise)\\b',
].join('|'), 'i');

const SENTENCE_BREAK = /(?<=[.!?])(\s+)/;

/** Devuelve el fragmento que recomienda algo al paciente, o null si no hay. */
export function findReferral(text: string): string | null {
  const sentences = text.replace(MARKER, '').split(SENTENCE_BREAK);
  for (const s of sentences) {
    if (s.includes('?')) continue;
    const match = s.match(REFERRAL);
    if (match) return match[0];
  }
  return null;
}

/**
 * Quita las frases afirmativas que recomiendan algo y conserva la marca de temas,
 * el resto del texto y sus saltos de línea. Devuelve null si no queda nada.
 */
export function removeReferrals(text: string): string | null {
  const marker = text.match(MARKER)?.[0] ?? '';
  const parts = text.slice(marker.length).split(SENTENCE_BREAK); // [frase, espacio, frase, …]
  let out = '';
  for (let i = 0; i < parts.length; i += 2) {
    const sentence = parts[i];
    if (!sentence.includes('?') && REFERRAL.test(sentence)) continue;
    out += sentence + (parts[i + 1] ?? '');
  }
  out = out.trim();
  return out ? marker + out : null;
}

/** Se agrega a las instrucciones cuando hay que pedirle a Nova que reescriba su respuesta. */
export const NO_REFERRAL_NOTE = {
  es: `

🚫 CORRECCIÓN PARA ESTE TURNO: tu respuesta anterior le dijo al paciente qué hacer (buscar valoración o atención médica, ver a un médico o ir a urgencias). Eso está prohibido (regla absoluta 6): el riesgo ya queda registrado para el resumen del médico. Escribe de nuevo tu respuesta: agradece o refleja en una frase, sin advertencias ni recomendaciones, y haz la siguiente pregunta de la entrevista, con la marca [[TEMAS:...]] al inicio como siempre.`,
  en: `

🚫 CORRECTION FOR THIS TURN: your previous reply told the patient what to do (seek medical evaluation or care, see a doctor or go to the ER). That is forbidden (absolute rule 6): the risk is already recorded for the doctor's summary. Write your reply again: thank or reflect in one sentence, with no warnings or recommendations, and ask the next interview question, with the [[TEMAS:...]] marker at the start as always.`,
} as const;
