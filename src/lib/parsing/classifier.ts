import { MetricInput, SnippetCard, SourceReference } from '../../types/report';
import { generateSnippetCards } from './deterministicParser';

export type FindingCategory = 'accomplishment' | 'metric' | 'risk' | 'action' | 'milestone' | 'context';

export interface ClassificationFinding {
  id: string;
  category: FindingCategory;
  title: string;
  detail: string;
  evidence: string;
  selected: boolean;
  confidence: 'explicit' | 'review';
  metric?: MetricInput;
  sourceStart: number;
  sourceEnd: number;
}

interface Passage { text: string; start: number; end: number }

export function slugKey(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'item';
}

/** Split prose/bullets into evidence-backed passages while retaining source offsets. */
function passagesOf(text: string): Passage[] {
  const result: Passage[] = [];
  const lines = text.split('\n');
  let offset = 0;
  for (const line of lines) {
    const content = line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '');
    const lead = line.indexOf(content);
    const sentenceRegex = /[^.!?]+(?:[.!?]+|$)/g;
    let match: RegExpExecArray | null;
    while ((match = sentenceRegex.exec(content))) {
      const value = match[0].trim();
      if (value.length > 3) {
        const local = match.index + match[0].indexOf(value);
        result.push({ text: value, start: offset + lead + local, end: offset + lead + local + value.length });
      }
    }
    offset += line.length + 1;
  }
  return result;
}

const add = (out: ClassificationFinding[], p: Passage, category: FindingCategory, title: string, detail = p.text, metric?: MetricInput) => {
  out.push({
    id: `${category}-${p.start}-${out.length}`,
    category,
    title,
    detail,
    evidence: p.text,
    selected: true,
    confidence: metric ? 'review' : 'explicit',
    metric,
    sourceStart: p.start,
    sourceEnd: p.end,
  });
};

function metricFromPassage(p: Passage): MetricInput | null {
  const numeric = /-?\d[\d,]*(?:\.\d+)?/g;
  const tokens = [...p.text.matchAll(numeric)];
  if (!tokens.length) return null;
  const parse = (s: string) => Number(s.replace(/,/g, ''));
  const range = p.text.match(/from\s+(-?\d[\d,]*(?:\.\d+)?)\s*(%|percent|ms|milliseconds?|seconds?|minutes?|hours?|days?|users?|defects?|bugs?|points?|requests?)?\s+(?:to|→)\s+(-?\d[\d,]*(?:\.\d+)?)\s*(%|percent|ms|milliseconds?|seconds?|minutes?|hours?|days?|users?|defects?|bugs?|points?|requests?)?/i);
  let currentToken = tokens[tokens.length - 1];
  let previousValue: number | undefined;
  let unitText = '';
  if (range) {
    previousValue = parse(range[1]);
    const currentValue = parse(range[3]);
    currentToken = tokens.find(t => t[0].replace(/,/g, '') === String(currentValue)) ?? currentToken;
    unitText = range[4] || range[2] || '';
  } else {
    const targetFirst = p.text.match(/(?:target|goal)\s*(?:of|is|at)?\s*(-?\d[\d,]*(?:\.\d+)?)(?:\s*(%|percent|ms|milliseconds?|seconds?|minutes?|hours?|days?|users?|defects?|bugs?|points?|requests?))?/i);
    const targetLast = p.text.match(/(-?\d[\d,]*(?:\.\d+)?)(?:\s*(%|percent|ms|milliseconds?|seconds?|minutes?|hours?|days?|users?|defects?|bugs?|points?|requests?))?\s*(?:is the\s*)?(?:target|goal)\b/i);
    const targetMatch = targetFirst ?? targetLast;
    const targetIndex = targetMatch?.index ?? -1;
    const targetNumber = targetMatch ? (targetFirst ? targetMatch[1] : targetMatch[1]) : undefined;
    const eligible = tokens.filter(t => !(targetMatch && t.index === targetIndex + targetMatch[0].indexOf(targetNumber!)));
    currentToken = eligible[eligible.length - 1] ?? tokens[tokens.length - 1];
    const tail = p.text.slice(currentToken.index! + currentToken[0].length);
    unitText = tail.match(/^\s*(%|percent|ms|milliseconds?|seconds?|minutes?|hours?|days?|users?|defects?|bugs?|points?|requests?)/i)?.[1] ?? '';
  }
  const current = parse(currentToken[0]);
  const targetFirst = p.text.match(/(?:target|goal)\s*(?:of|is|at)?\s*(-?\d[\d,]*(?:\.\d+)?)(?:\s*(%|percent|ms|milliseconds?|seconds?|minutes?|hours?|days?|users?|defects?|bugs?|points?|requests?))?/i);
  const targetLast = p.text.match(/(-?\d[\d,]*(?:\.\d+)?)(?:\s*(%|percent|ms|milliseconds?|seconds?|minutes?|hours?|days?|users?|defects?|bugs?|points?|requests?))?\s*(?:is the\s*)?(?:target|goal)\b/i);
  const target = targetFirst ? parse(targetFirst[1]) : targetLast ? parse(targetLast[1]) : undefined;
  unitText = /^percent$/i.test(unitText) ? '%' : /^milliseconds?$/i.test(unitText) ? 'ms' : unitText;
  const labelEnd = currentToken.index ?? 0;
  const prefix = p.text.slice(0, labelEnd).replace(/\b(?:dropped|decreased|increased|rose|improved|moved|changed|from|is|was|currently|now|at|averages?|reached|completed|stands|to)\b\s*$/i, '').trim();
  const label = prefix.split(/[;,]/).pop()?.replace(/^(?:the team|overall|and)\s+/i, '').trim();
  const looksMetric = !!unitText || target !== undefined || previousValue !== undefined || /\b(?:metric|latency|response time|velocity|completion|revenue|users|defects|bugs|conversion|uptime|average|score|rate|traffic)\b/i.test(p.text);
  if (!looksMetric) return null;
  return {
    id: `metric-source-${p.start}`,
    name: label && label.length < 48 ? label : (unitText ? 'Reported metric' : 'Reported value'),
    value: current,
    unit: unitText,
    previousValue,
    target,
    explanation: p.text,
    direction: /defect|bug|latency|time|delay/i.test(label ?? '' + unitText) ? 'lower' : 'neutral',
    chartStyle: previousValue !== undefined ? 'trend' : target !== undefined ? 'bar' : 'number',
  };
}

/** Local, deterministic classification. Cloud inference can implement this same contract later. */
export function classifyPassages(text: string): ClassificationFinding[] {
  const findings: ClassificationFinding[] = [];
  for (const p of passagesOf(text)) {
    const lower = p.text.toLowerCase();
    const negated = /\b(no|not|without|never|none|zero)\b/.test(lower);
    const resolved = /\b(resolved|fixed|closed|cleared|unblocked|completed|eliminated)\b/.test(lower);
    const riskCue = /\b(block(?:er|ing|ed)?|risk|defect|bug|issue|failure|behind|at risk)\b/.test(lower);
    const riskNegated = /\b(no|not|without|never|none|zero)\b.{0,35}\b(block(?:er|ing|ed)?|risk|defect|bug|issue|failure)s?\b/.test(lower);
    const completed = /\b(completed|delivered|achieved|shipped|launched|finished|complete|ready for review|resolved|fixed)\b/.test(lower) && !/\bnot\s+(?:completed|resolved|fixed|complete)\b/.test(lower);
    const isCompletionStatement = /\b(?:is|was|has been)\s+(?:complete|completed|resolved|fixed|finished)\b/.test(lower) || /\b(?:completed|delivered|achieved|shipped|launched|finished|resolved|fixed)\b/.test(lower);
    const actionCue = /\b(?:will\s+(?!not\b|be\s+determined\b)[a-z]+|plans?\s+to|need(?:s)?\s+to|should|must|action\s+item|follow\s+up|investigate|scheduled\s+to)\b/.test(lower);
    const milestoneCue = /\b(?:milestone|phase\s+\d+|release\s+candidate|beta\s+launch|ga\s+launch|target\s+release|handoff\s+milestone)\b/.test(lower);

    if (riskCue && !riskNegated && !resolved) {
      const blocker = /\b(block(?:er|ing|ed)?|blocking)\b/.test(lower);
      add(findings, p, 'risk', blocker ? 'Potential blocker' : 'Potential risk');
    }
    if (actionCue && !completed) {
      const owner = p.text.match(/\b(?:owner|lead|assigned to)\s*[:=]?\s*([A-Z][\p{L}-]+)/u)?.[1]
        ?? p.text.match(/\b([A-Z][\p{L}-]+)\s+will\b/u)?.[1];
      const due = p.text.match(/\bby\s+((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:\s+\w+\s+\d{1,2})?|\w+\s+\d{1,2})\b/i)?.[1];
      const detail = [owner ? `Owner: ${owner}` : '', due ? `Due: ${due}` : ''].filter(Boolean).join(' · ');
      add(findings, p, 'action', 'Next action', detail || p.text);
    }
    const metric = metricFromPassage(p);
    if (metric && !findings.some(f => f.sourceStart === p.start && f.category === 'metric')) {
      add(findings, p, 'metric', metric.name, `${metric.value}${metric.unit}${metric.target !== undefined ? ` · target ${metric.target}${metric.unit}` : ''}`, metric);
    }
    if (milestoneCue && !riskCue && !actionCue) {
      add(findings, p, 'milestone', 'Milestone');
    } else if (isCompletionStatement && !/\b(?:test|score|response time|latency|revenue|users|defects?)\b.{0,24}\d/i.test(p.text)) {
      add(findings, p, 'accomplishment', 'Accomplishment');
    }
    if (!riskCue && !actionCue && !completed && !metric && !milestoneCue && !negated) add(findings, p, 'context', 'Context');
  }
  return findings;
}

export function cardsFromFindings(findings: ClassificationFinding[], existingMetrics: MetricInput[], images: import('../../types/report').ImageAssetInput[], projectTitle: string): SnippetCard[] {
  const selected = findings.filter(f => f.selected);
  const now = new Date().toISOString();
  const source = (f: ClassificationFinding): SourceReference => ({
    passageText: f.evidence,
    startIndex: f.sourceStart,
    endIndex: f.sourceEnd,
    confidence: f.confidence === 'explicit' ? 'explicit' : 'inferred',
    notes: 'Classified locally; user reviewed before adding to report',
  });
  const cards: SnippetCard[] = [];
  const summaries = selected.filter(f => f.category === 'accomplishment' || f.category === 'context');
  if (summaries.length) {
    cards.push({
      id: `card-exec-${Date.now()}`,
      type: 'executive_summary',
      sourceKey: 'review:summary',
      title: 'Executive Summary',
      summary: summaries.map(f => f.detail).join(' '),
      keyAccomplishments: selected.filter(f => f.category === 'accomplishment').map(f => f.detail),
      createdAt: now,
      updatedAt: now,
      sourceRef: source(summaries[0]),
    });
  }
  selected.filter(f => f.category === 'metric' && f.metric).forEach((f) => {
    const extracted = f.metric!;
    const existing = existingMetrics.find(metric => metric.name.toLowerCase() === extracted.name.toLowerCase());
    const m = existing ? { ...existing, ...extracted, id: existing.id } : extracted;
    let trend: 'improving' | 'neutral' | 'declining' | undefined;
    if (m.target !== undefined && m.direction !== 'neutral') {
      const lowerIsBetter = m.direction === 'lower';
      trend = lowerIsBetter ? (m.value <= m.target ? 'improving' : 'declining') : (m.value >= m.target ? 'improving' : 'declining');
    }
    cards.push({
      id: `card-metric-${m.id}`,
      type: 'kpi_metric',
      sourceKey: `metric:${m.id}`,
      title: m.name,
      label: m.name,
      value: m.value,
      unit: m.unit,
      target: m.target,
      previousValue: m.previousValue,
      explanation: m.explanation,
      chartStyle: m.chartStyle,
      direction: m.direction,
      trend,
      createdAt: now,
      updatedAt: now,
      sourceRef: source(f),
    });
  });
  selected.filter(f => f.category === 'risk').forEach((f, index) => {
    const lower = f.evidence.toLowerCase();
    const isBlocker = /\b(block|blocking|blocked)\b/.test(lower);
    const severity = /\bcritical\b/.test(lower) ? 'critical' : /\bhigh\b/.test(lower) ? 'high' : 'medium';
    cards.push({
      id: `card-risk-${f.sourceStart}-${index}`,
      type: 'risk_blocker',
      sourceKey: `review:risk:${slugKey(f.evidence)}`,
      title: f.title,
      description: f.detail,
      severity,
      isBlocker,
      createdAt: now,
      updatedAt: now,
      sourceRef: source(f),
    });
  });
  selected.filter(f => f.category === 'milestone').forEach((f, index) => {
    const lower = f.evidence.toLowerCase();
    const status = /\b(completed|achieved|shipped|launched|finished|complete)\b/.test(lower)
      ? 'achieved'
      : /\b(at risk|behind|delay|delayed)\b/.test(lower)
        ? 'at_risk'
        : 'on_track';
    const dueDate = f.evidence.match(/\b(?:by|for|on)\s+((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:\s+\w+\s+\d{1,2})?|\w+\s+\d{1,2}(?:,\s*\d{4})?)\b/i)?.[1];
    cards.push({
      id: `card-milestone-${f.sourceStart}-${index}`,
      type: 'milestone',
      sourceKey: `review:milestone:${slugKey(f.evidence)}`,
      title: f.title === 'Accomplishment' || f.title === 'Context' ? 'Milestone' : f.title,
      description: f.detail,
      status,
      dueDate,
      createdAt: now,
      updatedAt: now,
      sourceRef: source(f),
    });
  });
  const actions = selected.filter(f => f.category === 'action');
  if (actions.length) {
    cards.push({
      id: `card-nextsteps-${Date.now()}`,
      type: 'next_steps',
      sourceKey: 'review:actions',
      title: 'Next Steps & Commitments',
      items: actions.map((f, index) => {
        const owner = f.detail.match(/Owner:\s*([^·]+)/i)?.[1]?.trim();
        const dueDate = f.detail.match(/Due:\s*(.+)$/i)?.[1]?.trim();
        const actionText = /^Owner:|^Due:/i.test(f.detail) ? f.evidence : f.detail;
        return { id: `step-${slugKey(f.evidence)}-${index}`, action: actionText, owner, dueDate, status: 'planned' as const, sourceRef: source(f) };
      }),
      createdAt: now,
      updatedAt: now,
      sourceRef: source(actions[0]),
    });
  }
  cards.push(...generateSnippetCards('', [], images, projectTitle).filter(c => c.type === 'visual_update'));
  return cards;
}
