-- Dangerous in production if filters are wrong. Review before running.
-- Removes demo/test data but keeps schema, policies, and safety systems intact.

begin;

-- Remove demo cart items by email domain pattern
delete from public.cart_items
where user_id in (
  select id from auth.users where email ilike '%@example.com' or email ilike '%@test.com'
);

-- Remove demo order items first, then orders
delete from public.order_items oi
using public.orders o
where oi.order_id = o.id
  and o.user_id in (
    select id from auth.users where email ilike '%@example.com' or email ilike '%@test.com'
  );

delete from public.orders
where user_id in (
  select id from auth.users where email ilike '%@example.com' or email ilike '%@test.com'
);

-- Optionally remove demo profiles if you maintain a separate profiles table
-- delete from public.profiles p
-- where p.id in (
--   select id from auth.users where email ilike '%@example.com' or email ilike '%@test.com'
-- );

-- Optionally remove demo auth.users (irreversible; commented by default)
-- delete from auth.users where email ilike '%@example.com' or email ilike '%@test.com';

commit;

