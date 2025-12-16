import React, { useState, useEffect } from 'react';
import { useTypingAnimation } from '../hooks/useTypingAnimation';
import { type Language } from '../types';

interface TypingMessageProps {
    text: string;
    sender: 'Nova' | 'You';
    timestamp?: string;
    language: Language;
    isLatest: boolean; // Solo animar el último mensaje
    speed?: number; // ms por palabra
}

/**
 * Componente de mensaje con animación de typing palabra-por-palabra
 * Solo anima el último mensaje de Nova para mejor UX
 */
const TypingMessage: React.FC<TypingMessageProps> = ({
    text,
    sender,
    timestamp,
    language,
    isLatest,
    speed = 50, // 50ms por palabra = ~20 palabras/segundo (rápido pero legible)
}) => {
    // Solo animar si es el último mensaje Y es de Nova
    const shouldAnimate = isLatest && sender === 'Nova';

    const { displayedText, isComplete, skipAnimation } = useTypingAnimation(
        text,
        speed,
        shouldAnimate
    );

    // El texto a mostrar: animado o completo
    const textToShow = shouldAnimate ? displayedText : text;

    return (
        <div
            className={`flex ${sender === 'Nova' ? 'justify-start' : 'justify-end'}`}
        >
            <div
                className={`max-w-[85%] rounded-2xl px-5 py-4 ${sender === 'Nova'
                        ? 'bg-slate-100 text-slate-800 rounded-bl-md border border-slate-200'
                        : 'bg-emerald-500 text-white rounded-br-md'
                    }`}
                onClick={shouldAnimate && !isComplete ? skipAnimation : undefined}
                style={{ cursor: shouldAnimate && !isComplete ? 'pointer' : 'default' }}
                title={shouldAnimate && !isComplete ? (language === 'es' ? 'Clic para mostrar todo' : 'Click to show all') : undefined}
            >
                {/* Larger text (18px) with better line height for elderly users */}
                <p
                    className="text-lg leading-relaxed whitespace-pre-wrap"
                    style={{ fontSize: '1.125rem', lineHeight: '1.7' }}
                >
                    {textToShow}
                    {/* Cursor parpadeante mientras escribe */}
                    {shouldAnimate && !isComplete && (
                        <span className="inline-block w-0.5 h-5 bg-slate-400 ml-1 animate-pulse" />
                    )}
                </p>
                {timestamp && isComplete && (
                    <p className={`text-xs mt-2 ${sender === 'Nova' ? 'text-slate-400' : 'text-emerald-200'}`}>
                        {new Date(timestamp).toLocaleTimeString(language === 'es' ? 'es-ES' : 'en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </p>
                )}
            </div>
        </div>
    );
};

export default React.memo(TypingMessage);
