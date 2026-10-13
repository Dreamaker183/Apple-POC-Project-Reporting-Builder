/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';
import { MetricInput, ImageAssetInput, MetricChartStyle } from '../../types/report';
import { CHART_STYLE_OPTIONS } from '../cards/MetricChart';

const ChartStyleIcon: React.FC<{ id: MetricChartStyle; className?: string }> = ({ id, className }) => {
  const Icon = id === 'bar' ? ChartColumn : id === 'donut' ? ChartPie : id === 'trend' ? TrendingUp : Hash;
  return <Icon className={className} />;
};

const ChartStyleIconButton: React.FC<{
  id: MetricChartStyle;
  label: string;
  active?: boolean;
  onClick?: () => void;
}> = ({ id, label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={`${label} graph`}
    aria-pressed={active}
    className={`p-1.5 rounded-lg transition-colors ${
      active ? 'bg-[#0071E3]/15 text-[#0071E3]' : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.05]'
    }`}
  >
    <ChartStyleIcon id={id} className="w-4 h-4" />
  </button>
);

interface Props {
  rawNotes: string;
  metrics: MetricInput[];
  images: ImageAssetInput[];
  highlightPassage?: { start?: number; end?: number; text?: string } | null;
  onNotesChange: (notes: string) => void;
  onMetricsChange: (metrics: MetricInput[]) => void;
  onImagesChange: (images: ImageAssetInput[]) => void;
  onGenerateReport: () => void;
  onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

export const ChatComposer: React.FC<Props> = ({
  rawNotes,
  metrics,
  images,
  highlightPassage,
  onNotesChange,
  onMetricsChange,
  onImagesChange,
  onGenerateReport,
  onNotify,
}) => {
  const [showMetrics, setShowMetrics] = useState(false);
  const [newMetricStyle, setNewMetricStyle] = useState<MetricChartStyle>('bar');
  const [showAttach, setShowAttach] = useState(false);
  const [showMetricForms, setShowMetricForms] = useState(false);
  const [selectedMetricIds, setSelectedMetricIds] = useState<Set<string>>(new Set());
  const [metricName, setMetricName] = useState('');
  const [metricValue, setMetricValue] = useState('');
  const [metricUnit, setMetricUnit] = useState('');
  const [metricTarget, setMetricTarget] = useState('');
  const [metricError, setMetricError] = useState<string | null>(null);
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
      setMetricError('Metric name is required');
      return;
    }
    const val = parseFloat(metricValue);
    if (isNaN(val)) {
      setMetricError('Value must be a valid number');
      return;
    }
    const targetNum = metricTarget.trim() ? parseFloat(metricTarget) : undefined;
    onMetricsChange([
      ...metrics,
      {
        id: `metric-${Date.now()}`,
        name: metricName.trim(),
        value: val,
        unit: metricUnit.trim(),
        target: targetNum !== undefined && !isNaN(targetNum) ? targetNum : undefined,
        chartStyle: newMetricStyle,
      },
    ]);
    setMetricName('');
    setMetricValue('');
    setMetricUnit('');
    setMetricTarget('');
    setMetricError(null);
    notify(`Metric added (${metrics.length + 1} total)`);
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
    notify(`Removed ${selectedMetricIds.size} metric${selectedMetricIds.size === 1 ? '' : 's'}`, 'info');
    setSelectedMetricIds(new Set());
  };

  // --- media: straight to device picker (same whitelist + 5MB guard as ImageUploader) ---
  const processFile = (file: File) => {
    setMediaError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      const msg = `Unsupported format: ${file.type}. Allowed: PNG, JPEG, WebP, SVG.`;
      setMediaError(msg);
      notify(msg, 'error');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      const msg = `File exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`;
      setMediaError(msg);
      notify(msg, 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      onImagesChange([
        ...images,
        {
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          dataUrl,
          altText: `Preview image for ${file.name.replace(/\.[^/.]+$/, '')}`,
          fileSize: file.size,
          fileType: file.type,
        },
      ]);
      notify(`Photo attached (${images.length + 1} total)`);
    };
    reader.onerror = () => {
      setMediaError('Failed to read image file.');
      notify('Failed to read image file.', 'error');
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
      onGenerateReport();
    }
  };

  return (
    <div className="no-print px-4 sm:px-8 pb-4 pt-2 bg-gradient-to-t from-[#F5F5F7] via-[#F5F5F7]/85 to-transparent">
      <div className="max-w-3xl mx-auto">
        {/* Chatbot card */}
        <div
          className={`relative rounded-[26px] border bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)] transition-colors ${
            dragOver ? 'border-[#0071E3] ring-2 ring-[#0071E3]/20' : 'border-black/[0.08]'
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
        {/* Metrics sheet: placed directly on the chatbot when open, content-sized like before */}
        {showMetrics && (
          <div className="absolute inset-x-0 bottom-0 z-30 max-h-[62vh] overflow-y-auto rounded-[26px] border border-black/[0.08] bg-[#FAFAFA] p-3 shadow-[0_16px_48px_rgba(0,0,0,0.18)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold tracking-wide uppercase text-[#86868B]">
                  Metrics ({metrics.length})
                </span>
                <div className="flex items-center gap-1">
                  {selectedMetricIds.size > 0 && (
                    <button
                      type="button"
                      onClick={handleDeleteSelectedMetrics}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete ({selectedMetricIds.size})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowMetrics(false)}
                    className="p-1 text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.05] rounded-full transition-colors"
                    aria-label="Close metrics"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <>
              {metrics.length > 0 ? (
                <div className="rounded-xl border border-black/[0.08] bg-white overflow-x-auto mb-2">
                  <div className="min-w-[460px]">
                  {/* Table header */}
                  <div className="grid grid-cols-[28px_minmax(0,1fr)_64px_48px_52px_78px_28px] items-center gap-1 px-2 py-1.5 bg-black/[0.03] text-[10px] font-semibold tracking-wide uppercase text-[#86868B]">
                    <input
                      type="checkbox"
                      checked={allMetricsSelected}
                      onChange={() =>
                        setSelectedMetricIds(allMetricsSelected ? new Set() : new Set(metrics.map((m) => m.id)))
                      }
                      className="w-3.5 h-3.5 accent-[#0071E3] cursor-pointer justify-self-center"
                      aria-label="Select all metrics"
                    />
                    <span>Metric</span>
                    <span>Value</span>
                    <span>Unit</span>
                    <span>Target</span>
                    <span>Graph</span>
                    <span />
                  </div>
                  {/* Table rows: tap checkbox to select, tap fields to edit */}
                  {metrics.map((m) => (
                    <div
                      key={m.id}
                      className={`grid grid-cols-[28px_minmax(0,1fr)_64px_48px_52px_78px_28px] items-center gap-1 px-2 py-1 border-t border-black/[0.05] transition-colors ${
                        selectedMetricIds.has(m.id) ? 'bg-[#0071E3]/[0.06]' : 'hover:bg-black/[0.02]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMetricIds.has(m.id)}
                        onChange={() => toggleSelectMetric(m.id)}
                        className="w-3.5 h-3.5 accent-[#0071E3] cursor-pointer justify-self-center"
                        aria-label={`Select metric ${m.name}`}
                      />
                      <input
                        type="text"
                        value={m.name}
                        onChange={(e) => handleUpdateMetric(m.id, { name: e.target.value })}
                        className="min-w-0 text-xs text-[#1D1D1F] bg-transparent border-b border-transparent hover:border-black/20 focus:border-[#0071E3] focus:outline-none py-0.5"
                        aria-label="Metric name"
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
                        aria-label="Metric value"
                      />
                      <input
                        type="text"
                        value={m.unit}
                        onChange={(e) => handleUpdateMetric(m.id, { unit: e.target.value })}
                        placeholder="—"
                        className="min-w-0 text-xs text-[#1D1D1F] bg-transparent border-b border-transparent hover:border-black/20 focus:border-[#0071E3] focus:outline-none py-0.5"
                        aria-label="Metric unit"
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
                        aria-label="Metric target"
                      />
                      <select
                        value={m.chartStyle ?? 'number'}
                        onChange={(e) => handleUpdateMetric(m.id, { chartStyle: e.target.value as MetricChartStyle })}
                        className="min-w-0 text-[11px] text-[#1D1D1F] bg-transparent border-b border-transparent hover:border-black/20 focus:border-[#0071E3] focus:outline-none py-0.5 capitalize cursor-pointer"
                        aria-label={`Graph form for ${m.name}`}
                      >
                        {CHART_STYLE_OPTIONS.map((o) => (
                          <option key={o.id} value={o.id} className="capitalize">
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => onMetricsChange(metrics.filter((x) => x.id !== m.id))}
                        className="p-0.5 text-[#86868B] hover:text-rose-600 rounded justify-self-center"
                        aria-label={`Remove metric ${m.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-black/15 bg-white px-3 py-4 mb-2 text-center text-xs text-[#86868B]">
                  No metrics yet — add your first one below.
                </div>
              )}

              {/* Quick-add row: Enter adds, focus returns here for rapid entry */}
              <div className="flex items-center gap-1 mb-2">
                <span className="text-[11px] text-[#86868B] mr-1">New graph:</span>
                {CHART_STYLE_OPTIONS.map((opt) => (
                  <ChartStyleIconButton
                    key={opt.id}
                    id={opt.id}
                    label={opt.label}
                    active={newMetricStyle === opt.id}
                    onClick={() => setNewMetricStyle(opt.id)}
                  />
                ))}
              </div>
              <form onSubmit={handleAddMetric} className="flex flex-col sm:flex-row gap-2">
                <input
                  ref={metricNameRef}
                  type="text"
                  value={metricName}
                  onChange={(e) => setMetricName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setShowMetrics(false);
                  }}
                  placeholder="Metric name *"
                  className="flex-1 text-xs p-2 bg-white border border-black/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                />
                <input
                  type="number"
                  step="any"
                  value={metricValue}
                  onChange={(e) => setMetricValue(e.target.value)}
                  placeholder="Value *"
                  className="w-full sm:w-24 text-xs p-2 bg-white border border-black/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                />
                <input
                  type="text"
                  value={metricUnit}
                  onChange={(e) => setMetricUnit(e.target.value)}
                  placeholder="Unit"
                  className="w-full sm:w-20 text-xs p-2 bg-white border border-black/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                />
                <input
                  type="number"
                  step="any"
                  value={metricTarget}
                  onChange={(e) => setMetricTarget(e.target.value)}
                  placeholder="Target"
                  className="w-full sm:w-24 text-xs p-2 bg-white border border-black/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-[#1D1D1F] text-white text-xs font-medium rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-1"
                  title="Add metric (Enter)"
                >
                  <Check className="w-3.5 h-3.5" /> Add ⏎
                </button>
                {metricError && (
                  <div className="sm:basis-full text-[11px] text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">{metricError}</div>
                )}
              </form>
              <div className="text-[10px] text-[#86868B] pt-1">
                Tip: press Enter to add, then keep typing the next metric — graph stays on {CHART_STYLE_OPTIONS.find((o) => o.id === newMetricStyle)?.label}.
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
                aria-label="Dismiss error"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Attached metrics + photos strip (always visible when attachments exist) */}
          {(metrics.length > 0 || images.length > 0) && (
            <div className="flex gap-1.5 px-4 pt-3 overflow-x-auto items-center">
              {metrics.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-1 pl-1.5 pr-1 py-1 bg-[#0071E3]/10 border border-[#0071E3]/20 rounded-full shrink-0"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowMetrics(true);
                    }}
                    title="Open metrics table"
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
                    aria-label={`Remove metric ${m.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {images.map((img) => (
                <div key={img.id} className="relative shrink-0 group">
                  <img src={img.dataUrl} alt={img.altText} className="w-12 h-12 rounded-xl object-cover border border-black/10" />
                  <button
                    type="button"
                    onClick={() => onImagesChange(images.filter((x) => x.id !== img.id))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#1D1D1F] text-white rounded-full flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-rose-600 focus:opacity-100 transition-opacity"
                    aria-label={`Remove ${img.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Main text field */}
          <div className="px-4 pt-3">
            <textarea
              value={rawNotes}
              onChange={(e) => onNotesChange(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder="Describe updates, blockers, next steps…"
              className="w-full bg-transparent text-[14px] leading-relaxed text-[#1D1D1F] placeholder:text-black/30 focus:outline-none resize-none min-h-[64px] max-h-[180px]"
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
                title="Attach metrics or photos"
                aria-label="Attach"
                aria-expanded={showAttach}
              >
                <Plus className="w-5 h-5" />
              </button>

              {showAttach && (
                <div className="absolute left-0 bottom-11 z-30 w-60 bg-white/95 backdrop-blur-xl rounded-2xl border border-black/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.14)] py-1.5 text-[13px]">
                  <div
                    className="relative"
                    onMouseEnter={() => setShowMetricForms(true)}
                    onMouseLeave={() => setShowMetricForms(false)}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowMetrics(true);
                        setShowAttach(false);
                        setShowMetricForms(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-black/[0.04] text-[#1D1D1F] transition-colors text-left"
                      aria-haspopup="menu"
                      aria-expanded={showMetricForms}
                    >
                      <BarChart2 className="w-4 h-4 text-[#0071E3]" />
                      <span className="flex-1">Add metric</span>
                      {metrics.length > 0 && (
                        <span className="text-[11px] text-[#86868B]">{metrics.length}</span>
                      )}
                      <span className="text-[#86868B] text-xs">›</span>
                    </button>
                    {showMetricForms && (
                      <div
                        role="menu"
                        aria-label="Pick a graph form"
                        className="absolute left-full bottom-0 z-30 ml-2 w-52 bg-white/95 backdrop-blur-xl rounded-2xl border border-black/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.14)] py-1.5 text-[13px] before:absolute before:-left-2 before:top-0 before:bottom-0 before:w-2 before:content-['']"
                      >
                        <div className="px-3.5 pt-1 pb-1 text-[10px] font-semibold tracking-wide uppercase text-[#86868B]">
                          Graph form
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
                              <span className="block leading-tight">{opt.label}</span>
                              <span className="block text-[10px] text-[#86868B] leading-tight">{opt.hint}</span>
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
                    <span className="flex-1">Attach photo</span>
                    {images.length > 0 && (
                      <span className="text-[11px] text-[#86868B]">{images.length}</span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {rawNotes && (
              <button
                type="button"
                onClick={() => onNotesChange('')}
                className="p-2 text-[#86868B] hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                title="Clear text"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <div className="flex-1" />

            <span className="text-[11px] text-[#86868B] hidden sm:block pr-1">
              {rawNotes.length > 0 ? `${rawNotes.length} chars` : '⌘⏎ to generate'}
              {(metrics.length > 0 || images.length > 0) && ` · ${metrics.length} metrics · ${images.length} images`}
              {highlightPassage?.text ? ' · trace linked' : ''}
            </span>

            <button
              type="button"
              onClick={onGenerateReport}
              aria-label="Generate report"
              className="w-9 h-9 flex items-center justify-center bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full shadow-[0_1px_2px_rgba(0,113,227,0.3)] transition-all active:scale-95 disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        <p className="text-[10px] text-center text-[#86868B] mt-1.5">
          Deterministic facts · No AI hallucinations
        </p>
      </div>
    </div>
  );
};
