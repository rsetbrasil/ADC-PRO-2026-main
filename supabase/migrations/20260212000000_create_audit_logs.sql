create table if not exists audit_logs (
  id uuid default gen_random_uuid() primary key,
  timestamp timestamptz not null default now(),
  user_id text,
  user_name text,
  user_role text,
  action text not null,
  details text
);
