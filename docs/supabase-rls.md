Row-Level Security (RLS)

This project reads/writes rows tied to a user (e.g., cart_items, public.users). RLS enforces ownership at the database layer.

Files
- db/supabase/cart_items_policies.sql — Enables RLS on public.cart_items and adds owner-only SELECT/INSERT/UPDATE/DELETE.
- db/supabase/users_policies.sql — Enables RLS on public.users and allows each user to SELECT/UPDATE only their own row.

Apply
1) Open Supabase SQL editor.
2) Run db/supabase/users_policies.sql
3) Run db/supabase/cart_items_policies.sql

Notes
- Service role (used by server-only code) bypasses RLS by design. We still explicitly scope by user_id in API routes.
- Anonymous or client-bound queries must include a valid user session (supabase-js) so auth.uid() resolves to the current user.
- Ensure public.cart_items has a user_id uuid referencing auth.users(id).

