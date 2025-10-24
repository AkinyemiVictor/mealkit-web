-- Admin RPCs for role assignment and user deactivation
-- These are simple helpers that store state in application-owned tables.
-- They are intended to be called from server-side routes with the service role key.

-- Roles storage
create table if not exists public.user_roles (
  user_id uuid primary key,
  role text not null,
  assigned_at timestamptz not null default now()
);

alter table if exists public.user_roles enable row level security;
-- No public policies by default. Access via service role or RPC only.

create or replace function public.assign_role(user_id uuid, role_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if user_id is null or coalesce(trim(role_name), '') = '' then
    raise exception 'user_id and role_name are required';
  end if;
  insert into public.user_roles (user_id, role)
  values (assign_role.user_id, trim(role_name))
  on conflict (user_id) do update
    set role = excluded.role,
        assigned_at = now();
end;
$$;

-- Deactivation storage
create table if not exists public.user_status (
  user_id uuid primary key,
  active boolean not null default true,
  deactivated_at timestamptz
);

alter table if exists public.user_status enable row level security;

create or replace function public.deactivate_user(user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if user_id is null then
    raise exception 'user_id is required';
  end if;
  insert into public.user_status (user_id, active, deactivated_at)
  values (deactivate_user.user_id, false, now())
  on conflict (user_id) do update
    set active = false,
        deactivated_at = now();
end;
$$;

-- Reactivate a user
create or replace function public.reactivate_user(user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if user_id is null then
    raise exception 'user_id is required';
  end if;
  insert into public.user_status (user_id, active, deactivated_at)
  values (reactivate_user.user_id, true, null)
  on conflict (user_id) do update
    set active = true,
        deactivated_at = null;
end;
$$;

-- Minimal RLS policies to allow users to read their own role/status
alter table if exists public.user_roles enable row level security;
alter table if exists public.user_status enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_roles' and policyname='user_roles_self_select'
  ) then
    create policy user_roles_self_select on public.user_roles for select using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_status' and policyname='user_status_self_select'
  ) then
    create policy user_status_self_select on public.user_status for select using (auth.uid() = user_id);
  end if;
end $$;
