/**
 * Terra Chat Service
 *
 * Text-mode interview chat with OpenAI GPT-6.1 Terra through the chat-openai
 * Edge Function, so the OpenAI key never reaches the browser. The function is
 * stateless, so this class keeps the history and sends it with every message.
 */

import type { Language, TranscriptMessage } from '../types';
import { invokeOpenAIFunction } from './openaiFunction';

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export class TerraChatSession {
  private history: ChatTurn[] = [];
  private readonly language: Language;

  constructor(language: Language) {
    this.language = language;
  }

  /**
   * Rebuilds the history from a saved transcript so a recovered interview
   * continues where it stopped. Failed messages never reached Nova, so they are skipped.
   */
  static fromTranscript(language: Language, activationMessage: string, transcript: TranscriptMessage[]): TerraChatSession {
    const session = new TerraChatSession(language);
    session.history = [
      { role: 'user', content: activationMessage },
      ...transcript
        .filter(msg => !msg.failed && msg.text.trim())
        .map<ChatTurn>(msg => ({ role: msg.sender === 'Nova' ? 'assistant' : 'user', content: msg.text })),
    ];
    return session;
  }

  /** Returns Nova's reply. On failure the history is unchanged, so the message can be sent again. */
  async sendMessage(message: string): Promise<string> {
    const messages: ChatTurn[] = [...this.history, { role: 'user', content: message }];
    const { text } = await invokeOpenAIFunction<{ text?: string }>('chat-openai', {
      language: this.language,
      messages,
    });
    const reply = text ?? '';
    this.history = [...messages, { role: 'assistant', content: reply }];
    return reply;
  }
}
