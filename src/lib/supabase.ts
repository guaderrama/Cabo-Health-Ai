import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cozsoshuctvhvdbmkmwc.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvenNvc2h1Y3R2aHZkYm1rbXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIwNDI2NDIsImV4cCI6MjA3NzYxODY0Mn0.Q6ewFANuzCISYqVwAOpGsJsO9UgEbUsJEVbkMPz1dsA';

// Fallback explícito para producción
if (!import.meta.env.VITE_SUPABASE_URL) {
  (window as any).VITE_SUPABASE_URL = 'https://cozsoshuctvhvdbmkmwc.supabase.co';
}
if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
  (window as any).VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvenNvc2h1Y3R2aHZkYm1rbXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIwNDI2NDIsImV4cCI6MjA3NzYxODY0Mn0.Q6ewFANuzCISYqVwAOpGsJsO9UgEbUsJEVbkMPz1dsA';
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);