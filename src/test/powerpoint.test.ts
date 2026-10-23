import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { SLIDES } from '../components/presentation/navigation';

describe('Downloadable PowerPoint artifact', () => {
  it('contains twelve widescreen slides with embedded PNG artwork and speaker notes', async () => {
    const bytes = await readFile(new URL('../../public/poc/project-reporting-builder-poc.pptx', import.meta.url));
    const zip = await JSZip.loadAsync(bytes);
    const slides = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    expect(slides).toHaveLength(12);
    const presentation = await zip.file('ppt/presentation.xml')!.async('string');
    expect(presentation).toContain('cx="12192000" cy="6858000"');
    for (const [index, slide] of SLIDES.entries()) {
      const xml = await zip.file(`ppt/slides/slide${index + 1}.xml`)!.async('string');
      expect(xml.match(/<p:pic>/g)).toHaveLength(1);
      expect(xml).not.toContain('r:link=');
      const notes = await zip.file(`ppt/notesSlides/notesSlide${index + 1}.xml`)!.async('string');
      expect(notes).toContain(slide.label.replaceAll('&', '&amp;'));
      expect(notes).toContain('Image-based slide');
    }
    const media = Object.keys(zip.files).filter((name) => /^ppt\/media\/.*\.png$/.test(name));
    expect(media).toHaveLength(12);
    for (const path of media) {
      const image = await zip.file(path)!.async('nodebuffer');
      expect(image.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect([image.readUInt32BE(16), image.readUInt32BE(20)]).toEqual([1600, 900]);
    }
    const overviewNotes = await zip.file('ppt/notesSlides/notesSlide1.xml')!.async('string');
    expect(overviewNotes).toContain('OPTIMISED DEMO');
    const captureNotes = await zip.file('ppt/notesSlides/notesSlide4.xml')!.async('string');
    expect(captureNotes).toContain('stores notes only');
    const readinessNotes = await zip.file('ppt/notesSlides/notesSlide7.xml')!.async('string');
    expect(readinessNotes).toContain('93%');
    expect(readinessNotes).not.toContain('demo defaults');
  });
});
