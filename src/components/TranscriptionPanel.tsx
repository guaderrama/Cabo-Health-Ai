import React, { useRef, useEffect, useState } from 'react';
import { type AppState, type Language, type TranscriptMessage } from '../types';
import { UI_TEXTS } from '../constants';
import { CopyIcon } from './icons';

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
        setTimeout(() => setShowCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy transcript:', err);
      }
    }
  };

  const MessageBubble: React.FC<{ message: TranscriptMessage }> = ({ message }) => {
    const isNova = message.sender === 'Nova';
    const youChar = texts.you_char || 'Y';
    
    return (
      <div className={`flex items-start gap-3 ${isNova ? 'justify-start' : 'justify-end'}`}>
        {isNova && (
          <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-white font-bold">N</div>
        )}
        <div className={`max-w-xs md:max-w-sm rounded-xl px-4 py-2.5 animate-fade-in-up ${isNova ? 'bg-slate-200 text-slate-800 rounded-tl-none' : 'bg-indigo-600 text-white rounded-tr-none'}`}>
          <p className="text-sm leading-relaxed">{message.text}</p>
        </div>
        {!isNova && (
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex-shrink-0 flex items-center justify-center text-white font-bold">{youChar}</div>
        )}
      </div>
    );
  };
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-4 flex flex-col h-[400px] lg:h-full">
      <div className="flex items-center justify-between mb-4 pb-2 border-b">
        <h2 className="text-lg font-bold text-slate-800">
          {language === 'es' ? 'Transcripción en Tiempo Real' : 'Real-Time Transcript'}
        </h2>
        {transcript.length > 0 && (
          <button
            onClick={handleCopy}
            className="text-sm px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center"
            aria-label={texts.copyToClipboardButton}
          >
            <CopyIcon className="w-4 h-4 mr-2" />
            {showCopied 
              ? (language === 'es' ? '¡Copiado!' : 'Copied!')
              : (language === 'es' ? 'Copiar' : 'Copy')
            }
          </button>
        )}
      </div>
      <div ref={scrollRef} className="flex-grow overflow-y-auto pr-2 space-y-4">
        {transcript.length > 0 ? (
          transcript.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            <p>{texts.transcriptPlaceholder}</p>
          </div>
        )}
      </div>
    </div>
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
