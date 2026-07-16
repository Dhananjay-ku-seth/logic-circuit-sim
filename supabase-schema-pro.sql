-- Run this once in the Supabase SQL Editor, same as supabase-schema.sql.
-- Tracks who has an active LabBench Pro subscription. Only the webhook
-- (using the Supabase *secret* key, which bypasses RLS) ever writes here —
-- users can only read their own row.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_pro boolean not null default false,
  razorpay_subscription_id text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "select own profile"
  on public.profiles for select
  using (auth.uid() = user_id);
