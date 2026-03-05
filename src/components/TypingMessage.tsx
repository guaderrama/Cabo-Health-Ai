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
    patientName?: string; // For avatar initial
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
    patientName,
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
            className={`flex items-end gap-2 ${sender === 'Nova' ? 'justify-start' : 'justify-end'} animate-fade-in-up`}
        >
            {/* Nova avatar */}
            {sender === 'Nova' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-sm">
                    <span className="text-white text-xs font-bold">N</span>
                </div>
            )}

            <div
                className={`max-w-[80%] rounded-2xl px-5 py-4 ${sender === 'Nova'
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
                {/* Skip animation hint */}
                {shouldAnimate && !isComplete && (
                    <div className="mt-1 text-xs text-slate-400 flex items-center gap-1">
                        <span>{language === 'es' ? 'Toca para ver todo' : 'Tap to see all'}</span>
                    </div>
                )}
                {timestamp && isComplete && (
                    <p className={`text-xs mt-2 ${sender === 'Nova' ? 'text-slate-500' : 'text-white/70'}`}>
                        {new Date(timestamp).toLocaleTimeString(language === 'es' ? 'es-ES' : 'en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </p>
                )}
            </div>

            {/* Patient avatar */}
            {sender !== 'Nova' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-600 to-cyan-700 flex items-center justify-center shadow-sm">
                    <span className="text-white text-xs font-bold">
                        {patientName ? patientName.charAt(0).toUpperCase() : 'P'}
                    </span>
                </div>
            )}
        </div>
    );
};

export default React.memo(TypingMessage);
