import React, { useRef, useState } from 'react';
import { Calendar, Clock, X } from 'lucide-react';
import { SendSchedule } from '../../types/report';
import { loadSavedWebhooks } from '../../lib/integrations/messageDispatch';
import { useLanguage } from '../../lib/i18n/LanguageContext';

interface Props {
  value: string;
  schedule?: SendSchedule;
  hasCards: boolean;
  onDateChange: (value: string) => void;
  onScheduleChange: (schedule?: SendSchedule) => void;
  onConfigure: () => void;
}

export function ReportingDate({ value, schedule, hasCards, onDateChange, onScheduleChange, onConfigure }: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState(() => schedule ? `${String(new Date(schedule.scheduledAt).getHours()).padStart(2, '0')}:${String(new Date(schedule.scheduledAt).getMinutes()).padStart(2, '0')}` : '09:00');
  const [destination, setDestination] = useState<SendSchedule['destination']>(schedule?.destination ?? 'slack');
  const [error, setError] = useState('');
  const dateRef = useRef<HTMLInputElement>(null);
  // The reporting period is always a plain ISO date (YYYY-MM-DD) or empty.
  const date = value;
  const updateDate = (next: string) => {
    onDateChange(next);
    if (schedule?.enabled) onScheduleChange({ ...schedule, enabled: false });
  };
  const enable = () => {
    const scheduled = new Date(`${date}T${time}:00`);
    if (!date || !time || !Number.isFinite(scheduled.getTime()) || scheduled.getTime() <= Date.now()) return setError(t('date.errFuture'));
    if (!hasCards) return setError(t('date.errCards'));
    if (!loadSavedWebhooks()[destination]) return setError(t('date.errConnect'));
    setError('');
    onScheduleChange({ enabled: true, scheduledAt: scheduled.toISOString(), destination, status: 'scheduled' });
  };
  return <div className="flex-1 min-w-0">
    <div className="flex flex-wrap items-center gap-2">
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
        <input ref={dateRef} type="date" aria-label={t('date.reportingDate')} value={date} onChange={(e) => updateDate(e.target.value)} className="reporting-date bg-transparent text-xs text-[#1D1D1F] rounded-md min-w-0" />
      </div>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="no-print flex items-center gap-1 rounded-full border border-black/[0.08] bg-white/70 px-2 py-1 text-[11px] text-[#0071E3]"><Clock className="w-3 h-3" />{schedule?.enabled ? t('date.autoSendOn') : t('date.autoSend')}</button>
    </div>
    {open && <div className="no-print mt-3 rounded-2xl bg-white border border-black/[0.08] p-4 shadow-sm space-y-3 text-xs" onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}>
      <div className="flex items-center justify-between"><strong className="text-[#1D1D1F]">{t('date.sendTitle')}</strong><button type="button" onClick={() => setOpen(false)} aria-label={t('date.closeSettings')}><X className="w-4 h-4" /></button></div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1"><span className="block text-[#6E6E73]">{t('date.timeLabel', { tz: Intl.DateTimeFormat().resolvedOptions().timeZone })}</span><input type="time" aria-label={t('date.timeAria')} value={time} onChange={(e) => { setTime(e.target.value); if (schedule?.enabled) onScheduleChange({ ...schedule, enabled: false }); }} className="rounded-lg border border-black/10 px-2 py-1.5 text-[#1D1D1F]" /></label>
        <label className="space-y-1"><span className="block text-[#6E6E73]">{t('date.destLabel')}</span><select aria-label={t('date.destLabel')} value={destination} onChange={(e) => { setDestination(e.target.value as SendSchedule['destination']); if (schedule?.enabled) onScheduleChange({ ...schedule, enabled: false }); }} className="rounded-lg border border-black/10 px-2 py-1.5 text-[#1D1D1F]"><option value="slack">Slack</option><option value="teams">Microsoft Teams</option><option value="googleChat">Google Chat</option><option value="discord">Discord</option></select></label>
        <label className="inline-flex items-center gap-2 py-2 text-[#1D1D1F]"><input type="checkbox" role="switch" aria-label={t('date.enableLabel')} checked={schedule?.enabled ?? false} onChange={(e) => e.target.checked ? enable() : onScheduleChange(schedule ? { ...schedule, enabled: false } : undefined)} />{t('date.autoSwitch')}</label>
      </div>
      <p className="text-[#6E6E73] leading-relaxed">{t('date.hint')}</p>
      {schedule && <p className={schedule.status === 'error' ? 'text-rose-700' : 'text-[#6E6E73]'} role="status">{schedule.status === 'sent' ? t('date.sentOk') : schedule.status === 'sending' ? t('date.sending') : schedule.status === 'error' ? schedule.message : schedule.enabled ? t('date.scheduled', { when: new Date(schedule.scheduledAt).toLocaleString() }) : t('date.off')}</p>}
      {error && <p role="alert" className="text-rose-700">{error}</p>}
      <button type="button" onClick={onConfigure} className="text-[#0071E3] font-medium">{t('date.configure')}</button>
    </div>}
  </div>;
}
