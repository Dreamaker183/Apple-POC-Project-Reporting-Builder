/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  CheckCircle2, 
  Wand2, 
  GitCompare, 
  Share2, 
  ShieldCheck, 
  FileText 
} from 'lucide-react';

export interface TourStep {
  title: string;
  badge: string;
  summary: string;
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
  currentStepIndex,
  isOpen,
  onClose,
  onNext,
  onPrev,
  onJumpToStep,
  steps,
}) => {
  if (!isOpen) return null;

  const currentStep = steps[currentStepIndex];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[92%] bg-white/95 backdrop-blur-md rounded-2xl border border-black/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-4 text-[#1F1F1F] no-print transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-black/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#0071E3] text-white flex items-center justify-center font-bold text-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#1F1F1F]">
              POC Guided Tour
            </span>
            <span className="text-[11px] text-[#727272] ml-2 font-medium">
              Step {currentStepIndex + 1} of {steps.length} · {currentStep.badge}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 text-[#727272] hover:text-[#1F1F1F] rounded-md hover:bg-black/[0.04] transition-colors"
          aria-label="Dismiss guided tour"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Step description */}
      <div className="space-y-2 mb-3">
        <h3 className="text-sm font-semibold text-[#1F1F1F]">
          {currentStep.title}
        </h3>
        <p className="text-xs text-[#727272] leading-relaxed">
          {currentStep.summary}
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-black/[0.04]">
        {/* Progress pills */}
        <div className="flex items-center gap-1.5">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onJumpToStep(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === currentStepIndex
                  ? 'w-6 bg-[#0071E3]'
                  : i < currentStepIndex
                  ? 'w-2 bg-emerald-600'
                  : 'w-2 bg-neutral-200'
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Step controls */}
        <div className="flex items-center gap-2">
          {currentStepIndex > 0 && (
            <button
              type="button"
              onClick={onPrev}
              className="p-1.5 text-xs text-[#727272] hover:text-[#1F1F1F] rounded-lg hover:bg-neutral-100 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          <button
            type="button"
            onClick={currentStep.onExecute}
            className="px-3.5 py-1.5 bg-[#0071E3] text-white text-xs font-semibold rounded-lg hover:bg-[#0071E3]/90 transition-all flex items-center gap-1.5 shadow-xs"
          >
            <span>{currentStep.actionLabel}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
