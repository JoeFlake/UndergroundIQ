import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const supabaseUrl = "https://kvlfpyfvifspllbtafnj.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2bGZweWZ2aWZzcGxsYnRhZm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE5NjczNTksImV4cCI6MjA1NzU0MzM1OX0.Kjo7ersYhaPxFCIbYP2YVaSNGhCso3aMvnh50nIfwiM";

// Client-side Supabase client (for components)
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

// Next.js client component helper
export const createClientComponent = () => createClientComponentClient();

// Next.js server component helper
export const createServerClient = () => createServerComponentClient({ cookies });

// Legacy function to maintain compatibility
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