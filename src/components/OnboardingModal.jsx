import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Dumbbell, Flame, Footprints, PencilLine, Sparkles, Timer, Wand2 } from 'lucide-react';
import { ONBOARDING_QUESTIONS, ONBOARDING_START_OPTIONS } from '../data/onboarding';
import heroImage from '../assets/hero.png';

const SPRING = { type: 'spring', stiffness: 320, damping: 28, mass: 0.85 };

const ICONS = {
  favorite: Sparkles,
  generate: Wand2,
  manual: PencilLine,
};

const START_VISUALS = {
  favorite: {
    accent: 'from-mint/35 via-mint/10 to-transparent',
    badge: 'Default split + default runs',
    icon: Dumbbell,
    tone: 'mint',
  },
  generate: {
    accent: 'from-cyan/35 via-cyan/10 to-transparent',
    badge: '4 quick questions',
    icon: Flame,
    tone: 'cyan',
  },
  manual: {
    accent: 'from-white/14 via-white/5 to-transparent',
    badge: 'Start simple and edit later',
    icon: Footprints,
    tone: 'neutral',
  },
};

const QUESTION_VISUALS = [
  { icon: Dumbbell, tone: 'mint', label: 'Strength setup' },
  { icon: Footprints, tone: 'cyan', label: 'Training rhythm' },
  { icon: Flame, tone: 'mint', label: 'Experience level' },
  { icon: Timer, tone: 'cyan', label: 'Session flow' },
];

function FitnessVisual({ icon: Icon, tone = 'mint', compact = false }) {
  const toneClasses = tone === 'cyan'
    ? {
        halo: 'bg-[radial-gradient(circle_at_20%_20%,rgba(214,238,99,0.34),transparent_36%)]',
        orb: 'from-cyan via-mint to-cyan/40',
        plate: 'from-cyan/[0.2] to-transparent',
      }
    : tone === 'neutral'
    ? {
        halo: 'bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_36%)]',
        orb: 'from-white/70 via-white/30 to-transparent',
        plate: 'from-white/[0.12] to-transparent',
      }
    : {
        halo: 'bg-[radial-gradient(circle_at_20%_20%,rgba(113,215,201,0.34),transparent_36%)]',
        orb: 'from-mint via-cyan to-mint/40',
        plate: 'from-mint/[0.22] to-transparent',
      };

  return (
    <div className={`relative overflow-hidden ${compact ? 'h-full min-h-[170px]' : 'h-full min-h-[220px] md:min-h-[560px]'}`}>
      <div className={`absolute inset-0 ${toneClasses.halo}`} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,11,13,0.08)_0%,rgba(10,11,13,0.72)_72%,rgba(10,11,13,0.92)_100%)]" />
      <div className={`absolute right-[-10%] top-[10%] h-[45%] w-[45%] rounded-full bg-gradient-to-br ${toneClasses.orb} blur-2xl opacity-85`} />
      <div className={`absolute left-[10%] top-[16%] h-[42%] w-[42%] rounded-[32px] bg-gradient-to-br ${toneClasses.plate} border border-white/[0.08] rotate-[-14deg] shadow-[0_24px_60px_rgba(0,0,0,0.24)]`} />
      <div className="absolute right-[16%] top-[16%] h-16 w-16 rounded-[22px] border border-white/[0.08] bg-bg-700/82 shadow-[0_16px_34px_rgba(0,0,0,0.24)]" />
      <div className="absolute right-[24%] top-[33%] h-24 w-24 rounded-[30px] border border-white/[0.08] bg-bg-700/88 shadow-[0_18px_40px_rgba(0,0,0,0.28)]" />
      <div className="absolute left-[18%] top-[28%] flex h-28 w-28 items-center justify-center rounded-[34px] border border-white/[0.08] bg-bg-700/88 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
        <div className={`absolute inset-3 rounded-[26px] bg-gradient-to-br ${toneClasses.orb} opacity-20 blur-lg`} />
        <Icon size={compact ? 34 : 40} className={tone === 'cyan' ? 'text-cyan' : tone === 'neutral' ? 'text-text-secondary' : 'text-mint'} />
      </div>
    </div>
  );
}

function PhotoVisual({ tone = 'mint', compact = false }) {
  const glowClass = tone === 'cyan'
    ? 'from-cyan/28 via-cyan/8 to-transparent'
    : 'from-mint/28 via-lime/12 to-transparent';

  return (
    <div className={`relative overflow-hidden ${compact ? 'h-full min-h-[170px]' : 'h-full min-h-[220px] md:min-h-[560px]'}`}>
      <img
        src={heroImage}
        alt="Fitness athlete"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className={`absolute inset-0 bg-gradient-to-br ${glowClass}`} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,12,0.06)_0%,rgba(8,10,12,0.34)_38%,rgba(8,10,12,0.78)_100%)]" />
      <div className="absolute inset-y-0 left-0 w-[56%] bg-[linear-gradient(90deg,rgba(8,10,12,0.82)_0%,rgba(8,10,12,0.52)_60%,rgba(8,10,12,0)_100%)]" />
      <div className="absolute left-[7%] top-[11%] h-[34%] w-[28%] rounded-[34px] border border-white/[0.08] bg-white/[0.03] backdrop-blur-[2px]" />
      <div className="absolute right-[10%] top-[16%] h-[20%] w-[22%] rounded-[28px] border border-white/[0.08] bg-bg-900/34 backdrop-blur-md" />
      <div className="absolute right-[18%] bottom-[14%] h-[18%] w-[16%] rounded-[24px] border border-white/[0.06] bg-bg-900/26 backdrop-blur-md" />
    </div>
  );
}

export default function OnboardingModal({ displayName, onApply }) {
  const [mode, setMode] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [direction, setDirection] = useState(1);

  const currentQuestion = ONBOARDING_QUESTIONS[step];

  const handleStart = (nextMode) => {
    if (nextMode !== 'generate') {
      onApply(nextMode);
      return;
    }
    setMode(nextMode);
    setStep(0);
    setDirection(1);
    setAnswers({});
  };

  const handleAnswer = (answerId) => {
    const nextAnswers = { ...answers, [currentQuestion.id]: answerId };
    if (step === ONBOARDING_QUESTIONS.length - 1) {
      onApply(mode, nextAnswers);
      return;
    }
    setAnswers(nextAnswers);
    setDirection(1);
    setStep(step + 1);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4"
        style={{ background: 'rgba(6,8,9,0.78)', backdropFilter: 'blur(20px)' }}
      >
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.98 }}
          transition={SPRING}
          className="w-full max-w-4xl overflow-hidden rounded-[36px] border border-white/[0.06] bg-bg-700/96 shadow-[0_30px_90px_rgba(0,0,0,0.35)]"
        >
          {!mode ? (
            <div className="grid md:grid-cols-[1.1fr_0.9fr]">
              <div className="relative min-h-[280px] md:min-h-[640px] p-6 md:p-8 overflow-hidden">
                <div className="absolute inset-0">
                  <PhotoVisual tone="mint" />
                </div>

                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-cyan/80 mb-3">Fast onboarding</p>
                    <h2 className="max-w-sm font-display text-[34px] leading-[1.02] text-text-primary mb-4">
                      {displayName ? `${displayName}, ` : ''}pick your start and get moving fast.
                    </h2>
                    <p className="max-w-sm text-sm text-text-secondary">
                      One tap favourite, one fast quiz, or manual setup. Clean start, no wasted steps.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 max-w-sm">
                    {[
                      { value: '5', label: 'Gym Days' },
                      { value: '3', label: 'Run Days' },
                      { value: '4Q', label: 'Quiz' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-[24px] border border-white/[0.08] bg-bg-900/35 p-3 backdrop-blur-xl">
                        <p className="font-display text-[22px] text-text-primary">{item.value}</p>
                        <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-text-secondary">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 md:p-6 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]">
                <div className="space-y-3">
                  {ONBOARDING_START_OPTIONS.map((option, idx) => {
                    const Icon = ICONS[option.id];
                    const visual = START_VISUALS[option.id];
                    const VisualIcon = visual.icon;
                    return (
                      <motion.button
                        key={option.id}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.985 }}
                        transition={SPRING}
                        onClick={() => handleStart(option.id)}
                        className="group relative w-full overflow-hidden rounded-[28px] border border-white/[0.06] bg-bg-800/92 text-left"
                      >
                        <div className="grid grid-cols-[1fr_132px] min-h-[170px]">
                          <div className="p-5 flex flex-col justify-between">
                            <div>
                              <div className="mb-3 flex items-center gap-3">
                                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                                  idx === 0 ? 'bg-mint/[0.18] text-mint' : idx === 1 ? 'bg-cyan/[0.18] text-cyan' : 'bg-white/[0.06] text-text-secondary'
                                }`}>
                                  <Icon size={18} />
                                </div>
                                <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-text-secondary">
                                  Option {idx + 1}
                                </span>
                              </div>
                              <h3 className="max-w-[220px] font-display text-[24px] leading-tight text-text-primary">
                                {option.title}
                              </h3>
                            </div>
                            <span className={`inline-flex w-fit rounded-full px-3 py-1 text-[11px] font-body font-semibold ${
                              idx === 0 ? 'bg-mint/[0.14] text-mint' : idx === 1 ? 'bg-cyan/[0.14] text-cyan' : 'bg-white/[0.06] text-text-secondary'
                            }`}>
                              {visual.badge}
                            </span>
                          </div>

                          <div className="relative overflow-hidden">
                            <div className={`absolute inset-0 bg-gradient-to-br ${visual.accent}`} />
                            <FitnessVisual icon={VisualIcon} tone={visual.tone} compact />
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-[0.92fr_1.08fr]">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={{
                    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 34 : -34, filter: 'blur(6px)' }),
                    center: { opacity: 1, x: 0, filter: 'blur(0px)' },
                    exit: (dir) => ({ opacity: 0, x: dir > 0 ? -24 : 24, filter: 'blur(4px)' }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                  className="grid md:col-span-2 md:grid-cols-[0.92fr_1.08fr]"
                >
                  <div className="relative min-h-[220px] md:min-h-[560px] overflow-hidden">
                    <PhotoVisual tone={QUESTION_VISUALS[step].tone} />
                    <div className="absolute left-5 right-5 bottom-5 rounded-[26px] border border-white/[0.08] bg-bg-900/38 p-4 backdrop-blur-xl">
                      <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-cyan/75 mb-2">
                        Question {step + 1} of {ONBOARDING_QUESTIONS.length}
                      </p>
                      <h3 className="font-display text-[26px] leading-tight text-text-primary">
                        {currentQuestion.title}
                      </h3>
                    </div>
                  </div>

                  <div className="p-5 md:p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <button
                        onClick={() => {
                          if (step === 0) {
                            setMode(null);
                          } else {
                            setDirection(-1);
                            setStep(step - 1);
                          }
                        }}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.06] bg-bg-800/80 text-text-secondary hover:text-text-primary transition-colors"
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-cyan/70">
                          Generate workout plan
                        </p>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                          <motion.div
                            animate={{ width: `${((step + 1) / ONBOARDING_QUESTIONS.length) * 100}%` }}
                            transition={SPRING}
                            className="h-full rounded-full bg-gradient-to-r from-mint to-cyan"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {currentQuestion.options.map((option, optionIdx) => (
                        <motion.button
                          key={option.id}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: optionIdx * 0.05, duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAnswer(option.id)}
                          className="min-h-[112px] rounded-[26px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] px-4 py-4 text-left text-text-primary transition-colors hover:border-mint/18 hover:bg-bg-600/78"
                        >
                          <span className="font-body text-[15px] font-semibold">{option.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
