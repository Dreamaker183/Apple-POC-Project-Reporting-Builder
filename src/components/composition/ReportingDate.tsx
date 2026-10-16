import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';
import { SendSchedule } from '../../types/report';
import { useLanguage } from '../../lib/i18n/LanguageContext';

interface Props {
  value: string;
  onDateChange: (value: string) => void;
  schedule?: SendSchedule;
  hasCards?: boolean;
  onScheduleChange?: (schedule?: SendSchedule) => void;
  onConfigure?: () => void;
}

export function ReportingDate({ value, onDateChange }: Props) {
  const { t } = useLanguage();
  const dateRef = useRef<HTMLInputElement>(null);
  // The reporting period is always a plain ISO date (YYYY-MM-DD) or empty.
  const date = value;

  return (
    <div className="inline-flex items-center gap-1 text-[#6E6E73]">
      <button
        type="button"
        onClick={() => {
          try {
            dateRef.current?.showPicker();
          } catch {
            dateRef.current?.focus();
          }
        }}
        aria-label={t('date.chooseDate')}
        className="p-1 rounded-md hover:text-[#1D1D1F] hover:bg-black/[0.05] transition-colors"
      >
        <Calendar className="h-3.5 w-3.5" />
      </button>
      <input
        ref={dateRef}
        type="date"
        aria-label={t('date.reportingDate')}
        value={date}
        onChange={(e) => onDateChange(e.target.value)}
        className="reporting-date bg-transparent text-xs text-[#1D1D1F] rounded-md min-w-0"
      />
    </div>
  );
}
