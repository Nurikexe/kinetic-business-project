import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SPRING = { type: 'spring', stiffness: 340, damping: 30, mass: 0.8 };

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode]           = useState('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'register' && !displayName.trim()) {
      setError('Please enter a display name');
      return;
    }
    setLoading(true);
    const result = mode === 'login'
      ? await login(email, password)
      : await register(displayName, email, password);
    setLoading(false);
    if (result?.error) setError(result.error);
  };

  const switchMode = () => {
    setMode(m => m === 'login' ? 'register' : 'login');
    setError('');
    setPassword('');
    setDisplayName('');
  };

  const fields = [
    ...(mode === 'register' ? [{
      label: 'Display Name', value: displayName, onChange: setDisplayName,
      type: 'text', autocomplete: 'name', placeholder: 'Your name',
    }] : []),
    {
      label: 'Email', value: email, onChange: setEmail,
      type: 'email', autocomplete: 'email', placeholder: 'you@email.com',
    },
  ];

  return (
    <div className="min-h-dvh grain relative flex flex-col items-center justify-center px-4">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0" style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80)`,
          backgroundSize: 'cover', backgroundPosition: 'center top',
        }} />
        <div className="absolute inset-0 bg-bg-900/[0.93]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(0,255,170,0.05)_0%,transparent_70%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-bg-900 to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-sm py-6">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, ...SPRING }}
          className="mb-8 flex items-center justify-center gap-3 sm:mb-10"
        >
          <div className="w-10 h-10 rounded-2xl bg-mint/[0.10] border border-mint/20 flex items-center justify-center">
            <Dumbbell size={20} className="text-mint" />
          </div>
          <div>
            <p className="font-display text-xl sm:text-2xl tracking-[3px] sm:tracking-[4px] uppercase leading-none">
              <span className="text-mint">Hybrid</span>
              <span className="text-text-muted"> Athlete</span>
            </p>
            <p className="font-mono text-[9px] tracking-[3px] text-text-muted/60 uppercase mt-0.5">
              Personal Training Hub
            </p>
          </div>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, ...SPRING }}
          className="bg-bg-700 border border-white/[0.07] rounded-2xl overflow-hidden"
        >
          {/* Tab strip */}
          <div className="flex border-b border-white/[0.05]">
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => m !== mode && switchMode()}
                className={`flex-1 py-3.5 font-display text-sm tracking-[2px] uppercase transition-colors duration-200 ${
                  mode === m ? 'text-mint bg-mint/[0.05]' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                {fields.map(f => (
                  <div key={f.label}>
                    <label className="text-[10px] font-mono text-text-muted tracking-[2px] uppercase block mb-1.5">
                      {f.label}
                    </label>
                    <input
                      type={f.type}
                      value={f.value}
                      onChange={e => f.onChange(e.target.value)}
                      autoComplete={f.autocomplete}
                      placeholder={f.placeholder}
                      className="w-full px-4 py-3 bg-bg-800 border border-white/[0.06] rounded-xl text-sm text-text-primary font-body outline-none focus:border-mint/35 transition-colors placeholder:text-text-muted/30"
                    />
                  </div>
                ))}

                {/* Password */}
                <div>
                  <label className="text-[10px] font-mono text-text-muted tracking-[2px] uppercase block mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 pr-11 bg-bg-800 border border-white/[0.06] rounded-xl text-sm text-text-primary font-body outline-none focus:border-mint/35 transition-colors placeholder:text-text-muted/30"
                    />
                    <button
                      type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 text-red/80 text-xs font-body"
                    >
                      <AlertCircle size={13} className="flex-shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  whileTap={{ scale: 0.97 }} type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-mint/[0.12] border border-mint/25 text-mint font-display text-sm tracking-[2px] uppercase hover:bg-mint/[0.18] transition-colors disabled:opacity-60"
                >
                  {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
                </motion.button>
              </motion.div>
            </AnimatePresence>
          </form>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-center text-[11px] font-body text-text-muted mt-5"
        >
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={switchMode} className="text-mint hover:underline">
            {mode === 'login' ? 'Register' : 'Sign In'}
          </button>
        </motion.p>
      </div>
    </div>
  );
}
