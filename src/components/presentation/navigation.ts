export const SLIDES = [
  { id: 'overview', label: 'Vision & user story', chapter: 'The concept' },
  { id: 'workspace', label: 'Website overview', chapter: 'Website · UI / UX walkthrough' },
  { id: 'library', label: 'Project library', chapter: 'Website · Organize' },
  { id: 'capture', label: 'Capture & review', chapter: 'Website · Input workflow' },
  { id: 'cards', label: 'Report components', chapter: 'Website · Component inventory' },
  { id: 'source', label: 'Source traceability', chapter: 'Website · Review with context' },
  { id: 'readiness', label: 'Readiness checks', chapter: 'Website · Quality review' },
  { id: 'snapshots', label: 'Snapshots & comparison', chapter: 'Website · Track change' },
  { id: 'export', label: 'Export & sharing', chapter: 'Website · Deliver the brief' },
  { id: 'architecture', label: 'Technical architecture', chapter: 'System · Data flow' },
  { id: 'metrics', label: 'POC success criteria', chapter: 'Validation · Measure the value' },
  { id: 'roadmap', label: 'Constraints & roadmap', chapter: 'Next steps · Pilot proposal' },
] as const;

export function navigateSlide(current: number, delta: number): number {
  return Math.max(0, Math.min(SLIDES.length - 1, current + delta));
}

export function parseSlideHash(hash: string): number {
  const index = SLIDES.findIndex((slide) => `#${slide.id}` === hash);
  return index < 0 ? 0 : index;
}

interface PresentationKey {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  defaultPrevented?: boolean;
}

export function slideForKey(event: PresentationKey, current: number, interactive = false): number | null {
  if (interactive || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) return navigateSlide(current, 1);
  if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) return navigateSlide(current, -1);
  if (event.key === 'Home') return 0;
  if (event.key === 'End') return SLIDES.length - 1;
  return null;
}
