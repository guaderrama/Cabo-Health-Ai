import React, { useRef, useEffect } from 'react';
import { type AppState, type Language, type TranscriptMessage } from '../types';
import { renderRichText } from '../utils/richText';

interface TranscriptionPanelProps {
  transcript: TranscriptMessage[];
  appState: AppState;
  language: Language;
  patientName?: string;
}

/** Texto de la conversación por voz, para que el paciente vea lo que Nova entendió. */
const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({ transcript, language, patientName }) => {
  const es = language === 'es';
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcript]);

  return (
    <section
      className="flex h-[420px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:h-full"
      aria-labelledby="transcript-title"
    >
      <h2 id="transcript-title" className="border-b border-slate-200 pb-2 text-lg font-semibold text-slate-900">
        {es ? 'Lo que se ha dicho' : 'What has been said'}
      </h2>
      <div
        ref={scrollRef}
        className="mt-3 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1"
        role="log"
        aria-live="polite"
        aria-labelledby="transcript-title"
      >
        {transcript.length > 0 ? (
          transcript.map((msg) => {
            const isNova = msg.sender === 'Nova';
            return (
              <div key={msg.id} className={`flex items-end gap-2 ${isNova ? 'justify-start' : 'justify-end'}`}>
                {isNova && (
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white" aria-hidden="true">N</span>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    isNova ? 'rounded-bl-md border border-slate-200 bg-slate-100 text-slate-900' : 'rounded-br-md bg-primary text-white'
                  }`}
                >
                  <span className="sr-only">{isNova ? 'Nova: ' : (es ? 'Tú: ' : 'You: ')}</span>
                  <p className="whitespace-pre-wrap break-words text-base leading-relaxed">{renderRichText(msg.text)}</p>
                </div>
                {!isNova && (
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-sea text-sm font-bold text-white" aria-hidden="true">
                    {patientName ? patientName.charAt(0).toUpperCase() : (es ? 'T' : 'Y')}
                  </span>
                )}
              </div>
            );
          })
        ) : (
          <p className="flex h-full items-center justify-center text-center text-slate-600">
            {es ? 'Aquí verás el texto de la conversación mientras hablan.' : 'You will see the text of the conversation here as you talk.'}
          </p>
        )}
      </div>
    </section>
  );
};

// Evita re-renderizar con cada actualización del nivel de audio
export default React.memo(TranscriptionPanel, (prev, next) =>
  prev.transcript.length === next.transcript.length &&
  prev.transcript[prev.transcript.length - 1]?.text === next.transcript[next.transcript.length - 1]?.text &&
  prev.appState === next.appState &&
  prev.language === next.language &&
  prev.patientName === next.patientName
);
