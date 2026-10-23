import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import PptxGenJS from 'pptxgenjs';
import JSZip from 'jszip';
import { SLIDES } from '../src/components/presentation/navigation';
import { WEBSITE_SLIDES } from '../src/components/presentation/websiteSlides';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = fileURLToPath(new URL('../public/poc/project-reporting-builder-poc.pptx', import.meta.url));
const temporary = `${output}.tmp`;
const server = await createServer({ root, server: { host: '127.0.0.1', port: 0, hmr: false, watch: null }, logLevel: 'error' });
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let generationFailed = false;

async function withDeadline<T>(operation: () => Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after 30 seconds.`)), 30_000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

try {
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Could not start the slide capture server.');
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1, colorScheme: 'light', reducedMotion: 'reduce', locale: 'en-US' });
  page.setDefaultTimeout(30_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${address.port}/poc#overview`);
  await page.addStyleTag({ content: `
    .deck-controls, .deck-skip { display: none !important; }
    .deck-viewport { padding: 0 !important; flex: none !important; width: 1600px !important; height: 900px !important; }
    .deck-fit { width: 1600px !important; height: 900px !important; box-shadow: none !important; }
    .keynote-slide { transform: none !important; animation: none !important; }
    .keynote-slide :focus { outline: none !important; }
  ` });
  await page.mouse.move(1599, 999);

  const deck = new PptxGenJS();
  deck.layout = 'LAYOUT_WIDE';
  deck.author = 'Project Reporting Builder';
  deck.subject = 'Twelve-slide proof of concept with annotated original website screenshots';
  deck.title = 'Project Reporting Builder — POC';
  deck.company = 'Project Reporting Builder';

  for (const [index, metadata] of SLIDES.entries()) {
    await page.evaluate((id) => { window.location.hash = id; }, metadata.id);
    const stage = page.locator('.keynote-slide');
    await page.getByRole('heading', { level: 1, name: metadata.label, exact: true }).waitFor();
    await withDeadline(() => page.evaluate(async () => {
      await document.fonts.ready;
      const sources = [...document.querySelectorAll('.keynote-slide img, .keynote-slide svg image')].map((element) => element.getAttribute('src') ?? element.getAttribute('href'));
      await Promise.all(sources.map(async (source) => {
        if (!source) throw new Error('Slide image has no source.');
        const image = new Image();
        image.src = source;
        await image.decode();
      }));
    }), `Loading assets for ${metadata.id}`);
    const bounds = await stage.boundingBox();
    if (!bounds || bounds.width !== 1600 || bounds.height !== 900) throw new Error(`Unexpected capture dimensions for ${metadata.id}.`);
    const image = await stage.screenshot({ animations: 'disabled', type: 'png' });
    if (image.length > 8_000_000) throw new Error(`Slide ${metadata.id} exceeds the image budget.`);
    const slide = deck.addSlide();
    slide.addImage({ data: `image/png;base64,${image.toString('base64')}`, x: 0, y: 0, w: 13.333333, h: 7.5, altText: `${index + 1}. ${metadata.label}` });
    const text = await stage.innerText();
    const details = WEBSITE_SLIDES[metadata.id]?.figure.callouts.map((callout) => `${callout.title}: ${callout.detail}`).join('\n\n');
    slide.addNotes(`Image-based slide: artwork preserves the website deck layout and is not individually editable.\n\n${metadata.label}\n\n${text}${details ? `\n\nCOMPONENT CONTEXT\n${details}` : ''}`);
  }

  if (errors.length) throw new Error(`Slide capture reported browser errors: ${errors.join('; ')}`);
  const bytes = await deck.write({ outputType: 'nodebuffer', compression: true });
  await writeFile(temporary, bytes as Buffer);
  const zip = await JSZip.loadAsync(await readFile(temporary));
  const count = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name)).length;
  if (count !== SLIDES.length) throw new Error(`PowerPoint validation failed: expected ${SLIDES.length} slides, got ${count}.`);
  await rename(temporary, output);
  process.stdout.write(`Exported ${SLIDES.length} slides to public/poc/project-reporting-builder-poc.pptx\n`);
} catch (error) {
  generationFailed = true;
  throw error;
} finally {
  const cleanup = await Promise.allSettled([
    withDeadline(async () => { await browser?.close(); }, 'Closing Chromium'),
    withDeadline(() => server.close(), 'Closing capture server'),
    rm(temporary, { force: true }),
  ]);
  const failures = cleanup.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
  if (failures.length) {
    if (generationFailed) process.stderr.write(`Export cleanup incomplete: ${failures.map((failure) => String(failure.reason)).join('; ')}\n`);
    else throw new AggregateError(failures.map((failure) => failure.reason), 'PowerPoint export cleanup failed.');
  }
}
