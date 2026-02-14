import React, { useRef, useEffect, useState } from 'react';
import { type AppState, type Language, type TranscriptMessage } from '../types';
import { UI_TEXTS } from '../constants';
import { CopyIcon } from './icons';
import { logger } from '../lib/logger';

interface TranscriptionPanelProps {
  transcript: TranscriptMessage[];
  appState: AppState;
  language: Language;
}

const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({ transcript, appState, language }) => {
  const texts = UI_TEXTS[language];
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showCopied, setShowCopied] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const handleCopy = async () => {
    if (navigator.clipboard) {
      const text = transcript.map(m => 
        `${m.sender === 'Nova' ? 'Nova' : texts.you}: ${m.text}`
      ).join('\n\n');
      
      try {
        await navigator.clipboard.writeText(text);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 3000);
      } catch (err) {
        logger.error('Failed to copy transcript:', err);
      }
    }
  };

  const MessageBubble: React.FC<{ message: TranscriptMessage }> = ({ message }) => {
    const isNova = message.sender === 'Nova';
    const youChar = texts.you_char || 'Y';

    return (
      <div className={`flex items-start gap-3 ${isNova ? 'justify-start' : 'justify-end'}`}>
        {isNova && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-md">
            N
          </div>
        )}
        <div className={`max-w-[85%] md:max-w-md rounded-2xl px-4 py-3 animate-fade-in-up shadow-sm ${
          isNova
            ? 'bg-slate-100 text-slate-900 rounded-tl-sm border border-slate-200'
            : 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-sm'
        }`}>
          <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>
        </div>
        {!isNova && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {youChar}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <>
      {/* Toast notification - aparece cuando se copia */}
      {showCopied && (
        <div className="fixed top-20 right-4 z-50 animate-fade-in-up">
          <div className="bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">
              {language === 'es' ? '¡Transcripción copiada al portapapeles!' : 'Transcript copied to clipboard!'}
            </span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg p-4 flex flex-col h-[400px] md:h-[500px] lg:h-full" role="region" aria-label={language === 'es' ? 'Transcripción de la conversación' : 'Conversation transcript'}>
        <div className="flex items-center justify-between mb-4 pb-2 border-b">
          <h2 className="text-lg font-bold text-slate-800" id="transcript-title">
            {language === 'es' ? 'Transcripción en Tiempo Real' : 'Real-Time Transcript'}
          </h2>
          {transcript.length > 0 && (
            <button
              onClick={handleCopy}
              className="min-w-[44px] min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center justify-center active:scale-95 text-sm font-medium"
              aria-label={texts.copyToClipboardButton}
              title={language === 'es' ? 'Copiar transcripción al portapapeles' : 'Copy transcript to clipboard'}
            >
              <CopyIcon className="w-5 h-5 mr-2" />
              {language === 'es' ? 'Copiar' : 'Copy'}
            </button>
          )}
        </div>
        <div
          ref={scrollRef}
          className="flex-grow overflow-y-auto pr-2 space-y-4"
          role="log"
          aria-live="polite"
          aria-atomic="false"
          aria-labelledby="transcript-title"
        >
          {transcript.length > 0 ? (
            transcript.map((msg) => <MessageBubble key={msg.id} message={msg} />)
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              <p>{texts.transcriptPlaceholder}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const MemoizedTranscriptionPanel = React.memo(TranscriptionPanel, (prevProps, nextProps) => {
    // This custom comparison prevents re-renders on every audio frequency update.
    // It only re-renders if the transcript content, app state, or language actually changes.
    return (
        prevProps.transcript.length === nextProps.transcript.length &&
        prevProps.appState === nextProps.appState &&
        prevProps.language === nextProps.language
    );
});

export default MemoizedTranscriptionPanel;
