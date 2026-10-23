import { useId, useState } from 'react';

export interface Box { x: number; y: number; w: number; h: number }
export interface Callout {
  title: string;
  text: string;
  target: Box;
  label: Box;
  detail: string;
}
export interface WebsiteFigure {
  image: string;
  alt: string;
  crop: Box;
  frame: Box;
  callouts: Callout[];
}

/** Screenshots and markings share a single slide coordinate system. */
export function AnnotatedWebsite({ figure, visible }: { figure: WebsiteFigure; visible: boolean }) {
  const [selected, setSelected] = useState<number | null>(null);
  const markerId = useId().replace(/:/g, '');
  const { crop } = figure;
  const fit = Math.min(1, 510 / figure.frame.h);
  const frame = { x: figure.frame.x + figure.frame.w * (1 - fit) / 2, y: 250, w: figure.frame.w * fit, h: figure.frame.h * fit };
  const callouts = figure.callouts.map((callout) => ({ ...callout, label: { ...callout.label, y: Math.min(610, Math.max(255, callout.label.y)), h: 145 } }));
  const factor = frame.w / crop.w;
  const project = (box: Box): Box => ({ x: frame.x + (box.x - crop.x) * factor, y: frame.y + (box.y - crop.y) * factor, w: box.w * factor, h: box.h * factor });

  return (
    <>
      <div className="website-stage" aria-hidden="true" />
      <svg className="website-capture" style={{ left: frame.x, top: frame.y, width: frame.w, height: frame.h }} viewBox={`${crop.x} ${crop.y} ${crop.w} ${crop.h}`} role="img" aria-label={figure.alt}>
        <image href={`/poc/${figure.image}`} width="1440" height="900" />
      </svg>
      {visible && <>
        <svg className="website-markings" viewBox="0 0 1600 900" aria-hidden="true">
          <defs><marker id={markerId} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto-start-reverse"><path d="M 0 0 L 8 4 L 0 8 z" fill="#0071e3" /></marker></defs>
          {callouts.map((callout, index) => {
            const target = project(callout.target);
            const left = callout.label.x < target.x;
            const startX = left ? target.x : target.x + target.w;
            const startY = target.y + target.h / 2;
            const endX = left ? callout.label.x + callout.label.w : callout.label.x;
            const endY = callout.label.y + 28;
            const middleX = (startX + endX) / 2;
            return <g key={callout.title} className={selected === index ? 'marking-selected' : ''}>
              <rect x={target.x} y={target.y} width={target.w} height={target.h} rx="6" className="annotation-halo" />
              <rect x={target.x} y={target.y} width={target.w} height={target.h} rx="6" className="annotation-rectangle" />
              <circle cx={startX} cy={startY} r="5" className="annotation-dot" />
              <path d={`M ${startX} ${startY} H ${middleX} V ${endY} H ${endX}`} className="annotation-connector" markerEnd={`url(#${markerId})`} />
            </g>;
          })}
        </svg>
        {callouts.map((callout, index) => <button type="button" className={`website-callout ${selected === index ? 'is-selected' : ''}`} style={{ left: callout.label.x, top: callout.label.y, width: callout.label.w, height: callout.label.h }} key={callout.title} aria-expanded={selected === index} aria-label={`${index + 1}. ${callout.title}`} title={callout.detail} onClick={() => setSelected(selected === index ? null : index)}>
          <span className="callout-heading"><b>{index + 1}</b>{callout.title}</span>{selected === index ? <span className="callout-detail">{callout.detail}</span> : <span className="callout-description">{callout.text}</span>}
        </button>)}
      </>}
    </>
  );
}
