
export const playWelcomeSound = (audioContext: AudioContext | null) => {
  if (!audioContext) return;
  const masterGain = audioContext.createGain();
  masterGain.connect(audioContext.destination);
  masterGain.gain.setValueAtTime(0.3, audioContext.currentTime);

  const now = audioContext.currentTime;

  // Bass
  const bass = audioContext.createOscillator();
  bass.type = 'sine';
  bass.frequency.setValueAtTime(80, now);
  bass.frequency.exponentialRampToValueAtTime(60, now + 1.5);
  const bassGain = audioContext.createGain();
  bassGain.gain.setValueAtTime(0.5, now);
  bassGain.gain.exponentialRampToValueAtTime(0.01, now + 2);
  bass.connect(bassGain).connect(masterGain);
  bass.start(now);
  bass.stop(now + 2);

  // Pads
  for (let i = 0; i < 3; i++) {
    const pad = audioContext.createOscillator();
    pad.type = 'sawtooth';
    pad.frequency.setValueAtTime(200 + i * 2, now);
    const padGain = audioContext.createGain();
    padGain.gain.setValueAtTime(0, now);
    padGain.gain.linearRampToValueAtTime(0.1, now + 0.5);
    padGain.gain.linearRampToValueAtTime(0, now + 2);
    pad.connect(padGain).connect(masterGain);
    pad.start(now);
    pad.stop(now + 2);
  }

  // Melody with Echo
  const melodyNotes = [600, 800, 700, 900];
  const delay = audioContext.createDelay(1.0);
  delay.delayTime.value = 0.25;
  const feedback = audioContext.createGain();
  feedback.gain.value = 0.4;
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(masterGain);

  melodyNotes.forEach((freq, i) => {
    const note = audioContext.createOscillator();
    note.type = 'triangle';
    note.frequency.setValueAtTime(freq, now + i * 0.2);
    const noteGain = audioContext.createGain();
    noteGain.gain.setValueAtTime(0.2, now + i * 0.2);
    noteGain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.2 + 0.15);
    note.connect(noteGain).connect(masterGain);
    note.connect(noteGain).connect(delay);
    note.start(now + i * 0.2);
    note.stop(now + i * 0.2 + 0.2);
  });

  // Stardust effect
  const noise = audioContext.createBufferSource();
  const bufferSize = audioContext.sampleRate * 1.5;
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noise.buffer = buffer;
  const noiseFilter = audioContext.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 8000;
  const noiseGain = audioContext.createGain();
  noiseGain.gain.setValueAtTime(0, now + 0.5);
  noiseGain.gain.linearRampToValueAtTime(0.05, now + 1);
  noiseGain.gain.linearRampToValueAtTime(0, now + 2);
  noise.connect(noiseFilter).connect(noiseGain).connect(masterGain);
  noise.start(now + 0.5);
  noise.stop(now + 2);
};
