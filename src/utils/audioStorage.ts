import { supabase } from '../lib/supabase';

/**
 * Sube un fragmento de audio a Supabase Storage
 * @param audioData - Datos de audio en formato Uint8Array
 * @param sessionId - ID de la sesión
 * @param messageId - ID del mensaje
 * @param sender - Emisor del mensaje ('You' o 'Nova')
 * @returns URL del audio subido o null si falla
 */
export async function uploadAudioFragment(
  audioData: Uint8Array,
  sessionId: string,
  messageId: string,
  sender: string
): Promise<string | null> {
  try {
    // Convertir Uint8Array a Blob
    const audioBlob = new Blob([audioData], { type: 'audio/pcm' });
    
    // Crear nombre de archivo único
    const timestamp = Date.now();
    const fileName = `${sessionId}/${sender.toLowerCase()}_${messageId}_${timestamp}.pcm`;

    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from('consultation-audio')
      .upload(fileName, audioBlob, {
        contentType: 'audio/pcm',
        upsert: false
      });

    if (error) {
      console.error('Error al subir audio:', error);
      return null;
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('consultation-audio')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error en uploadAudioFragment:', error);
    return null;
  }
}

/**
 * Convierte audio PCM a formato WAV
 * @param pcmData - Datos PCM en Uint8Array
 * @param sampleRate - Tasa de muestreo (default: 16000)
 * @returns Blob WAV
 */
export function pcmToWav(pcmData: Uint8Array, sampleRate: number = 16000): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const headerSize = 44;
  
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);
  
  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  
  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // audio format (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  
  // PCM data
  const pcmView = new Uint8Array(buffer, headerSize);
  pcmView.set(pcmData);
  
  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Sube audio en formato WAV
 * @param pcmData - Datos PCM
 * @param sessionId - ID de sesión
 * @param messageId - ID de mensaje
 * @param sender - Emisor
 * @param sampleRate - Tasa de muestreo
 * @returns URL del audio o null
 */
export async function uploadAudioFragmentWav(
  pcmData: Uint8Array,
  sessionId: string,
  messageId: string,
  sender: string,
  sampleRate: number = 16000
): Promise<string | null> {
  try {
    const wavBlob = pcmToWav(pcmData, sampleRate);
    const timestamp = Date.now();
    const fileName = `${sessionId}/${sender.toLowerCase()}_${messageId}_${timestamp}.wav`;

    const { data, error } = await supabase.storage
      .from('consultation-audio')
      .upload(fileName, wavBlob, {
        contentType: 'audio/wav',
        upsert: false
      });

    if (error) {
      console.error('Error al subir audio WAV:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('consultation-audio')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error en uploadAudioFragmentWav:', error);
    return null;
  }
}
