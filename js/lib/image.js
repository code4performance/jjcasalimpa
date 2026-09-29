export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_SIDE = 1200;

export function isAllowedImage(file) {
  return !!file && ALLOWED_IMAGE_TYPES.includes(file.type);
}

/** Dimensões finais mantendo a proporção, com o maior lado limitado a `max`. */
export function fitWithin(width, height, max = MAX_IMAGE_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Reduz a foto no navegador e converte para WebP (ou JPEG se o navegador
 * não gerar WebP). Retorna { blob, ext, contentType }.
 */
export async function resizeImage(file, max = MAX_IMAGE_SIDE) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { width, height } = fitWithin(bitmap.width, bitmap.height, max);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  // Fundo branco para PNGs com transparência não ficarem pretos no JPEG.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  let blob = await canvasToBlob(canvas, 'image/webp', 0.8);
  if (blob && blob.type === 'image/webp') return { blob, ext: 'webp', contentType: 'image/webp' };
  blob = await canvasToBlob(canvas, 'image/jpeg', 0.82);
  if (!blob) throw new Error('Não foi possível processar a imagem');
  return { blob, ext: 'jpg', contentType: 'image/jpeg' };
}
