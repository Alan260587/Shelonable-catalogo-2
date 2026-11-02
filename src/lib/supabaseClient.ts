import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getEnvVar(name: string): string {
  // 1. Read from Vite's import.meta.env in browser/bundler context
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name]) {
      return String(import.meta.env[name]).trim();
    }
  } catch {
    // Ignore if import.meta is unavailable
  }

  // 2. Fallback to process.env if running in Node/SSR context
  try {
    if (typeof process !== 'undefined' && process.env && process.env[name]) {
      return String(process.env[name]).trim();
    }
  } catch {
    // Ignore if process is unavailable
  }

  return '';
}

const DEFAULT_SUPABASE_URL = 'https://hlngbrnoimfawrdiciam.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsbmdicm5vaW1mYXdyZGljaWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1ODk2NTgsImV4cCI6MjEwOTE2NTY1OH0.SHrFdF8BuZDVrw21gtI6nBB6lqmUUvw4KS3fK4Kv_-k';

function isValidSupabaseUrl(url: string): boolean {
  if (!url) return false;
  const normalized = url.trim().replace(/\.+$/, '').toLowerCase();
  if (
    normalized === 'my_supabase_url' ||
    normalized === 'your_supabase_url' ||
    normalized === 'https://tu-proyecto.supabase.co' ||
    normalized === 'https://xyzcompany.supabase.co'
  ) {
    return false;
  }
  return normalized.startsWith('https://') || normalized.startsWith('http://');
}

function isValidAnonKey(key: string): boolean {
  if (!key) return false;
  if (key === 'MY_SUPABASE_ANON_KEY' || key === 'YOUR_SUPABASE_ANON_KEY') return false;
  // Never allow service_role or secret keys in the frontend client
  const lower = key.toLowerCase();
  if (lower.includes('service_role') || lower.startsWith('sb_secret_')) return false;
  return key.length > 20;
}

const envSupabaseUrl = getEnvVar('VITE_SUPABASE_URL').trim().replace(/\.+$/, '');
const envSupabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY').trim();

// Prioritize VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables; only use fallback if missing
const rawSupabaseUrl = isValidSupabaseUrl(envSupabaseUrl)
  ? envSupabaseUrl
  : DEFAULT_SUPABASE_URL;
const rawSupabaseAnonKey = isValidAnonKey(envSupabaseAnonKey)
  ? envSupabaseAnonKey
  : DEFAULT_SUPABASE_ANON_KEY;

export const supabaseProjectUrl: string = rawSupabaseUrl;

export const isSupabaseConfigured: boolean =
  isValidSupabaseUrl(rawSupabaseUrl) && isValidAnonKey(rawSupabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(rawSupabaseUrl, rawSupabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

