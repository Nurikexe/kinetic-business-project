import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

let exerciseCounter = 0;
function newExercise() {
  return { id: `ex-${++exerciseCounter}`, name: '', sets: 3, reps: '8-10', rest: '90s' };
}
let dayCounter = 0;
function newDay(label = '') {
  return { id: `day-${++dayCounter}`, name: label || `Day ${dayCounter}`, focus: '', exercises: [newExercise()] };
}

export default function CreateWorkoutPage({ setPage }) {
  const { user } = useAuth();
  const [title, setTitle]       = useState('');
  const [desc, setDesc]         = useState('');
  const [planType, setPlanType] = useState('gym');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [days, setDays]         = useState([newDay('Day 1')]);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);

  // ── Day handlers ──────────────────────────────────────────
  const addDay = () => setDays(d => [...d, newDay(`Day ${d.length + 1}`)]);
  const removeDay = (id) => setDays(d => d.filter(x => x.id !== id));
  const updateDay = (id, field, value) =>
    setDays(d => d.map(x => x.id === id ? { ...x, [field]: value } : x));

  // ── Exercise handlers ─────────────────────────────────────
  const addExercise = (dayId) =>
    setDays(d => d.map(x => x.id === dayId ? { ...x, exercises: [...x.exercises, newExercise()] } : x));
  const removeExercise = (dayId, exId) =>
    setDays(d => d.map(x => x.id === dayId ? { ...x, exercises: x.exercises.filter(e => e.id !== exId) } : x));
  const updateExercise = (dayId, exId, field, value) =>
    setDays(d => d.map(x => x.id === dayId
      ? { ...x, exercises: x.exercises.map(e => e.id === exId ? { ...e, [field]: value } : e) }
      : x));

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!title.trim()) { setError('Plan title is required.'); return; }
    if (!user) { setError('You must be logged in.'); return; }

    setSaving(true);
    setError('');

    const { error: dbErr } = await supabase.from('community_plans').insert({
      user_id:    user.id,
      title:      title.trim(),
      description: desc.trim(),
      plan_type:  planType,
      difficulty,
      plan_data:  { days },
      likes:      0,
    });

    setSaving(false);
    if (dbErr) {
      setError(dbErr.message);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-3xl text-on-primary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        </div>
        <h2 className="text-3xl font-black font-headline uppercase tracking-tighter mb-3">Plan Published!</h2>
        <p className="text-on-surface-variant mb-8">Your workout plan has been shared with the KINETIC community.</p>
        <button
          onClick={() => setPage('home')}
          className="px-8 py-4 rounded-full kinetic-gradient text-on-primary-fixed font-headline font-black uppercase tracking-tighter"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl flex items-center gap-4 px-6 py-4 border-b border-outline-variant/10">
        <button onClick={() => setPage('home')} className="text-on-surface-variant hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <span className="text-xl font-black font-headline uppercase tracking-tighter text-primary-fixed">Create Plan</span>
      </header>

      <div className="px-6 pt-8 pb-10 max-w-2xl mx-auto">
        {/* Hero heading */}
        <section className="mb-10">
          <h1 className="font-headline font-black text-5xl tracking-tighter uppercase leading-none mb-3">
            Forge <br /><span className="text-primary-container">Greatness.</span>
          </h1>
          <p className="text-on-surface-variant max-w-sm">Design your custom performance blueprint and share it with the community.</p>
        </section>

        {/* Basic Info */}
        <div className="grid grid-cols-1 gap-6 mb-10">
          <div className="bg-surface-container rounded-lg p-6 space-y-5">
            <div>
              <label className="font-headline font-bold text-xs uppercase tracking-widest text-primary-container mb-2 block">Plan Name</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. HYBRID STRENGTH & FLOW"
                className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-lg px-5 py-3 text-lg font-headline font-bold tracking-tight placeholder:text-outline focus:outline-none focus:border-primary-container/50 transition-colors"
              />
            </div>
            <div>
              <label className="font-headline font-bold text-xs uppercase tracking-widest text-primary-container mb-2 block">Description</label>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Explain the philosophy behind this plan…"
                rows={3}
                className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-lg px-5 py-3 text-sm placeholder:text-outline focus:outline-none focus:border-primary-container/50 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Plan Type + Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container rounded-lg p-5">
              <label className="font-headline font-bold text-xs uppercase tracking-widest text-primary-container mb-3 block">Type</label>
              <div className="space-y-2">
                {['gym', 'running', 'hybrid'].map(t => (
                  <button
                    key={t}
                    onClick={() => setPlanType(t)}
                    className={`w-full py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition-colors ${planType === t ? 'bg-primary-container text-on-primary-fixed' : 'bg-surface-container-highest text-on-surface-variant hover:text-on-surface'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-surface-container rounded-lg p-5">
              <label className="font-headline font-bold text-xs uppercase tracking-widest text-primary-container mb-3 block">Difficulty</label>
              <div className="space-y-2">
                {['beginner', 'intermediate', 'advanced'].map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`w-full py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition-colors ${difficulty === d ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-on-surface-variant hover:text-on-surface'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Exercise Builder */}
        <section className="space-y-6 mb-10">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="font-headline font-extrabold text-2xl tracking-tight">The Split</h2>
              <p className="text-on-surface-variant text-sm">Define your training days and movements</p>
            </div>
            <button
              onClick={addDay}
              className="bg-surface-container-highest text-on-surface px-5 py-2.5 rounded-full font-headline font-bold text-sm flex items-center gap-2 hover:bg-surface-bright transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">add</span> Day
            </button>
          </div>

          <div className="space-y-5">
            {days.map((day, dayIdx) => (
              <div key={day.id} className="bg-surface-container rounded-lg overflow-hidden">
                {/* Day header */}
                <div className="px-6 py-4 bg-surface-container-high flex justify-between items-center gap-3">
                  <input
                    type="text"
                    value={day.name}
                    onChange={e => updateDay(day.id, 'name', e.target.value)}
                    className="flex-1 bg-transparent text-primary-container font-headline font-bold uppercase tracking-wide focus:outline-none placeholder:text-outline-variant"
                    placeholder={`DAY ${dayIdx + 1}`}
                  />
                  <input
                    type="text"
                    value={day.focus}
                    onChange={e => updateDay(day.id, 'focus', e.target.value)}
                    className="w-32 bg-transparent text-on-surface-variant text-xs font-bold uppercase tracking-widest focus:outline-none text-right placeholder:text-outline-variant"
                    placeholder="PUSH / PULL…"
                  />
                  {days.length > 1 && (
                    <button onClick={() => removeDay(day.id)} className="text-error hover:opacity-80 transition-opacity ml-2 shrink-0">
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  )}
                </div>

                {/* Exercises */}
                <div className="p-5 space-y-3">
                  {day.exercises.map(ex => (
                    <div key={ex.id} className="bg-surface-container-highest rounded-lg p-4 border-l-4 border-primary-container/40">
                      <div className="flex gap-3 items-start">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={ex.name}
                            onChange={e => updateExercise(day.id, ex.id, 'name', e.target.value)}
                            placeholder="Exercise name (e.g. Bench Press)"
                            className="w-full bg-transparent font-headline font-bold placeholder:text-outline-variant focus:outline-none"
                          />
                          <div className="flex gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-on-surface-variant uppercase font-bold">Sets</span>
                              <input
                                type="number"
                                value={ex.sets}
                                onChange={e => updateExercise(day.id, ex.id, 'sets', e.target.value)}
                                className="w-12 bg-surface-container rounded px-2 py-1 text-sm font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary-container"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-on-surface-variant uppercase font-bold">Reps</span>
                              <input
                                type="text"
                                value={ex.reps}
                                onChange={e => updateExercise(day.id, ex.id, 'reps', e.target.value)}
                                className="w-16 bg-surface-container rounded px-2 py-1 text-sm font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary-container"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-on-surface-variant uppercase font-bold">Rest</span>
                              <input
                                type="text"
                                value={ex.rest}
                                onChange={e => updateExercise(day.id, ex.id, 'rest', e.target.value)}
                                className="w-14 bg-surface-container rounded px-2 py-1 text-sm font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary-container"
                              />
                            </div>
                          </div>
                        </div>
                        {day.exercises.length > 1 && (
                          <button onClick={() => removeExercise(day.id, ex.id)} className="text-outline hover:text-error transition-colors shrink-0 mt-1">
                            <span className="material-symbols-outlined text-lg">close</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => addExercise(day.id)}
                    className="flex items-center gap-2 text-on-surface-variant hover:text-primary-fixed transition-colors text-sm font-bold uppercase tracking-widest pt-1"
                  >
                    <span className="material-symbols-outlined text-sm">add_circle</span>
                    Add Movement
                  </button>
                </div>
              </div>
            ))}

            {/* Ghost add day */}
            <button
              onClick={addDay}
              className="w-full border border-outline-variant/20 rounded-lg p-8 flex flex-col items-center justify-center border-dashed min-h-[120px] group hover:bg-surface-container/30 transition-all"
            >
              <span className="material-symbols-outlined text-4xl text-outline group-hover:text-primary-container transition-colors mb-2">post_add</span>
              <span className="font-headline font-bold text-outline group-hover:text-on-surface transition-colors text-sm">Add Next Training Day</span>
            </button>
          </div>
        </section>

        {/* Publish */}
        {error && (
          <div className="bg-error-container/20 border border-error/20 rounded-lg px-5 py-3 text-error text-sm font-bold mb-4">
            {error}
          </div>
        )}

        <div className="glass-panel p-8 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-outline-variant/10">
          <div>
            <h3 className="font-headline font-extrabold text-2xl mb-1">Ready to publish?</h3>
            <p className="text-on-surface-variant text-sm">Your plan will be shared with the KINETIC community.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={() => setPage('home')}
              className="px-6 py-3.5 rounded-full font-headline font-bold text-on-surface hover:bg-surface-container transition-all border border-outline-variant/30 active:scale-95 text-sm uppercase"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="kinetic-gradient px-10 py-3.5 rounded-full font-headline font-black text-on-primary-fixed shadow-[0_8px_30px_rgba(212,251,0,0.2)] hover:shadow-[0_8px_40px_rgba(212,251,0,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2 text-sm uppercase disabled:opacity-60"
            >
              {saving ? 'Publishing…' : 'Share to Community'}
              <span className="material-symbols-outlined text-lg">send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
