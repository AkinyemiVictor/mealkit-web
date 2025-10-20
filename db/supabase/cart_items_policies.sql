-- Enable RLS and add ownership policies for cart_items
-- Assumes columns: id (pk), user_id (uuid), product_id, quantity

alter table if exists public.cart_items enable row level security;

-- SELECT: only owner can read
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cart_items' and policyname = 'cart_owner_select'
  ) then
    create policy cart_owner_select on public.cart_items
      for select using (auth.uid() = user_id);
  end if;
end $$;

-- INSERT: only as yourself
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cart_items' and policyname = 'cart_owner_insert'
  ) then
    create policy cart_owner_insert on public.cart_items
      for insert with check (auth.uid() = user_id);
  end if;
end $$;

-- UPDATE: only your rows
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cart_items' and policyname = 'cart_owner_update'
  ) then
    create policy cart_owner_update on public.cart_items
      for update using (auth.uid() = user_id);
  end if;
end $$;

-- DELETE: only your rows
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cart_items' and policyname = 'cart_owner_delete'
  ) then
    create policy cart_owner_delete on public.cart_items
      for delete using (auth.uid() = user_id);
  end if;
end $$;

