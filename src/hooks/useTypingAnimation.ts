import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook para animar texto palabra por palabra
 * Mejora la experiencia de usuario para adultos mayores al permitir
 * leer el texto mientras aparece gradualmente
 * 
 * @param text - Texto completo a animar
 * @param speed - Velocidad en ms por palabra (default: 60ms)
 * @param enabled - Si la animación está habilitada
 * @returns { displayedText, isComplete, skipAnimation }
 */
export const useTypingAnimation = (
    text: string,
    speed: number = 60,
    enabled: boolean = true
) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const wordsRef = useRef<string[]>([]);
    const indexRef = useRef(0);

    // Función para saltar la animación y mostrar todo el texto
    const skipAnimation = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setDisplayedText(text);
        setIsComplete(true);
    }, [text]);

    useEffect(() => {
        // Si está deshabilitado o no hay texto, mostrar todo inmediatamente
        if (!enabled || !text) {
            setDisplayedText(text);
            setIsComplete(true);
            return;
        }

        // Resetear estado
        setDisplayedText('');
        setIsComplete(false);
        indexRef.current = 0;

        // Dividir texto en palabras
        wordsRef.current = text.split(' ');

        // Limpiar intervalo anterior
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        // Crear nuevo intervalo
        intervalRef.current = setInterval(() => {
            if (indexRef.current < wordsRef.current.length) {
                const nextWord = wordsRef.current[indexRef.current] || '';
                setDisplayedText((prev: string): string => {
                    if (indexRef.current === 0) {
                        return nextWord;
                    }
                    return prev + ' ' + nextWord;
                });
                indexRef.current++;
            } else {
                // Completado
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
                setIsComplete(true);
            }
        }, speed);

        // Cleanup
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [text, speed, enabled]);

    return { displayedText, isComplete, skipAnimation };
};

export default useTypingAnimation;
