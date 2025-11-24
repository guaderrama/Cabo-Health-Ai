
export const playWelcomeSound = (audioContext: AudioContext | null, enabled: boolean = true) => {
  if (!audioContext || !enabled) return;

  const now = audioContext.currentTime;

  // Sonido simple y profesional: tono ascendente suave
  // Inspirado en notificaciones médicas profesionales
  const note = audioContext.createOscillator();
  note.type = 'sine'; // Tono puro y suave
  note.frequency.setValueAtTime(440, now); // La4 (nota estándar)
  note.frequency.exponentialRampToValueAtTime(550, now + 0.25); // Sube a Do#5

  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.05); // Fade in rápido
  gain.gain.linearRampToValueAtTime(0.15, now + 0.2); // Mantiene
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5); // Fade out suave

  note.connect(gain);
  gain.connect(audioContext.destination);

  note.start(now);
  note.stop(now + 0.5);
};
