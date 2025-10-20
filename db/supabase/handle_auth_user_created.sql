-- Ensure profile columns exist in public.users
alter table if exists public.users
  add column if not exists name text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists city text;

-- Insert/Upsert user row into public.users when a new auth user is created
create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, phone, address, city)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'address',
    new.raw_user_meta_data->>'city'
  )
  on conflict (id) do update
    set email   = excluded.email,
        name    = coalesce(excluded.name, public.users.name),
        phone   = coalesce(excluded.phone, public.users.phone),
        address = coalesce(excluded.address, public.users.address),
        city    = coalesce(excluded.city, public.users.city);
  return new;
end;
$$;

-- Recreate trigger (safe if it already exists)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_auth_user_created();

