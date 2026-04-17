import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { streamChat } from '../lib/openrouter';
import { buildOnboardingConfig } from '../data/onboarding';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CommunityPlanCard, CommunityPlanModal } from '../components/CommunityPlan';

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

const GYM_QUESTIONS = [
  {
    id: 'gym_days',
    title: 'How many days can you train per week?',
    options: [
      { id: '3', label: '3 Days' },
      { id: '4', label: '4 Days' },
      { id: '5+', label: '5+ Days' },
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
  {
    id: 'experience',
    title: 'What is your experience level?',
    options: [
      { id: 'beginner',     label: 'Beginner' },
      { id: 'intermediate', label: 'Intermediate' },
      { id: 'advanced',     label: 'Advanced' },
    ],
  },
];

const RUNNING_QUESTIONS = [
  {
    id: 'run_days',
    title: 'How many days do you want to run?',
    options: [
      { id: '2', label: '2 Days' },
      { id: '3', label: '3 Days' },
      { id: '4', label: '4 Days' },
      { id: '5+', label: '5+ Days' },
    ],
  },
  {
    id: 'session_duration',
    title: 'Average run duration?',
    options: [
      { id: '30', label: '30 min' },
      { id: '45', label: '45 min' },
      { id: '60', label: '60 min' },
      { id: '90+', label: '90+ min' },
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
];

const HYBRID_QUESTIONS = [
  {
    id: 'gym_days',
    title: 'How many days in the gym?',
    options: [
      { id: '2', label: '2 Days' },
      { id: '3', label: '3 Days' },
      { id: '4', label: '4 Days' },
    ],
  },
  {
    id: 'run_days',
    title: 'How many days running?',
    options: [
      { id: '1', label: '1 Day' },
      { id: '2', label: '2 Days' },
      { id: '3+', label: '3+ Days' },
    ],
  },
  {
    id: 'session_duration',
    title: 'Average session duration?',
    options: [
      { id: '45', label: '45 min' },
      { id: '60', label: '60 min' },
      { id: '90', label: '90 min' },
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
];

function getQuestions(planType) {
  if (planType === 'gym') return GYM_QUESTIONS;
  if (planType === 'running') return RUNNING_QUESTIONS;
  return HYBRID_QUESTIONS;
}

function buildAIPrompt(answers) {
  const extras = [];
  const isGym = answers.plan_type === 'gym' || answers.plan_type === 'hybrid';
  const isRunning = answers.plan_type === 'running' || answers.plan_type === 'hybrid';

  if (isGym) {
    if (answers.gym_stats?.trim()) {
      extras.push(`- Gym Goals & Current Stats: ${answers.gym_stats.trim()}`);
    }
  }

  if (isRunning) {
    if (answers.run_stats?.trim()) {
      extras.push(`- Running Goals & Current Stats: ${answers.run_stats.trim()}`);
    }
    if (answers.weeks_count) extras.push(`- Weeks of progression: ${answers.weeks_count}`);
  }

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
  "methodology": ["Rule 1", "Rule 2"],
  "performanceTargets": ["Target 1"],
  "runningDays": [
    {
      "name": "Day Name",
      "day": "Monday",
      "type": "Run type",
      "distance": "5km",
      "pace": "6:00/km",
      "description": "Session description"
    }
  ],
  "weeks": [
    { "week": 1, "sessions": { "<runDayName>": "session description" } }
  ],
  "weeklySchedule": "Mon: Push, Tue: Run, etc."
}

Only include gymDays if the plan has gym. Only include runningDays and weeks if the plan has running. The "weeks" array length MUST equal the user's requested number of weeks and each week's "sessions" keys must match the "name" of each runningDay.
${isGym ? (answers.gym_stats?.trim() ? '\nA gym goal/stats was provided. You MUST generate 2 to 4 progression rules in the "methodology" array and set "performanceTargets" based on their input.' : '\nNo valid gym goal/stats provided. You MUST leave "performanceTargets" and "methodology" arrays completely empty.') : ''}
${isRunning ? `
CRITICAL RUNNING PROGRESSION RULES — THESE ARE MANDATORY, NOT OPTIONAL:
1. EVERY session in the "weeks" array MUST show clear, measurable week-over-week progression. It is STRICTLY FORBIDDEN for any session to have the same distance AND same pace as the identical session in any previous week.
2. Distance progression: increase each run type by 5–10% per week (roughly 0.5–2km depending on base). Example: Long Run 10km (wk1) → 11km (wk2) → 12km (wk3) → 13km (wk4).
3. Pace progression: tempo, interval, and threshold paces must improve by at least 5–10 sec/km per week OR volume must increase.
4. EVERY session description MUST explicitly state the exact distance in km AND the target pace in min/km format, e.g. "12km at 5:30/km — push the final 2km".
5. NEVER write vague descriptions like "Continue long run training" or "Similar to last week". Always include specific numbers that differ from the previous week.
6. Deload weeks (if included): must be explicitly 80% of the previous week's volume — not a copy of it.
7. Before writing the JSON, mentally verify that no two consecutive weeks share identical numbers for the same session type.
${answers.run_stats?.trim() ? 'Running goal/stats were provided. Build the progression so the athlete reaches (or closely approaches) their stated goal by the final week. Make the delta visible across every week.' : 'No running goals provided. Start from sensible defaults for the experience level and apply the 10% weekly volume rule throughout all weeks.'}
` : ''}`
    },
    {
      role: 'user',
      content: `Create a workout plan for someone with these preferences:
- Plan type: ${answers.plan_type}
- Experience level: ${answers.experience}
- Gym training days: ${answers.gym_days || 'None'}
- Running days: ${answers.run_days || 'None'}
- Session duration: ${answers.session_duration} minutes
${extras.join('\n')}`,
    },
  ];
}

// ── Community Plans Browser ───────────────────────────────────
function CommunityPlansView({ onSelect, onBack }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    supabase
      .from('community_plans')
      .select('*, author:user_config(avatar_url)')
      .order('likes', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setPlans(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="px-6 py-6 sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="max-w-xl mx-auto flex items-center gap-5">
          <button 
            onClick={onBack} 
            className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <div>
            <h2 className="font-headline font-black text-3xl uppercase tracking-tighter leading-none mb-1">Elite <span className="text-secondary">Vault</span></h2>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-on-surface-variant opacity-70">Community Shared Programs</p>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 max-w-xl mx-auto w-full px-6 pt-8 pb-32">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-secondary/10 border-t-secondary animate-spin" />
              <div className="absolute inset-2 rounded-full border-2 border-primary-container/10 border-b-primary-container animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
            </div>
            <p className="font-headline font-bold text-xs uppercase tracking-widest text-on-surface-variant animate-pulse">Scanning the Vault...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center">
            <div className="w-20 h-20 rounded-3xl bg-surface-container flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-outline-variant">folder_off</span>
            </div>
            <h3 className="font-headline font-black text-xl uppercase tracking-tight mb-2">The Vault is Empty</h3>
            <p className="text-on-surface-variant text-sm max-w-[240px] leading-relaxed mx-auto italic">
              Be the first to upload a blueprint and lead the community.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {plans.map(plan => (
              <CommunityPlanCard 
                key={plan.id}
                plan={plan}
                onClick={setSelectedPlan}
                isLiked={false}
                onLike={null}
                isOwn={false}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Decorative Background Elements ── */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[40%] bg-secondary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-5%] left-[-10%] w-[40%] h-[30%] bg-primary-container/5 blur-[100px] rounded-full" />
      </div>

      {/* ── Detail Modal ── */}
      {selectedPlan && (
        <CommunityPlanModal 
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onUsePlan={onSelect}
          isLiked={false}
          onLike={null}
          isOwn={false}
        />
      )}
    </div>
  );
}

// ── Main Onboarding Page ──────────────────────────────────────
export default function OnboardingPage({ onComplete }) {
  const { user } = useAuth();
  const [step, setStep]       = useState('choice'); // choice | ai_plantype | ai_quiz | ai_extras | ai_generating | ai_result | community | scratch
  const [answers, setAnswers] = useState({});
  const [qIndex, setQIndex]   = useState(0);
  const [aiText, setAiText]   = useState('');
  const [aiPlan, setAiPlan]   = useState(null);
  const [aiError, setAiError] = useState('');

  // ── Extras form state (plan-type-specific follow-ups) ─────
  const [gymStats, setGymStats]                   = useState('');
  const [runStats, setRunStats]                   = useState('');
  const [weeksCount, setWeeksCount]               = useState('8');

  const runGeneration = (finalAnswers) => {
    setStep('ai_generating');
    setAiText('');
    setAiError('');
    streamChat(buildAIPrompt(finalAnswers), (chunk) => {
      setAiText(t => t + chunk);
    })
      .then((full) => {
        try {
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
  };

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
    const currentQuestions = getQuestions(answers.plan_type || 'gym');
    const q = currentQuestions[qIndex];

    const handleAnswer = (optId) => {
      const newAnswers = { ...answers, [q.id]: optId };
      setAnswers(newAnswers);

      if (qIndex < currentQuestions.length - 1) {
        setQIndex(i => i + 1);
      } else {
        // All base questions answered — collect plan-type-specific extras next
        setStep('ai_extras');
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
              {currentQuestions.map((_, i) => (
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

  // ── AI: plan-type-specific extras ─────────────────────────
  if (step === 'ai_extras') {
    const isGym     = answers.plan_type === 'gym' || answers.plan_type === 'hybrid';
    const isRunning = answers.plan_type === 'running' || answers.plan_type === 'hybrid';

    const canContinue = isRunning
      ? (!!weeksCount && Number(weeksCount) > 0 && Number(weeksCount) <= 52)
      : true;

    const handleContinue = () => {
      const extras = {};
      if (isGym) extras.gym_stats = gymStats;
      if (isRunning) {
        extras.run_stats = runStats;
        extras.weeks_count = Number(weeksCount) || 8;
      }
      const finalAnswers = { ...answers, ...extras };
      setAnswers(finalAnswers);
      runGeneration(finalAnswers);
    };

    return (
      <motion.div {...SLIDE} className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center gap-3 px-6 py-4">
          <button
            onClick={() => { setStep('ai_quiz'); setQIndex(getQuestions(answers.plan_type || 'gym').length - 1); }}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span className="font-headline font-bold text-xl uppercase tracking-tight text-primary-fixed">Fine-Tuning</span>
        </header>

        <main className="flex-1 px-6 pt-2 pb-32 max-w-xl mx-auto w-full space-y-8">
          {/* Gym Goals & Stats */}
          {isGym && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Gym Goals & Current Stats
              </label>
              <p className="text-on-surface-variant/70 text-sm mb-3">Optional — leave blank to skip.</p>
              <textarea
                value={gymStats}
                onChange={(e) => setGymStats(e.target.value)}
                placeholder="e.g. Goal: Bench press 100kg. Current: Bench press 40kg"
                rows={3}
                maxLength={500}
                className="w-full bg-surface-container rounded-lg p-4 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary-container resize-none"
              />
            </div>
          )}

          {/* Running Goals & Stats */}
          {isRunning && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Running Goals & Current Stats
              </label>
              <p className="text-on-surface-variant/70 text-sm mb-3">Optional — leave blank to skip.</p>
              <textarea
                value={runStats}
                onChange={(e) => setRunStats(e.target.value)}
                placeholder="e.g. Current: 5km at 6:00 pace. Goal: 5km at 5:00 pace"
                rows={3}
                maxLength={500}
                className="w-full bg-surface-container rounded-lg p-4 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary-container resize-none"
              />
            </div>
          )}

          {/* Running/Hybrid: weeks count */}
          {isRunning && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                How many weeks of progression do you want generated?
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={52}
                value={weeksCount}
                onChange={(e) => {
                  if (e.target.value.length <= 2) {
                    setWeeksCount(e.target.value);
                  }
                }}
                className="w-full bg-surface-container rounded-lg p-4 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
            </div>
          )}
        </main>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/95 backdrop-blur-xl border-t border-outline-variant/10">
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className="w-full py-4 rounded-full kinetic-gradient text-on-primary-fixed font-headline font-black uppercase tracking-tighter text-lg shadow-[0_8px_30px_rgba(212,251,0,0.2)] active:scale-95 transition-transform disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            Generate Plan
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </button>
        </div>
      </motion.div>
    );
  }

  // ── AI: generating ────────────────────────────────────────
  if (step === 'ai_generating') {
    if (aiError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
          <span className="material-symbols-outlined text-6xl text-error mb-4">error</span>
          <p className="text-on-surface-variant mb-8">{aiError}</p>
          <button
            onClick={() => runGeneration(answers)}
            className="px-8 py-4 rounded-full bg-primary-container text-on-primary-fixed font-headline font-bold uppercase"
          >
            Try Again
          </button>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        {/* Orbital animation */}
        <div className="relative w-36 h-36 mb-10">
          {/* Outer slow ring */}
          <div className="absolute inset-0 rounded-full border-2 border-primary-container/15 animate-spin" style={{ animationDuration: '3s' }} />
          {/* Middle dashed ring */}
          <div className="absolute inset-3 rounded-full border-2 border-dashed border-primary-container/30 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
          {/* Inner solid arc */}
          <div className="absolute inset-6 rounded-full border-4 border-transparent border-t-primary-container border-r-primary-container/40 animate-spin" style={{ animationDuration: '1s' }} />
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
          </div>
          {/* Orbiting dot */}
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '1.8s' }}>
            <div className="w-3 h-3 rounded-full bg-primary-container shadow-[0_0_8px_rgba(212,251,0,0.8)] absolute -top-1.5 left-1/2 -translate-x-1/2" />
          </div>
        </div>

        <h2 className="text-3xl font-black font-headline uppercase tracking-tighter mb-3">
          Generating Your Plan
        </h2>
        <p className="text-on-surface-variant max-w-xs leading-relaxed">
          Our AI is analysing your goals and crafting a personalised blueprint just for you…
        </p>

        {/* Animated step hints */}
        <div className="mt-10 space-y-3 w-full max-w-xs text-left">
          {[
            { icon: 'analytics',      label: 'Analysing your goals' },
            { icon: 'fitness_center', label: 'Selecting optimal exercises' },
            { icon: 'directions_run', label: 'Structuring your schedule' },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-surface-container"
              style={{ opacity: 0.4 + i * 0.2, animation: `pulse ${1.5 + i * 0.4}s ease-in-out infinite` }}
            >
              <span className="material-symbols-outlined text-primary-container text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                {item.icon}
              </span>
              <span className="text-sm font-medium text-on-surface-variant">{item.label}</span>
              <div className="ml-auto flex gap-1">
                {[0,1,2].map(d => (
                  <div
                    key={d}
                    className="w-1 h-1 rounded-full bg-primary-container/50 animate-bounce"
                    style={{ animationDelay: `${d * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
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
