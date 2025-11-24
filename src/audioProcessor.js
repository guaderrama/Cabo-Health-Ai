// This script runs as an AudioWorkletProcessor in a separate thread.
// It receives raw audio data from the microphone, buffers it to a specific size (4096 samples),
// converts it to 16-bit PCM format, and sends the processed buffer back to the main thread
// for streaming to the Gemini API. This ensures smooth audio capture without blocking the UI.

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Buffer audio data until we have 4096 samples
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs) {
    // Fix: Verificar que inputs tenga elementos antes de acceder a [0]
    if (!inputs || inputs.length === 0) {
      return true; // Keep the processor alive
    }

    const input = inputs[0];
    // This processor is designed for mono input.
    if (input && input.length > 0) {
      const inputChannel = input[0];
      if (inputChannel) {
        for (let i = 0; i < inputChannel.length; i++) {
          this.buffer[this.bufferIndex++] = inputChannel[i];
          if (this.bufferIndex === this.bufferSize) {
            // Once the buffer is full, convert it to 16-bit PCM
            // and send it back to the main thread.
            const int16 = new Int16Array(this.bufferSize);
            for (let j = 0; j < this.bufferSize; j++) {
              int16[j] = Math.max(-1, Math.min(1, this.buffer[j])) * 32767;
            }
            // Post the data as a Transferable object for performance.
            this.port.postMessage(int16.buffer, [int16.buffer]);
            this.bufferIndex = 0; // Reset buffer
          }
        }
      }
    }
    // Keep the processor alive.
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
