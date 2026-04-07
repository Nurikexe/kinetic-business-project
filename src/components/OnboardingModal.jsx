import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, PencilLine, Sparkles, Wand2 } from 'lucide-react';
import { buildOnboardingConfig, ONBOARDING_QUESTIONS, ONBOARDING_START_OPTIONS } from '../data/onboarding';

const SPRING = { type: 'spring', stiffness: 320, damping: 28, mass: 0.85 };

const ICONS = {
  favorite: Sparkles,
  generate: Wand2,
  manual: PencilLine,
};

export default function OnboardingModal({ displayName, onApply }) {
  const [mode, setMode] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const currentQuestion = ONBOARDING_QUESTIONS[step];

  const handleStart = (nextMode) => {
    if (nextMode !== 'generate') {
      onApply(nextMode);
      return;
    }
    setMode(nextMode);
    setStep(0);
    setAnswers({});
  };

  const handleAnswer = (answerId) => {
    const nextAnswers = { ...answers, [currentQuestion.id]: answerId };
    if (step === ONBOARDING_QUESTIONS.length - 1) {
      onApply(mode, nextAnswers);
      return;
    }
    setAnswers(nextAnswers);
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
          className="w-full max-w-md rounded-[32px] border border-white/[0.06] bg-bg-700/95 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.35)]"
        >
          {!mode ? (
            <>
              <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-mint/75 mb-2">Fast onboarding</p>
              <h2 className="font-display text-[28px] leading-tight text-text-primary mb-5">
                {displayName ? `${displayName}, ` : ''}how do you want to start?
              </h2>

              <div className="space-y-3">
                {ONBOARDING_START_OPTIONS.map((option, idx) => {
                  const Icon = ICONS[option.id];
                  return (
                    <motion.button
                      key={option.id}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={SPRING}
                      onClick={() => handleStart(option.id)}
                      className={`w-full rounded-[26px] border p-4 text-left transition-colors ${
                        idx === 0
                          ? 'border-mint/20 bg-mint/[0.09] hover:bg-mint/[0.13]'
                          : idx === 1
                          ? 'border-cyan/20 bg-cyan/[0.09] hover:bg-cyan/[0.13]'
                          : 'border-white/[0.06] bg-bg-800/88 hover:border-white/[0.1]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                          idx === 0 ? 'bg-mint/[0.18] text-mint' : idx === 1 ? 'bg-cyan/[0.18] text-cyan' : 'bg-white/[0.05] text-text-secondary'
                        }`}>
                          <Icon size={18} />
                        </div>
                        <span className="font-body text-[15px] font-semibold text-text-primary">{idx + 1}) {option.title}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => {
                    if (step === 0) {
                      setMode(null);
                    } else {
                      setStep(step - 1);
                    }
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.06] bg-bg-800/80 text-text-secondary hover:text-text-primary transition-colors"
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-cyan/70">
                    Question {step + 1} of {ONBOARDING_QUESTIONS.length}
                  </p>
                  <h3 className="font-display text-[24px] leading-tight text-text-primary">{currentQuestion.title}</h3>
                </div>
              </div>

              <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                <motion.div
                  animate={{ width: `${((step + 1) / ONBOARDING_QUESTIONS.length) * 100}%` }}
                  transition={SPRING}
                  className="h-full rounded-full bg-gradient-to-r from-mint to-cyan"
                />
              </div>

              <div className="space-y-3">
                {currentQuestion.options.map((option) => (
                  <motion.button
                    key={option.id}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={SPRING}
                    onClick={() => handleAnswer(option.id)}
                    className="w-full rounded-[24px] border border-white/[0.06] bg-bg-800/86 px-4 py-3.5 text-left text-text-primary transition-colors hover:border-mint/18 hover:bg-bg-600/86"
                  >
                    <span className="font-body text-[15px] font-semibold">{option.label}</span>
                  </motion.button>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
