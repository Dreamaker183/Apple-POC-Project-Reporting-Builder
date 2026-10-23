import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Expand, Grid2X2, Highlighter, Minimize2, X } from 'lucide-react';
import { SLIDES, parseSlideHash, slideForKey } from './navigation';
import { SlideContent } from './SlideContent';
import './presentation.css';

const WIDTH = 1600;
const HEIGHT = 900;

export default function PocPresentation() {
  const [active, setActive] = useState(() => parseSlideHash(window.location.hash));
  const [scale, setScale] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [overview, setOverview] = useState(false);
  const [annotations, setAnnotations] = useState(true);
  const [notice, setNotice] = useState('');
  const viewport = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const chooser = useRef<HTMLDialogElement>(null);
  const picker = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!overview) return;
    chooser.current?.showModal();
    return () => {
      chooser.current?.close();
      picker.current?.focus({ preventScroll: true });
    };
  }, [overview]);

  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= SLIDES.length) return;
    setActive(index);
    setOverview(false);
    if (window.location.hash !== `#${SLIDES[index].id}`) window.history.pushState(null, '', `#${SLIDES[index].id}`);
  }, []);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(entry.contentRect.width / WIDTH, entry.contentRect.height / HEIGHT));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const previous = document.title;
    document.title = 'Project Reporting Builder — POC Presentation';
    const syncHash = () => { setActive(parseSlideHash(window.location.hash)); setOverview(false); };
    const syncFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    window.addEventListener('hashchange', syncHash);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => {
      document.title = previous;
      window.removeEventListener('hashchange', syncHash);
      document.removeEventListener('fullscreenchange', syncFullscreen);
    };
  }, []);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [active]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && overview) { setOverview(false); return; }
      if (overview) return;
      const interactive = event.target instanceof Element && Boolean(event.target.closest('button, a, input, textarea, select, [contenteditable="true"]'));
      const next = slideForKey(event, active, interactive);
      if (next !== null) { event.preventDefault(); goTo(next); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, goTo, overview]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else setNotice('Use your browser’s full-screen command to present.');
    } catch { setNotice('Full screen is unavailable in this window.'); }
  };

  return (
    <div className="keynote-player">
      <a className="deck-skip" href="#slide" onClick={(event) => { event.preventDefault(); heading.current?.focus(); }}>Skip to slide</a>
      <div className="deck-viewport" ref={viewport}>
        <main className="deck-fit" style={{ width: WIDTH * scale, height: HEIGHT * scale }} aria-label="POC slide presentation">
          <section key={SLIDES[active].id} id="slide" className="keynote-slide" aria-label={`Slide ${active + 1}: ${SLIDES[active].label}`} style={{ transform: `scale(${scale})` }}>
            <header className="slide-heading"><span className="slide-chapter"><i />{SLIDES[active].chapter}</span><span className="slide-meta"><span className="slide-progress" aria-hidden="true">{SLIDES.map((slide, index) => <em key={slide.id} className={index === active ? 'is-active' : index < active ? 'is-done' : undefined} />)}</span>PROJECT REPORTING BUILDER · PROOF OF CONCEPT</span></header>
            <h1 ref={heading} tabIndex={-1} className="sr-only">{SLIDES[active].label}</h1>
            <SlideContent id={SLIDES[active].id} annotations={annotations} />
            <footer className="slide-footer"><span>Project Reporting Builder · POC / 2026<b>{String(active + 1).padStart(2, '0')}</b></span></footer>
          </section>
        </main>
      </div>
      <nav className="deck-controls" aria-label="Presentation controls">
        <div className="deck-controls-start"><a href="/" className="deck-workspace">Open workspace ↗</a><a href="/poc/project-reporting-builder-poc.pptx" download="project-reporting-builder-poc.pptx" className="deck-download" aria-label="Download PowerPoint" title="Download all 12 slides as an image-based PowerPoint with speaker notes"><Download size={16} /><span>Download PowerPoint</span></a></div>
        <div className="deck-controls-center"><button type="button" aria-label="Previous slide" disabled={active === 0} onClick={() => goTo(active - 1)}><ChevronLeft size={19} /></button>
          <button ref={picker} type="button" className="deck-slide-picker" aria-label="Choose a slide" aria-expanded={overview} onClick={() => setOverview(!overview)}><Grid2X2 size={15} /><span aria-live="polite">{String(active + 1).padStart(2, '0')} / 12</span></button>
          <button type="button" aria-label="Next slide" disabled={active === SLIDES.length - 1} onClick={() => goTo(active + 1)}><ChevronRight size={19} /></button>
        </div>
        <div className="deck-controls-end"><button type="button" aria-label="Show website annotations" aria-pressed={annotations} title="Toggle website annotations" onClick={() => setAnnotations(!annotations)}><Highlighter size={17} /></button><button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'}>{fullscreen ? <Minimize2 size={17} /> : <Expand size={17} />}</button></div>
      </nav>
      {overview && <dialog ref={chooser} className="deck-index" aria-label="Choose a slide" onCancel={() => setOverview(false)}><div className="deck-index-heading"><span>THE PRESENTATION <small>12 slides · 16:9</small></span><button type="button" aria-label="Close slide chooser" onClick={() => setOverview(false)} autoFocus><X size={18} /></button></div><div className="deck-index-grid">{SLIDES.map((slide, index) => <button type="button" key={slide.id} aria-current={index === active ? 'step' : undefined} onClick={() => goTo(index)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{slide.label}</strong><small>{slide.chapter}</small></button>)}</div></dialog>}
      {notice && <div className="deck-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')}>Dismiss</button></div>}
    </div>
  );
}
