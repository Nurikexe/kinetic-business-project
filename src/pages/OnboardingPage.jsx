import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { streamChat } from '../lib/openrouter';
import { buildOnboardingConfig } from '../data/onboarding';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const SLIDE = {
  initial: { opacity: 0, x: 32 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -32 },
  transition: { type: 'spring', stiffness: 320, damping: 30 },
};

// ── Onboarding Questions ──────────────────────────────────────
const PLAN_TYPE_Q = {
  id: 'plan_type',
  title: 'What kind of plan do you need?',
  options: [
    { id: 'gym',     label: 'Gym Only',   icon: 'fitness_center', desc: 'Strength & hypertrophy' },
    { id: 'running', label: 'Running Only', icon: 'directions_run', desc: 'Endurance & cardio' },
    { id: 'hybrid',  label: 'Hybrid',     icon: 'bolt', desc: 'Gym + running combined' },
  ],
};

const QUESTIONS = [
  {
    id: 'main_goal',
    title: 'What is your main goal?',
    options: [
      { id: 'muscle_growth', label: 'Muscle Growth' },
      { id: 'strength',      label: 'Strength' },
      { id: 'fat_loss',      label: 'Fat Loss' },
      { id: 'running_endurance', label: 'Running Endurance' },
      { id: 'hybrid',        label: 'Hybrid Performance' },
      { id: 'general_fitness', label: 'General Fitness' },
    ],
  },
  {
    id: 'training_days',
    title: 'How many days can you train per week?',
    options: [
      { id: '3', label: '3 Days' },
      { id: '4', label: '4 Days' },
      { id: '5+', label: '5+ Days' },
    ],
  },
  {
    id: 'experience',
    title: 'What is your experience level?',
    options: [
      { id: 'beginner',     label: 'Beginner' },
      { id: 'intermediate', label: 'Intermediate' },
      { id: 'advanced',     label: 'Advanced' },
    ],
  },
  {
    id: 'session_duration',
    title: 'How long is one session?',
    options: [
      { id: '30', label: '30 min' },
      { id: '45', label: '45 min' },
      { id: '60', label: '60 min' },
      { id: '90', label: '90 min' },
    ],
  },
];

function buildAIPrompt(answers) {
  return [
    {
      role: 'system',
      content: `You are an expert fitness coach creating personalized workout plans.
Generate a structured workout plan in valid JSON only — no markdown, no extra text, just JSON.

Schema:
{
  "planType": "gym" | "running" | "hybrid",
  "title": "Plan Title",
  "description": "Brief description",
  "gymDays": [
    {
      "name": "Day Name",
      "focus": "Focus area",
      "exercises": [
        { "name": "Exercise", "sets": 3, "reps": "8-10", "rest": "90s" }
      ]
    }
  ],
  "runningDays": [
    {
      "name": "Day Name",
      "type": "Run type",
      "distance": "5km",
      "pace": "6:00/km",
      "description": "Session description"
    }
  ],
  "weeklySchedule": "Mon: Push, Tue: Run, etc."
}

Only include gymDays if the plan has gym. Only include runningDays if the plan has running.`,
    },
    {
      role: 'user',
      content: `Create a workout plan for someone with these preferences:
- Plan type: ${answers.plan_type}
- Main goal: ${answers.main_goal}
- Training days per week: ${answers.training_days}
- Experience level: ${answers.experience}
- Session duration: ${answers.session_duration} minutes`,
    },
  ];
}

// ── Community Plans Browser ───────────────────────────────────
function CommunityPlansView({ onSelect, onBack }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useState(() => {
    supabase
      .from('community_plans')
      .select('*')
      .order('likes', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setPlans(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background pb-8">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10">
        <button onClick={onBack} className="text-on-surface-variant hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <span className="font-headline font-bold text-xl uppercase tracking-tight">Community Plans</span>
      </header>

      <div className="flex-1 px-6 pt-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-primary-container/30 border-t-primary-container animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-5xl text-outline mb-4 block">group</span>
            <p className="text-on-surface-variant font-medium">No community plans yet.</p>
            <p className="text-on-surface-variant/60 text-sm mt-1">Be the first to share!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map(plan => (
              <button
                key={plan.id}
                onClick={() => onSelect(plan)}
                className="w-full text-left bg-surface-container rounded-lg p-6 hover:bg-surface-container-high transition-colors active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-headline font-bold text-lg uppercase tracking-tight">{plan.title}</h3>
                  <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-sm">favorite</span>
                    {plan.likes ?? 0}
                  </span>
                </div>
                <p className="text-on-surface-variant text-sm mb-3">{plan.description}</p>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-primary-container/10 text-primary-fixed text-xs font-bold rounded-full uppercase">
                    {plan.plan_type}
                  </span>
                  {plan.difficulty && (
                    <span className="px-3 py-1 bg-surface-container-highest text-on-surface-variant text-xs font-bold rounded-full uppercase">
                      {plan.difficulty}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Onboarding Page ──────────────────────────────────────
export default function OnboardingPage({ onComplete }) {
  const { user } = useAuth();
  const [step, setStep]       = useState('choice'); // choice | ai_plantype | ai_quiz | ai_generating | ai_result | community | scratch
  const [answers, setAnswers] = useState({});
  const [qIndex, setQIndex]   = useState(0);
  const [aiText, setAiText]   = useState('');
  const [aiPlan, setAiPlan]   = useState(null);
  const [aiError, setAiError] = useState('');

  // ── Choice screen ─────────────────────────────────────────
  if (step === 'choice') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="px-6 py-6">
          <span className="text-2xl font-black italic tracking-tighter text-primary-fixed font-headline uppercase">KINETIC</span>
        </header>
        <main className="flex-1 px-6 pt-4 pb-12 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black font-headline tracking-tighter uppercase leading-none mb-4">
              Choose Your <span className="text-primary-container">Path</span>
            </h2>
            <p className="text-on-surface-variant max-w-sm mx-auto">
              Select your starting point. We'll adapt to your goals and physiology.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 w-full">
            {/* AI Blueprint */}
            <button
              onClick={() => setStep('ai_plantype')}
              className="group glass-card border border-outline-variant/10 hover:border-primary-container/30 transition-all duration-300 active:scale-95 rounded-lg p-7 flex items-start gap-5 text-left"
            >
              <div className="p-3 rounded-xl bg-surface-container-highest text-primary-container shrink-0">
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
              </div>
              <div>
                <h3 className="text-xl font-black font-headline tracking-tight uppercase mb-1 group-hover:text-primary-container transition-colors">AI Blueprint</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  Answer a few questions and our AI generates a hyper-personalized multi-week program just for you.
                </p>
              </div>
            </button>

            {/* Community Plans */}
            <button
              onClick={() => setStep('community')}
              className="group glass-card border border-outline-variant/10 hover:border-secondary/30 transition-all duration-300 active:scale-95 rounded-lg p-7 flex items-start gap-5 text-left"
            >
              <div className="p-3 rounded-xl bg-surface-container-highest text-secondary shrink-0">
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
              </div>
              <div>
                <h3 className="text-xl font-black font-headline tracking-tight uppercase mb-1 group-hover:text-secondary transition-colors">Community Plans</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  Clone battle-tested workout routines shared by athletes in the KINETIC community.
                </p>
              </div>
            </button>

            {/* Build from Scratch */}
            <button
              onClick={() => onComplete('scratch', {})}
              className="group glass-card border border-outline-variant/10 hover:border-white/20 transition-all duration-300 active:scale-95 rounded-lg p-7 flex items-start gap-5 text-left"
            >
              <div className="p-3 rounded-xl bg-surface-container-highest text-on-surface shrink-0">
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>architecture</span>
              </div>
              <div>
                <h3 className="text-xl font-black font-headline tracking-tight uppercase mb-1 group-hover:text-white transition-colors">Build from Scratch</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  Start with a blank canvas and build your own training program your way.
                </p>
              </div>
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ── Community plans ───────────────────────────────────────
  if (step === 'community') {
    return (
      <CommunityPlansView
        onBack={() => setStep('choice')}
        onSelect={(plan) => onComplete('community', { plan })}
      />
    );
  }

  // ── AI: plan type selection ───────────────────────────────
  if (step === 'ai_plantype') {
    return (
      <motion.div {...SLIDE} className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center gap-3 px-6 py-4">
          <button onClick={() => setStep('choice')} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span className="font-headline font-bold text-xl uppercase tracking-tight text-primary-fixed">AI Blueprint</span>
        </header>

        <main className="flex-1 px-6 pt-6 pb-12 max-w-xl mx-auto w-full">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Step 1 of 5</p>
            <h2 className="text-3xl font-black font-headline tracking-tighter uppercase">{PLAN_TYPE_Q.title}</h2>
          </div>

          <div className="space-y-4">
            {PLAN_TYPE_Q.options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  setAnswers(a => ({ ...a, plan_type: opt.id }));
                  setStep('ai_quiz');
                  setQIndex(0);
                }}
                className="w-full bg-surface-container rounded-lg p-5 flex items-center gap-4 hover:bg-surface-container-high transition-colors active:scale-[0.98] text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary-container shrink-0">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{opt.icon}</span>
                </div>
                <div>
                  <p className="font-headline font-bold uppercase tracking-tight">{opt.label}</p>
                  <p className="text-on-surface-variant text-sm">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </main>
      </motion.div>
    );
  }

  // ── AI: quiz questions ────────────────────────────────────
  if (step === 'ai_quiz') {
    const q = QUESTIONS[qIndex];

    const handleAnswer = (optId) => {
      const newAnswers = { ...answers, [q.id]: optId };
      setAnswers(newAnswers);

      if (qIndex < QUESTIONS.length - 1) {
        setQIndex(i => i + 1);
      } else {
        // All questions answered — generate
        setStep('ai_generating');
        setAiText('');
        setAiError('');
        streamChat(buildAIPrompt(newAnswers), (chunk) => {
          setAiText(t => t + chunk);
        })
          .then((full) => {
            try {
              // Extract JSON from response
              const jsonMatch = full.match(/\{[\s\S]*\}/);
              if (!jsonMatch) throw new Error('No JSON found in response');
              const parsed = JSON.parse(jsonMatch[0]);
              setAiPlan(parsed);
              setStep('ai_result');
            } catch (e) {
              setAiError('Could not parse AI response. Please try again.');
              setStep('ai_generating');
            }
          })
          .catch((e) => {
            setAiError(e.message ?? 'AI generation failed.');
            setStep('ai_generating');
          });
      }
    };

    return (
      <AnimatePresence mode="wait">
        <motion.div key={qIndex} {...SLIDE} className="min-h-screen bg-background flex flex-col">
          <header className="flex items-center gap-3 px-6 py-4">
            <button
              onClick={() => qIndex === 0 ? setStep('ai_plantype') : setQIndex(i => i - 1)}
              className="text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <span className="font-headline font-bold text-xl uppercase tracking-tight text-primary-fixed">AI Blueprint</span>
          </header>

          <div className="px-6 mb-2">
            <div className="flex gap-1.5">
              {QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${i <= qIndex ? 'bg-primary-container' : 'bg-surface-container-highest'}`}
                />
              ))}
            </div>
          </div>

          <main className="flex-1 px-6 pt-6 pb-12 max-w-xl mx-auto w-full">
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Step {qIndex + 2} of 5</p>
              <h2 className="text-3xl font-black font-headline tracking-tighter uppercase">{q.title}</h2>
            </div>

            <div className="space-y-3">
              {q.options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleAnswer(opt.id)}
                  className="w-full bg-surface-container rounded-lg px-6 py-4 text-left font-headline font-bold uppercase tracking-tight hover:bg-primary-container hover:text-on-primary-fixed transition-all active:scale-[0.98]"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </main>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── AI: generating ────────────────────────────────────────
  if (step === 'ai_generating') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        {aiError ? (
          <div>
            <span className="material-symbols-outlined text-5xl text-error mb-4 block">error</span>
            <p className="text-on-surface-variant mb-6">{aiError}</p>
            <button
              onClick={() => setStep('ai_quiz')}
              className="px-8 py-4 rounded-full bg-primary-container text-on-primary-fixed font-headline font-bold uppercase"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div>
            <div className="w-16 h-16 rounded-full border-2 border-primary-container/30 border-t-primary-container animate-spin mb-6 mx-auto" />
            <h2 className="text-2xl font-black font-headline uppercase tracking-tighter mb-2">Generating Your Plan</h2>
            <p className="text-on-surface-variant text-sm">Our AI is crafting your personalized blueprint…</p>
            {aiText && (
              <div className="mt-6 max-w-sm text-left bg-surface-container rounded-lg p-4 text-xs text-on-surface-variant font-mono max-h-32 overflow-hidden">
                {aiText.slice(0, 200)}…
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── AI: result ────────────────────────────────────────────
  if (step === 'ai_result' && aiPlan) {
    // Color-code run types for visual clarity
    const runTypeColor = (type = '') => {
      const t = type.toLowerCase();
      if (t.includes('easy') || t.includes('recovery')) return { color: '#10b981', bg: '#10b98115', label: 'Easy' };
      if (t.includes('long'))      return { color: '#ff3b5c', bg: '#ff3b5c15', label: 'Long Run' };
      if (t.includes('tempo'))     return { color: '#ffb020', bg: '#ffb02015', label: 'Tempo' };
      if (t.includes('interval'))  return { color: '#a855f7', bg: '#a855f715', label: 'Intervals' };
      if (t.includes('threshold')) return { color: '#ff6b35', bg: '#ff6b3515', label: 'Threshold' };
      if (t.includes('hill'))      return { color: '#f59e0b', bg: '#f59e0b15', label: 'Hills' };
      return { color: '#00e3fd', bg: '#00e3fd15', label: type || 'Run' };
    };

    const hasGym     = aiPlan.gymDays?.length > 0;
    const hasRunning = aiPlan.runningDays?.length > 0;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10 sticky top-0 z-10 bg-background/95 backdrop-blur-xl">
          <button onClick={() => setStep('ai_quiz')} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span className="font-headline font-bold text-xl uppercase tracking-tight text-primary-fixed">Your Blueprint</span>
        </header>

        <div className="flex-1 pb-32 overflow-y-auto">
          {/* Hero */}
          <div className="px-6 pt-6 pb-5 max-w-xl mx-auto">
            <div className="flex flex-wrap gap-2 mb-4">
              {hasGym && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container/15 text-primary-fixed text-xs font-black uppercase tracking-widest">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
                  Gym
                </span>
              )}
              {hasRunning && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-black uppercase tracking-widest">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>directions_run</span>
                  Running
                </span>
              )}
              {answers.difficulty && (
                <span className="px-3 py-1 rounded-full bg-surface-container-highest text-on-surface-variant text-xs font-black uppercase tracking-widest">
                  {answers.experience || 'Custom'}
                </span>
              )}
            </div>

            <h2 className="text-4xl font-black font-headline uppercase tracking-tighter leading-none mb-3">
              {aiPlan.title}
            </h2>
            <p className="text-on-surface-variant leading-relaxed">{aiPlan.description}</p>
          </div>

          {/* Weekly Schedule strip */}
          {aiPlan.weeklySchedule && (
            <div className="px-6 mb-6 max-w-xl mx-auto">
              <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-primary-fixed text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
                  <p className="text-xs font-black uppercase tracking-widest text-primary-fixed">Weekly Schedule</p>
                </div>
                <p className="text-on-surface-variant text-sm leading-relaxed">{aiPlan.weeklySchedule}</p>
              </div>
            </div>
          )}

          {/* Gym Days */}
          {hasGym && (
            <section className="px-6 mb-8 max-w-xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
                <h3 className="font-headline font-black text-base uppercase tracking-widest text-primary-fixed">Gym Days</h3>
                <div className="flex-1 h-px bg-primary-container/20" />
              </div>

              <div className="space-y-3">
                {aiPlan.gymDays.map((day, i) => (
                  <div key={i} className="bg-surface-container rounded-lg overflow-hidden border border-outline-variant/10">
                    {/* Day header */}
                    <div className="px-5 py-3 bg-surface-container-high flex justify-between items-center">
                      <div>
                        <p className="font-headline font-black uppercase tracking-tight">{day.name}</p>
                        {day.focus && (
                          <p className="text-primary-fixed text-[10px] font-black uppercase tracking-widest mt-0.5">{day.focus}</p>
                        )}
                      </div>
                      <span className="text-xs font-bold text-on-surface-variant uppercase">{day.exercises?.length ?? 0} exercises</span>
                    </div>
                    {/* Exercises */}
                    <div className="p-4 space-y-2.5">
                      {day.exercises?.map((ex, j) => (
                        <div key={j} className="flex justify-between items-center">
                          <span className="text-sm text-on-surface">{ex.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="bg-primary-container/15 text-primary-fixed text-xs font-black px-2.5 py-1 rounded-full">
                              {ex.sets}×{ex.reps}
                            </span>
                            {ex.rest && (
                              <span className="text-on-surface-variant text-[10px] font-bold">{ex.rest}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Running Days */}
          {hasRunning && (
            <section className="px-6 mb-8 max-w-xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>directions_run</span>
                <h3 className="font-headline font-black text-base uppercase tracking-widest text-secondary">Running Days</h3>
                <div className="flex-1 h-px bg-secondary/20" />
              </div>

              <div className="space-y-3">
                {aiPlan.runningDays.map((day, i) => {
                  const tc = runTypeColor(day.type);
                  return (
                    <div
                      key={i}
                      className="rounded-lg overflow-hidden border border-outline-variant/10"
                      style={{ background: '#191919', borderLeftColor: tc.color, borderLeftWidth: 4 }}
                    >
                      <div className="p-5">
                        {/* Top row: day name + distance */}
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-headline font-black text-lg uppercase tracking-tight leading-tight pr-3">
                            {day.name}
                          </h4>
                          {day.distance && (
                            <span
                              className="shrink-0 text-sm font-black px-3 py-1 rounded-full"
                              style={{ background: tc.bg, color: tc.color }}
                            >
                              {day.distance}
                            </span>
                          )}
                        </div>

                        {/* Type + pace badges */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span
                            className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                            style={{ background: tc.bg, color: tc.color }}
                          >
                            {tc.label}
                          </span>
                          {day.pace && (
                            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">timer</span>
                              {day.pace}
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {day.description && (
                          <p className="text-on-surface-variant text-sm leading-relaxed">{day.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* CTA */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/95 backdrop-blur-xl border-t border-outline-variant/10">
          <button
            onClick={() => onComplete('ai', { plan: aiPlan, answers })}
            className="w-full py-4 rounded-full kinetic-gradient text-on-primary-fixed font-headline font-black uppercase tracking-tighter text-lg shadow-[0_8px_30px_rgba(212,251,0,0.2)] active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            Use This Plan
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_forward</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
}
