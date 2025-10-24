-- Enable RLS and add ownership policies for orders and order_items
-- Assumes columns:
--   orders(id, user_id uuid, total numeric, status text, payment_status text, delivery_address text, created_at timestamptz)
--   order_items(order_id bigint, product_id bigint, quantity int, unit_price numeric)

alter table if exists public.orders enable row level security;
alter table if exists public.order_items enable row level security;

-- ORDERS: SELECT own orders
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'orders' and policyname = 'orders_owner_select'
  ) then
    create policy orders_owner_select on public.orders
      for select using (auth.uid() = user_id);
  end if;
end $$;

-- ORDERS: INSERT only for yourself (server/API routes should set user_id)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'orders' and policyname = 'orders_owner_insert'
  ) then
    create policy orders_owner_insert on public.orders
      for insert with check (auth.uid() = user_id);
  end if;
end $$;

-- ORDERS: UPDATE only your orders
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'orders' and policyname = 'orders_owner_update'
  ) then
    create policy orders_owner_update on public.orders
      for update using (auth.uid() = user_id);
  end if;
end $$;

-- ORDERS: DELETE (rare) only your orders
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'orders' and policyname = 'orders_owner_delete'
  ) then
    create policy orders_owner_delete on public.orders
      for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ORDER_ITEMS: SELECT items only for orders you own
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'order_items' and policyname = 'order_items_parent_select'
  ) then
    create policy order_items_parent_select on public.order_items
      for select using (
        exists (
          select 1 from public.orders o
          where o.id = order_id and o.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- ORDER_ITEMS: INSERT only into orders you own
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'order_items' and policyname = 'order_items_parent_insert'
  ) then
    create policy order_items_parent_insert on public.order_items
      for insert with check (
        exists (
          select 1 from public.orders o
          where o.id = order_id and o.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- ORDER_ITEMS: UPDATE only for your orders
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'order_items' and policyname = 'order_items_parent_update'
  ) then
    create policy order_items_parent_update on public.order_items
      for update using (
        exists (
          select 1 from public.orders o
          where o.id = order_id and o.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- ORDER_ITEMS: DELETE only for your orders
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'order_items' and policyname = 'order_items_parent_delete'
  ) then
    create policy order_items_parent_delete on public.order_items
      for delete using (
        exists (
          select 1 from public.orders o
          where o.id = order_id and o.user_id = auth.uid()
        )
      );
  end if;
end $$;

