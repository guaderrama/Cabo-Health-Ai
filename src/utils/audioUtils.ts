export function encode(bytes: Uint8Array): string {
  // Perf: Avoid string concatenation in a loop.
  // It's much faster to build an array of characters and join it once.
  const len = bytes.byteLength;
  const chars = new Array(len);
  for (let i = 0; i < len; i++) {
    chars[i] = String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(chars.join(''));
}

export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = (dataInt16[i * numChannels + channel] ?? 0) / 32768.0;
    }
  }
  return buffer;
}

/**
 * Concatena múltiples Uint8Array en un único Uint8Array
 * @param arrays Array de Uint8Array a concatenar
 * @returns Uint8Array concatenado
 */
export function concatenateUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  // Calcular el tamaño total
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  
  // Crear el array resultante
  const result = new Uint8Array(totalLength);
  
  // Copiar cada array en el resultado
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  
  return result;
}
