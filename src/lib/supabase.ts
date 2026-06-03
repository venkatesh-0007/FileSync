import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nmgcvestghgngctfaais.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_bd05OPyPGzt1HL9RVA0x8g_TZx35H1O';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
