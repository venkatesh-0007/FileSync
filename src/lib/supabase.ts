import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('placeholder.supabase.co') &&
  supabaseAnonKey !== 'placeholder'
);

if (!isSupabaseConfigured) {
  console.warn(
    'Warning: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or invalid. Please configure these in your Vercel Project Settings (Environment Variables) or local .env.local file, and redeploy.'
  );
}

// Export client with env vars, falling back to dummy values during offline build / linting
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

