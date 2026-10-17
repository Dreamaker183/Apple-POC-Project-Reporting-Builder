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
      <stop offset="0%" stop-color="#F5F5F7"/>
      <stop offset="100%" stop-color="#E5E5EA"/>
    </linearGradient>
    <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0071E3"/>
      <stop offset="100%" stop-color="#47A3FF"/>
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-opacity="0.12"/>
    </filter>
  </defs>
  
  <!-- Canvas Background -->
  <rect width="800" height="480" fill="url(#bg)" rx="16"/>
  
  <!-- Browser Window Frame -->
  <g filter="url(#shadow)" transform="translate(36, 24)">
    <rect width="728" height="432" fill="#FFFFFF" rx="10" stroke="#D1D1D6" stroke-width="1"/>
    
    <!-- Window Chrome Header -->
    <rect width="728" height="42" fill="#F9F9FA" rx="10" stroke-bottom="#E5E5EA"/>
    <line x1="0" y1="42" x2="728" y2="42" stroke="#E5E5EA" stroke-width="1"/>
    
    <!-- Traffic lights -->
    <circle cx="20" cy="21" r="5.5" fill="#FF5F56" stroke="#E0443E" stroke-width="0.5"/>
    <circle cx="38" cy="21" r="5.5" fill="#FFBD2E" stroke="#DEA123" stroke-width="0.5"/>
    <circle cx="56" cy="21" r="5.5" fill="#27C93F" stroke="#1AAB29" stroke-width="0.5"/>
    
    <!-- URL Pill -->
    <rect x="180" y="8" width="368" height="26" rx="6" fill="#FFFFFF" stroke="#D1D1D6" stroke-width="0.8"/>
    <g transform="translate(192, 14)">
      <!-- Lock Icon -->
      <path d="M4 5V3a2 2 0 1 1 4 0v2h1a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1zm1 0h2V3a1 1 0 0 0-2 0v2z" fill="#34C759"/>
    </g>
    <text x="364" y="25" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="11" font-weight="500" fill="#6E6E73" text-anchor="middle">portal.enterprise.internal/account/settings</text>
    
    <!-- Sidebar Navigation -->
    <rect x="0" y="42" width="186" height="390" fill="#F5F5F7"/>
    <line x1="186" y1="42" x2="186" y2="432" stroke="#E5E5EA" stroke-width="1"/>
    
    <g transform="translate(18, 64)">
      <text font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="13" font-weight="700" fill="#1D1D1F">Customer Portal</text>
      <rect x="110" y="-11" width="36" height="16" rx="4" fill="#0071E3" opacity="0.12"/>
      <text x="128" y="1" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="9" font-weight="600" fill="#0071E3" text-anchor="middle">v2.4</text>
    </g>
    
    <!-- Nav Items -->
    <!-- Active Nav Item -->
    <rect x="10" y="82" width="166" height="32" rx="7" fill="#0071E3"/>
    <text x="34" y="102" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="12" font-weight="600" fill="#FFFFFF">Account &amp; Profile</text>
    
    <!-- Other Nav Items -->
    <text x="34" y="138" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="500" fill="#6E6E73">Security &amp; 2FA</text>
    <text x="34" y="174" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="500" fill="#6E6E73">Billing &amp; Invoices</text>
    <text x="34" y="210" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="500" fill="#6E6E73">API &amp; Webhooks</text>
    <text x="34" y="246" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="500" fill="#6E6E73">Audit Telemetry</text>
    
    <!-- Sidebar Footer Status -->
    <circle cx="22" cy="406" r="3.5" fill="#34C759"/>
    <text x="32" y="410" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" font-weight="500" fill="#6E6E73">All Systems Operational</text>
    
    <!-- Main Content Area -->
    <text x="214" y="72" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="600" fill="#86868B">Settings &gt; Enterprise Account</text>
    <text x="214" y="98" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="18" font-weight="700" fill="#1D1D1F">Customer Profile Modernization</text>
    <text x="214" y="118" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11.5" fill="#6E6E73">Sprint 42 Candidate Build (26A4092b) · Verified for Staging Handoff</text>
    
    <!-- Profile Card Container -->
    <rect x="214" y="134" width="490" height="114" rx="8" fill="#FFFFFF" stroke="#E5E5EA" stroke-width="1"/>
    
    <!-- Monogram Avatar -->
    <circle cx="258" cy="180" r="26" fill="url(#blueGrad)"/>
    <text x="258" y="186" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="16" font-weight="700" fill="#FFFFFF" text-anchor="middle">AC</text>
    
    <!-- Organization Details -->
    <text x="300" y="168" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="600" fill="#1D1D1F">Acme Enterprise Core</text>
    <text x="300" y="188" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11.5" fill="#6E6E73">Org ID: org_9281a-ent · Tier: Enterprise Platinum · Region: us-west-2</text>
    
    <!-- Verified Badge -->
    <rect x="300" y="200" width="128" height="20" rx="4" fill="#34C759" opacity="0.12"/>
    <text x="364" y="214" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10.5" font-weight="600" fill="#248A3D" text-anchor="middle">✓ Verified Organization</text>
    
    <rect x="436" y="200" width="102" height="20" rx="4" fill="#0071E3" opacity="0.1"/>
    <text x="487" y="214" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10.5" font-weight="600" fill="#0071E3" text-anchor="middle">OIDC SSO Enforced</text>

    <!-- Payment Integration Notice Banner -->
    <rect x="214" y="258" width="490" height="54" rx="8" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1"/>
    <circle cx="236" cy="285" r="9" fill="#F59E0B" opacity="0.2"/>
    <text x="236" y="289" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="700" fill="#B45309" text-anchor="middle">!</text>
    
    <text x="254" y="278" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11.5" font-weight="600" fill="#92400E">Testing Notice: Payment callback pending validation</text>
    <text x="254" y="296" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10.5" fill="#B45309">Payment webhook callback testing active in staging environment (Bug #4109 HMAC timeout).</text>

    <!-- Metrics Row -->
    <!-- Metric 1: Sprint Work -->
    <rect x="214" y="324" width="154" height="74" rx="8" fill="#F5F5F7" stroke="#E5E5EA" stroke-width="1"/>
    <text x="228" y="344" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10.5" font-weight="500" fill="#6E6E73">Sprint Work Done</text>
    <text x="228" y="369" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="19" font-weight="700" fill="#0071E3">85%</text>
    <rect x="228" y="380" width="126" height="5" rx="2.5" fill="#E5E5EA"/>
    <rect x="228" y="380" width="107" height="5" rx="2.5" fill="#0071E3"/>

    <!-- Metric 2: Latency -->
    <rect x="382" y="324" width="154" height="74" rx="8" fill="#F5F5F7" stroke="#E5E5EA" stroke-width="1"/>
    <text x="396" y="344" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10.5" font-weight="500" fill="#6E6E73">Avg API Latency</text>
    <text x="396" y="369" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="19" font-weight="700" fill="#D97706">240 ms</text>
    <text x="396" y="386" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="9.5" font-weight="500" fill="#86868B">Target: &lt; 200 ms SLA</text>
    
    <!-- Metric 3: Critical Defects -->
    <rect x="550" y="324" width="154" height="74" rx="8" fill="#F5F5F7" stroke="#E5E5EA" stroke-width="1"/>
    <text x="564" y="344" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10.5" font-weight="500" fill="#6E6E73">Open Critical Bugs</text>
    <text x="564" y="369" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="19" font-weight="700" fill="#DC2626">3</text>
    <text x="564" y="386" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="9.5" font-weight="500" fill="#DC2626">1 Blocker · 2 UI</text>
  </g>
</svg>
`)}`;

/**
 * Standard enterprise source text from prompt specification
 */
export const SAMPLE_SOURCE_TEXT =
  `The team completed 85% of planned sprint work across the unified customer portal and identity platform. The customer profile page and account settings flow are ready for review following end-to-end design and accessibility audits. Three critical defects remain open, including a payment callback issue that is blocking end-to-end validation across staging merchant flows. API response time currently averages 240 ms against a 200 ms target, with query cache optimizations underway to close the gap. The team plans to complete payment integration testing and resolve the remaining critical defects before the next review. The release date has not yet been confirmed pending third-party gateway security certification.`;

/**
 * Messy, unstructured raw notes demonstrating real-world ingestion resilience
 */
export const SAMPLE_MESSY_SOURCE_TEXT =
  `Sprint 42 Engineering Standup & Raw Sync Notes (Build 26A4092b)
Attendees: @marcus (Identity & Frontend), @sarah (Billing & Payments), @david (Infra/API Gateway), @elena (EPM)

Delivery & Accomplishments:
- The customer profile page and account settings flow are ready for review following design handoff.
- The team completed 85% of planned sprint work overall (34 of 40 committed story points).
- Merged PR #842 for SSO token refresh with zero staging regressions reported.

Blockers & Quality:
- Three critical defects remain open, including a payment callback issue that is blocking end-to-end validation across staging merchant flows.
- API response time currently averages 240 ms against a 200 ms target SLA (p99 spiked to 460ms during synthetic load testing).

Next Steps & Commitments:
- The team plans to complete payment integration testing and resolve the remaining critical defects before the next review.
- @sarah to patch HMAC webhook handler by Wednesday EOD.
- @david tuning database query cache and indexing on tenant account lookup.

Deployment Constraint:
- The release date has not yet been confirmed pending external payment gateway compliance signoff.`;

export const SAMPLE_METRICS: MetricInput[] = [
  {
    id: 'sample-metric-1',
    name: 'Sprint completion',
    value: 85,
    unit: '%',
    target: 100,
    previousValue: 70,
    explanation: '34 of 40 committed story points delivered; final 15% delayed by payment webhook blocker',
    chartStyle: 'bar',
    direction: 'higher',
  },
  {
    id: 'sample-metric-2',
    name: 'Open critical defects',
    value: 3,
    unit: '',
    target: 0,
    previousValue: 5,
    explanation: 'Down from 5 in Week 40; 1 Sev-1 webhook blocker in payment callback and 2 Sev-2 UI regressions',
    chartStyle: 'trend',
    direction: 'lower',
  },
  {
    id: 'sample-metric-3',
    name: 'Average API response time',
    value: 240,
    unit: 'ms',
    target: 200,
    previousValue: 260,
    explanation: 'p99 latency improved by 20ms over last sprint; redis query cache layer tuning underway',
    chartStyle: 'donut',
    direction: 'lower',
  },
];

export const SAMPLE_IMAGES: ImageAssetInput[] = [
  {
    id: 'sample-img-1',
    name: 'customer-portal-profile-mockup.svg',
    dataUrl: SAMPLE_IMAGE_SVG,
    altText: 'Customer portal modern account settings and profile page mockup ready for review',
    fileSize: 18450,
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
    statusNote: 'Sprint 40 delivered on schedule with database tuning pending',
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
    direction: 'higher',
    explanation: '28 of 40 committed story points completed in Week 40 sprint',
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
    direction: 'lower',
    explanation: '5 critical issues identified during initial staging spin-up',
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
    direction: 'lower',
    explanation: 'Baseline p99 response time prior to Redis caching layer integration',
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
    owner: 'david-infra',
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
        owner: 'david-infra',
        dueDate: '02 Oct 2026',
      },
      {
        id: 'step-old-2',
        action: 'Build customer profile frontend views',
        status: 'in_progress',
        owner: 'marcus-identity',
        dueDate: '09 Oct 2026',
      },
    ],
    createdAt: '2026-10-02T17:00:00.000Z',
    updatedAt: '2026-10-02T17:00:00.000Z',
  },
];

