import { describe, expect, it } from 'vitest';
import { createSampleProject } from '../lib/sampleData';
import { formatForExecutiveEmail, formatSlackWebhookPayload, formatTeamsWebhookPayload, formatGoogleChatWebhookPayload, formatDiscordWebhookPayload } from '../lib/export/destinationFormatters';
import { metricGraphHtml, metricGraphText } from '../lib/export/metricGraphs';
import { KpiMetricCardData } from '../types/report';

describe('Executive email and dispatch graphs', () => {
  it('exports the chosen graph forms and all report sections in email-safe HTML', () => {
    const project = createSampleProject();
    const html = formatForExecutiveEmail(project);
    expect(html).toContain('data-metric-graph="bar"');
    expect(html).toContain('data-metric-graph="trend"');
    expect(html).toContain('data-metric-graph="donut"');
    expect(html).toContain('Visual updates');
    expect(html).toContain('Metrics &amp; data'.replace('&amp;', '&'));
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<svg');
  });
  it('carries portable graphs into all four live webhook payloads', () => {
    const project = createSampleProject();
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
});
