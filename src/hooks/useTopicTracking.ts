import { useState, useCallback, useRef } from 'react';
import { type TopicMarker, type TopicTracking } from '../types';
import { logger } from '../lib/logger';

// Regex para extraer el marcador de temas del inicio del mensaje
const TOPIC_MARKER_REGEX = /^\[\[TEMAS:(\{.*?\})\]\]\n?/;

// Número mínimo de temas requeridos para completar la entrevista
export const MIN_TOPICS_REQUIRED = 15;

// Temas esenciales (siempre deben cubrirse)
export const ESSENTIAL_TOPICS = [1, 2, 3, 4, 5, 6, 7, 8];

interface UseTopicTrackingReturn {
  tracking: TopicTracking;
  processNovaMessage: (text: string) => string;
  resetTracking: () => void;
  loadTracking: (coveredTopics: number[]) => void;
  getProgress: () => { covered: number; total: number; percentage: number };
  isComplete: boolean;
  essentialsCovered: number;
}

/**
 * Hook para rastrear el progreso de temas en la entrevista médica
 * Extrae marcadores [[TEMAS:{...}]] del texto de Nova y mantiene el estado
 */
export const useTopicTracking = (): UseTopicTrackingReturn => {
  const [tracking, setTracking] = useState<TopicTracking>({
    coveredTopics: new Set<number>(),
    currentTopic: null,
    lastUpdated: '',
  });

  // Ref para evitar re-renders innecesarios
  const trackingRef = useRef(tracking);
  trackingRef.current = tracking;

  /**
   * Extrae el marcador de temas del mensaje de Nova
   * Retorna el texto limpio (sin marcador) y el marcador si existe
   */
  const extractMarker = useCallback((text: string): { cleaned: string; marker: TopicMarker | null } => {
    const match = text.match(TOPIC_MARKER_REGEX);

    if (match && match[1]) {
      try {
        const marker = JSON.parse(match[1]) as TopicMarker;
        const cleaned = text.replace(TOPIC_MARKER_REGEX, '').trim();
        logger.debug('📊 Marcador de temas extraído:', marker);
        return { cleaned, marker };
      } catch (e) {
        logger.warn('⚠️ Error parseando marcador de temas:', e);
        return { cleaned: text, marker: null };
      }
    }

    return { cleaned: text, marker: null };
  }, []);

  /**
   * Procesa un mensaje de Nova, extrae el marcador y actualiza el tracking
   * Retorna el texto limpio para mostrar en la UI
   */
  const processNovaMessage = useCallback((text: string): string => {
    const { cleaned, marker } = extractMarker(text);

    if (marker) {
      setTracking(prev => {
        const newCovered = new Set(prev.coveredTopics);

        // Agregar todos los temas cubiertos del marcador
        if (marker.c && Array.isArray(marker.c)) {
          marker.c.forEach(topic => {
            if (topic >= 1 && topic <= 20) {
              newCovered.add(topic);
            }
          });
        }

        const newTracking: TopicTracking = {
          coveredTopics: newCovered,
          currentTopic: marker.p,
          lastUpdated: new Date().toISOString(),
        };

        logger.debug('📊 Tracking actualizado:', {
          covered: Array.from(newCovered),
          current: marker.p,
          total: newCovered.size,
        });

        return newTracking;
      });
    }

    return cleaned;
  }, [extractMarker]);

  /**
   * Resetea el tracking a su estado inicial
   */
  const resetTracking = useCallback(() => {
    setTracking({
      coveredTopics: new Set<number>(),
      currentTopic: null,
      lastUpdated: '',
    });
    logger.debug('📊 Tracking reseteado');
  }, []);

  /**
   * Carga temas cubiertos desde un checkpoint guardado
   */
  const loadTracking = useCallback((coveredTopics: number[]) => {
    setTracking({
      coveredTopics: new Set(coveredTopics),
      currentTopic: null,
      lastUpdated: new Date().toISOString(),
    });
    logger.debug('📊 Tracking cargado desde checkpoint:', coveredTopics);
  }, []);

  /**
   * Obtiene el progreso actual
   */
  const getProgress = useCallback(() => {
    const covered = trackingRef.current.coveredTopics.size;
    return {
      covered,
      total: MIN_TOPICS_REQUIRED,
      percentage: Math.round((covered / MIN_TOPICS_REQUIRED) * 100),
    };
  }, []);

  /**
   * Verifica si se han cubierto los temas mínimos requeridos
   */
  const isComplete = tracking.coveredTopics.size >= MIN_TOPICS_REQUIRED;

  /**
   * Cuenta cuántos temas esenciales se han cubierto
   */
  const essentialsCovered = ESSENTIAL_TOPICS.filter(t => tracking.coveredTopics.has(t)).length;

  return {
    tracking,
    processNovaMessage,
    resetTracking,
    loadTracking,
    getProgress,
    isComplete,
    essentialsCovered,
  };
};

/**
 * Convierte el Set de temas a array para persistencia
 */
export const topicsToArray = (tracking: TopicTracking): number[] => {
  return Array.from(tracking.coveredTopics).sort((a, b) => a - b);
};

/**
 * Convierte array a Set para carga desde checkpoint
 */
export const arrayToTopics = (topics: number[]): Set<number> => {
  return new Set(topics.filter(t => t >= 1 && t <= 20));
};
