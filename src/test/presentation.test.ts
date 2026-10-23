import { describe, expect, it } from 'vitest';
import { navigateSlide, parseSlideHash, slideForKey, SLIDES } from '../components/presentation/navigation';

describe('POC presentation navigation', () => {
  it('bounds navigation at the first and last slides', () => {
    expect(navigateSlide(0, -1)).toBe(0);
    expect(navigateSlide(11, 1)).toBe(11);
    expect(navigateSlide(2, 1)).toBe(3);
    expect(navigateSlide(2, -1)).toBe(1);
  });

  it.each(SLIDES.map((slide, index) => [slide.id, index] as const))('restores the %s slide from its URL', (id, index) => {
    expect(parseSlideHash(`#${id}`)).toBe(index);
  });

  it.each(['', '#unknown', '#2abc', '#-1', '#1.5'])('falls back safely for %s', (hash) => {
    expect(parseSlideHash(hash)).toBe(0);
  });

  it.each([
    ['ArrowRight', 3], ['ArrowDown', 3], ['PageDown', 3], [' ', 3],
    ['ArrowLeft', 1], ['ArrowUp', 1], ['PageUp', 1], ['Home', 0], ['End', 11],
  ])('maps %s to the expected slide', (key, expected) => {
    expect(slideForKey({ key: key as string }, 2)).toBe(expected);
  });

  it('leaves interactive controls and modified keypresses alone', () => {
    for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey', 'defaultPrevented']) {
      expect(slideForKey({ key: 'ArrowRight', [modifier]: true }, 2)).toBeNull();
    }
    expect(slideForKey({ key: 'ArrowRight' }, 2, true)).toBeNull();
    expect(slideForKey({ key: 'Enter' }, 2)).toBeNull();
  });

  it('provides twelve distinct presentation slides with original website introductions', () => {
    expect(SLIDES).toHaveLength(12);
    expect(new Set(SLIDES.map((slide) => slide.id)).size).toBe(12);
    expect(SLIDES.map((slide) => slide.id)).toEqual([
      'overview', 'workspace', 'library', 'capture', 'cards', 'source',
      'readiness', 'snapshots', 'export', 'architecture', 'metrics', 'roadmap',
    ]);
  });
});
