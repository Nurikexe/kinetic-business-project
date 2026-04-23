import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

function WorkoutCard({ workout }) {
  const [open, setOpen] = useState(false)
  const exercises = workout.exercises?.items ?? workout.exercises ?? []

  return (
    <div className="bg-surface-container-low border border-outline/10 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-container transition-colors"
      >
        <div>
          <p className="font-headline font-bold text-on-surface">{workout.day_name}</p>
          {workout.day_focus && (
            <p className="font-label text-xs text-on-surface-variant mt-0.5">{workout.day_focus}</p>
          )}
          <p className="font-label text-[10px] text-outline mt-0.5">
            {new Date(workout.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant text-xl transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          expand_more
        </span>
      </button>
      {open && exercises.length > 0 && (
        <div className="px-5 pb-4 space-y-2 border-t border-outline/10">
          {exercises.map((ex, i) => (
            <div key={ex.id ?? i} className="flex items-center justify-between py-2 border-b border-outline/5 last:border-0">
              <p className="font-label text-sm text-on-surface">{ex.name}</p>
              <p className="font-label text-xs text-on-surface-variant">
                {ex.sets} × {ex.reps}{ex.weight ? ` @ ${ex.weight}` : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RunCard({ session }) {
  return (
    <div className="bg-surface-container-low border border-outline/10 rounded-2xl px-5 py-4 flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-secondary-container/20 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-secondary-container text-xl"
            style={{ fontVariationSettings: "'FILL' 1" }}>directions_run</span>
        </div>
        <div>
          <p className="font-headline font-bold text-on-surface">{session.title || session.run_type || 'Run'}</p>
          <p className="font-label text-[10px] text-outline">
            {new Date(session.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        {session.total_distance > 0 && (
          <p className="font-headline font-bold text-on-surface">{Number(session.total_distance).toFixed(2)} km</p>
        )}
        {session.avg_pace && (
          <p className="font-label text-xs text-on-surface-variant">{session.avg_pace}/km</p>
        )}
      </div>
    </div>
  )
}

export default function UserDataPage({ coach, request, onBack }) {
  const [workouts, setWorkouts]     = useState([])
  const [runSessions, setRunSessions] = useState([])
  const [userConfig, setUserConfig] = useState(null)
  const [profile, setProfile]       = useState(null)
  const [hasAccess, setHasAccess]   = useState(null)
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('workouts')
  const [editingPlan, setEditingPlan] = useState(false)
  const [savingPlan, setSavingPlan] = useState(false)
  const [editedDays, setEditedDays] = useState(null)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      const { data: access } = await supabase
        .from('workout_access')
        .select('id')
        .eq('coach_id', coach.id)
        .eq('user_id', request.user_id)
        .maybeSingle()

      if (!mounted) return

      if (!access) { setHasAccess(false); setLoading(false); return }
      setHasAccess(true)

      const [
        { data: ws },
        { data: rs },
        { data: cfg },
        { data: prof },
      ] = await Promise.all([
        supabase.from('workouts').select('*').eq('user_id', request.user_id).order('date', { ascending: false }),
        supabase.from('run_sessions').select('*').eq('user_id', request.user_id).order('date', { ascending: false }),
        supabase.from('user_config').select('gym_days,run_weeks,run_types').eq('user_id', request.user_id).maybeSingle(),
        supabase.from('profiles').select('*').eq('user_id', request.user_id).maybeSingle(),
      ])

      if (!mounted) return
      setWorkouts(ws ?? [])
      setRunSessions(rs ?? [])
      setUserConfig(cfg)
      setEditedDays(cfg?.gym_days ?? [])
      setProfile(prof)
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [coach.id, request.user_id])

  const savePlan = async () => {
    setSaveError('')
    setSavingPlan(true)
    const { data, error } = await supabase
      .from('user_config')
      .update({
        gym_days: editedDays,
        gym_day_count: Array.isArray(editedDays) ? editedDays.length : 0,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', request.user_id)
      .select('gym_days,run_weeks,run_types')
      .maybeSingle()

    if (error) {
      setSaveError(error.message || 'Failed to save the workout plan.')
      setSavingPlan(false)
      return
    }

    if (data) {
      setUserConfig(data)
      setEditedDays(data.gym_days ?? [])
    }

    setSavingPlan(false)
    setEditingPlan(false)
  }

  const athleteName = profile?.display_name || 'Athlete'

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-5 border-b border-outline/10 flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-xl">arrow_back</span>
          </button>
          <h1 className="font-headline text-xl font-bold text-on-surface">{athleteName}</h1>
          {hasAccess && (
            <span className="font-label text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-primary-container/20 text-primary-container">
              Full Access
            </span>
          )}
        </div>
        <p className="font-label text-sm text-on-surface-variant pl-12">Athlete workout history & plan management</p>

        {hasAccess && (
          <div className="flex gap-2 mt-4 pl-12">
            {['workouts', 'runs', 'plan'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-full font-label text-xs font-bold uppercase tracking-widest transition-all ${
                  tab === t
                    ? 'bg-primary-container text-on-primary-fixed'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-primary-container/30 border-t-primary-container animate-spin" />
          </div>
        ) : hasAccess === false ? (
          <div className="text-center py-24">
            <span className="material-symbols-outlined text-6xl text-outline mb-4 block">lock</span>
            <h2 className="font-headline text-xl text-on-surface mb-2">Access Locked</h2>
            <p className="font-label text-sm text-on-surface-variant max-w-sm mx-auto">
              The athlete must complete a payment before you can view or edit their workout data.
            </p>
            <p className="font-label text-xs text-outline mt-2">
              Send a payment request from the chat.
            </p>
          </div>
        ) : (
          <div className="max-w-2xl">
            {tab === 'workouts' && (
              workouts.length === 0 ? (
                <EmptyState icon="fitness_center" label="No gym sessions logged yet" />
              ) : (
                <div className="space-y-3">
                  {workouts.map(w => <WorkoutCard key={w.id} workout={w} />)}
                </div>
              )
            )}

            {tab === 'runs' && (
              runSessions.length === 0 ? (
                <EmptyState icon="directions_run" label="No run sessions logged yet" />
              ) : (
                <div className="space-y-3">
                  {runSessions.map(r => <RunCard key={r.id} session={r} />)}
                </div>
              )
            )}

            {tab === 'plan' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-headline text-base font-bold text-on-surface">Current Workout Plan</h3>
                    <p className="font-label text-xs text-on-surface-variant mt-0.5">
                      Edit the athlete&apos;s workout plan directly
                    </p>
                  </div>
                  {!editingPlan ? (
                    <button
                      onClick={() => setEditingPlan(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary-fixed font-label text-xs font-bold rounded-xl hover:bg-primary-dim transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                      Edit Plan
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditingPlan(false); setEditedDays(userConfig?.gym_days ?? []) }}
                        className="px-4 py-2 bg-surface-container text-on-surface-variant font-label text-xs font-bold rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={savePlan}
                        disabled={savingPlan}
                        className="px-4 py-2 bg-primary-container text-on-primary-fixed font-label text-xs font-bold rounded-xl disabled:opacity-50"
                      >
                        {savingPlan ? 'Saving…' : 'Save Plan'}
                      </button>
                    </div>
                  )}
                </div>

                {saveError && (
                  <p className="font-label text-xs text-error-container mb-4">{saveError}</p>
                )}

                {(!editedDays || editedDays.length === 0) ? (
                  <EmptyState icon="calendar_month" label="No plan configured yet" />
                ) : (
                  <div className="space-y-4">
                    {editedDays.map((day, dayIdx) => (
                      <div key={day.id ?? dayIdx} className="bg-surface-container-low border border-outline/10 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-headline font-bold text-on-surface">{day.num} — {day.name}</p>
                            {day.sub && <p className="font-label text-xs text-on-surface-variant">{day.sub}</p>}
                            {day.schedule && <p className="font-label text-[10px] text-outline">{day.schedule}</p>}
                          </div>
                        </div>
                        <div className="space-y-2">
                          {(day.exercises ?? []).map((ex, exIdx) => (
                            <div key={ex.id ?? exIdx} className="flex items-center gap-3 py-2 border-b border-outline/5 last:border-0">
                              <div className="flex-1">
                                {editingPlan ? (
                                  <input
                                    value={ex.name}
                                    onChange={e => {
                                      const newDays = editedDays.map((d, di) =>
                                        di === dayIdx
                                          ? { ...d, exercises: d.exercises.map((ex2, ei) => ei === exIdx ? { ...ex2, name: e.target.value } : ex2) }
                                          : d
                                      )
                                      setEditedDays(newDays)
                                    }}
                                    className="w-full bg-surface-container border border-outline/20 rounded-lg px-3 py-1.5 font-label text-sm text-on-surface focus:outline-none focus:border-primary-container/50"
                                  />
                                ) : (
                                  <p className="font-label text-sm text-on-surface">{ex.name}</p>
                                )}
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                {editingPlan ? (
                                  <>
                                    <input
                                      value={ex.sets}
                                      onChange={e => {
                                        const newDays = editedDays.map((d, di) =>
                                          di === dayIdx
                                            ? { ...d, exercises: d.exercises.map((ex2, ei) => ei === exIdx ? { ...ex2, sets: e.target.value } : ex2) }
                                            : d
                                        )
                                        setEditedDays(newDays)
                                      }}
                                      className="w-14 bg-surface-container border border-outline/20 rounded-lg px-2 py-1.5 font-label text-xs text-on-surface text-center focus:outline-none focus:border-primary-container/50"
                                      placeholder="sets"
                                    />
                                    <input
                                      value={ex.reps}
                                      onChange={e => {
                                        const newDays = editedDays.map((d, di) =>
                                          di === dayIdx
                                            ? { ...d, exercises: d.exercises.map((ex2, ei) => ei === exIdx ? { ...ex2, reps: e.target.value } : ex2) }
                                            : d
                                        )
                                        setEditedDays(newDays)
                                      }}
                                      className="w-20 bg-surface-container border border-outline/20 rounded-lg px-2 py-1.5 font-label text-xs text-on-surface text-center focus:outline-none focus:border-primary-container/50"
                                      placeholder="reps"
                                    />
                                  </>
                                ) : (
                                  <p className="font-label text-xs text-on-surface-variant">{ex.sets} × {ex.reps}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ icon, label }) {
  return (
    <div className="text-center py-20">
      <span className="material-symbols-outlined text-5xl text-outline mb-3 block">{icon}</span>
      <p className="font-label text-sm text-on-surface-variant">{label}</p>
    </div>
  )
}
