import { createServerClient } from "@supabase/ssr";
import { supabasePublicConfig } from "@/lib/config/supabase";

export const getSupabaseRouteClient = (cookieStore) => {
  return createServerClient(supabasePublicConfig.url, supabasePublicConfig.anonKey, {
    cookies: {
      get(name) {
        try {
          return cookieStore.get(name)?.value;
        } catch {
          return undefined;
        }
      },
      set(name, value, options) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          /* noop */
        }
      },
      remove(name, options) {
        try {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        } catch {
          /* noop */
        }
      },
    },
  });
};

export default getSupabaseRouteClient;

