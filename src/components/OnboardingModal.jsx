import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, PencilLine, Sparkles, Wand2 } from 'lucide-react';
import { ONBOARDING_QUESTIONS, ONBOARDING_START_OPTIONS } from '../data/onboarding';

const SPRING = { type: 'spring', stiffness: 320, damping: 28, mass: 0.85 };

const ICONS = {
  favorite: Sparkles,
  generate: Wand2,
  manual: PencilLine,
};

const START_VISUALS = {
  favorite: {
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80',
    accent: 'from-mint/35 via-mint/10 to-transparent',
    badge: 'Default split + default runs',
  },
  generate: {
    image: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=1200&q=80',
    accent: 'from-cyan/35 via-cyan/10 to-transparent',
    badge: '4 quick questions',
  },
  manual: {
    image: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1200&q=80',
    accent: 'from-white/14 via-white/5 to-transparent',
    badge: 'Start simple and edit later',
  },
};

const QUESTION_VISUALS = [
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=1200&q=80',
];

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
                  <img
                    src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=80"
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(10,11,13,0.18)_0%,rgba(10,11,13,0.72)_58%,rgba(10,11,13,0.92)_100%)]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,238,99,0.32),transparent_34%)]" />
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
                            <img src={visual.image} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            <div className={`absolute inset-0 bg-gradient-to-br ${visual.accent}`} />
                            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,24,28,0.88)_0%,rgba(17,24,28,0.18)_55%,rgba(17,24,28,0.06)_100%)]" />
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
                    <img src={QUESTION_VISUALS[step]} alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,11,13,0.12)_0%,rgba(10,11,13,0.7)_70%,rgba(10,11,13,0.9)_100%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(113,215,201,0.28),transparent_34%)]" />
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
