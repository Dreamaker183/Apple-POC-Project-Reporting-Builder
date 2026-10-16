import { KpiMetricCardData } from '../../types/report';

const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
export const metricColor = (m: KpiMetricCardData) => m.trend === 'declining' ? '#B45309' : m.trend === 'improving' ? '#16835B' : '#0071E3';
export const metricStatus = (m: KpiMetricCardData) => m.trend === 'declining' ? 'Needs attention' : m.trend === 'improving' ? 'On track' : 'Reported value';

/** Plain, portable graph for channels without HTML/image attachments. No external chart service. */
export function metricGraphText(m: KpiMetricCardData): string {
  const style = m.chartStyle ?? 'number';
  if (style === 'number') return '';
  const scale = Math.max(Math.abs(m.value), Math.abs(m.target ?? 0), Math.abs(m.previousValue ?? 0), 1);
  const bar = (value: number) => {
    const length = Math.round(Math.abs(value) / scale * 12);
    return `${value < 0 ? '−' : ''}${'█'.repeat(length)}${'░'.repeat(12 - length)}`;
  };
  if (style === 'donut') {
    if (m.target === undefined || m.target <= 0 || m.value < 0) return 'Progress: positive target required';
    const percent = m.value / m.target * 100;
    const filled = Math.min(12, Math.max(0, Math.round(percent / 100 * 12)));
    return `Progress ${'●'.repeat(filled)}${'○'.repeat(12 - filled)} ${Math.round(percent)}% of target ${m.target}${m.unit}`;
  }
  if (style === 'trend') return `${m.previousValue !== undefined ? `Previous ${bar(m.previousValue)} ${m.previousValue}${m.unit}\n` : ''}Current  ${bar(m.value)} ${m.value}${m.unit}`;
  return `Current ${bar(m.value)} ${m.value}${m.unit}${m.target !== undefined ? `\nTarget  ${bar(m.target)} ${m.target}${m.unit}` : ''}`;
}

/** Inline table graphs work in Gmail/Outlook without scripts, SVG, remote images or CSS gradients. */
export function metricGraphHtml(m: KpiMetricCardData): string {
  const style = m.chartStyle ?? 'number';
  if (style === 'number') return '';
  const color = metricColor(m);
  const label = escape(`${m.label}: ${m.value}${m.unit}`);
  if (style === 'donut') {
    if (m.target === undefined || m.target <= 0 || m.value < 0) return '<p style="font-size:12px;color:#6E6E73;margin:12px 0 0;">Add a positive target to show progress.</p>';
    const ratio = Math.min(1, m.value / m.target);
    // A compact tiled ring: table cells retain the graphic in restrictive email clients.
    const rows = Array.from({ length: 9 }, (_, y) => `<tr>${Array.from({ length: 9 }, (_, x) => {
      const dx = x - 4, dy = y - 4;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const ring = distance >= 2.5 && distance <= 4.5;
      const angle = (Math.atan2(dx, -dy) + Math.PI * 2) % (Math.PI * 2);
      const fill = ring ? (angle / (Math.PI * 2) < ratio ? color : '#E8E8ED') : '#FFFFFF';
      return `<td width="9" height="9" bgcolor="${fill}" style="width:9px;height:9px;padding:0;font-size:0;line-height:0;background-color:${fill};">&nbsp;</td>`;
    }).join('')}</tr>`).join('');
    return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:16px;"><tr><td><table role="img" aria-label="${label}" data-metric-graph="donut" cellpadding="0" cellspacing="0">${rows}</table></td><td style="padding-left:18px;"><div style="font-size:24px;font-weight:600;color:${color};">${Math.round(m.value / m.target * 100)}%</div><div style="font-size:12px;color:#6E6E73;">of target ${escape(String(m.target) + m.unit)}</div></td></tr></table>`;
  }
  const values = [0, m.value, m.target ?? 0, m.previousValue ?? 0];
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const position = (n: number) => (n - min) / span;
  const rows: [string, number, string][] = style === 'trend'
    ? [...(m.previousValue !== undefined ? [['Previous', m.previousValue, '#A1A1AA'] as [string, number, string]] : []), ['Current', m.value, color]]
    : [['Current', m.value, color], ...(m.target !== undefined ? [['Target', m.target, '#A1A1AA'] as [string, number, string]] : [])];
  return `<table role="img" aria-label="${label}" data-metric-graph="${style}" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">${rows.map(([name, value, fill]) => {
    const start = Math.round(Math.min(position(0), position(value)) * 100);
    const width = Math.round(Math.abs(position(value) - position(0)) * 100);
    const segments = [[start, '#F0F0F3'], [width, fill], [100 - start - width, '#F0F0F3']] as const;
    return `<tr><td width="60" style="font-size:11px;color:#6E6E73;padding:6px 10px 6px 0;">${name}</td><td style="padding:6px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${segments.filter(([size]) => size > 0).map(([size, bg]) => `<td width="${size}%" height="12" bgcolor="${bg}" style="height:12px;font-size:0;line-height:0;background-color:${bg};">&nbsp;</td>`).join('')}</tr></table></td><td width="70" style="padding-left:12px;font-size:12px;text-align:right;color:#1D1D1F;white-space:nowrap;">${escape(String(value) + m.unit)}</td></tr>`;
  }).join('')}</table>`;
}
