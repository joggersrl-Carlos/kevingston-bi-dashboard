// === js/supabase.js ===
const SUPABASE_URL = 'https://sooutfkhgoofczdrjqis.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JKRgvgMKXSRKEw05wC2uNA_SD30xl0V';

export const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

if (!supabase) {
    console.error('[KBI] Supabase SDK not found. Make sure to include it in index.html');
} else {
    console.log('[KBI] Supabase client initialized.');
}
