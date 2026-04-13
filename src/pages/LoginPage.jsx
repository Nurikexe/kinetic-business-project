import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode]             = useState('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'register' && !displayName.trim()) {
      setError('Please enter a display name.');
      return;
    }
    setLoading(true);
    const result = mode === 'login'
      ? await login(email, password)
      : await register(displayName, email, password);
    setLoading(false);
    if (result?.error) setError(result.error);
  };

  const inputClass =
    'w-full bg-surface-container-highest border border-outline-variant/20 rounded-lg px-5 py-3.5 text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container/60 transition-colors';

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-black italic tracking-tighter text-primary-fixed font-headline uppercase mb-2">
          KINETIC
        </h1>
        <p className="text-on-surface-variant text-sm">Engineered for high-performance athletes.</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-surface-container rounded-lg p-8 space-y-5">
        {/* Mode toggle */}
        <div className="flex bg-surface-container-low p-1 rounded-full">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-2 rounded-full font-headline font-bold text-sm uppercase tracking-wide transition-all ${mode === 'login' ? 'bg-primary-container text-on-primary-fixed' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 py-2 rounded-full font-headline font-bold text-sm uppercase tracking-wide transition-all ${mode === 'register' ? 'bg-primary-container text-on-primary-fixed' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Display name"
              autoComplete="name"
              className={inputClass}
            />
          )}

          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            required
            className={inputClass}
          />

          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              className={inputClass + ' pr-12'}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-xl">
                {showPw ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-error text-sm font-medium bg-error-container/10 rounded-lg px-4 py-2.5">
              <span className="material-symbols-outlined text-lg shrink-0">error</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-full kinetic-gradient text-on-primary-fixed font-headline font-black uppercase tracking-tighter text-lg shadow-[0_8px_24px_rgba(212,251,0,0.2)] hover:shadow-[0_8px_32px_rgba(212,251,0,0.35)] transition-all active:scale-95 disabled:opacity-60 mt-2"
          >
            {loading
              ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
              : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>
      </div>

      <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/30">
        Engineered for high-performance results © 2025 KINETIC
      </p>
    </div>
  );
}
