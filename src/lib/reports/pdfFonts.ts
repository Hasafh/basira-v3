import { Font } from '@react-pdf/renderer';

let promise: Promise<void> | null = null;

function extractFontUrl(css: string, weight: number): string {
  // Match the block for this weight, then grab the first url() inside it
  const blockRe = new RegExp(
    `font-weight:\\s*${weight}[\\s\\S]*?url\\(([^)]+)\\)`,
  );
  const m = blockRe.exec(css);
  if (m) return m[1];
  throw new Error(`Tajawal weight ${weight} URL not found in Google Fonts CSS`);
}

export function ensurePdfFonts(): Promise<void> {
  if (promise) return promise;

  promise = fetch(
    'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap',
  )
    .then(r => r.text())
    .then(css => {
      Font.register({
        family: 'Tajawal',
        fonts: [
          { src: extractFontUrl(css, 400), fontWeight: 400 },
          { src: extractFontUrl(css, 700), fontWeight: 700 },
        ],
      });
    })
    .catch(err => {
      console.warn('[pdfFonts] Could not load Tajawal — PDF will use fallback font:', err);
    });

  return promise;
}
