// Vignettes d'images enregistrées dans les dispositions (widget « browse ») :
// une vignette, pas l'image entière. Une image de 6 Mo encodée en base64
// alourdissait le document du projet, relu à chaque action de widget.

export const THUMB_MAX_SIDE = 480;
// Au-delà, la vignette est réduite (environ 300 Ko d'image d'origine).
export const THUMB_MAX_DATA_URL_LENGTH = 400_000;

export function isOversizedThumb(dataUrl) {
  return typeof dataUrl === 'string'
    && dataUrl.startsWith('data:image/')
    && dataUrl.length > THUMB_MAX_DATA_URL_LENGTH;
}

export function fitWithin(width, height, maxSide = THUMB_MAX_SIDE) {
  const w = Math.max(1, Math.round(Number(width) || 1));
  const h = Math.max(1, Math.round(Number(height) || 1));
  const scale = Math.min(1, maxSide / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

// Réduit une image (data URL) à THUMB_MAX_SIDE pixels de côté, en WebP
// (transparence conservée). En cas d'échec, l'image d'origine est rendue.
export function shrinkImageDataUrl(dataUrl, maxSide = THUMB_MAX_SIDE) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return Promise.resolve(dataUrl);
  if (typeof document === 'undefined' || typeof Image === 'undefined') return Promise.resolve(dataUrl);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, maxSide);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        const out = canvas.toDataURL('image/webp', 0.85);
        resolve(out && out.length < dataUrl.length ? out : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
