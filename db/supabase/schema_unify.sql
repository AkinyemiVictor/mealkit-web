-- Schema unification helpers
-- These statements add commonly expected columns when missing and, where safe,
-- backfill from existing alternative columns. They are idempotent.

-- products.image_url <= products.image
alter table if exists public.products add column if not exists image_url text;
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'image'
  ) then
    update public.products set image_url = coalesce(image_url, image) where image_url is null;
  end if;
end $$;

-- orders.delivery_address <= orders.address
alter table if exists public.orders add column if not exists delivery_address text;
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'address'
  ) then
    update public.orders set delivery_address = coalesce(delivery_address, address) where delivery_address is null;
  end if;
end $$;

-- order_items.unit_price <= order_items.price
alter table if exists public.order_items add column if not exists unit_price numeric;
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'order_items' and column_name = 'price'
  ) then
    update public.order_items set unit_price = coalesce(unit_price, price) where unit_price is null;
  end if;
end $$;

-- profiles first/last name normalisation
alter table if exists public.profiles add column if not exists first_name text;
alter table if exists public.profiles add column if not exists last_name text;
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'firstname'
  ) then
    update public.profiles set first_name = coalesce(first_name, firstname) where first_name is null;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'lastname'
  ) then
    update public.profiles set last_name = coalesce(last_name, lastname) where last_name is null;
  end if;
end $$;

-- profiles id/user_id dual support (do not change PKs here; just mirror when missing)
alter table if exists public.profiles add column if not exists user_id uuid;
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'id'
  ) then
    update public.profiles set user_id = coalesce(user_id, id) where user_id is null;
  end if;
end $$;

