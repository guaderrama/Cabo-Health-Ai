import { Language } from '../types';

export interface MotivationLevel {
  level: 'high' | 'medium' | 'low' | 'unknown';
  color: string;
  textColor: string;
}

/**
 * Formats a date string for display
 */
export const formatDate = (dateString: string, language: Language): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString(language, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Formats duration in seconds to "X min Y seg" format
 */
export const formatDuration = (seconds?: number): string => {
  if (!seconds) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins} min ${secs} seg`;
};

/**
 * Returns motivation level styling based on score
 */
export const getMotivationLevel = (score?: number): MotivationLevel => {
  if (!score) return { level: 'unknown', color: 'bg-gray-200', textColor: 'text-gray-600' };
  if (score >= 7) return { level: 'high', color: 'bg-green-500', textColor: 'text-green-700' };
  if (score >= 4) return { level: 'medium', color: 'bg-yellow-500', textColor: 'text-yellow-700' };
  return { level: 'low', color: 'bg-red-500', textColor: 'text-red-700' };
};
