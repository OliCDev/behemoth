
import { createClient } from "@supabase/supabase-js";
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from "$env/static/public"


const supabaseUrl = PUBLIC_SUPABASE_URL;
const supabaseKey = PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to get/create a realtime channel
export function getRealtimeChannel(name: string) {
  // Optionally, you could cache channels here if you want singleton channels per name
  return supabase.channel(name);
}
