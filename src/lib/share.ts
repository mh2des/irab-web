/**
 * share.ts — turn a result card into a shareable PNG (Arabic/RTL + the custom
 * Uthmanic/Aref-Ruqaa fonts render CORRECTLY via snapdom's foreignObject
 * pipeline), then share it through the native share sheet (mobile) or download
 * it, and export a matching PDF (the PNG placed into a page so Arabic stays
 * pixel-perfect). snapdom + jsPDF are dynamically imported inside each function,
 * so they never ship in the page bundle until a user actually shares.
 */

const SCALE = 2.5; // retina-crisp; keeps tashkeel + Ruqaa swashes sharp
const ARABIC_SAMPLE = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ الإعراب ٢:٢٥٥';
const FONT_FACES = ['"Uthmanic Hafs"', '"Aref Ruqaa"', '"The Year of Handicrafts"'];

/** Decode the Arabic faces before rasterizing — the #1 cause of "Arabic broken
 *  in the screenshot" is capturing before the woff2 has loaded. */
async function ensureFonts(): Promise<void> {
  try {
    const fonts = (document as any).fonts;
    if (!fonts) return;
    await fonts.ready;
    await Promise.all(
      FONT_FACES.flatMap((f) => [
        fonts.load(`400 64px ${f}`, ARABIC_SAMPLE).catch(() => {}),
        fonts.load(`700 48px ${f}`, ARABIC_SAMPLE).catch(() => {}),
      ]),
    );
  } catch { /* ignore — embedFonts will still try */ }
}

function bgColor(): string {
  return document.documentElement.classList.contains('dark') ? '#0B1115' : '#F8F6F1';
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ShareOpts { filename?: string; title?: string; text?: string; }

/** Capture an element to a PNG Blob (Arabic + custom fonts embedded). */
export async function captureBlob(el: HTMLElement): Promise<Blob> {
  await ensureFonts();
  const { snapdom } = await import('@zumer/snapdom');
  return snapdom.toBlob(el, { scale: SCALE, embedFonts: true, type: 'png', backgroundColor: bgColor() });
}

/** Share the element as an image via the native sheet; fall back to download. */
export async function shareImage(el: HTMLElement, opts: ShareOpts = {}): Promise<void> {
  const filename = opts.filename ?? 'irab.png';
  const blob = await captureBlob(el);
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as any;
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: opts.title, text: opts.text });
      return;
    } catch (e: any) {
      if (e?.name === 'AbortError') return; // user dismissed the sheet — not an error
      // any other failure → fall through to download
    }
  }
  downloadBlob(blob, filename);
}

/** Download the element as a PDF (the captured PNG on a page; Arabic = pixels). */
export async function downloadPdf(el: HTMLElement, filename = 'irab.pdf'): Promise<void> {
  await ensureFonts();
  const { snapdom } = await import('@zumer/snapdom');
  const canvas = await snapdom.toCanvas(el, { scale: SCALE, embedFonts: true, backgroundColor: bgColor() });
  const dataUrl = canvas.toDataURL('image/png');
  const w = canvas.width;
  const h = canvas.height;
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'px', format: [w, h], orientation: w > h ? 'landscape' : 'portrait' });
  pdf.addImage(dataUrl, 'PNG', 0, 0, w, h);
  pdf.save(filename);
}
