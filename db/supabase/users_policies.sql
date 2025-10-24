-- RLS policies for public.users (created by trigger on auth.users)
-- Allows each authenticated user to read/update only their own row.

alter table if exists public.users enable row level security;

-- SELECT own row
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'users' and policyname = 'users_self_select'
  ) then
    create policy users_self_select on public.users
      for select using (auth.uid() = id);
  end if;
end $$;

-- UPDATE own row
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'users' and policyname = 'users_self_update'
  ) then
    create policy users_self_update on public.users
      for update using (auth.uid() = id) with check (auth.uid() = id);
  end if;
end $$;

-- INSERT is handled by trigger from auth.users; no direct inserts from client.

