/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Sparkles, ChevronRight, ChevronLeft, X, Check, Lightbulb } from 'lucide-react';
import { TourCharacter } from './TourCharacter';
import { useLanguage } from '../../lib/i18n/LanguageContext';

export interface TourStep {
  title: string;
  badge: string;
  summary: string;
  tip: string;
  actionLabel: string;
  onExecute: () => void;
}

interface Props {
  currentStepIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onJumpToStep: (idx: number) => void;
  steps: TourStep[];
}

export const GuidedTour: React.FC<Props> = ({
  currentStepIndex, isOpen, onClose, onNext, onPrev, onJumpToStep, steps,
}) => {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      // Let an open export/comparison dialog handle its own Escape key.
      if (event.key === 'Escape' && !document.querySelector('[aria-modal="true"]')) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && currentStep && (
        <motion.aside
          initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          aria-label={t('tour.ariaLabel')}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[60] w-[calc(100%-2rem)] sm:w-[440px] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-black/[0.08] bg-white/95 backdrop-blur-xl shadow-[0_12px_48px_rgba(0,0,0,0.16)] text-[#1D1D1F] no-print"
        >
          <div className="flex items-center justify-between px-5 pt-4">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0071E3]">
              <Sparkles className="w-3.5 h-3.5" /> {t('tour.guideTag')}
            </span>
            <button type="button" onClick={onClose} aria-label={t('tour.dismiss')} className="p-2 -mr-2 rounded-full text-[#86868B] hover:bg-black/[0.04] hover:text-[#1D1D1F] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 px-5 pt-1 pb-3">
            <TourCharacter celebrating={isLastStep} />
            <div className="relative flex-1 rounded-2xl rounded-bl-sm bg-[#F0F7FF] px-4 py-3">
              <p className="text-sm font-semibold">{isLastStep ? t('tour.pipTitleLast') : currentStepIndex === 0 ? t('tour.pipTitleFirst') : t('tour.pipTitleNext')}</p>
              <p className="mt-1 text-xs leading-relaxed text-[#52677D]">
                {isLastStep ? t('tour.pipBodyLast') : currentStepIndex === 0 ? t('tour.pipBodyFirst') : t('tour.pipBodyStep', { badge: currentStep.badge })}
              </p>
            </div>
          </div>

          <div className="px-5 pb-5">
            <div className="flex flex-wrap items-center justify-between gap-1 mb-3">
              <span className="text-[11px] font-medium text-[#6E6E73]">{t('tour.stepProgress', { current: currentStepIndex + 1, total: steps.length, badge: currentStep.badge })}</span>
              <nav aria-label={t('tour.stepsNav')} className="flex items-center gap-0.5 shrink-0">
                {steps.map((step, index) => (
                  <button key={step.title} type="button" onClick={() => onJumpToStep(index)} aria-label={t('tour.stepJump', { n: index + 1, title: step.title })} aria-current={index === currentStepIndex ? 'step' : undefined} title={step.title} className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-black/[0.04]">
                    <span className={`h-1.5 rounded-full transition-all ${index === currentStepIndex ? 'w-5 bg-[#0071E3]' : 'w-1.5 bg-[#D2D2D7]'}`} />
                  </button>
                ))}
              </nav>
            </div>

            <div aria-live="polite" aria-atomic="true">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentStepIndex}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.16, ease: 'easeOut' }}
                >
                  <h3 className="text-base font-semibold tracking-tight">{currentStep.title}</h3>
                  <p className="mt-2 text-[13px] text-[#6E6E73] leading-relaxed">{currentStep.summary}</p>
                  <div className="flex items-start gap-2 mt-3 mb-4 rounded-xl bg-[#FFF8E8] p-3">
                    <Lightbulb className="w-4 h-4 text-[#B67B13] shrink-0 mt-0.5" />
                    <p className="text-xs text-[#806126] leading-relaxed"><span className="font-semibold">{t('tour.pipTipLabel')}</span>{currentStep.tip}</p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <button type="button" onClick={currentStep.onExecute} className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] active:scale-[0.98] text-white text-xs font-semibold transition-all">
              {currentStep.actionLabel}{isLastStep ? <Check className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/[0.06]">
              <button type="button" onClick={onPrev} disabled={currentStepIndex === 0} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-[#6E6E73] hover:bg-black/[0.04] disabled:opacity-35 disabled:hover:bg-transparent">
                <ChevronLeft className="w-3.5 h-3.5" />{t('tour.back')}
              </button>
              <button type="button" onClick={isLastStep ? onClose : onNext} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#0071E3] hover:bg-[#0071E3]/[0.06]">
                {isLastStep ? t('tour.finish') : t('tour.next')}{isLastStep ? <Check className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
