const isBrowser = typeof window !== "undefined";

const ensureEnv = (key) => {
  const value = process.env[key];
  if (!value || value.length === 0) {
    throw new Error(`Required environment variable "${key}" is missing.`);
  }
  return value;
};

export const supabasePublicConfig = Object.freeze({
  url: ensureEnv("NEXT_PUBLIC_SUPABASE_URL"),
  anonKey: ensureEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
});

let cachedServerConfig = null;

export const getSupabaseServerConfig = () => {
  if (isBrowser) {
    throw new Error("getSupabaseServerConfig can only be used on the server.");
  }

  if (cachedServerConfig) {
    return cachedServerConfig;
  }

  cachedServerConfig = Object.freeze({
    serviceRoleKey: ensureEnv("SUPABASE_SERVICE_ROLE_KEY"),
    db: Object.freeze({
      poolerUrl: ensureEnv("SUPABASE_DB_POOLER_URL"),
      directUrl: ensureEnv("SUPABASE_DB_DIRECT_URL"),
    }),
  });

  return cachedServerConfig;
};

