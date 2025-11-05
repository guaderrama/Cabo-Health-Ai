import React from 'react';
import { CaboHealthLogo } from './icons';

interface ListeningVisualizerProps {
  isListening: boolean;
  audioFrequency: number;
}

const ListeningVisualizer: React.FC<ListeningVisualizerProps> = ({ isListening, audioFrequency }) => {
  // Normalize frequency data (0-255) to a more usable scale for animation (e.g., 0-1)
  const normalizedFrequency = Math.min(audioFrequency / 128, 1);
  const scale = 1 + normalizedFrequency * 0.1;
  const glowOpacity = normalizedFrequency * 0.7;

  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Blue Glow */}
      <div
        className="absolute w-full h-full rounded-full bg-blue-500 transition-opacity duration-200"
        style={{ opacity: isListening ? glowOpacity : 0, filter: 'blur(40px)' }}
      />
      
      {/* Ripple Effects */}
      {isListening && (
        <>
          <div className="absolute w-full h-full rounded-full border-blue-400 animate-ripple" />
          <div className="absolute w-full h-full rounded-full border-blue-300 animate-ripple" style={{ animationDelay: '0.75s' }} />
        </>
      )}

      {/* Central Orb */}
      <div
        className={`relative w-48 h-48 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border-2 border-white/20 shadow-inner shadow-black/50 backdrop-blur-sm flex items-center justify-center transition-transform duration-100 ${
          !isListening ? 'animate-breathing' : ''
        }`}
        style={{ transform: `scale(${isListening ? scale : 1})` }}
      >
        <CaboHealthLogo
          className={`w-36 h-auto text-white transition-all duration-300 ${
            isListening ? 'animate-glow' : ''
          }`}
        />
      </div>
    </div>
  );
};

export default ListeningVisualizer;