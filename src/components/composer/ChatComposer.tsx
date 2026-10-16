/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart2,
  Image as ImageIcon,
  Send,
  Trash2,
  Plus,
  X,
  AlertCircle,
  Check,
  ChartColumn,
  ChartPie,
  TrendingUp,
  Hash,
  StickyNote,
  FileText,
} from 'lucide-react';
import { MetricInput, ImageAssetInput, MetricChartStyle } from '../../types/report';
import { MetricChart, CHART_STYLE_OPTIONS } from '../cards/MetricChart';
import { ClassificationFinding, FindingCategory, cardsFromFindings, classifyPassages } from '../../lib/parsing/classifier';
import { SnippetCard } from '../../types/report';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { DictKey } from '../../lib/i18n/dictionaries';

type TFn = (key: DictKey, vars?: Record<string, string | number>) => string;

const CHART_LABEL_KEYS: Record<MetricChartStyle, { label: DictKey; hint: DictKey }> = {
  number: { label: 'composer.chartNumber', hint: 'composer.chartNumberHint' },
  bar: { label: 'composer.chartBar', hint: 'composer.chartBarHint' },
  donut: { label: 'composer.chartDonut', hint: 'composer.chartDonutHint' },
  trend: { label: 'composer.chartTrend', hint: 'composer.chartTrendHint' },
};

const ChartStyleIcon: React.FC<{ id: MetricChartStyle; className?: string }> = ({ id, className }) => {
  const Icon = id === 'bar' ? ChartColumn : id === 'donut' ? ChartPie : id === 'trend' ? TrendingUp : Hash;
  return <Icon className={className} />;
};

const ChartStyleIconButton: React.FC<{
  id: MetricChartStyle;
  label: string;
  active?: boolean;
  onClick?: () => void;
}> = ({ id, label, active, onClick }) => {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={t('composer.graphLabel', { label })}
      aria-pressed={active}
      className={`p-1.5 rounded-lg transition-colors ${
        active ? 'bg-[#0071E3]/15 text-[#0071E3]' : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.05]'
      }`}
    >
      <ChartStyleIcon id={id} className="w-4 h-4" />
    </button>
  );
};

interface Props {
  projectId: string;
  projectTitle: string;
  rawNotes: string;
  metrics: MetricInput[];
  images: ImageAssetInput[];
  highlightPassage?: { start?: number; end?: number; text?: string } | null;
  onNotesChange: (notes: string) => void;
  onMetricsChange: (metrics: MetricInput[]) => void;
  onImagesChange: (images: ImageAssetInput[]) => void;
  onImagesAppend: (images: ImageAssetInput[]) => void;
  hasCards: boolean;
  onGenerateReport: (notes?: string) => void;
  onApplyFindings: (notes: string, cards: SnippetCard[], metrics: MetricInput[], selectedCount?: number) => void;
  onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

export const ChatComposer: React.FC<Props> = ({
  projectId,
  projectTitle,
  rawNotes,
  metrics,
  images,
  highlightPassage,
  onNotesChange,
  onMetricsChange,
  onImagesChange,
  onImagesAppend,
  hasCards,
  onGenerateReport,
  onApplyFindings,
  onNotify,
}) => {
  const { t } = useLanguage();
  const [showMetrics, setShowMetrics] = useState(false);
  const [submittedAttachments, setSubmittedAttachments] = useState<Set<string>>(() => {
    try {
      const saved = sessionStorage.getItem(`reporting-attachments:${projectId}`);
      if (saved) return new Set(JSON.parse(saved));
    } catch { /* use current project state */ }
    return new Set(hasCards ? [...metrics, ...images].map(item => JSON.stringify(item)) : []);
  });
  const pendingMetrics = metrics.filter(item => !submittedAttachments.has(JSON.stringify(item)));
  const pendingImages = images.filter(item => !submittedAttachments.has(JSON.stringify(item)));
  const clearAttachmentStrip = (submittedMetrics = metrics) => {
    const signatures = [...submittedMetrics, ...images].map(item => JSON.stringify(item));
    setSubmittedAttachments(new Set(signatures));
    try { sessionStorage.setItem(`reporting-attachments:${projectId}`, JSON.stringify(signatures)); } catch { /* optional storage */ }
  };
  const [draft, setDraft] = useState('');
  const [showSources, setShowSources] = useState(false);
  const [reviewFindings, setReviewFindings] = useState<ClassificationFinding[] | null>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    try { setDraft(sessionStorage.getItem(`reporting-composer:${projectId}`) ?? ''); } catch { /* keep editing in memory */ }
  }, [projectId]);
  const [newMetricStyle, setNewMetricStyle] = useState<MetricChartStyle>('bar');
  const [showAttach, setShowAttach] = useState(false);
  const [showMetricForms, setShowMetricForms] = useState(false);
  const [selectedMetricIds, setSelectedMetricIds] = useState<Set<string>>(new Set());
  const [metricName, setMetricName] = useState('');
  const [metricValue, setMetricValue] = useState('');
  const [metricUnit, setMetricUnit] = useState('');
  const [metricTarget, setMetricTarget] = useState('');
  const [metricPrev, setMetricPrev] = useState('');
  const [metricNote, setMetricNote] = useState('');
  const [metricDirection, setMetricDirection] = useState<MetricInput['direction']>('neutral');
  const [metricError, setMetricError] = useState<string | null>(null);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachRef = useRef<HTMLDivElement>(null);
  const metricNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (attachRef.current && !attachRef.current.contains(e.target as Node)) {
        setShowAttach(false);
      }
    };
    if (showAttach) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showAttach]);

  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMetrics(false);
        setShowAttach(false);
        setShowMetricForms(false);
      }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, []);

  // Rapid entry: focus the name field whenever the metrics sheet opens
  useEffect(() => {
    if (showMetrics) {
      const t = setTimeout(() => metricNameRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [showMetrics]);

  const notify = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    onNotify?.(msg, type);
  };

  // --- metrics quick-add (same guards as MetricsEditor) ---
  const handleAddMetric = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!metricName.trim()) {
      setMetricError(t('composer.errNameRequired'));
      return;
    }
    const val = metricValue.trim() ? Number(metricValue) : NaN;
    if (!Number.isFinite(val)) {
      setMetricError(t('composer.errValueNumber'));
      return;
    }
    const targetNum = metricTarget.trim() ? Number(metricTarget) : undefined;
    const prevNum = metricPrev.trim() ? Number(metricPrev) : undefined;
    if ((targetNum !== undefined && !Number.isFinite(targetNum)) || (prevNum !== undefined && !Number.isFinite(prevNum))) {
      setMetricError(t('composer.errTargetPrevNumber'));
      return;
    }
    onMetricsChange([
      ...metrics,
      {
        id: `metric-${Date.now()}`,
        name: metricName.trim(),
        value: val,
        unit: metricUnit.trim(),
        target: targetNum !== undefined && !isNaN(targetNum) ? targetNum : undefined,
        previousValue: prevNum !== undefined && !isNaN(prevNum) ? prevNum : undefined,
        explanation: metricNote.trim() || undefined,
        chartStyle: newMetricStyle,
        direction: metricDirection,
      },
    ]);
    setMetricName('');
    setMetricValue('');
    setMetricUnit('');
    setMetricTarget('');
    setMetricPrev('');
    setMetricNote('');
    setMetricError(null);
    notify(t('composer.metricAdded', { count: metrics.length + 1 }));
    // Stay ready for the next entry: keep panel + style, refocus name
    requestAnimationFrame(() => metricNameRef.current?.focus());
  };

  const handleUpdateMetric = (id: string, updates: Partial<MetricInput>) => {
    onMetricsChange(metrics.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  const toggleSelectMetric = (id: string) => {
    setSelectedMetricIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allMetricsSelected = metrics.length > 0 && selectedMetricIds.size === metrics.length;

  const handleDeleteSelectedMetrics = () => {
    if (selectedMetricIds.size === 0) return;
    onMetricsChange(metrics.filter((m) => !selectedMetricIds.has(m.id)));
    notify(t('composer.metricsRemoved', { count: selectedMetricIds.size }), 'info');
    setSelectedMetricIds(new Set());
  };

  // --- media: straight to device picker (same whitelist + 5MB guard as ImageUploader) ---
  const processFile = (file: File) => {
    setMediaError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      const msg = t('composer.errFormat', { type: file.type });
      setMediaError(msg);
      notify(msg, 'error');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      const msg = t('composer.errTooBig', { size: (file.size / (1024 * 1024)).toFixed(1) });
      setMediaError(msg);
      notify(msg, 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      onImagesAppend([
        {
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          dataUrl,
          altText: `Preview image for ${file.name.replace(/\.[^/.]+$/, '')}`,
          fileSize: file.size,
          fileType: file.type,
        },
      ]);
    };
    reader.onerror = () => {
      setMediaError(t('composer.errReadFailed'));
      notify(t('composer.errReadFailed'), 'error');
    };
    reader.readAsDataURL(file);
  };

  const openPhotoPicker = () => {
    setShowAttach(false);
    fileInputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      submitUpdate();
    }
  };

  const submitUpdate = () => {
    if (draft.trim()) {
      setReviewFindings(classifyPassages(draft));
      return;
    }
    setShowSources(false);
    onGenerateReport(draft);
    clearAttachmentStrip();
    setDraft('');
    try { sessionStorage.removeItem(`reporting-composer:${projectId}`); } catch { /* session storage may be unavailable */ }
  };

  const setFinding = (id: string, updates: Partial<ClassificationFinding>) => {
    setReviewFindings((prev) => prev?.map((finding) => finding.id === id ? { ...finding, ...updates } : finding) ?? null);
  };

  const applyReviewedFindings = () => {
    if (!reviewFindings) return;
    const selected = reviewFindings.filter(f => f.selected);
    const additions = selected.flatMap(f => f.category === 'metric' && f.metric ? [f.metric] : []);
    const updatedMetrics = [...metrics];
    for (const metric of additions) {
      const match = updatedMetrics.findIndex(m => m.name.toLowerCase() === metric.name.toLowerCase());
      if (match >= 0) updatedMetrics[match] = { ...updatedMetrics[match], ...metric, id: updatedMetrics[match].id };
      else updatedMetrics.push(metric);
    }
    const cards = cardsFromFindings(reviewFindings, metrics, images, projectTitle);
    onApplyFindings(draft, cards, updatedMetrics, selected.length);
    clearAttachmentStrip(updatedMetrics);
    setShowSources(false);
    setDraft('');
    setReviewFindings(null);
    try { sessionStorage.removeItem(`reporting-composer:${projectId}`); } catch { /* optional storage */ }
  };

  const keepAsContext = () => {
    if (!draft.trim()) return;
    onGenerateReport(draft);
    clearAttachmentStrip();
    setDraft('');
    setReviewFindings(null);
    try { sessionStorage.removeItem(`reporting-composer:${projectId}`); } catch { /* optional storage */ }
  };

  const categoryLabels: Record<FindingCategory, string> = {
    accomplishment: t('composer.catAccomplishment'),
    metric: t('composer.catMetric'),
    risk: t('composer.catRisk'),
    action: t('composer.catAction'),
    milestone: t('composer.catMilestone'),
    context: t('composer.catContext'),
  };

  useEffect(() => {
    const field = draftRef.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${Math.min(field.scrollHeight, 160)}px`;
  }, [draft]);

  return (
    <div className="no-print shrink-0 px-3 sm:px-6 md:px-10 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 bg-transparent">
      <div className="max-w-[740px] mx-auto">
        {/* Chatbot card */}
        <div
          className={`relative rounded-[26px] border bg-white/95 backdrop-blur-2xl shadow-[0_16px_50px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.04)] transition-all duration-200 ${
            dragOver ? 'border-[#0071E3] ring-4 ring-[#0071E3]/20 shadow-[0_20px_60px_rgba(0,113,227,0.2)]' : 'border-black/[0.08]'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.length) Array.from(e.dataTransfer.files).forEach(processFile);
          }}
        >
        {reviewFindings && <div className="absolute inset-x-0 bottom-0 z-40 max-h-[75vh] overflow-y-auto rounded-[26px] border border-black/[0.08] bg-[#FAFAFA] p-3.5 sm:p-5 shadow-[0_16px_48px_rgba(0,0,0,0.18)]">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div><h2 className="text-[16px] font-semibold text-[#1D1D1F]">{t('composer.reviewTitle')}</h2><p className="mt-0.5 text-xs text-[#6E6E73]">{t('composer.reviewSubtitle')}</p></div>
            <button type="button" onClick={() => setReviewFindings(null)} aria-label={t('composer.closeReview')} className="p-1.5 rounded-full hover:bg-black/[0.06]"><X className="w-4 h-4" /></button>
          </div>
          {reviewFindings.length === 0 ? <div className="rounded-xl border border-black/[0.08] bg-white p-4 text-sm text-[#6E6E73]">{t('composer.noFindings')}</div> : <div className="space-y-2 max-h-[min(46vh,380px)] overflow-y-auto">
            {reviewFindings.map((finding) => <div key={finding.id} className={`rounded-xl border bg-white p-3 ${finding.selected ? 'border-[#0071E3]/25' : 'border-black/[0.08] opacity-70'}`}>
              <div className="flex items-start gap-2.5">
                <input type="checkbox" checked={finding.selected} onChange={(e) => setFinding(finding.id, { selected: e.target.checked })} aria-label={t('composer.includeFinding', { title: finding.title })} className="mt-1 accent-[#0071E3]" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2 items-center">
                    <strong className="text-[13px] text-[#1D1D1F]">{finding.title}</strong>
                    <select
                      aria-label={t('composer.categoryFor', { title: finding.title })}
                      value={finding.category}
                      onChange={(e) => {
                        const nextCat = e.target.value as FindingCategory;
                        const fallbackMetric: MetricInput | undefined =
                          nextCat === 'metric' && !finding.metric
                             ? {
                                id: `metric-source-${finding.sourceStart}`,
                                name: finding.title,
                                value: 0,
                                unit: '',
                                explanation: finding.evidence,
                                chartStyle: 'bar',
                                direction: 'neutral',
                              }
                            : finding.metric;
                        setFinding(finding.id, { category: nextCat, metric: fallbackMetric });
                      }}
                      className="text-[11px] bg-[#F5F5F7] rounded-full px-2 py-1"
                    >
                      {(Object.keys(categoryLabels) as FindingCategory[]).map(c => <option key={c} value={c}>{categoryLabels[c]}</option>)}
                    </select>
                    {finding.confidence === 'review' && <span className="text-[10px] rounded-full bg-amber-50 text-amber-800 px-2 py-1">{t('composer.checkNumbers')}</span>}
                  </div>
                  <p className="text-xs text-[#424245] mt-1">{finding.detail}</p>
                  <blockquote className="mt-2 border-l-2 border-[#0071E3]/40 pl-2 text-[11px] leading-relaxed text-[#6E6E73]">“{finding.evidence}”</blockquote>
                  {finding.metric && finding.category === 'metric' && <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <input aria-label={t('composer.metricNameAria')} value={finding.metric.name} onChange={(e) => setFinding(finding.id, { title: e.target.value, metric: { ...finding.metric!, name: e.target.value } })} className="min-w-0 text-xs rounded-lg border border-black/10 px-2 py-1.5" />
                    <input aria-label={t('composer.metricValueAria')} type="number" value={finding.metric.value} onChange={(e) => setFinding(finding.id, { metric: { ...finding.metric!, value: Number(e.target.value) } })} className="min-w-0 text-xs rounded-lg border border-black/10 px-2 py-1.5" />
                    <input aria-label={t('composer.metricUnitAria')} value={finding.metric.unit} onChange={(e) => setFinding(finding.id, { metric: { ...finding.metric!, unit: e.target.value } })} className="min-w-0 text-xs rounded-lg border border-black/10 px-2 py-1.5" />
                    <input aria-label={t('composer.metricTargetAria')} type="number" placeholder={t('composer.fieldTarget')} value={finding.metric.target ?? ''} onChange={(e) => setFinding(finding.id, { metric: { ...finding.metric!, target: e.target.value ? Number(e.target.value) : undefined } })} className="min-w-0 text-xs rounded-lg border border-black/10 px-2 py-1.5" />
                  </div>}
                </div>
              </div>
            </div>)}
          </div>}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-black/[0.06]"><span className="text-[11px] text-[#6E6E73]">{t('composer.analyzedLocally')}</span><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setReviewFindings(null)} className="px-3 py-2 text-xs text-[#6E6E73]">{t('composer.reviewBack')}</button><button type="button" onClick={keepAsContext} className="px-3 py-2 rounded-full border border-black/10 text-[#424245] text-xs">{t('composer.keepAsContext')}</button><button type="button" disabled={!reviewFindings.some(f => f.selected)} onClick={applyReviewedFindings} className="px-4 py-2 rounded-full bg-[#0071E3] text-white text-xs font-medium disabled:opacity-40">{t('composer.addFindings', { count: reviewFindings.filter(f => f.selected).length })}</button></div></div>
        </div>}
        {/* Metrics sheet: placed directly on the chatbot when open, content-sized like before */}
        {showMetrics && (
          <div className="absolute inset-x-0 bottom-0 z-30 max-h-[62vh] overflow-y-auto rounded-[26px] border border-black/[0.08] bg-[#FAFAFA] p-3 shadow-[0_16px_48px_rgba(0,0,0,0.18)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold tracking-wide uppercase text-[#86868B]">
                  {t('composer.metricsTitle', { count: metrics.length })}
                </span>
                <div className="flex items-center gap-1">
                  {selectedMetricIds.size > 0 && (
                    <button
                      type="button"
                      onClick={handleDeleteSelectedMetrics}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{t('composer.deleteMetrics', { count: selectedMetricIds.size })}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowMetrics(false)}
                    className="p-1 text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.05] rounded-full transition-colors"
                    aria-label={t('composer.closeMetrics')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <>
              {metrics.length > 0 ? (
                <div className="rounded-xl border border-black/[0.08] bg-white overflow-x-auto mb-2">
                  <div className="min-w-[540px]">
                  {/* Table header */}
                  <div className="grid grid-cols-[28px_minmax(0,1fr)_64px_44px_52px_52px_78px_44px] items-center gap-1 px-2 py-1.5 bg-black/[0.03] text-[10px] font-semibold tracking-wide uppercase text-[#86868B]">
                    <input
                      type="checkbox"
                      checked={allMetricsSelected}
                      onChange={() =>
                        setSelectedMetricIds(allMetricsSelected ? new Set() : new Set(metrics.map((m) => m.id)))
                      }
                      className="w-3.5 h-3.5 accent-[#0071E3] cursor-pointer justify-self-center"
                      aria-label={t('composer.selectAllMetrics')}
                    />
                    <span>{t('composer.colMetric')}</span>
                    <span>{t('composer.colValue')}</span>
                    <span>{t('composer.colUnit')}</span>
                    <span>{t('composer.colTarget')}</span>
                    <span>{t('composer.colPrev')}</span>
                    <span>{t('composer.colGraph')}</span>
                    <span />
                  </div>
                  {/* Table rows: tap checkbox to select, tap fields to edit */}
                  {metrics.map((m) => (
                    <React.Fragment key={m.id}>
                    <div
                      className={`grid grid-cols-[28px_minmax(0,1fr)_64px_44px_52px_52px_78px_44px] items-center gap-1 px-2 py-1 border-t border-black/[0.05] transition-colors ${
                        selectedMetricIds.has(m.id) ? 'bg-[#0071E3]/[0.06]' : 'hover:bg-black/[0.02]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMetricIds.has(m.id)}
                        onChange={() => toggleSelectMetric(m.id)}
                        className="w-3.5 h-3.5 accent-[#0071E3] cursor-pointer justify-self-center"
                        aria-label={t('composer.selectMetric', { name: m.name })}
                      />
                      <input
                        type="text"
                        value={m.name}
                        onChange={(e) => handleUpdateMetric(m.id, { name: e.target.value })}
                        className="min-w-0 text-xs text-[#1D1D1F] bg-transparent border-b border-transparent hover:border-black/20 focus:border-[#0071E3] focus:outline-none py-0.5"
                        aria-label={t('composer.metricNameAria')}
                      />
                      <input
                        type="number"
                        step="any"
                        value={m.value}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v)) handleUpdateMetric(m.id, { value: v });
                        }}
                        className="min-w-0 text-xs text-[#1D1D1F] bg-transparent border-b border-transparent hover:border-black/20 focus:border-[#0071E3] focus:outline-none py-0.5"
                        aria-label={t('composer.metricValueAria')}
                      />
                      <input
                        type="text"
                        value={m.unit}
                        onChange={(e) => handleUpdateMetric(m.id, { unit: e.target.value })}
                        placeholder="—"
                        className="min-w-0 text-xs text-[#1D1D1F] bg-transparent border-b border-transparent hover:border-black/20 focus:border-[#0071E3] focus:outline-none py-0.5"
                        aria-label={t('composer.metricUnitAria')}
                      />
                      <input
                        type="number"
                        step="any"
                        value={m.target ?? ''}
                        onChange={(e) =>
                          handleUpdateMetric(m.id, {
                            target: e.target.value === '' ? undefined : parseFloat(e.target.value),
                          })
                        }
                        placeholder="—"
                        className="min-w-0 text-xs text-[#1D1D1F] bg-transparent border-b border-transparent hover:border-black/20 focus:border-[#0071E3] focus:outline-none py-0.5"
                        aria-label={t('composer.metricTargetAria')}
                      />
                      <input
                        type="number"
                        step="any"
                        value={m.previousValue ?? ''}
                        onChange={(e) =>
                          handleUpdateMetric(m.id, {
                            previousValue: e.target.value === '' ? undefined : parseFloat(e.target.value),
                          })
                        }
                        placeholder="—"
                        className="min-w-0 text-xs text-[#1D1D1F] bg-transparent border-b border-transparent hover:border-black/20 focus:border-[#0071E3] focus:outline-none py-0.5"
                        aria-label={t('composer.metricPrevAria')}
                      />
                      <select
                        value={m.chartStyle ?? 'number'}
                        onChange={(e) => handleUpdateMetric(m.id, { chartStyle: e.target.value as MetricChartStyle })}
                        className="min-w-0 text-[11px] text-[#1D1D1F] bg-transparent border-b border-transparent hover:border-black/20 focus:border-[#0071E3] focus:outline-none py-0.5 capitalize cursor-pointer"
                        aria-label={t('composer.graphFor', { name: m.name })}
                      >
                        {CHART_STYLE_OPTIONS.map((o) => (
                          <option key={o.id} value={o.id} className="capitalize">
                            {t(CHART_LABEL_KEYS[o.id].label)}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center justify-self-center">
                        <button
                          type="button"
                          onClick={() => setExpandedNoteId(expandedNoteId === m.id ? null : m.id)}
                          className={`p-0.5 rounded transition-colors ${
                            expandedNoteId === m.id || m.explanation
                              ? 'text-[#0071E3]'
                              : 'text-[#86868B] hover:text-[#1D1D1F]'
                          }`}
                          title={m.explanation || t('composer.addNoteTitle')}
                          aria-label={t('composer.noteFor', { name: m.name })}
                          aria-expanded={expandedNoteId === m.id}
                        >
                          <StickyNote className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMetricsChange(metrics.filter((x) => x.id !== m.id))}
                            className="p-0.5 text-[#86868B] hover:text-rose-600 rounded"
                            aria-label={t('composer.removeMetric', { name: m.name })}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {expandedNoteId === m.id && (
                      <div className="px-2 py-1.5 border-t border-black/[0.05] bg-[#FAFAFA]">
                        <input
                          autoFocus
                          type="text"
                          value={m.explanation ?? ''}
                          onChange={(e) =>
                            handleUpdateMetric(m.id, { explanation: e.target.value || undefined })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Escape') setExpandedNoteId(null);
                          }}
                          placeholder={t('composer.noteExample')}
                          className="w-full text-xs p-1.5 bg-white border border-black/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                          aria-label={t('composer.noteFor', { name: m.name })}
                        />
                      </div>
                    )}
                    </React.Fragment>
                  ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-black/15 bg-white px-3 py-4 mb-2 text-center text-xs text-[#86868B]">
                  {t('composer.noMetrics')}
                </div>
              )}

              {/* Quick-add row: Enter adds, focus returns here for rapid entry */}
              <div className="flex items-center gap-1 mb-2">
                <span className="text-[11px] text-[#86868B] mr-1">{t('composer.newGraph')}</span>
                {CHART_STYLE_OPTIONS.map((opt) => (
                  <ChartStyleIconButton
                    key={opt.id}
                    id={opt.id}
                    label={t(CHART_LABEL_KEYS[opt.id].label)}
                    active={newMetricStyle === opt.id}
                    onClick={() => setNewMetricStyle(opt.id)}
                  />
                ))}
                <select aria-label={t('composer.directionAria')} value={metricDirection} onChange={(e) => setMetricDirection(e.target.value as MetricInput['direction'])} className="ml-auto min-w-0 bg-white border border-black/10 rounded-lg text-xs p-1.5">
                  <option value="neutral">{t('composer.directionNeutral')}</option>
                  <option value="higher">{t('composer.directionHigher')}</option>
                  <option value="lower">{t('composer.directionLower')}</option>
                </select>
              </div>
              <form onSubmit={handleAddMetric} className="grid grid-cols-2 sm:grid-cols-4 md:flex md:flex-wrap gap-2">
                <input
                  ref={metricNameRef}
                  type="text"
                  value={metricName}
                  onChange={(e) => setMetricName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setShowMetrics(false);
                  }}
                  placeholder={t('composer.fieldName')}
                  className="col-span-2 sm:col-span-2 md:flex-[2_1_140px] min-w-0 text-xs p-2 bg-white border border-black/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                />
                <input
                  type="number"
                  step="any"
                  value={metricValue}
                  onChange={(e) => setMetricValue(e.target.value)}
                  placeholder={t('composer.fieldValue')}
                  className="col-span-1 md:flex-1 min-w-[70px] text-xs p-2 bg-white border border-black/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                />
                <input
                  type="text"
                  value={metricUnit}
                  onChange={(e) => setMetricUnit(e.target.value)}
                  placeholder={t('composer.fieldUnit')}
                  className="col-span-1 md:flex-1 min-w-[60px] text-xs p-2 bg-white border border-black/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                />
                <input
                  type="number"
                  step="any"
                  value={metricTarget}
                  onChange={(e) => setMetricTarget(e.target.value)}
                  placeholder={t('composer.fieldTarget')}
                  className="col-span-1 md:flex-1 min-w-[70px] text-xs p-2 bg-white border border-black/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                />
                <input
                  type="number"
                  step="any"
                  value={metricPrev}
                  onChange={(e) => setMetricPrev(e.target.value)}
                  placeholder={t('composer.fieldPrev')}
                  className="col-span-1 md:flex-1 min-w-[70px] text-xs p-2 bg-white border border-black/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                />
                <input
                  type="text"
                  value={metricNote}
                  onChange={(e) => setMetricNote(e.target.value)}
                  placeholder={t('composer.fieldNote')}
                  className="col-span-2 sm:col-span-3 md:flex-[3_1_160px] min-w-0 text-xs p-2 bg-white border border-black/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                />
                <button
                  type="submit"
                  className="col-span-2 sm:col-span-1 md:w-auto px-3 py-2 bg-[#1D1D1F] text-white text-xs font-medium rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-1"
                  title={t('composer.addTitle')}
                >
                  <Check className="w-3.5 h-3.5" /> {t('composer.addButton')}
                </button>
                {metricError && (
                  <div className="col-span-2 sm:col-span-4 md:basis-full text-[11px] text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">{metricError}</div>
                )}
              </form>
              {(metricValue.trim() && Number.isFinite(Number(metricValue))) && <div className="mt-3 rounded-xl bg-white border border-black/[0.06] p-3"><div className="text-[11px] text-[#6E6E73] mb-2">{t('composer.preview')} · {metricName || t('composer.yourMetric')}</div>{newMetricStyle === 'number' ? <span className="text-2xl font-semibold">{metricValue}{metricUnit}</span> : <MetricChart datum={{ value: Number(metricValue), unit: metricUnit, target: metricTarget.trim() ? Number(metricTarget) : undefined, previousValue: metricPrev.trim() ? Number(metricPrev) : undefined }} style={newMetricStyle} />}</div>}
              <div className="text-[10px] text-[#86868B] pt-1">
                {t('composer.metricTip', { label: t(CHART_LABEL_KEYS[newMetricStyle].label) })}
              </div>
              </>
            </div>
          )}

          {/* Hidden file input: attach menu opens the device picker directly */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            multiple
            onChange={(e) => {
              if (e.target.files?.length) Array.from(e.target.files).forEach(processFile);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="hidden"
          />

          {/* Inline media error (no panel) */}
          {mediaError && (
            <div className="mx-4 mt-3 flex items-start gap-1.5 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-2 py-1.5">
              <AlertCircle className="w-3.5 h-3.5 mt-px shrink-0" />
              <span className="flex-1">{mediaError}</span>
              <button
                type="button"
                onClick={() => setMediaError(null)}
                className="p-0.5 text-rose-400 hover:text-rose-700 rounded"
                aria-label={t('composer.dismissError')}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Only attachments not yet submitted belong in the composer. */}
          {(pendingMetrics.length > 0 || pendingImages.length > 0) && (
            <div className="flex gap-1.5 px-4 pt-3 overflow-x-auto items-center">
              {pendingMetrics.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-1 pl-1.5 pr-1 py-1 bg-[#0071E3]/10 border border-[#0071E3]/20 rounded-full shrink-0"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowMetrics(true);
                    }}
                    title={t('composer.openMetricsTable')}
                    className="flex items-center gap-1 hover:bg-[#0071E3]/15 rounded-full transition-colors"
                  >
                    <BarChart2 className="w-3 h-3 text-[#0071E3]" />
                    <span className="text-[11px] font-medium text-[#1D1D1F] max-w-[140px] truncate">
                      {m.name}: {m.value}{m.unit}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onMetricsChange(metrics.filter((x) => x.id !== m.id))}
                    className="p-0.5 text-[#86868B] hover:text-rose-600 rounded-full"
                    aria-label={t('composer.removeMetric', { name: m.name })}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {pendingImages.map((img) => (
                <div key={img.id} className="relative shrink-0 group">
                  <img src={img.dataUrl} alt={img.altText} className="w-12 h-12 rounded-xl object-cover border border-black/10" />
                  <button
                    type="button"
                    onClick={() => onImagesChange(images.filter((x) => x.id !== img.id))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#1D1D1F] text-white rounded-full flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-rose-600 focus:opacity-100 transition-opacity"
                    aria-label={t('composer.removeNamed', { name: img.name })}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showSources && <div className="mx-4 mt-3 rounded-xl bg-[#F5F5F7] p-3 max-h-40 overflow-y-auto"><div className="text-[11px] font-medium text-[#6E6E73] mb-2">{t('composer.sourceNotesTitle')}</div><textarea aria-label={t('composer.editSources')} value={rawNotes} onChange={(e) => onNotesChange(e.target.value)} rows={4} className="w-full bg-transparent text-[13px] leading-relaxed resize-y focus:outline-none" /></div>}
          {/* Main text field */}
          <div className="px-4 pt-3">
            <textarea
              ref={draftRef}
              aria-label={t('composer.updateAria')}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                try { sessionStorage.setItem(`reporting-composer:${projectId}`, e.target.value); } catch { /* keep editing in memory */ }
              }}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder={t('composer.updatePlaceholder')}
              className="w-full bg-transparent text-[16px] sm:text-[15px] leading-relaxed text-[#1D1D1F] placeholder:text-[#76767B] focus:outline-none resize-none min-h-[52px] max-h-[160px]"
            />
          </div>

          {/* Bottom action row */}
          <div className="flex items-center gap-1 px-3 pb-3">
            <div className="relative" ref={attachRef}>
              <button
                type="button"
                onClick={() => {
                  setShowAttach((v) => !v);
                  setShowMetricForms(false);
                }}
                className={`p-2 rounded-full transition-colors ${
                  showAttach ? 'bg-black/[0.06] text-[#1D1D1F]' : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.04]'
                }`}
                title={t('composer.attachTitle')}
                aria-label={t('composer.attach')}
                aria-expanded={showAttach}
              >
                <Plus className="w-5 h-5" />
              </button>

              <AnimatePresence>
              {showAttach && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 6 }}
                  transition={{ duration: 0.14, ease: [0.32, 0.72, 0, 1] }}
                  className="absolute left-0 bottom-11 z-30 w-60 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-xl rounded-2xl border border-black/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.14)] py-1.5 text-[13px] origin-bottom-left"
                >
                  <div
                    className="relative"
                    onMouseEnter={() => setShowMetricForms(true)}
                    onMouseLeave={() => setShowMetricForms(false)}
                  >
                    <button
                      type="button"
                      onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); setShowMetricForms(true); } }}
                      onClick={() => setShowMetricForms(!showMetricForms)}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-black/[0.04] text-[#1D1D1F] transition-colors text-left"
                      aria-haspopup="menu"
                      aria-expanded={showMetricForms}
                    >
                      <BarChart2 className="w-4 h-4 text-[#0071E3]" />
                      <span className="flex-1">{t('composer.addMetric')}</span>
                      {metrics.length > 0 && (
                        <span className="text-[11px] text-[#86868B]">{metrics.length}</span>
                      )}
                      <span className="text-[#86868B] text-xs">›</span>
                    </button>
                    {showMetricForms && (
                      <div
                        role="menu"
                        aria-label={t('composer.pickGraph')}
                        className="absolute left-0 bottom-full mb-1 sm:mb-0 sm:left-full sm:bottom-0 z-30 sm:ml-2 w-52 max-w-[calc(100vw-2.5rem)] bg-white/95 backdrop-blur-xl rounded-2xl border border-black/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.14)] py-1.5 text-[13px] before:absolute before:-left-2 before:top-0 before:bottom-0 before:w-2 before:content-['']"
                      >
                        <div className="px-3.5 pt-1 pb-1 text-[10px] font-semibold tracking-wide uppercase text-[#86868B]">
                          {t('composer.graphForm')}
                        </div>
                        {CHART_STYLE_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setNewMetricStyle(opt.id);
                              setShowMetrics(true);
                              setShowAttach(false);
                              setShowMetricForms(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-black/[0.04] text-[#1D1D1F] transition-colors text-left"
                          >
                            <ChartStyleIcon id={opt.id} className="w-4 h-4 text-[#0071E3] shrink-0" />
                            <span className="flex-1">
                              <span className="block leading-tight">{t(CHART_LABEL_KEYS[opt.id].label)}</span>
                              <span className="block text-[10px] text-[#86868B] leading-tight">{t(CHART_LABEL_KEYS[opt.id].hint)}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={openPhotoPicker}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-black/[0.04] text-[#1D1D1F] transition-colors text-left"
                  >
                    <ImageIcon className="w-4 h-4 text-[#0071E3]" />
                    <span className="flex-1">{t('composer.attachPhoto')}</span>
                    {images.length > 0 && (
                      <span className="text-[11px] text-[#86868B]">{images.length}</span>
                    )}
                  </button>
                </motion.div>
              )}
              </AnimatePresence>
            </div>

            {rawNotes && (
              <button
                type="button"
                onClick={() => setShowSources(!showSources)}
                className="p-2 text-[#86868B] hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                title={t('composer.sourceNotes')}
                aria-label={t('composer.toggleSources')}
                aria-expanded={showSources}
              >
                <FileText className="w-4 h-4" />
              </button>
            )}

            <div className="flex-1" />

            <span className="text-[11px] text-[#86868B] hidden sm:block pr-1">
              {draft.length > 0 ? t('composer.characters', { n: draft.length }) : t('composer.cmdEnter')}
              {(pendingMetrics.length > 0 || pendingImages.length > 0) && t('composer.pendingCounts', { metrics: pendingMetrics.length, images: pendingImages.length })}
              {highlightPassage?.text ? t('composer.traceLinked') : ''}
            </span>

            <button
              type="button"
              onClick={submitUpdate}
              disabled={!draft.trim() && !rawNotes.trim() && !metrics.length && !images.length}
              aria-label={hasCards ? t('composer.updateReport') : t('composer.buildReport')}
              className="h-9 px-4 gap-2 flex items-center justify-center bg-gradient-to-r from-[#0071E3] to-[#0077ED] hover:from-[#0077ED] hover:to-[#0082FF] active:scale-[0.97] text-white rounded-full text-[12.5px] font-medium transition-all shadow-[0_2px_10px_rgba(0,113,227,0.28)] disabled:opacity-40 disabled:shadow-none disabled:active:scale-100"
            >
              <span>{hasCards ? t('composer.updateReport') : t('composer.buildReport')}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="text-[10px] text-center text-[#86868B] mt-1.5">
          {t('composer.privacyNote')}
        </p>
      </div>
    </div>
  );
};
