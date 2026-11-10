import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

/**
 * The patient's name and date of birth are asked once and remembered in the
 * account (user_metadata), so they do not have to type them every session.
 * localStorage is a fallback for when the account update fails.
 */

export interface PatientProfile {
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD
}

const STORAGE_KEY = 'cabo_health_patient_profile';

export function loadPatientProfile(user: User | null): PatientProfile {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  let local: Partial<PatientProfile> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PatientProfile> & { userId?: string };
      if (!parsed.userId || parsed.userId === user?.id) local = parsed;
    }
  } catch {
    // ignore unreadable storage
  }
  return {
    fullName: (typeof meta.full_name === 'string' && meta.full_name) || local.fullName || '',
    dateOfBirth: (typeof meta.date_of_birth === 'string' && meta.date_of_birth) || local.dateOfBirth || '',
  };
}

export async function savePatientProfile(user: User | null, profile: PatientProfile): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...profile, userId: user?.id }));
  } catch {
    // ignore
  }

  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  if (!user || (meta.full_name === profile.fullName && meta.date_of_birth === profile.dateOfBirth)) return;

  try {
    const { error } = await supabase.auth.updateUser({
      data: { full_name: profile.fullName, date_of_birth: profile.dateOfBirth },
    });
    if (error) throw error;
  } catch (e) {
    logger.warn('No se pudo guardar el perfil del paciente en la cuenta:', e);
  }
}

/** Keeps letters (any alphabet), spaces, apostrophes, dots and hyphens. */
export function sanitizeName(value: string): string {
  return value.replace(/[^\p{L}\p{M}\s'.-]/gu, '').slice(0, 100);
}

export function isValidDateOfBirth(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date <= now && date.getFullYear() >= 1900;
}
