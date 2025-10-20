-- Sync updates from auth.users to public.users
-- Fields mapped from raw_user_meta_data: name, phone, address, city
-- Also keeps email in sync if it changes

-- Ensure columns exist (safe to run multiple times)
alter table if exists public.users
  add column if not exists name text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists city text;

create or replace function public.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users u
  set
    email   = new.email,
    name    = coalesce(new.raw_user_meta_data->>'name',    u.name),
    phone   = coalesce(new.raw_user_meta_data->>'phone',   u.phone),
    address = coalesce(new.raw_user_meta_data->>'address', u.address),
    city    = coalesce(new.raw_user_meta_data->>'city',    u.city)
  where u.id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_auth_user_updated();

