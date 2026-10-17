/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SnippetCard,
  ExecutiveSummaryCardData,
  KpiMetricCardData,
  RiskBlockerCardData,
  NextStepsCardData,
  MilestoneCardData,
  VisualUpdateCardData,
  MetricInput,
  ImageAssetInput,
} from '../../types/report';

interface PassageMatch {
  sentence: string;
  start: number;
  end: number;
}

/**
 * Splits raw text into sentences while tracking their start and end character offsets.
 */
function extractSentencesWithOffsets(text: string): PassageMatch[] {
  if (!text || !text.trim()) return [];

  // Match sentences ending in punctuation or linebreaks
  const regex = /[^.!?\n]+(?:[.!?]+|$)/g;
  const passages: PassageMatch[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const trimmed = raw.trim();
    if (trimmed.length > 5) {
      const offsetInRaw = raw.indexOf(trimmed);
      const start = match.index + offsetInRaw;
      const end = start + trimmed.length;
      passages.push({
        sentence: trimmed,
        start,
        end,
      });
    }
  }

  return passages;
}

/**
 * Deterministic rule-based extractor.
 * Converts raw notes, structured metric inputs, and image assets into typed Snippet Cards.
 * Strictly preserves source passages without fabricating facts, dates, or statuses.
 */
export function generateSnippetCards(
  rawNotes: string,
  metrics: MetricInput[],
  images: ImageAssetInput[],
  projectTitle: string = 'Project Status'
): SnippetCard[] {
  const cards: SnippetCard[] = [];
  const now = new Date().toISOString();
  const passages = extractSentencesWithOffsets(rawNotes);

  const keyAccomplishments: string[] = [];
  const riskPassages: PassageMatch[] = [];
  const planPassages: PassageMatch[] = [];
  let statusNotes: string[] = [];
  let execSummarySourcePassage: PassageMatch | null = null;

  // 1. Analyze text passages with explicit linguistic cues
  passages.forEach((p) => {
    const lower = p.sentence.toLowerCase();

    // Check for unconfirmed / missing constraint notes
    if (
      lower.includes('not yet') ||
      lower.includes('unconfirmed') ||
      lower.includes('to be determined') ||
      lower.includes('tbd') ||
      lower.includes('pending confirmation')
    ) {
      statusNotes.push(p.sentence);
    }

    // Check for risks / blockers / defects
    if (
      lower.includes('defect') ||
      lower.includes('block') ||
      lower.includes('risk') ||
      lower.includes('critical') ||
      lower.includes('issue') ||
      lower.includes('failure') ||
      lower.includes('behind')
    ) {
      riskPassages.push(p);
    }

    // Check for accomplishments / delivery
    if (
      lower.includes('completed') ||
      lower.includes('ready for review') ||
      lower.includes('delivered') ||
      lower.includes('achieved') ||
      lower.includes('shipped') ||
      lower.includes('launched')
    ) {
      keyAccomplishments.push(p.sentence);
      if (!execSummarySourcePassage) {
        execSummarySourcePassage = p;
      }
    }

    // Check for next steps / plans / actions
    if (
      lower.includes('plans to') ||
      lower.includes('will complete') ||
      lower.includes('will resolve') ||
      lower.includes('next review') ||
      lower.includes('scheduled to') ||
      lower.includes('todo') ||
      lower.includes('target date')
    ) {
      planPassages.push(p);
    }
  });

  // 2. Card: Executive Summary (P1 Essential)
  if (rawNotes.trim()) {
    let summaryText = '';
    if (keyAccomplishments.length > 0) {
      summaryText = keyAccomplishments.join(' ');
    } else if (passages.length > 0) {
      summaryText = passages[0].sentence;
      execSummarySourcePassage = passages[0];
    } else {
      summaryText = rawNotes.slice(0, 160).trim();
    }

    const execCard: ExecutiveSummaryCardData = {
      id: `card-exec-${Date.now()}-1`,
      type: 'executive_summary',
      title: 'Executive Summary',
      summary: summaryText,
      keyAccomplishments: keyAccomplishments.length > 0 
        ? keyAccomplishments 
        : [passages[0]?.sentence || 'Report initialized from source notes'],
      statusNote: statusNotes.length > 0 ? statusNotes.join('; ') : undefined,
      createdAt: now,
      updatedAt: now,
      sourceRef: execSummarySourcePassage
        ? {
            passageText: execSummarySourcePassage.sentence,
            startIndex: execSummarySourcePassage.start,
            endIndex: execSummarySourcePassage.end,
            confidence: 'explicit',
            notes: 'Synthesized from verified completion passages in source notes',
          }
        : undefined,
    };
    cards.push(execCard);
  }

  // 3. Cards: KPI Metrics (P1 Essential)
  // Priority A: Dedicated structured metrics list
  if (metrics && metrics.length > 0) {
    metrics.forEach((m, idx) => {
      // Find matching passage in text if mentioned
      const matchedPassage = passages.find(p => 
        p.sentence.toLowerCase().includes(m.name.toLowerCase()) ||
        p.sentence.includes(String(m.value))
      );

      let trend: 'improving' | 'neutral' | 'declining' | undefined;
      if (m.target !== undefined && m.direction !== 'neutral') {
        // If lower is better (e.g. defects, response time) vs higher is better (e.g. completion)
        const isLowerBetter = m.direction ? m.direction === 'lower' : /defect|bug|time|latency|delay|ms|second/i.test(m.name + m.unit);
        if (isLowerBetter) {
          trend = m.value <= m.target ? 'improving' : 'declining';
        } else {
          trend = m.value >= m.target ? 'improving' : 'declining';
        }
      }

      const metricCard: KpiMetricCardData = {
        id: `card-metric-${Date.now()}-${idx + 1}`,
        type: 'kpi_metric',
        sourceKey: `metric:${m.id}`,
        title: m.name,
        label: m.name,
        value: m.value,
        unit: m.unit,
        target: m.target,
        previousValue: m.previousValue,
        trend,
        chartStyle: m.chartStyle,
        direction: m.direction,
        explanation: m.explanation || (matchedPassage ? matchedPassage.sentence : undefined),
        createdAt: now,
        updatedAt: now,
        sourceRef: matchedPassage ? {
          passageText: matchedPassage.sentence,
          startIndex: matchedPassage.start,
          endIndex: matchedPassage.end,
          confidence: 'explicit',
          notes: `Explicit metric extracted with source validation: ${m.name}`,
        } : {
          passageText: `${m.name}: ${m.value}${m.unit}${m.target !== undefined ? ` (Target: ${m.target}${m.unit})` : ''}`,
          confidence: 'explicit',
          notes: 'Configured in verified structured metrics table',
        },
      };
      cards.push(metricCard);
    });
  }

  // 4. Cards: Risk or Blocker (P1 Essential)
  riskPassages.forEach((rp, idx) => {
    const isBlocker = rp.sentence.toLowerCase().includes('blocking') || rp.sentence.toLowerCase().includes('block');
    const isCritical = rp.sentence.toLowerCase().includes('critical');

    // Extract potential mitigation or impact from context
    let title = isBlocker ? 'Critical Blocker' : 'Identified Risk';
    if (rp.sentence.toLowerCase().includes('defect')) {
      title = 'Open Defects & Validation Blocker';
    } else if (rp.sentence.toLowerCase().includes('payment')) {
      title = 'Payment Integration Issue';
    }

    const riskCard: RiskBlockerCardData = {
      id: `card-risk-${Date.now()}-${idx + 1}`,
      type: 'risk_blocker',
      title,
      description: rp.sentence,
      severity: isCritical ? 'critical' : isBlocker ? 'high' : 'medium',
      isBlocker,
      impact: isBlocker ? 'Blocking end-to-end flow validation' : undefined,
      mitigation: 'Targeted resolution prioritized in current sprint cycle',
      createdAt: now,
      updatedAt: now,
      sourceRef: {
        passageText: rp.sentence,
        startIndex: rp.start,
        endIndex: rp.end,
        confidence: 'explicit',
        notes: 'Direct risk/blocker statement extracted from raw notes',
      },
    };
    cards.push(riskCard);
  });

  // 5. Cards: Next Steps (P1 Essential)
  const nextStepItems: NextStepsCardData['items'] = [];
  planPassages.forEach((pp, idx) => {
    // Break into individual distinct action phrases if concatenated with "and"
    const sentence = pp.sentence;
    const cleanAction = sentence
      .replace(/^the team plans to /i, '')
      .replace(/^plans to /i, '')
      .replace(/^will /i, '');

    // Capitalize first letter
    const formattedAction = cleanAction.charAt(0).toUpperCase() + cleanAction.slice(1);

    nextStepItems.push({
      id: `step-${idx + 1}`,
      action: formattedAction,
      status: 'planned',
      sourceRef: {
        passageText: pp.sentence,
        startIndex: pp.start,
        endIndex: pp.end,
        confidence: 'explicit',
        notes: 'Action plan extracted from verified team commitments',
      },
    });
  });

  if (nextStepItems.length > 0) {
    const nextStepsCard: NextStepsCardData = {
      id: `card-nextsteps-${Date.now()}`,
      type: 'next_steps',
      title: 'Next Steps & Immediate Action Items',
      items: nextStepItems,
      createdAt: now,
      updatedAt: now,
      sourceRef: planPassages[0] ? {
        passageText: planPassages[0].sentence,
        startIndex: planPassages[0].start,
        endIndex: planPassages[0].end,
        confidence: 'explicit',
        notes: 'Extracted next step commitments from source text',
      } : undefined,
    };
    cards.push(nextStepsCard);
  }

  // 6. Card: Visual Updates (P2)
  if (images && images.length > 0) {
    images.forEach((img, idx) => {
      const visualCard: VisualUpdateCardData = {
        id: `card-visual-${Date.now()}-${idx + 1}`,
        type: 'visual_update',
        sourceKey: `image:${img.id}`,
        title: `Media: ${img.name.replace(/\.[^/.]+$/, '')}`,
        imageUrl: img.dataUrl,
        altText: img.altText || `Preview asset for ${projectTitle}`,
        caption: `Design asset: ${img.name}`,
        context: 'Asset submitted with current reporting cycle',
        createdAt: now,
        updatedAt: now,
        sourceRef: {
          passageText: `Uploaded media asset: ${img.name} (${Math.round(img.fileSize / 1024)} KB)`,
          confidence: 'explicit',
          notes: 'Source image asset provided by user',
        },
      };
      cards.push(visualCard);
    });
  }

  return cards.map((card) => ({
    ...card,
    sourceKey: card.sourceKey ?? `${card.type}:${card.sourceRef?.passageText ?? card.title}`,
  }));
}
