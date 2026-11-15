// =============================================================================
// NOVA SOLO ENTREVISTA: detecta si una respuesta le dice al paciente qué hacer
// =============================================================================
// Las instrucciones ya lo prohíben, pero ante síntomas que empeoran el modelo a veces
// escribe "es importante que recibas una valoración médica pronto", "eso puede ser señal
// de un problema grave" o pregunta "¿Puedes ir a urgencias ahora?". Una pregunta de
// historia como "¿Ya te vio un especialista?" es parte de la entrevista y no cuenta.

const MARKER = /^\[\[TEMAS:\{.*?\}\]\]\n?/;

// Frases afirmativas que le dicen al paciente qué hacer o qué podría tener
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
  // Alarmas o posibles causas ("puede ser señal de un problema grave")
  '\\b(puede|pueden|podr[ií]a|podr[ií]an)\\b[^.!?]{0,15}\\bser\\b[^.!?]{0,40}\\b(se[nñ]al|se[nñ]ales|signo|signos|grave|graves|seri[oa]s?|enfermedad|infecci[oó]n|alarma|lesi[oó]n|da[nñ]o|urgencia|problema de salud|problema m[eé]dico)\\b',
  '\\b(puede|pueden|podr[ií]a|podr[ií]an)\\b[^.!?]{0,10}\\b(indicar|significar|deberse a|tratarse de)\\b',
  '\\b(se[nñ]al|se[nñ]ales|signo|signos) de (alarma|alerta)\\b', '\\b(algo|problema|cuadro) (grave|serio)\\b',
  '\\b(may|might|could)\\b[^.!?]{0,10}\\b(indicate|mean|signal|be a sign|be signs|be due to|be caused by)\\b',
  '\\b(serious|severe) (problem|condition|issue|illness)\\b', '\\bwarning signs?\\b',
  // Explicaciones médicas, riesgos e indicaciones ("las pastillas con estrógeno aumentan el
  // riesgo...", "no se recomiendan", "no la suspendas sin consultar")
  '\\b(podr[ií]a|podr[ií]an|puede|pueden)\\b[^.!?]{0,10}\\bser\\b[^.!?]{0,30}\\b(aura|migra[nñ]a|ansiedad|depresi[oó]n|menopausia|perimenopausia|tiroides|hipotiroidismo|hipertiroidismo|diabetes|prediabetes|gastritis|reflujo|colitis|artritis|artrosis|anemia|apnea|s[ií]ntoma de|efecto (secundario|adverso))\\b',
  '\\b(aumenta|aumentan|eleva|elevan|incrementa|incrementan|reduce|reducen|disminuye|disminuyen)\\b[^.!?]{0,15}\\briesgo\\b',
  '\\bse (recomienda|recomiendan|aconseja|aconsejan|sugiere|sugieren)\\b', '\\b(es|ser[ií]a) (recomendable|aconsejable|conveniente)\\b', '\\bconviene\\b',
  '\\b(no )?(la |lo |las |los )?(suspendas|dejes de tomar|combines|mezcles)\\b', '\\bno (la |lo |las |los )?(tomes|dejes)\\b',
  '\\b(suele|suelen) (deberse|estar relacionad|causar|indicar)', '\\bes (normal|com[uú]n|frecuente) (que|a tu edad|en la|en el|durante)\\b',
  '\\b(increases?|raises?|reduces?|lowers?) (the |your )?risk\\b', '\\b(is|are) (not )?(recommended|advised)\\b',
  "\\b(don't|do not) (stop|take|mix|combine)\\b", '\\bit would be (best|better|wise)\\b',
  '\\b(could|might|may) be (an? )?(aura|migraine|anxiety|depression|menopause|perimenopause|thyroid|infection|symptom of|side effect)\\b',
  "\\bit(?:'s| is) (normal|common) (to|for|at your age)\\b",
].join('|'), 'i');

// Pregunta médica del paciente ("¿Debería dejar el ibuprofeno?", "¿Será la menopausia?"):
// en ese turno se le recuerda a Nova que solo la anote para el resumen
const MEDICAL_QUESTION = /\b(deber[ií]a|debo|tengo que|puedo|es (peligroso|malo|grave|normal|seguro)|ser[aá]|qu[eé] (me )?(recomiendas|sugieres|tomo|hago|estudios|medicamento|pastilla|tengo)|me conviene|should i|can i|do i need|is it (safe|dangerous|bad|normal|serious)|could (it|this) be|what (should|do you recommend))\b/i;

export function isMedicalQuestion(patientText: string): boolean {
  return /[?¿]/.test(patientText) && MEDICAL_QUESTION.test(patientText);
}

export const MEDICAL_QUESTION_NOTE = {
  es: `

⚠️ NOTA PARA ESTE TURNO: el último mensaje del paciente parece incluir una pregunta médica. Si lo es (sobre su salud, síntomas, medicamentos, estudios, riesgos o qué debería hacer), NO la respondas: no expliques, no menciones riesgos ni posibles causas, no digas qué hacer ni que consulte a nadie. Di solo "Anotaré tu pregunta para el resumen." y sigue con la siguiente pregunta de la entrevista, con la marca [[TEMAS:...]] al inicio como siempre. Si no es una pregunta médica, ignora esta nota.`,
  en: `

⚠️ NOTE FOR THIS TURN: the patient's last message seems to include a medical question. If it is one (about their health, symptoms, medications, tests, risks or what they should do), do NOT answer it: no explanations, no risks or possible causes, no telling them what to do or to consult anyone. Just say "I'll note your question for the summary." and continue with the next interview question, with the [[TEMAS:...]] marker at the start as always. If it is not a medical question, ignore this note.`,
} as const;

const CLOSING = /gracias por compartir todo esto conmigo|thank you for sharing all of this with me/i;

/** Una respuesta normal de Nova siempre trae una pregunta, salvo el cierre. */
export function lacksQuestion(text: string): boolean {
  const visible = text.replace(MARKER, '');
  return !visible.includes('?') && !CLOSING.test(visible);
}

// Preguntas que en realidad mandan al paciente a algún lado ("¿Puedes ir a urgencias
// ahora?"). Las de historia ("¿Has ido a urgencias por esto?") no entran aquí.
const DIRECTIVE_QUESTION = new RegExp([
  '\\b911\\b',
  '\\b(puedes|podr[ií]as|puede|podr[ií]a|te es posible|alcanzas a|te parece|quieres|pueda|puedan)\\b[^.!?]{0,40}\\b(ir|acudir|llegar|llamar|ver|consultar|pedir|buscar|llevarte|acompa[nñ]arte)\\b[^.!?]{0,30}\\b(urgencias|emergencias|hospital|cl[ií]nica|m[eé]dic[oa]|doctor|especialista)\\b',
  '\\bhay alguien que (te|lo|la) (lleve|acompa[nñ]e|pueda llevar)',
  '\\b(can|could|would) you\\b[^.!?]{0,40}\\b(go|get|head|call|see|contact|visit|reach)\\b[^.!?]{0,30}\\b(er|emergency|hospital|urgent care|clinic|doctor|physician)\\b',
  '\\b(is there|do you have) (someone|anyone)\\b[^.!?]{0,40}\\b(take|drive|bring) you\\b',
].join('|'), 'i');

const SENTENCE_BREAK = /(?<=[.!?])(\s+)/;

function offendingPart(sentence: string): string | null {
  const match = sentence.includes('?')
    ? sentence.match(DIRECTIVE_QUESTION)
    : sentence.match(REFERRAL) ?? sentence.match(DIRECTIVE_QUESTION);
  return match?.[0] ?? null;
}

/** Devuelve el fragmento que recomienda algo al paciente, o null si no hay. */
export function findReferral(text: string): string | null {
  for (const s of text.replace(MARKER, '').split(SENTENCE_BREAK)) {
    const part = offendingPart(s);
    if (part) return part;
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
    if (offendingPart(sentence)) continue;
    out += sentence + (parts[i + 1] ?? '');
  }
  out = out.trim();
  return out ? marker + out : null;
}

const FALLBACK = {
  es: { thanks: 'Gracias por contármelo, queda registrado.', question: '¿Desde cuándo lo notas y con qué frecuencia te pasa?' },
  en: { thanks: 'Thank you for telling me, I have noted it.', question: 'When did you first notice this, and how often does it happen?' },
} as const;

const questionsIn = (text: string) =>
  text.replace(MARKER, '').split(SENTENCE_BREAK).filter((s) => s.includes('?') && !offendingPart(s));

/**
 * Respuesta segura cuando los dos intentos de Nova recomendaron algo: quita esas frases y,
 * si no queda ninguna pregunta, usa una limpia del primer intento o una neutral, para que
 * el paciente siempre tenga algo que contestar.
 */
export function safeReply(retryText: string, firstText: string, language: 'es' | 'en'): string {
  const marker = retryText.match(MARKER)?.[0] ?? firstText.match(MARKER)?.[0] ?? '';
  const cleaned = (removeReferrals(retryText) ?? '').replace(MARKER, '').trim();
  if (cleaned.includes('?')) return marker + cleaned;
  const question = questionsIn(firstText)[0] ?? FALLBACK[language].question;
  return `${marker}${cleaned || FALLBACK[language].thanks} ${question}`;
}

/** Se agrega a las instrucciones cuando hay que pedirle a Nova que reescriba su respuesta. */
export const NO_REFERRAL_NOTE = {
  es: `

🚫 CORRECCIÓN PARA ESTE TURNO: tu respuesta anterior le dijo al paciente qué hacer o qué podría tener (buscar valoración o atención médica, ver a un médico, ir a urgencias, preguntarle si puede ir a urgencias, o decirle que un síntoma puede ser señal de algo grave). Eso está prohibido (regla absoluta 6): el riesgo ya queda registrado para el resumen del médico. Escribe de nuevo tu respuesta con EXACTAMENTE este formato: la marca [[TEMAS:...]] al inicio como siempre, una frase corta de agradecimiento sin opinar sobre el síntoma, y UNA pregunta de la entrevista (por ejemplo, desde cuándo, con qué frecuencia o cómo es lo que acaba de contar). Nada más: sin advertencias, sin urgencias, sin médicos.`,
  en: `

🚫 CORRECTION FOR THIS TURN: your previous reply told the patient what to do or what they might have (seek medical evaluation or care, see a doctor, go to the ER, asking whether they can go to the ER, or saying a symptom may be a sign of something serious). That is forbidden (absolute rule 6): the risk is already recorded for the doctor's summary. Write your reply again in EXACTLY this format: the [[TEMAS:...]] marker at the start as always, one short thank-you sentence with no opinion about the symptom, and ONE interview question (for example, since when, how often or what it is like). Nothing else: no warnings, no ER, no doctors.`,
} as const;
