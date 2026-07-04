import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isMockMode = 
  !supabaseUrl || 
  !supabaseAnonKey || 
  supabaseUrl.includes('placeholder.supabase.co') || 
  supabaseAnonKey.includes('placeholder-key');

const actualUrl = supabaseUrl || 'https://placeholder.supabase.co';
const actualKey = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient(actualUrl, actualKey);

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: 'staff' | 'admin';
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id, email, display_name, role')
    .eq('id', session.user.id)
    .single();

  return (data as Profile) ?? null;
}
