import { ReportProject, SnippetCard } from '../../types/report';
import { escapeHtml } from './htmlExport';
import { metricColor, metricGraphHtml, metricStatus } from './metricGraphs';
import { Locale } from '../i18n/dictionaries';

const EMAIL_I18N: Record<Locale, Record<string, string>> = {
  en: {
    briefing: 'Project briefing',
    reportCards: 'report cards',
    execSummary: 'Executive summary',
    metrics: 'Metrics & data',
    target: 'Target',
    previous: 'Previous',
    risks: 'Risks & blockers',
    blocker: 'BLOCKER',
    risk: 'RISK',
    impact: 'Impact',
    mitigation: 'Mitigation',
    nextSteps: 'Next steps',
    due: 'Due',
    milestones: 'Milestones',
    visualUpdates: 'Media',
    footer: 'Project Reporting Builder',
    planned: 'Planned',
    in_progress: 'In progress',
    completed: 'Completed',
    achieved: 'Achieved',
    on_track: 'On track',
    at_risk: 'At risk',
    delayed: 'Delayed',
    critical: 'CRITICAL',
    high: 'HIGH',
    medium: 'MEDIUM',
    low: 'LOW',
  },
  'zh-Hans': {
    briefing: '项目简报',
    reportCards: '张报告卡片',
    execSummary: '执行摘要',
    metrics: '关键指标与数据',
    target: '目标',
    previous: '上一期',
    risks: '风险与阻碍',
    blocker: '阻碍',
    risk: '风险',
    impact: '影响',
    mitigation: '缓解措施',
    nextSteps: '下一步计划',
    due: '截止日期',
    milestones: '关键里程碑',
    visualUpdates: '媒体',
    footer: '项目报告生成器',
    planned: '已排期',
    in_progress: '进行中',
    completed: '已完成',
    achieved: '已达成',
    on_track: '按计划推进',
    at_risk: '有风险',
    delayed: '已延期',
    critical: '极高',
    high: '高',
    medium: '中',
    low: '低',
  },
  'zh-Hant': {
    briefing: '專案簡報',
    reportCards: '張報告卡片',
    execSummary: '執行摘要',
    metrics: '關鍵指標與數據',
    target: '目標',
    previous: '上一期',
    risks: '風險與阻礙',
    blocker: '阻礙',
    risk: '風險',
    impact: '影響',
    mitigation: '緩解措施',
    nextSteps: '下一步計劃',
    due: '截止日期',
    milestones: '關鍵里程碑',
    visualUpdates: '媒體',
    footer: '專案報告生成器',
    planned: '已排程',
    in_progress: '進行中',
    completed: '已完成',
    achieved: '已達成',
    on_track: '按計劃推進',
    at_risk: '有風險',
    delayed: '已延期',
    critical: '極高',
    high: '高',
    medium: '中',
    low: '低',
  },
};

export function executiveEmailHtml(project: ReportProject, cards?: SnippetCard[], locale: Locale = 'en'): string {
  const i18n = EMAIL_I18N[locale] ?? EMAIL_I18N.en;
  const selected = cards ?? project.cards;
  const title = escapeHtml(project.title);
  const section = (label: string, content: string) => `<tr><td style="padding:28px 28px 10px;font-size:11px;letter-spacing:1.2px;font-weight:600;text-transform:uppercase;color:#6E6E73;">${label}</td></tr><tr><td style="padding:0 28px;">${content}</td></tr>`;
  const summaries = selected.filter(c => c.type === 'executive_summary');
  const metrics = selected.filter(c => c.type === 'kpi_metric');
  const risks = selected.filter(c => c.type === 'risk_blocker');
  const steps = selected.filter(c => c.type === 'next_steps');
  const milestones = selected.filter(c => c.type === 'milestone');
  const visuals = selected.filter(c => c.type === 'visual_update');
  const box = (body: string) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8E8ED;border-radius:12px;margin-bottom:12px;background:#FFFFFF;"><tr><td style="padding:20px;">${body}</td></tr></table>`;
  const heading = (text: string) => `<div style="font-size:16px;font-weight:600;color:#1D1D1F;margin-bottom:8px;">${escapeHtml(text)}</div>`;
  const para = (text: string) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#424245;">${escapeHtml(text)}</p>`;
  const safeImage = (url: string) => /^(https:\/\/|data:image\/(png|jpeg|webp|svg\+xml)[;,])/i.test(url);

  return `<div style="background:#F5F5F7;padding:24px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#1D1D1F;line-height:1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;margin:0 auto;background:#FFFFFF;border:1px solid #E8E8ED;border-radius:16px;">
    <tr><td style="padding:32px 28px 24px;border-bottom:1px solid #E8E8ED;">
      <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#0071E3;font-weight:600;margin-bottom:12px;">${i18n.briefing}</div>
      <h1 style="font-size:28px;font-weight:600;letter-spacing:-0.7px;line-height:1.2;margin:0 0 12px;color:#1D1D1F;">${title}</h1>
      <div style="font-size:13px;color:#6E6E73;">${project.reportingPeriod ? escapeHtml(project.reportingPeriod) + ' &nbsp;·&nbsp; ' : ''}${selected.length} ${i18n.reportCards}</div>
    </td></tr>
    ${summaries.length ? section(i18n.execSummary, summaries.map(c => box(`${para(c.summary)}${c.keyAccomplishments.length ? `<ul style="margin:14px 0 0;padding-left:18px;font-size:13px;color:#424245;line-height:1.7;">${c.keyAccomplishments.map(a => `<li style="padding-bottom:6px;">${escapeHtml(a)}</li>`).join('')}</ul>` : ''}${c.statusNote ? `<div style="margin-top:14px;padding:10px 12px;background:#FFF8EB;border-radius:8px;color:#925B12;font-size:12px;">${escapeHtml(c.statusNote)}</div>` : ''}`)).join('')) : ''}
    ${metrics.length ? section(i18n.metrics, metrics.map(m => box(`${heading(m.label)}<div style="font-size:32px;font-weight:600;letter-spacing:-0.8px;line-height:1.2;">${escapeHtml(String(m.value))}<span style="font-size:16px;color:#6E6E73;letter-spacing:0;"> ${escapeHtml(m.unit)}</span></div><div style="font-size:11px;color:${metricColor(m)};margin-top:8px;">${metricStatus(m, locale)}${m.target !== undefined ? ` &nbsp;·&nbsp; ${i18n.target} ${escapeHtml(String(m.target) + m.unit)}` : ''}${m.previousValue !== undefined ? ` &nbsp;·&nbsp; ${i18n.previous} ${escapeHtml(String(m.previousValue) + m.unit)}` : ''}</div>${metricGraphHtml(m, locale)}${m.explanation ? `<div style="font-size:12px;color:#6E6E73;line-height:1.6;margin-top:14px;">${escapeHtml(m.explanation)}</div>` : ''}`)).join('')) : ''}
    ${risks.length ? section(i18n.risks, risks.map(r => box(`${heading(r.title)}<div style="font-size:11px;font-weight:600;color:${r.isBlocker ? '#B42318' : '#925B12'};margin-bottom:10px;">${r.isBlocker ? i18n.blocker : i18n.risk} · ${escapeHtml(i18n[r.severity] ?? r.severity.toUpperCase())}</div>${para(r.description)}${r.impact ? para(i18n.impact + ': ' + r.impact) : ''}${r.mitigation ? para(i18n.mitigation + ': ' + r.mitigation) : ''}`)).join('')) : ''}
    ${steps.length ? section(i18n.nextSteps, steps.map(c => box(`<ol style="padding-left:18px;margin:0;">${c.items.map(s => `<li style="padding:0 0 14px;font-size:14px;">${escapeHtml(s.action)}<div style="font-size:12px;color:#6E6E73;margin-top:4px;">${escapeHtml(i18n[s.status] ?? s.status.replace(/_/g, ' '))}${s.owner ? ' · ' + escapeHtml(s.owner) : ''}${s.dueDate ? ` · ${i18n.due} ` + escapeHtml(s.dueDate) : ''}</div></li>`).join('')}</ol>`)).join('')) : ''}
    ${milestones.length ? section(i18n.milestones, milestones.map(c => box(`${heading(c.title)}${para(c.description)}<div style="font-size:12px;color:#6E6E73;">${escapeHtml(i18n[c.status] ?? c.status.replace(/_/g, ' '))}${c.dueDate ? ` · ${i18n.due} ` + escapeHtml(c.dueDate) : ''}</div>`)).join('')) : ''}
    ${visuals.length ? section(i18n.visualUpdates, visuals.map(c => box(`${heading(c.title)}${safeImage(c.imageUrl) ? `<img src="${escapeHtml(c.imageUrl)}" alt="${escapeHtml(c.altText)}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border-radius:8px;margin:12px 0;" />` : ''}${para(c.caption)}${c.context ? para(c.context) : ''}`)).join('')) : ''}
    <tr><td style="padding:24px 28px;font-size:11px;color:#6E6E73;border-top:1px solid #E8E8ED;">${title} &nbsp;·&nbsp; ${i18n.footer}</td></tr>
  </table></div>`;
}
