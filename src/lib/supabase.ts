
import { createClient } from '@supabase/supabase-js';

// These should be replaced with your actual Supabase credentials
const supabaseUrl = 'https://your-supabase-url.supabase.co';
const supabaseAnonKey = 'your-supabase-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
