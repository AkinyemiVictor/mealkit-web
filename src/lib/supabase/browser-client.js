import { createClient } from "@supabase/supabase-js";
import { supabasePublicConfig } from "@/lib/config/supabase";

let browserClient = null;

export const getBrowserSupabaseClient = () => {
  if (typeof window === "undefined") {
    throw new Error("getBrowserSupabaseClient can only be used in the browser.");
  }

  if (browserClient) {
    return browserClient;
  }

  browserClient = createClient(supabasePublicConfig.url, supabasePublicConfig.anonKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
};

