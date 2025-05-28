import { createClient } from "@supabase/supabase-js";

// Use process.env for Node.js compatibility, fallback to import.meta.env for Vite
const supabaseUrl = (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : import.meta.env.VITE_SUPABASE_URL) as string;
const supabaseAnonKey = (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : import.meta.env.VITE_SUPABASE_ANON_KEY) as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const fetchProjectTickets = async (projectId: string) => {
  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
};
