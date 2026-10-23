import { describe, expect, it } from 'vitest';
import { createSampleProject } from '../lib/sampleData';
import { formatForExecutiveEmail, formatSlackWebhookPayload, formatTeamsWebhookPayload, formatGoogleChatWebhookPayload, formatDiscordWebhookPayload } from '../lib/export/destinationFormatters';
import { metricGraphHtml, metricGraphText } from '../lib/export/metricGraphs';
import { KpiMetricCardData } from '../types/report';

describe('Executive email and dispatch graphs', () => {
  it('exports the chosen graph forms and all report sections in email-safe HTML', () => {
    const sample = createSampleProject();
    const project = { ...sample, cards: sample.cards.map(card => card.type === 'kpi_metric' && card.label === 'Sprint completion' ? { ...card, chartStyle: 'donut' as const } : card) };
    const html = formatForExecutiveEmail(project);
    expect(html).toContain('data-metric-graph="bar"');
    expect(html).toContain('data-metric-graph="trend"');
    expect(html).toContain('data-metric-graph="donut"');
    expect(html).toContain('Media');
    expect(html).toContain('Metrics &amp; data'.replace('&amp;', '&'));
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<svg');
  });
  it('carries portable graphs into all four live webhook payloads', () => {
    const sample = createSampleProject();
    const project = { ...sample, cards: sample.cards.map(card => card.type === 'kpi_metric' && card.label === 'Sprint completion' ? { ...card, chartStyle: 'donut' as const } : card) };
    for (const formatter of [formatSlackWebhookPayload, formatTeamsWebhookPayload, formatGoogleChatWebhookPayload, formatDiscordWebhookPayload]) {
      const payload = JSON.stringify(formatter(project));
      expect(payload).toContain('█');
      expect(payload).toContain('Previous');
      expect(payload).toContain('Progress');
    }
  });
  it('escapes custom labels and safely handles negative bars and missing donut targets', () => {
    const card: KpiMetricCardData = { id: 'x', type: 'kpi_metric', title: 'x', label: '<img onerror="bad">', value: -10, unit: '<x>', chartStyle: 'bar', createdAt: '', updatedAt: '' };
    expect(metricGraphHtml(card)).toContain('&lt;img');
    expect(metricGraphHtml(card)).not.toContain('width="-');
    expect(metricGraphText(card)).toContain('−');
    expect(metricGraphHtml({ ...card, chartStyle: 'donut' })).toContain('positive target');
    expect(metricGraphHtml({ ...card, chartStyle: 'number' })).toBe('');
  });
  it('respects empty and selected export scopes', () => {
    const project = createSampleProject();
    expect(formatForExecutiveEmail(project, [])).not.toContain('data-metric-graph');
    const metric = project.cards.filter(c => c.type === 'kpi_metric').slice(0, 1);
    expect(formatForExecutiveEmail(project, metric)).toContain('data-metric-graph="bar"');
    expect(formatForExecutiveEmail(project, metric)).not.toContain('Risks & blockers');
  });

  it('supports localized executive email for Simplified and Traditional Chinese locales', () => {
    const project = createSampleProject();
    const hansHtml = formatForExecutiveEmail(project, undefined, 'zh-Hans');
    expect(hansHtml).toContain('项目简报');
    expect(hansHtml).toContain('执行摘要');
    expect(hansHtml).toContain('关键指标与数据');
    expect(hansHtml).toContain('风险与阻碍');
    expect(hansHtml).toContain('下一步计划');

    const hantHtml = formatForExecutiveEmail(project, undefined, 'zh-Hant');
    expect(hantHtml).toContain('專案簡報');
    expect(hantHtml).toContain('執行摘要');
    expect(hantHtml).toContain('關鍵指標與數據');
    expect(hantHtml).toContain('風險與阻礙');
    expect(hantHtml).toContain('下一步計劃');
  });
});
