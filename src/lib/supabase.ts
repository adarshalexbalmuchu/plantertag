import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables are missing. Please verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
