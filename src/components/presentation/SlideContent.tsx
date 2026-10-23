import { ArrowRight, ArrowUpRight, Check, FileInput, Layers3, ScanLine, Send } from 'lucide-react';
import { AnnotatedWebsite } from './AnnotatedWebsite';
import { WEBSITE_SLIDES } from './websiteSlides';

export function SlideContent({ id, annotations }: { id: string; annotations: boolean }) {
  const website = WEBSITE_SLIDES[id];
  if (website) return <>
    <div className="slide-title"><span>WEBSITE / COMPONENT WALKTHROUGH</span><h2>{website.title}</h2><p>{website.subtitle}</p></div>
    <AnnotatedWebsite figure={website.figure} visible={annotations} />
    <div className="slide-takeaway">{website.takeaway}</div>
  </>;
  if (id === 'overview') return <Vision />;
  if (id === 'cards') return <Cards />;
  if (id === 'architecture') return <Architecture />;
  if (id === 'metrics') return <Metrics />;
  return <Roadmap />;
}

function Vision() {
  return <>
    <div className="vision-title"><span>THE PROBLEM · 15 MINUTES INCLUDING Q&amp;A</span><h2>From scattered updates<br /><em>to decision-ready reports.</em></h2><p>Project leads assemble status, risks, and metrics by hand. Reporting takes time, and context is easy to lose.</p><a className="vision-demo-link" href="/">Start the 6-minute live demo <ArrowUpRight size={19} /></a></div>
    <figure className="vision-screenshot"><div className="vision-screenshot-crop"><img src="/poc/workspace.png" width="1440" height="900" alt="Project Reporting Builder showing the fictional project report and update input together" /></div><figcaption>ONE FICTIONAL PROJECT · A WORKING POC</figcaption></figure>
    <section className="vision-flow" aria-label="Project reporting workflow">
      <span className="vision-section-label">ONE REVIEWABLE FLOW</span>
      <div className="vision-flow-steps" role="list">{[
        { number: '01', title: 'Input', text: 'Team updates and metrics' },
        { number: '02', title: 'Review', text: 'Correct findings with source' },
        { number: '03', title: 'Report', text: 'Compose a decision-ready brief' },
        { number: '04', title: 'Share', text: 'Export the current report' },
      ].map((step) => <div className="vision-flow-step" role="listitem" key={step.title}><span>{step.number}</span><div><strong>{step.title}</strong><p>{step.text}</p></div></div>)}</div>
      <p className="vision-takeaway">The project lead reviews and corrects the report before sharing.</p>
    </section>
    <section className="vision-agenda" aria-label="15-minute presentation agenda">{[
      { minutes: '02', title: 'PROBLEM & APPROACH', text: 'Why project reporting needs a better path' },
      { minutes: '06', title: 'LIVE DEMO', text: 'Review and correct 240 → 220 ms' },
      { minutes: '04', title: 'ARCHITECTURE & PILOT', text: 'Evidence, limits, and next steps' },
      { minutes: '03', title: 'Q&A & DECISION', text: 'Agree the limited pilot' },
    ].map(({ minutes, title, text }) => <div key={title}><em>{minutes}<small>min</small></em><b>{title}</b><p>{text}</p></div>)}</section>
  </>;
}

const CARDS = [
  { image: 'card-summary.png', title: 'Executive summary', text: 'Bottom-line update, accomplishments, and status caveats.', size: [740, 339] },
  { image: 'card-kpi.png', title: 'KPI metric', text: 'Value, target, previous value, and a choice of chart styles.', size: [740, 272] },
  { image: 'card-risk.png', title: 'Risk & blocker', text: 'Severity, blocker status, impact, and mitigation.', size: [740, 268] },
  { image: 'card-next-steps.png', title: 'Next steps', text: 'Actions with status, owner, and due-date fields.', size: [740, 159] },
  { image: 'card-milestone.png', title: 'Milestone', text: 'A sourced handoff checkpoint, generated from the fictional notes.', size: [740, 211] },
  { image: 'card-visual.png', title: 'Visual update', text: 'A screenshot or diagram with caption, context, and alt text.', size: [740, 410] },
];

function Cards() {
  return <>
    <div className="slide-title"><span>WEBSITE / SIX ORIGINAL COMPONENTS</span><h2>Different information. The right card.</h2><p>Real component captures from the report canvas. Edit fields inline, reorder cards, and select what to share.</p></div>
    <div className="component-gallery">{CARDS.map((card, index) => <figure key={card.title}><div className="card-crop"><img src={`/poc/${card.image}`} width={card.size[0]} height={card.size[1]} alt={`Original ${card.title} component showing fictional sample data`} /></div><figcaption><span>{index + 1}</span><div><h3>{card.title}</h3><p>{card.text}</p></div></figcaption></figure>)}</div>
    <div className="slide-takeaway">CardRenderer routes each typed card to its own component. Not every update needs all six types.</div>
  </>;
}

function Architecture() {
  return <>
    <div className="slide-title"><span>TECHNICAL ARCHITECTURE / DATA FLOW</span><h2>Local processing. Shared report state.</h2><p>React + TypeScript connect capture, human review, composition, persistence, and export.</p></div>
    <div className="architecture-browser"><span className="architecture-boundary">BROWSER APPLICATION <small>No model call in the inspected generation paths</small></span><div className="architecture-stages">{[
      { Icon: FileInput, title: '1. Capture', body: 'Notes · KPI inputs · Images', code: 'ChatComposer' },
      { Icon: ScanLine, title: '2. Review', body: 'Classify → inspect → confirm', code: 'classifyPassages / cardsFromFindings' },
      { Icon: Layers3, title: '3. Compose', body: 'Edit · Readiness · Compare', code: 'ReportProject / ReportCanvas' },
      { Icon: Send, title: '4. Format', body: 'Email · Chat · Files · Print', code: 'ExportModal / formatters' },
    ].map(({ Icon, title, body, code }, index) => <div key={title}><Icon size={34} strokeWidth={1.5} /><h3>{title}</h3><p>{body}</p><code>{code}</code>{index < 3 && <ArrowRight className="architecture-arrow" size={25} />}</div>)}</div><div className="architecture-state"><strong>Shared state & persistence</strong><span>Zod validation for stored / imported data</span><span>Project library + snapshots</span><span>localStorage</span></div></div>
    <div className="architecture-details"><div><b>EDIT-PRESERVING REFRESH</b><p>Initial build parses source notes.<br />Later refresh retains reviewed narrative.</p></div><div><b>REVIEWED FINDINGS PATH</b><p>prepareReviewedUpdate → mergeReviewedCards<br />→ synchronized KPIs + source-linked cards</p></div><div><b>EXPLICIT OUTBOUND BOUNDARY</b><p>Local downloads use current report cards.<br />External delivery needs separate verification.</p></div></div>
    <div className="slide-takeaway">Rules structure the input; the project lead remains responsible for the final interpretation and commitments.</div>
  </>;
}

function Metrics() {
  return <>
    <div className="slide-title"><span>POC VALIDATION / PROPOSED ACCEPTANCE CRITERIA</span><h2>Measure reporting value. Not just features.</h2><p>The workflow is implemented. These pilot targets still need real-user validation.</p></div>
    <div className="metrics-table" role="table" aria-label="Proposed POC acceptance targets"><div className="metrics-table-header" role="row"><span role="columnheader">SUCCESS MEASURE</span><span role="columnheader">PROPOSED TARGET</span><span role="columnheader">HOW TO EVALUATE</span></div>{[
      ['Time to first reviewed brief', 'Median < 5 min', 'Time the same source-material task in the current workflow and in the builder.'],
      ['Critical-fact preservation', '100% of audit set', 'Audit predefined values, blockers, dates, and ownership against the original notes.'],
      ['Stakeholder clarity', 'At least 4 / 5', 'Ask readers to identify progress, the key risk, and the next action.'],
    ].map(([measure, target, method]) => <div role="row" key={measure}><strong role="cell">{measure}</strong><b role="cell">{target}</b><p role="cell">{method}</p></div>)}</div>
    <div className="pilot-plan"><div><span>PROPOSED PILOT</span><h3>5 project leads.<br />2 reporting cycles.</h3></div><p>Use the same inputs for both workflows.<br />Record task time, factual corrections, and reader ratings.<br />Establish the baseline before judging improvement.</p><span className="unmeasured-stamp">TARGETS, NOT<br /><strong>MEASURED RESULTS</strong></span></div>
    <div className="slide-takeaway">Go / no-go: faster preparation is valuable only if critical details and decision clarity are preserved.</div>
  </>;
}

function Roadmap() {
  return <>
    <div className="slide-title"><span>CURRENT CONSTRAINTS / NEXT PHASES</span><h2>A focused POC. A practical path forward.</h2><p>Prove the individual reporting experience before investing in team-scale infrastructure.</p></div>
    <div className="roadmap-columns">{[
      { phase: '01 / NOW', title: 'Reliable demo journey', status: 'IMPLEMENTED & REHEARSED', items: ['Non-destructive fictional demo project', 'Corrections survive refresh and reload', 'Current-value comparison and exports'] },
      { phase: '02 / NEXT', title: 'Validate with people', status: 'PROPOSED', items: ['Run a narrated five-minute rehearsal', 'Measure time, corrections, and clarity', 'Expand browser and language coverage'] },
      { phase: '03 / LATER', title: 'Team foundations', status: 'SUBJECT TO PILOT FINDINGS', items: ['Shared persistence and access control', 'Secure integration configuration', 'Durable scheduling and delivery proof'] },
    ].map((phase) => <div key={phase.phase}><span>{phase.phase}</span><h3>{phase.title}</h3><small>{phase.status}</small><ul>{phase.items.map((item) => <li key={item}><Check size={17} />{item}</li>)}</ul></div>)}</div>
    <div className="roadmap-constraints"><b>CURRENT BOUNDARIES</b><p><strong>Browser-local data</strong>Storage can be cleared; no cloud sync.</p><p><strong>Rule-based interpretation</strong>Language and ambiguity need human review.</p><p><strong>Session-bound scheduling</strong>The browser must stay active.</p></div>
    <div className="roadmap-decision"><p><span>THE NEXT DECISION</span>Can project leads produce clearer reports with less assembly?</p><a href="/">Try the original workspace <ArrowUpRight size={21} /></a></div>
  </>;
}
