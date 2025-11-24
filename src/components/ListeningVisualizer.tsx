import React, { useState, useEffect } from 'react';
import { CaboHealthLogo } from './icons';

interface ListeningVisualizerProps {
  isListening: boolean;
  audioFrequency: number;
}

const ListeningVisualizer: React.FC<ListeningVisualizerProps> = ({ isListening, audioFrequency }) => {
  // Detectar preferencia de animaciones reducidas
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Normalize frequency data (0-255) to a more usable scale for animation (e.g., 0-1)
  const normalizedFrequency = Math.min(audioFrequency / 128, 1);
  const scale = 1 + normalizedFrequency * (prefersReducedMotion ? 0.05 : 0.15);
  const glowIntensity = normalizedFrequency * (prefersReducedMotion ? 0.3 : 0.8);

  // Reducir intensidad de blur en dispositivos de baja potencia
  const blurIntensity = prefersReducedMotion ? 0.3 : 1;

  return (
    <div
      className="relative w-80 h-80 flex items-center justify-center"
      style={{ willChange: 'transform' }}
      role="status"
      aria-live="polite"
      aria-label={isListening ? "Escuchando audio activamente" : "Visualizador de audio en espera"}
    >

      {/* Outer Glow (Pulsing) - Colores Cabo Health */}
      {!prefersReducedMotion && (
        <div
          className={`absolute w-full h-full rounded-full bg-gradient-to-r from-teal-500/20 via-blue-500/20 to-cyan-400/20 ${
            isListening ? 'animate-pulse-glow' : ''
          }`}
          style={{
            filter: `blur(${60 * blurIntensity}px)`,
            opacity: isListening ? 0.6 : 0.3,
            transition: 'opacity 0.5s ease',
            willChange: 'opacity'
          }}
        />
      )}

      {/* Flowing Waves - Layer 1 (Outermost) - Colores Cabo Health */}
      {!prefersReducedMotion && (
        <div
          className={`absolute w-full h-full rounded-full bg-gradient-to-br from-blue-500 via-teal-500 to-transparent opacity-20 ${
            isListening ? 'animate-wave-1' : ''
          }`}
          style={{
            filter: `blur(${2 * blurIntensity}px)`,
            transform: `scale(${isListening ? 1 + glowIntensity * 0.1 : 1})`,
            transition: 'transform 0.2s ease-out',
            willChange: 'transform'
          }}
        />
      )}

      {/* Flowing Waves - Layer 2 - Colores Cabo Health */}
      {!prefersReducedMotion && (
        <div
          className={`absolute w-[90%] h-[90%] rounded-full bg-gradient-to-br from-teal-500 via-cyan-400 to-transparent opacity-25 ${
            isListening ? 'animate-wave-2' : ''
          }`}
          style={{
            filter: `blur(${3 * blurIntensity}px)`,
            transform: `scale(${isListening ? 1 + glowIntensity * 0.08 : 1})`,
            transition: 'transform 0.2s ease-out',
            animationDelay: '1s',
            willChange: 'transform'
          }}
        />
      )}

      {/* Flowing Waves - Layer 3 - Colores Cabo Health */}
      <div
        className={`absolute w-[80%] h-[80%] rounded-full bg-gradient-to-br from-cyan-400 via-blue-400 to-transparent ${
          prefersReducedMotion ? 'opacity-20' : 'opacity-30'
        } ${isListening && !prefersReducedMotion ? 'animate-wave-3' : ''}`}
        style={{
          filter: prefersReducedMotion ? 'none' : `blur(${4 * blurIntensity}px)`,
          transform: `scale(${isListening ? 1 + glowIntensity * 0.12 : 1})`,
          transition: 'transform 0.2s ease-out',
          animationDelay: '2s',
          willChange: prefersReducedMotion ? 'auto' : 'transform'
        }}
      />

      {/* Active Ripple Effects (Only when listening) - Colores Cabo Health */}
      {isListening && !prefersReducedMotion && (
        <>
          <div
            className="absolute w-full h-full rounded-full border-2 border-blue-400/40 animate-ripple"
            style={{ animationDelay: '0s', willChange: 'transform, opacity' }}
          />
          <div
            className="absolute w-full h-full rounded-full border-2 border-teal-400/40 animate-ripple"
            style={{ animationDelay: '1s', willChange: 'transform, opacity' }}
          />
          <div
            className="absolute w-full h-full rounded-full border-2 border-cyan-400/40 animate-ripple"
            style={{ animationDelay: '2s', willChange: 'transform, opacity' }}
          />
        </>
      )}

      {/* Inner Glow (Dynamic) - Colores Cabo Health */}
      <div
        className="absolute w-64 h-64 rounded-full bg-gradient-to-br from-teal-500/30 via-blue-500/30 to-cyan-400/30"
        style={{
          filter: prefersReducedMotion ? 'blur(10px)' : `blur(${30 * blurIntensity}px)`,
          opacity: isListening ? glowIntensity : 0.2,
          transform: `scale(${isListening ? 1 + glowIntensity * 0.2 : 1})`,
          transition: 'opacity 0.3s ease, transform 0.2s ease-out',
          willChange: 'opacity, transform'
        }}
      />

      {/* Central Orb - Medical Orb Luminoso */}
      <div
        className="relative w-56 h-56 rounded-full bg-gradient-to-br from-white via-blue-50 to-teal-50 border-2 border-blue-200/40 shadow-2xl backdrop-blur-sm flex items-center justify-center overflow-hidden"
        style={{
          transform: `scale(${isListening ? scale : 1})`,
          transition: 'transform 0.1s ease-out',
          boxShadow: prefersReducedMotion
            ? '0 0 40px rgba(74, 144, 226, 0.2), inset 0 0 60px rgba(255, 255, 255, 0.8)'
            : isListening
            ? `0 0 60px rgba(43, 93, 58, ${glowIntensity * 0.6}), 0 0 100px rgba(74, 144, 226, ${glowIntensity * 0.4}), inset 0 0 80px rgba(255, 255, 255, 0.8)`
            : '0 0 40px rgba(74, 144, 226, 0.2), inset 0 0 60px rgba(255, 255, 255, 0.8)',
          willChange: 'transform'
        }}
      >
        {/* Rotating gradient background (subtle) - Colores Cabo Health */}
        {!prefersReducedMotion && (
          <div
            className={`absolute inset-0 rounded-full bg-gradient-to-br from-teal-500/5 via-blue-500/5 to-cyan-400/5 ${
              isListening ? 'animate-wave-1' : ''
            }`}
            style={{ filter: `blur(${20 * blurIntensity}px)`, willChange: 'transform' }}
          />
        )}

        {/* Logo con gradiente Cabo Health */}
        <div
          className="relative z-10 w-40 h-auto transition-all duration-300"
          style={{
            filter: prefersReducedMotion
              ? 'drop-shadow(0 0 10px rgba(43, 93, 58, 0.5))'
              : isListening
              ? `drop-shadow(0 0 ${10 + glowIntensity * 20}px rgba(43, 93, 58, ${0.6 + glowIntensity * 0.4})) drop-shadow(0 0 ${10 + glowIntensity * 15}px rgba(74, 144, 226, ${0.4 + glowIntensity * 0.3}))`
              : 'drop-shadow(0 0 10px rgba(43, 93, 58, 0.5))',
            transform: `scale(${isListening ? 1 + glowIntensity * 0.05 : 1})`,
            transition: 'filter 0.3s ease, transform 0.2s ease-out',
            willChange: prefersReducedMotion ? 'auto' : 'filter, transform'
          }}
        >
          <CaboHealthLogo
            className="w-full h-auto"
            style={{
              background: 'linear-gradient(135deg, #2B5D3A 0%, #4A90E2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          />
        </div>
      </div>

      {/* Shimmer effect overlay (only when listening) */}
      {isListening && !prefersReducedMotion && (
        <div
          className="absolute w-64 h-64 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.1) 0%, transparent 60%)',
            opacity: glowIntensity * 0.5,
            transition: 'opacity 0.2s ease-out',
            willChange: 'opacity'
          }}
        />
      )}
    </div>
  );
};

export default ListeningVisualizer;
