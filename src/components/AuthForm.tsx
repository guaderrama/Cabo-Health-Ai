import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Language } from '../types';
import { getInitialLanguage, saveLanguage } from '../utils/languagePreference';
import { LanguageToggle } from './WelcomeScreen';
import BrandBackdrop from './BrandBackdrop';

/** Supabase responde en inglés; aquí se traduce a algo que el paciente entienda. */
function friendlyAuthError(message: string, es: boolean): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return es ? 'Correo o contraseña incorrectos.' : 'Incorrect email or password.';
  if (m.includes('email not confirmed')) {
    return es ? 'Primero confirma tu correo: te enviamos un enlace cuando te registraste.' : 'Please confirm your email first: we sent you a link when you signed up.';
  }
  if (m.includes('already registered') || m.includes('already exists')) {
    return es ? 'Ya existe una cuenta con este correo. Inicia sesión.' : 'An account with this email already exists. Please sign in.';
  }
  if (m.includes('at least 6') || m.includes('password should')) {
    return es ? 'La contraseña debe tener al menos 6 caracteres.' : 'The password must be at least 6 characters.';
  }
  if (m.includes('rate limit') || m.includes('security purposes') || m.includes('too many')) {
    return es ? 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.' : 'Too many attempts. Wait a minute and try again.';
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return es ? 'No hay conexión a internet. Revisa tu conexión.' : 'No internet connection. Please check your connection.';
  }
  if (m.includes('invalid email') || m.includes('valid email')) return es ? 'Revisa que el correo esté bien escrito.' : 'Check that the email is spelled correctly.';
  return es ? 'No pudimos completar la acción. Inténtalo de nuevo.' : 'We could not complete that. Please try again.';
}

const AuthForm: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const es = language === 'es';

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    saveLanguage(lang);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email.trim(), password);
      } else {
        // El registro público es solo para pacientes; las cuentas de médico las da el administrador
        await signUp(email.trim(), password, 'patient');
        setSuccess(es
          ? 'Cuenta creada. Revisa tu correo y toca el enlace para confirmarla; después podrás entrar.'
          : 'Account created. Check your email and tap the link to confirm it; then you can sign in.');
      }
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : '', es));
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30';

  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-brand-cream p-4">
      <BrandBackdrop density="full" className="-z-10" />
      <div className="relative w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <LanguageToggle language={language} onChange={changeLanguage} />
        </div>

        <div className="text-center">
          <h1 className="bg-gradient-to-b from-brand-navy to-brand-deep bg-clip-text font-display text-5xl font-semibold tracking-tight text-transparent sm:text-6xl">
            Cabo Health
          </h1>
          <div className="mx-auto mt-3 h-px w-24 origin-center animate-rule-in bg-gradient-to-r from-transparent via-brand-bronze to-transparent" aria-hidden="true" />
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.2em] text-brand-sea sm:tracking-[0.35em]">
            {es ? 'Entrevista previa a tu consulta' : 'Pre-appointment interview'}
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white p-6 shadow-lg shadow-brand-deep/5 sm:p-8">
          <p className="text-lg leading-relaxed text-slate-700">
            {es
              ? 'Responde unas preguntas sobre tu salud antes de tu cita. Tu médico recibirá un resumen.'
              : 'Answer a few questions about your health before your appointment. Your doctor will receive a summary.'}
          </p>

          <h2 className="mt-5 text-xl font-semibold text-slate-900">
            {isLogin ? (es ? 'Entrar' : 'Sign in') : (es ? 'Crear tu cuenta' : 'Create your account')}
          </h2>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-800">
                {es ? 'Correo electrónico' : 'Email'}
              </label>
              <input
                type="email"
                id="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
                placeholder={es ? 'tucorreo@ejemplo.com' : 'you@example.com'}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-800">
                {es ? 'Contraseña' : 'Password'}
              </label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className={`${inputClass.replace('mt-1 ', '')} pr-24`}
                  aria-describedby={!isLogin ? 'password-hint' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-2 top-1/2 min-h-[40px] -translate-y-1/2 rounded-lg px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-pressed={showPassword}
                >
                  {showPassword ? (es ? 'Ocultar' : 'Hide') : (es ? 'Mostrar' : 'Show')}
                </button>
              </div>
              {!isLogin && (
                <p id="password-hint" className="mt-1 text-sm text-slate-600">
                  {es ? 'Al menos 6 caracteres.' : 'At least 6 characters.'}
                </p>
              )}
            </div>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-base text-red-800" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-xl border border-primary-border bg-primary-soft px-4 py-3 text-base text-slate-900" role="status">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="min-h-[52px] w-full rounded-xl bg-primary px-4 text-lg font-semibold text-white transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? (es ? 'Un momento…' : 'One moment…')
                : isLogin ? (es ? 'Entrar' : 'Sign in') : (es ? 'Crear cuenta' : 'Create account')}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-4 text-center">
            <p className="text-base text-slate-700">
              {isLogin ? (es ? '¿Es tu primera vez?' : 'First time here?') : (es ? '¿Ya tienes cuenta?' : 'Already have an account?')}
            </p>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setSuccess('');
              }}
              className="mt-1 min-h-[44px] rounded-lg px-4 font-semibold text-primary transition-colors hover:bg-primary-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isLogin ? (es ? 'Crear una cuenta' : 'Create an account') : (es ? 'Entrar' : 'Sign in')}
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-brand-sea">Next-Gen Clinical AI · Ivan Guaderrama</p>
      </div>
    </main>
  );
};

export default AuthForm;
