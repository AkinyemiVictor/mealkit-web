-- Core tables required by the app. Safe to run multiple times.

create table if not exists public.products (
  id bigint primary key,
  name text not null,
  image_url text,
  price numeric not null default 0,
  old_price numeric,
  unit text,
  stock text,
  in_season boolean not null default true,
  category text,
  created_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete restrict,
  quantity int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  total numeric not null default 0,
  status text not null default 'processing',
  payment_status text not null default 'pending',
  delivery_address text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigserial primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete restrict,
  quantity int not null default 1,
  unit_price numeric not null default 0,
  created_at timestamptz not null default now()
);

