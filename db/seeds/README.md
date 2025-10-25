Seed scripts go here for local development or initial provisioning.

Guidance
- Keep seed scripts out of CI/CD and production deploy steps.
- Run seeds only on empty/non‑production databases to avoid data conflicts.
- Prefer idempotent patterns (upsert on natural keys) if you must re‑run.

Example usage
-- psql $SUPABASE_DB_DIRECT_URL -f db/seeds/seed_products.sql

Note: This project currently has no active seed SQL files. Use this folder if you add any in the future.

