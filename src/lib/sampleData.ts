/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReportProject, ImageAssetInput, MetricInput, SnippetCard } from '../types/report';
import { generateSnippetCards } from './parsing/deterministicParser';

/**
 * High-fidelity, self-contained SVG representation of the Customer Portal Modernization UI mockup
 */
export const SAMPLE_IMAGE_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480" width="800" height="480">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F9FAFB"/>
      <stop offset="100%" stop-color="#F3F4F6"/>
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.08"/>
    </filter>
  </defs>
  
  <!-- Canvas Background -->
  <rect width="800" height="480" fill="url(#bg)" rx="12"/>
  
  <!-- Browser Window Frame -->
  <g filter="url(#shadow)" transform="translate(40, 30)">
    <rect width="720" height="420" fill="#FFFFFF" rx="8" stroke="#E5E7EB" stroke-width="1"/>
    
    <!-- Window Bar -->
    <rect width="720" height="38" fill="#F8FAFC" rx="8" stroke-bottom="#E5E7EB"/>
    <line x1="0" y1="38" x2="720" y2="38" stroke="#E5E7EB" stroke-width="1"/>
    <circle cx="20" cy="19" r="5" fill="#EF4444"/>
    <circle cx="36" cy="19" r="5" fill="#F59E0B"/>
    <circle cx="52" cy="19" r="5" fill="#10B981"/>
    
    <!-- URL pill -->
    <rect x="180" y="8" width="360" height="22" rx="4" fill="#FFFFFF" stroke="#E2E8F0"/>
    <text x="360" y="23" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#64748B" text-anchor="middle">portal.acme-corp.internal/settings/profile</text>
    
    <!-- Sidebar navigation -->
    <rect x="0" y="38" width="180" height="382" fill="#F8FAFC" stroke-right="#E5E7EB"/>
    <line x1="180" y1="38" x2="180" y2="420" stroke="#E5E7EB" stroke-width="1"/>
    
    <text x="24" y="70" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="700" fill="#0F172A">Customer Portal</text>
    
    <!-- Nav items -->
    <rect x="12" y="86" width="156" height="28" rx="6" fill="#EFF6FF"/>
    <text x="32" y="104" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#0071E3">Account &amp; Profile</text>
    
    <text x="32" y="140" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" fill="#64748B">Billing &amp; Invoices</text>
    <text x="32" y="176" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" fill="#64748B">Security &amp; SSO</text>
    <text x="32" y="212" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" fill="#64748B">API Keys</text>
    <text x="32" y="248" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" fill="#64748B">Audit Logs</text>
    
    <!-- Main content area -->
    <text x="210" y="70" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" fill="#94A3B8">Settings &gt; Profile</text>
    <text x="210" y="96" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="18" font-weight="700" fill="#0F172A">Customer Profile Modernization</text>
    <text x="210" y="116" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" fill="#64748B">Sprint 42 candidate build — verified for design handoff</text>
    
    <!-- Profile card -->
    <rect x="210" y="134" width="480" height="120" rx="6" fill="#FFFFFF" stroke="#E2E8F0"/>
    <circle cx="250" cy="180" r="24" fill="#0071E3" opacity="0.1"/>
    <text x="250" y="185" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="700" fill="#0071E3" text-anchor="middle">AC</text>
    <text x="290" y="170" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="600" fill="#0F172A">Acme Enterprise Core</text>
    <text x="290" y="190" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" fill="#64748B">Organization ID: org_9281a · Tier: Enterprise</text>
    <text x="290" y="210" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" fill="#059669">Verified Organization</text>

    <!-- Payment integration notice banner -->
    <rect x="210" y="268" width="480" height="52" rx="6" fill="#FFFBEB" stroke="#FDE68A"/>
    <text x="226" y="292" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#92400E">Testing Notice: Payment callback pending validation</text>
    <text x="226" y="308" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" fill="#B45309">Payment webhook callback testing active in staging environment.</text>

    <!-- Metrics row -->
    <rect x="210" y="334" width="150" height="60" rx="6" fill="#F8FAFC" stroke="#E2E8F0"/>
    <text x="224" y="356" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" fill="#64748B">Sprint Work Done</text>
    <text x="224" y="378" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="16" font-weight="700" fill="#0071E3">85%</text>

    <rect x="375" y="334" width="150" height="60" rx="6" fill="#F8FAFC" stroke="#E2E8F0"/>
    <text x="389" y="356" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" fill="#64748B">Avg Latency</text>
    <text x="389" y="378" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="16" font-weight="700" fill="#D97706">240 ms</text>
    
    <rect x="540" y="334" width="150" height="60" rx="6" fill="#F8FAFC" stroke="#E2E8F0"/>
    <text x="554" y="356" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" fill="#64748B">Open Critical Bugs</text>
    <text x="554" y="378" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="16" font-weight="700" fill="#DC2626">3</text>
  </g>
</svg>
`)}`;

/**
 * Standard enterprise source text from prompt specification
 */
export const SAMPLE_SOURCE_TEXT =
  `The team completed 85% of planned sprint work. The customer profile page and account settings flow are ready for review. Three critical defects remain open, including a payment callback issue that is blocking end-to-end validation. API response time currently averages 240 ms against a 200 ms target. The team plans to complete payment integration testing and resolve the remaining critical defects before the next review. The release date has not yet been confirmed.`;

/**
 * Messy, unstructured raw notes demonstrating real-world ingestion resilience
 */
export const SAMPLE_MESSY_SOURCE_TEXT =
  `Sprint 42 raw updates from dev standup:
- customer profile page and account settings flow are completed and ready for review!
- team completed 85% of planned sprint work overall.
- heads up: 3 critical defects remain open, especially a payment callback issue that is blocking end-to-end validation.
- latency metric: API response time currently averages 240 ms against a 200 ms target.
- immediate action: team plans to complete payment integration testing and resolve the remaining critical defects before the next review.
- status constraint: the release date has not yet been confirmed.`;

export const SAMPLE_METRICS: MetricInput[] = [
  {
    id: 'sample-metric-1',
    name: 'Sprint completion',
    value: 85,
    unit: '%',
    target: 100,
    previousValue: 70,
    explanation: '85% of planned sprint work completed on schedule',
    chartStyle: 'bar',
  },
  {
    id: 'sample-metric-2',
    name: 'Open critical defects',
    value: 3,
    unit: '',
    target: 0,
    previousValue: 5,
    explanation: 'Includes 1 payment callback issue blocking validation',
    chartStyle: 'trend',
  },
  {
    id: 'sample-metric-3',
    name: 'Average API response time',
    value: 240,
    unit: 'ms',
    target: 200,
    previousValue: 260,
    explanation: 'Currently 240 ms vs 200 ms target SLA',
    chartStyle: 'donut',
  },
];

export const SAMPLE_IMAGES: ImageAssetInput[] = [
  {
    id: 'sample-img-1',
    name: 'customer-portal-profile-mockup.svg',
    dataUrl: SAMPLE_IMAGE_SVG,
    altText: 'Customer portal modern account settings and profile page mockup ready for review',
    fileSize: 12400,
    fileType: 'image/svg+xml',
  },
];

export function createSampleProject(useMessyInput: boolean = false): ReportProject {
  const sourceText = useMessyInput ? SAMPLE_MESSY_SOURCE_TEXT : SAMPLE_SOURCE_TEXT;
  const cards = generateSnippetCards(
    sourceText,
    SAMPLE_METRICS,
    SAMPLE_IMAGES,
    'Customer Portal Modernization'
  );

  return {
    id: 'project-sample-customer-portal',
    title: 'Customer Portal Modernization',
    reportingPeriod: '2026-10-09',
    createdAt: '2026-10-09T09:00:00.000Z',
    rawNotes: sourceText,
    metrics: SAMPLE_METRICS,
    images: SAMPLE_IMAGES,
    cards,
    lastSavedAt: new Date().toISOString(),
    isDirty: false,
  };
}

/**
 * Historical Week 40 Baseline Snapshot (prior sprint) to compare against Week 41
 */
export const WEEK_40_BASELINE_SNAPSHOT: SnippetCard[] = [
  {
    id: 'base-card-exec',
    type: 'executive_summary',
    title: 'Executive Summary',
    summary: 'The team completed initial architecture and database schemas.',
    keyAccomplishments: [
      'Customer profile wireframes completed and approved',
      'Initial staging environment provisioned',
    ],
    createdAt: '2026-10-02T17:00:00.000Z',
    updatedAt: '2026-10-02T17:00:00.000Z',
  },
  {
    id: 'base-card-metric-1',
    type: 'kpi_metric',
    title: 'Sprint completion',
    label: 'Sprint completion',
    value: 70,
    unit: '%',
    target: 100,
    trend: 'improving',
    createdAt: '2026-10-02T17:00:00.000Z',
    updatedAt: '2026-10-02T17:00:00.000Z',
  },
  {
    id: 'base-card-metric-2',
    type: 'kpi_metric',
    title: 'Open critical defects',
    label: 'Open critical defects',
    value: 5,
    unit: '',
    target: 0,
    trend: 'declining',
    createdAt: '2026-10-02T17:00:00.000Z',
    updatedAt: '2026-10-02T17:00:00.000Z',
  },
  {
    id: 'base-card-metric-3',
    type: 'kpi_metric',
    title: 'Average API response time',
    label: 'Average API response time',
    value: 260,
    unit: 'ms',
    target: 200,
    trend: 'declining',
    createdAt: '2026-10-02T17:00:00.000Z',
    updatedAt: '2026-10-02T17:00:00.000Z',
  },
  {
    id: 'base-card-risk-legacy',
    type: 'risk_blocker',
    title: 'Legacy database migration timeout',
    description: 'Database schema migration timing out on staging cluster, blocking integration tests.',
    severity: 'critical',
    isBlocker: true,
    impact: 'Staging environment blocked',
    mitigation: 'Database tuning scheduled with platform team',
    createdAt: '2026-10-02T17:00:00.000Z',
    updatedAt: '2026-10-02T17:00:00.000Z',
  },
  {
    id: 'base-card-nextsteps',
    type: 'next_steps',
    title: 'Next Steps & Commitments',
    items: [
      {
        id: 'step-old-1',
        action: 'Resolve staging database timeout',
        status: 'completed',
      },
      {
        id: 'step-old-2',
        action: 'Build customer profile frontend views',
        status: 'in_progress',
      },
    ],
    createdAt: '2026-10-02T17:00:00.000Z',
    updatedAt: '2026-10-02T17:00:00.000Z',
  },
];
