create index if not exists orders_date_desc_idx on public.orders (date desc);
create index if not exists orders_created_at_desc_idx on public.orders (created_at desc);
create index if not exists orders_status_date_desc_idx on public.orders (status, date desc);
create index if not exists orders_seller_id_date_desc_idx on public.orders ("sellerId", date desc);
create index if not exists orders_customer_cpf_idx on public.orders ((customer->>'cpf'));
create index if not exists orders_customer_code_idx on public.orders ((customer->>'code'));
