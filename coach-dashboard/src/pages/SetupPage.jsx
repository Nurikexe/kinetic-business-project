import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const SPEC_OPTIONS = ['Strength', 'Running', 'Hybrid', 'Nutrition', 'Mobility', 'CrossFit', 'Powerlifting']

export default function SetupPage() {
  const { user, refreshCoachProfile } = useAuth()
  const [form, setForm] = useState({
    display_name: user?.user_metadata?.display_name || '',
    bio: '',
    specializations: [],
    certifications: '',
    price_per_month: '',
    avatar_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const toggleSpec = (spec) => {
    setForm(f => ({
      ...f,
      specializations: f.specializations.includes(spec)
        ? f.specializations.filter(s => s !== spec)
        : [...f.specializations, spec],
    }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.display_name.trim()) { setError('Name is required.'); return }
    if (!form.price_per_month || Number(form.price_per_month) <= 0) { setError('Set a monthly price.'); return }

    setSaving(true)
    setError('')

    const certs = form.certifications
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)

    const { error: err } = await supabase.from('coaches').insert({
      user_id:         user.id,
      display_name:    form.display_name.trim(),
      bio:             form.bio.trim(),
      specializations: form.specializations,
      certifications:  certs,
      price_per_month: Number(form.price_per_month),
      avatar_url:      form.avatar_url.trim(),
      is_available:    true,
    })

    if (err) { setError(err.message); setSaving(false); return }
    await refreshCoachProfile()
  }

  return (
    <div className="h-screen bg-background flex items-center justify-center px-4 overflow-y-auto py-8">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <p className="font-headline text-xs tracking-[6px] text-primary-container uppercase font-bold mb-2">Step 1</p>
          <h1 className="font-headline text-3xl font-bold text-on-surface">Set Up Your Profile</h1>
          <p className="font-label text-sm text-on-surface-variant mt-2">
            This is what athletes will see in the KINETIC marketplace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Full Name">
            <input
              value={form.display_name}
              onChange={e => update('display_name', e.target.value)}
              placeholder="Jane Doe"
              className={INPUT_CLS}
            />
          </Field>

          <Field label="Short Bio">
            <textarea
              value={form.bio}
              onChange={e => update('bio', e.target.value)}
              placeholder="Certified strength coach with 5 years of experience…"
              rows={3}
              className={INPUT_CLS + ' resize-none'}
            />
          </Field>

          <Field label="Specializations">
            <div className="flex flex-wrap gap-2 mt-1">
              {SPEC_OPTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSpec(s)}
                  className={`px-3 py-1.5 rounded-full font-label text-xs font-bold uppercase tracking-wide transition-all ${
                    form.specializations.includes(s)
                      ? 'bg-primary-container text-on-primary-fixed'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Certifications (one per line)">
            <textarea
              value={form.certifications}
              onChange={e => update('certifications', e.target.value)}
              placeholder={'NASM-CPT\nCFSC\nPrecision Nutrition Level 1'}
              rows={3}
              className={INPUT_CLS + ' resize-none'}
            />
          </Field>

          <Field label="Monthly Price (USD)">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline font-label text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price_per_month}
                onChange={e => update('price_per_month', e.target.value)}
                placeholder="199"
                className={INPUT_CLS + ' pl-8'}
              />
            </div>
          </Field>

          <Field label="Avatar URL (optional)">
            <input
              value={form.avatar_url}
              onChange={e => update('avatar_url', e.target.value)}
              placeholder="https://…"
              className={INPUT_CLS}
            />
          </Field>

          {error && <p className="font-label text-xs text-error-container">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary-container text-on-primary-fixed font-headline font-bold py-4 rounded-2xl text-base disabled:opacity-50 hover:bg-primary-dim transition-colors"
          >
            {saving ? 'Creating Profile…' : 'Launch My Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}

const INPUT_CLS = 'w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-3 font-label text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container/50'

function Field({ label, children }) {
  return (
    <div>
      <label className="font-label text-xs text-on-surface-variant uppercase tracking-widest mb-2 block">{label}</label>
      {children}
    </div>
  )
}
