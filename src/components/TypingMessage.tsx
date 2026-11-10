import React from 'react';
import { useTypingAnimation } from '../hooks/useTypingAnimation';
import { type Language } from '../types';

interface TypingMessageProps {
    text: string;
    sender: 'Nova' | 'You';
    timestamp?: string;
    language: Language;
    isLatest: boolean; // Solo animar el último mensaje
    speed?: number; // ms por palabra
    patientName?: string; // Inicial del avatar
    failed?: boolean; // El mensaje no llegó a Nova
    onRetry?: () => void;
}

/**
 * Mensaje del chat. Solo el último mensaje de Nova se escribe palabra por palabra.
 */
const TypingMessage: React.FC<TypingMessageProps> = ({
    text,
    sender,
    timestamp,
    language,
    isLatest,
    speed = 50,
    patientName,
    failed = false,
    onRetry,
}) => {
    const es = language === 'es';
    const isNova = sender === 'Nova';
    const shouldAnimate = isLatest && isNova;

    const { displayedText, isComplete, skipAnimation } = useTypingAnimation(text, speed, shouldAnimate);
    const textToShow = shouldAnimate ? displayedText : text;
    const animating = shouldAnimate && !isComplete;

    return (
        <div className={`flex items-end gap-2 ${isNova ? 'justify-start' : 'justify-end'} animate-fade-in-up`}>
            {isNova && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary" aria-hidden="true">
                    <span className="text-xs font-bold text-white">N</span>
                </div>
            )}

            <div className={`flex max-w-[85%] flex-col ${isNova ? 'items-start' : 'items-end'}`}>
                <div
                    className={`rounded-2xl px-4 py-3 ${isNova
                        ? 'rounded-bl-md border border-slate-200 bg-slate-100 text-slate-900'
                        : failed
                            ? 'rounded-br-md border-2 border-dashed border-red-300 bg-red-50 text-slate-900'
                            : 'rounded-br-md bg-primary text-white'
                        }`}
                    onClick={animating ? skipAnimation : undefined}
                    style={{ cursor: animating ? 'pointer' : 'default' }}
                >
                    {/* sr-only: quién habla, para lectores de pantalla */}
                    <span className="sr-only">{isNova ? 'Nova: ' : (es ? 'Tú: ' : 'You: ')}</span>
                    {/* Texto grande (18px) para personas mayores */}
                    <p className="whitespace-pre-wrap break-words text-lg leading-relaxed">
                        {textToShow}
                        {animating && <span className="ml-1 inline-block h-5 w-0.5 animate-pulse bg-slate-400" aria-hidden="true" />}
                    </p>
                    {animating && (
                        <p className="mt-1 text-xs text-slate-600">{es ? 'Toca para ver todo' : 'Tap to see all'}</p>
                    )}
                    {timestamp && !animating && !failed && (
                        <p className={`mt-1 text-xs ${isNova ? 'text-slate-600' : 'text-white/85'}`}>
                            {new Date(timestamp).toLocaleTimeString(es ? 'es-MX' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    )}
                </div>

                {failed && (
                    <div className="mt-1 flex items-center gap-2 text-sm" role="alert">
                        <span className="font-medium text-red-700">{es ? 'No se envió' : 'Not sent'}</span>
                        {onRetry && (
                            <button
                                onClick={onRetry}
                                className="min-h-[44px] rounded-lg px-3 font-semibold text-primary underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                {es ? 'Reintentar' : 'Retry'}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {!isNova && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-sea" aria-hidden="true">
                    <span className="text-xs font-bold text-white">
                        {patientName ? patientName.charAt(0).toUpperCase() : (es ? 'T' : 'Y')}
                    </span>
                </div>
            )}
        </div>
    );
};

export default React.memo(TypingMessage);
