/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MetricChartStyle } from '../../types/report';

export interface MetricChartDatum {
  value: number;
  unit: string;
  target?: number;
  previousValue?: number;
  trend?: 'improving' | 'neutral' | 'declining';
}

interface Props {
  datum: MetricChartDatum;
  style: MetricChartStyle;
  idSuffix?: string;
}

export const CHART_STYLE_OPTIONS: Array<{ id: MetricChartStyle; label: string; hint: string }> = [
  { id: 'number', label: 'Number', hint: 'Big value' },
  { id: 'bar', label: 'Bar', hint: 'vs target' },
  { id: 'donut', label: 'Donut', hint: 'Progress ring' },
  { id: 'trend', label: 'Trend', hint: 'prev vs now' },
];

function accentFor(trend?: MetricChartDatum['trend']): string {
  if (trend === 'improving') return '#059669';
  if (trend === 'declining') return '#DC2626';
  return '#0071E3';
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Deterministic pure-SVG metric visualizations. No chart library, no guessing:
 * every pixel derives from value / target / previousValue only.
 */
export const MetricChart: React.FC<Props> = ({ datum, style, idSuffix = 'c' }) => {
  const { value, unit, target, previousValue, trend } = datum;
  const accent = accentFor(trend);

  if (style === 'bar') {
    const scale = Math.max(Math.abs(value), Math.abs(target ?? 0), Math.abs(previousValue ?? 0)) || 1;
    const fillPct = clamp01(value / scale) * 100;
    const targetPct = target !== undefined ? clamp01(target / scale) * 100 : undefined;
    const prevPct = previousValue !== undefined ? clamp01(previousValue / scale) * 100 : undefined;
    return (
      <div role="img" aria-label={`Bar chart: ${value}${unit}${target !== undefined ? `, target ${target}${unit}` : ''}`}>
        <div className="relative h-2.5 rounded-full bg-black/[0.07]">
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all"
            style={{ width: `${fillPct}%`, backgroundColor: accent }}
          />
          {targetPct !== undefined && (
            <div
              className="absolute top-[-3px] h-[16px] w-[2px] rounded bg-[#1D1D1F]"
              style={{ left: `calc(${targetPct}% - 1px)` }}
              title={`Target ${target}${unit}`}
            />
          )}
          {prevPct !== undefined && (
            <div
              className="absolute top-[-2px] h-[14px] w-[2px] rounded bg-white border border-black/30"
              style={{ left: `calc(${prevPct}% - 1px)` }}
              title={`Previous ${previousValue}${unit}`}
            />
          )}
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-[#86868B]">
          <span>
            0{unit}
          </span>
          <span className="flex items-center gap-2">
            {previousValue !== undefined && <span>Prev {previousValue}{unit}</span>}
            {target !== undefined && <span className="font-medium text-[#1D1D1F]">Target {target}{unit}</span>}
          </span>
        </div>
      </div>
    );
  }

  if (style === 'donut') {
    const denom = target !== undefined && target > 0 ? target : Math.max(value, previousValue ?? 0, 1);
    const progress = clamp01(value / denom);
    const size = 84;
    const stroke = 9;
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    return (
      <div className="flex items-center gap-3" role="img" aria-label={`Donut chart: ${value}${unit} of ${denom}${unit}`}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="#F5F5F7" strokeWidth={stroke} fill="transparent" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={accent}
            strokeWidth={stroke}
            strokeDasharray={circ}
            strokeDashoffset={circ - progress * circ}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>
        <div>
          <div className="text-xl font-semibold tracking-tight text-[#1D1D1F]">
            {value}
            <span className="text-xs font-medium text-[#727272] ml-0.5">{unit}</span>
          </div>
          <div className="text-[10px] text-[#86868B]">
            {Math.round(progress * 100)}% of {denom}{unit}
          </div>
        </div>
      </div>
    );
  }

  if (style === 'trend') {
    if (previousValue === undefined) {
      return (
        <div className="flex items-end gap-2" role="img" aria-label={`Trend chart: ${value}${unit}, no previous value`}>
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 rounded-md bg-black/[0.07] h-16 relative overflow-hidden">
              <div className="absolute bottom-0 w-full rounded-md" style={{ height: '100%', backgroundColor: accent }} />
            </div>
            <span className="text-[10px] font-medium text-[#1D1D1F]">Now</span>
          </div>
          <span className="text-[10px] text-[#86868B] pb-5">No previous value</span>
        </div>
      );
    }
    const max = Math.max(Math.abs(value), Math.abs(previousValue), 1);
    const prevH = Math.max(6, (Math.abs(previousValue) / max) * 64);
    const curH = Math.max(6, (Math.abs(value) / max) * 64);
    const delta = previousValue !== 0 ? Math.round(((value - previousValue) / Math.abs(previousValue)) * 100) : null;
    return (
      <div className="flex items-end gap-3" role="img" aria-label={`Trend chart: previous ${previousValue}${unit}, now ${value}${unit}`}>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-medium text-[#727272]">{previousValue}{unit}</span>
          <div className="w-10 rounded-md bg-black/[0.08]" style={{ height: prevH }} />
          <span className="text-[10px] text-[#86868B]">Prev</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-semibold text-[#1D1D1F]">{value}{unit}</span>
          <div className="w-10 rounded-md" style={{ height: curH, backgroundColor: accent }} />
          <span className="text-[10px] text-[#86868B]">Now</span>
        </div>
        {delta !== null && (
          <span
            className="text-[11px] font-semibold pb-5"
            style={{ color: accent }}
          >
            {delta > 0 ? `+${delta}%` : `${delta}%`}
          </span>
        )}
      </div>
    );
  }

  return null;
};
