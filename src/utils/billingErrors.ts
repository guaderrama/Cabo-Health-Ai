import { type Language } from '../types';

/**
 * Detecta cuando OpenAI rechaza la solicitud porque la cuenta no tiene saldo.
 * El mensaje de OpenAI trae un link a ".../billing", así que debe revisarse
 * ANTES que isGeminiBillingError, que también reconoce la palabra "billing".
 */
export function isOpenAIBillingError(message: string): boolean {
  return /no credits remaining|exceeded your current quota|insufficient_quota/i.test(message);
}

export function getOpenAIBillingMessage(language: Language): string {
  return language === 'es'
    ? `💳 Se agotó el saldo de OpenAI\n\nNova no puede responder hasta que se recargue el saldo. No es un problema de tu conexión.\n\n📋 Pasos:\n1. Entra a https://platform.openai.com/settings/organization/billing\n2. Agrega saldo o activa la recarga automática\n3. Recarga esta página e inicia la sesión de nuevo`
    : `💳 OpenAI credits are depleted\n\nNova cannot respond until the balance is topped up. This is not a connection problem.\n\n📋 Steps:\n1. Go to https://platform.openai.com/settings/organization/billing\n2. Add credits or enable auto-recharge\n3. Reload this page and start the session again`;
}

/**
 * Detecta cuando Gemini rechaza la solicitud porque se agotaron los créditos
 * prepagados de Google AI Studio (HTTP 402 en REST, cierre 1011 en Live API).
 * El mensaje trae un link a "gemini-api/docs/billing", así que debe revisarse
 * ANTES que los checks de API key, o se reporta como error de autenticación.
 */
export function isGeminiBillingError(message: string): boolean {
  return /prepayment|credits are depleted|billing|\b402\b/i.test(message);
}

export function getGeminiBillingMessage(language: Language): string {
  return language === 'es'
    ? `💳 Se agotaron los créditos de Gemini (Google AI Studio)\n\nNova no puede responder hasta que se recarguen los créditos. No es un problema del micrófono ni de la conexión.\n\n📋 Pasos:\n1. Entra a https://aistudio.google.com y abre Billing\n2. Recarga créditos o activa la recarga automática\n3. Recarga esta página e inicia la sesión de nuevo`
    : `💳 Gemini credits are depleted (Google AI Studio)\n\nNova cannot respond until the credits are topped up. This is not a microphone or connection problem.\n\n📋 Steps:\n1. Go to https://aistudio.google.com and open Billing\n2. Top up credits or enable auto-reload\n3. Reload this page and start the session again`;
}
