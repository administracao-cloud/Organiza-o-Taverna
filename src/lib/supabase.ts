import { createClient } from '@supabase/supabase-js';

// Fallback values directly from project config if environment variables are missing
const PROJECT_SUPABASE_URL = 'https://dxvxqkqqrqgcoaeeazzh.supabase.co';
const PROJECT_SUPABASE_ANON_KEY = 'sb_publishable_cGDWUhw-Mae1vr_kFVlR-g_gCptL1AY';

const metaEnv = (import.meta as any).env || {};
const procEnv = typeof process !== 'undefined' ? process.env : {};

// Priority: Vite Env > Process Env > Hardcoded Project Fallback
const rawUrl = (
  metaEnv.VITE_SUPABASE_URL || 
  procEnv.SUPABASE_URL || 
  PROJECT_SUPABASE_URL
).trim();

export const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

export const supabaseAnonKey = (
  metaEnv.VITE_SUPABASE_ANON_KEY || 
  procEnv.SUPABASE_ANON_KEY || 
  PROJECT_SUPABASE_ANON_KEY
).trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});
