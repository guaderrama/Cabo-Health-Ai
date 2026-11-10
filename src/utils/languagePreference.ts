import type { Language } from '../types';

const STORAGE_KEY = 'cabo_health_language';

/** Saved choice first, then the phone/browser language, then Spanish. */
export function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
    // localStorage can be blocked (private mode); fall through to detection
  }
  if (typeof navigator !== 'undefined') {
    const preferred = navigator.languages?.[0] ?? navigator.language ?? '';
    if (preferred.toLowerCase().startsWith('en')) return 'en';
  }
  return 'es';
}

export function saveLanguage(language: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Not critical: the app still works, the choice just is not remembered
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
  }
}
