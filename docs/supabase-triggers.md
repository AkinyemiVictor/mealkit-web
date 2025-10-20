Supabase Triggers

This project includes SQL to keep `public.users` in sync with Supabase Auth (`auth.users`).

Files
- `db/supabase/handle_auth_user_created.sql` — creates an INSERT trigger that populates `public.users` on sign-up from `auth.users` (`email` + `raw_user_meta_data`: `name`, `phone`, `address`, `city`). Ensures columns exist.
- `db/supabase/handle_auth_user_updated.sql` — creates an UPDATE trigger that syncs `email` and selected fields from `raw_user_meta_data` (`name`, `phone`, `address`, `city`). Safe to run multiple times.

Apply
1) Open the Supabase SQL editor (or connect to your Postgres DB).
2) Paste and run, in order:
   - `db/supabase/handle_auth_user_created.sql`
   - `db/supabase/handle_auth_user_updated.sql`

Prereqs
- Ensure you also have the INSERT trigger that populates `public.users` on sign-up (often named `on_auth_user_created` using `public.handle_auth_user_created`). The UPDATE trigger assumes rows already exist in `public.users`.

Notes
- The UPDATE trigger uses `coalesce(new.raw_user_meta_data->>'field', existing_value)` so it only overwrites values that are provided in the metadata payload.
- If you later add more profile fields, extend the `UPDATE` list and re-run the SQL.
