import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/**
 * Calls one of the OpenAI Edge Functions (chat-openai, generate-summary-openai).
 * On a non-2xx response the useful message is in the body, so it goes into the
 * thrown Error, where isOpenAIBillingError can recognize it.
 */
export async function invokeOpenAIFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) {
    let message = error.message;
    if (error instanceof FunctionsHttpError) {
      const errorBody = await error.context.json().catch(() => null);
      message = errorBody?.error?.message ?? message;
    }
    throw new Error(`GPT-6.1 Terra: ${message}`);
  }
  return (data ?? {}) as T;
}
