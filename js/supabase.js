import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const IMAGE_BUCKET = 'product-images';

export const isConfigured = !SUPABASE_URL.includes('SEU-PROJETO') && !SUPABASE_ANON_KEY.includes('COLE-AQUI');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** URL pública de uma foto guardada no Storage. */
export function imageUrl(path) {
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}
