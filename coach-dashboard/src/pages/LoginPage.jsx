import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async e => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await login(email, password)
    if (err) setError(err.message)
    setLoading(false)
  }

  return (
    <div className="h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="font-headline text-xs tracking-[6px] text-primary-container uppercase font-bold mb-2">Kinetic</p>
          <h1 className="font-headline text-3xl font-bold text-on-surface">Coach Portal</h1>
          <p className="font-label text-sm text-on-surface-variant mt-2">Sign in with your coach account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="font-label text-xs text-on-surface-variant uppercase tracking-widest mb-2 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="coach@example.com"
              className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-3 font-label text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container/50"
            />
          </div>
          <div>
            <label className="font-label text-xs text-on-surface-variant uppercase tracking-widest mb-2 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-3 font-label text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container/50"
            />
          </div>
          {error && <p className="font-label text-xs text-error-container">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-container text-on-primary-fixed font-headline font-bold py-4 rounded-2xl text-base disabled:opacity-50 hover:bg-primary-dim transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="font-label text-xs text-on-surface-variant text-center mt-8">
          Use the same account as your KINETIC app.
        </p>
      </div>
    </div>
  )
}
