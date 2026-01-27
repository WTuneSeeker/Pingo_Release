import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://crffhptmhupyestaxufk.supabase.co'; // Vind je in Supabase > Settings > API
const supabaseAnonKey = 'sb_publishable_qw1dnQNnMCnC6B_nACPKXg_-GUOXpm2'; // Vind je daar ook

export const supabase = createClient(supabaseUrl, supabaseAnonKey);