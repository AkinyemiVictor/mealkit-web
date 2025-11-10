-- Decrement and restore product stock_count based on order_items changes
-- Safe to run multiple times (idempotent guards where possible)

-- 1) Ensure numeric stock column exists alongside existing text stock label
alter table if exists public.products
  add column if not exists stock_count integer;

-- Optional backfill: parse digits from stock text when stock_count is null
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'stock'
  ) then
    update public.products
      set stock_count = coalesce(stock_count, nullif(regexp_replace(stock, '\\D', '', 'g'), '')::int)
    where stock_count is null;
  end if;
end $$;

-- 2) Trigger function: handle insert/update/delete on order_items
create or replace function public.handle_order_items_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  delta integer := 0;
begin
  if TG_OP = 'INSERT' then
    delta := -greatest(0, coalesce(NEW.quantity, 0));
  elsif TG_OP = 'DELETE' then
    delta := greatest(0, coalesce(OLD.quantity, 0));
  elsif TG_OP = 'UPDATE' then
    delta := greatest(0, coalesce(OLD.quantity, 0)) * -1 + greatest(0, coalesce(NEW.quantity, 0));
  end if;

  if delta <> 0 then
    update public.products
      set stock_count = greatest(0, coalesce(stock_count, 0) + delta)
      where id = coalesce(NEW.product_id, OLD.product_id);
  end if;

  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;
end;
$$;

-- 3) Triggers on order_items
drop trigger if exists trg_order_items_stock_ins on public.order_items;
drop trigger if exists trg_order_items_stock_upd on public.order_items;
drop trigger if exists trg_order_items_stock_del on public.order_items;

create trigger trg_order_items_stock_ins
after insert on public.order_items
for each row execute function public.handle_order_items_stock();

create trigger trg_order_items_stock_upd
after update of quantity, product_id on public.order_items
for each row execute function public.handle_order_items_stock();

create trigger trg_order_items_stock_del
after delete on public.order_items
for each row execute function public.handle_order_items_stock();

