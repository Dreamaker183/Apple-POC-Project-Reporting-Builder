import { ReportProject, SnippetCard } from '../../types/report';
import { escapeHtml } from './htmlExport';
import { metricColor, metricGraphHtml, metricStatus } from './metricGraphs';

export function executiveEmailHtml(project: ReportProject, cards?: SnippetCard[]): string {
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
      <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#0071E3;font-weight:600;margin-bottom:12px;">Project briefing</div>
      <h1 style="font-size:28px;font-weight:600;letter-spacing:-0.7px;line-height:1.2;margin:0 0 12px;color:#1D1D1F;">${title}</h1>
      <div style="font-size:13px;color:#6E6E73;">${project.reportingPeriod ? escapeHtml(project.reportingPeriod) + ' &nbsp;·&nbsp; ' : ''}${selected.length} report cards</div>
    </td></tr>
    ${summaries.length ? section('Executive summary', summaries.map(c => box(`${para(c.summary)}${c.keyAccomplishments.length ? `<ul style="margin:14px 0 0;padding-left:18px;font-size:13px;color:#424245;line-height:1.7;">${c.keyAccomplishments.map(a => `<li style="padding-bottom:6px;">${escapeHtml(a)}</li>`).join('')}</ul>` : ''}${c.statusNote ? `<div style="margin-top:14px;padding:10px 12px;background:#FFF8EB;border-radius:8px;color:#925B12;font-size:12px;">${escapeHtml(c.statusNote)}</div>` : ''}`)).join('')) : ''}
    ${metrics.length ? section('Metrics & data', metrics.map(m => box(`${heading(m.label)}<div style="font-size:32px;font-weight:600;letter-spacing:-0.8px;line-height:1.2;">${escapeHtml(String(m.value))}<span style="font-size:16px;color:#6E6E73;letter-spacing:0;"> ${escapeHtml(m.unit)}</span></div><div style="font-size:11px;color:${metricColor(m)};margin-top:8px;">${metricStatus(m)}${m.target !== undefined ? ` &nbsp;·&nbsp; Target ${escapeHtml(String(m.target) + m.unit)}` : ''}${m.previousValue !== undefined ? ` &nbsp;·&nbsp; Previous ${escapeHtml(String(m.previousValue) + m.unit)}` : ''}</div>${metricGraphHtml(m)}${m.explanation ? `<div style="font-size:12px;color:#6E6E73;line-height:1.6;margin-top:14px;">${escapeHtml(m.explanation)}</div>` : ''}`)).join('')) : ''}
    ${risks.length ? section('Risks & blockers', risks.map(r => box(`${heading(r.title)}<div style="font-size:11px;font-weight:600;color:${r.isBlocker ? '#B42318' : '#925B12'};margin-bottom:10px;">${r.isBlocker ? 'BLOCKER' : 'RISK'} · ${escapeHtml(r.severity.toUpperCase())}</div>${para(r.description)}${r.impact ? para('Impact: ' + r.impact) : ''}${r.mitigation ? para('Mitigation: ' + r.mitigation) : ''}`)).join('')) : ''}
    ${steps.length ? section('Next steps', steps.map(c => box(`<ol style="padding-left:18px;margin:0;">${c.items.map(s => `<li style="padding:0 0 14px;font-size:14px;">${escapeHtml(s.action)}<div style="font-size:12px;color:#6E6E73;margin-top:4px;">${escapeHtml(s.status.replace(/_/g, ' '))}${s.owner ? ' · ' + escapeHtml(s.owner) : ''}${s.dueDate ? ' · Due ' + escapeHtml(s.dueDate) : ''}</div></li>`).join('')}</ol>`)).join('')) : ''}
    ${milestones.length ? section('Milestones', milestones.map(c => box(`${heading(c.title)}${para(c.description)}<div style="font-size:12px;color:#6E6E73;">${escapeHtml(c.status.replace(/_/g, ' '))}${c.dueDate ? ' · ' + escapeHtml(c.dueDate) : ''}</div>`)).join('')) : ''}
    ${visuals.length ? section('Visual updates', visuals.map(c => box(`${heading(c.title)}${safeImage(c.imageUrl) ? `<img src="${escapeHtml(c.imageUrl)}" alt="${escapeHtml(c.altText)}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border-radius:8px;margin:12px 0;" />` : ''}${para(c.caption)}${c.context ? para(c.context) : ''}`)).join('')) : ''}
    <tr><td style="padding:24px 28px;font-size:11px;color:#6E6E73;border-top:1px solid #E8E8ED;">${title} &nbsp;·&nbsp; Project Reporting Builder</td></tr>
  </table></div>`;
}
