import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ExportModal } from '../components/export/ExportModal';
import { exportReportToJson, importReportFromJson } from '../lib/export/jsonExport';
import { LanguageProvider } from '../lib/i18n/LanguageContext';
import type { KpiMetricCardData, ReportProject } from '../types/report';

const timestamp = '2026-10-20T00:00:00.000Z';
const latency: KpiMetricCardData = {
  id: 'latency-card',
  type: 'kpi_metric',
  title: 'Current latency',
  sourceKey: 'metric:api-latency',
  createdAt: timestamp,
  updatedAt: timestamp,
  label: 'API latency',
  value: 210,
  unit: 'ms',
  target: 200,
  previousValue: 240,
  explanation: 'Current reviewed latency explanation',
  chartStyle: 'trend',
  direction: 'lower',
};
const throughput: KpiMetricCardData = {
  ...latency,
  id: 'throughput-card',
  sourceKey: undefined,
  title: 'Current throughput',
  label: 'Request throughput',
  value: 500,
  unit: 'req/s',
};
const project: ReportProject = {
  id: 'current-report',
  title: 'Current report',
  reportingPeriod: 'Week 43',
  rawNotes: '',
  metrics: [
    { id: 'api-latency', name: latency.label, value: 220, unit: 'ms', explanation: 'Stale input explanation' },
    { id: 'unrelated', name: 'Unrelated input metric', value: 999, unit: '%' },
  ],
  cards: [latency, throughput],
  images: [],
  lastSavedAt: timestamp,
  isDirty: false,
};

describe('Current report JSON exports', () => {
  it('exports current KPI facts and explanation instead of stale metric inputs', () => {
    const exported = JSON.parse(exportReportToJson(project));
    expect(exported.cards[0].content.value).toBe(210);
    expect(exported.metricsSummary).toEqual([
      {
        id: 'api-latency', name: latency.label, value: 210, unit: 'ms', target: 200,
        previousValue: 240, explanation: latency.explanation, chartStyle: 'trend', direction: 'lower',
      },
      {
        id: throughput.id, name: throughput.label, value: 500, unit: throughput.unit, target: 200,
        previousValue: 240, explanation: throughput.explanation, chartStyle: 'trend', direction: 'lower',
      },
    ]);
    expect(importReportFromJson(JSON.stringify(exported)).data?.metrics).toEqual(exported.metricsSummary);
  });

  it('limits the summary to exported KPI cards', () => {
    const exported = JSON.parse(exportReportToJson(project, [latency]));
    expect(exported.cards.map((card: { id: string }) => card.id)).toEqual([latency.id]);
    expect(exported.metricsSummary).toHaveLength(1);
    expect(exported.metricsSummary[0]).toMatchObject({ id: 'api-latency', value: 210 });
    expect(JSON.stringify(exported)).not.toContain('Unrelated input metric');
    expect(JSON.stringify(exported)).not.toContain(throughput.label);
  });

  it('does not include input metrics when the exported report has no KPI cards', () => {
    expect(JSON.parse(exportReportToJson({ ...project, cards: [] })).metricsSummary).toEqual([]);
  });

  it('imports legacy summaries without IDs and preserves a legitimate zero', () => {
    const exported = JSON.parse(exportReportToJson(project, [latency]));
    const result = importReportFromJson(JSON.stringify({
      ...exported,
      metricsSummary: [{ name: 'Errors', value: 0, unit: '' }],
    }));
    expect(result.success).toBe(true);
    expect(result.data?.metrics[0]).toMatchObject({ id: 'metric-imported-0', value: 0 });
  });

  it.each([
    ['missing value', '{"name":"Latency","unit":"ms"}'],
    ['invalid value', '{"name":"Latency","unit":"ms","value":"invalid"}'],
    ['null value', '{"name":"Latency","unit":"ms","value":null}'],
    ['nonfinite value', '{"name":"Latency","unit":"ms","value":1e400}'],
    ['invalid target', '{"name":"Latency","unit":"ms","value":210,"target":"invalid"}'],
    ['nonfinite previous value', '{"name":"Latency","unit":"ms","value":210,"previousValue":1e400}'],
  ])('rejects a summary with %s rather than manufacturing a zero', (_label, metric) => {
    const result = importReportFromJson(`{"project":{"title":"Malformed"},"cards":[],"metricsSummary":[${metric}]}`);
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.error).toBeTruthy();
  });

  it('rejects malformed cards instead of silently dropping them', () => {
    const exported = JSON.parse(exportReportToJson(project));
    const cards = exported.cards.map((card: { content: object }) => ({
      ...card, content: { ...card.content, value: null },
    }));
    expect(importReportFromJson(JSON.stringify({ ...exported, cards })).success).toBe(false);
  });
});

describe('Export modal initial scope', () => {
  function renderModal(initialScope?: 'all' | 'selected') {
    return renderToStaticMarkup(React.createElement(LanguageProvider, { initialLocale: 'en', children:
      React.createElement(ExportModal, {
        project, selectedCards: [latency], isOpen: true, onClose: () => {}, onNotify: () => {},
        ...(initialScope ? { initialScope } : {}),
      }),
    }));
  }

  it('defaults to the whole report even when cards are selected', () => {
    expect(renderModal()).toContain(throughput.label);
  });

  it('allows selection sharing to explicitly start with selected scope', () => {
    const html = renderModal('selected');
    expect(html).toContain(latency.label);
    expect(html).not.toContain(throughput.label);
  });
});
