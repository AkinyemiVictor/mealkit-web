"use client";

import { createClient } from "@supabase/supabase-js";

let cachedClient = null;

export function getSupabaseClient() {
  if (cachedClient) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.warn("Supabase env not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    return null;
  }
  cachedClient = createClient(url, anon);
  return cachedClient;
}

export default getSupabaseClient;

