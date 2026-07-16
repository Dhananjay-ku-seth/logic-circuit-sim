-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> Run).
-- Creates the table that backs "Save Circuit" / "My Circuits", locked down with
-- Row Level Security so each user can only ever see/change their own rows.

create table if not exists public.circuits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  comps_json jsonb not null,
  wires_json jsonb not null,
  note text default '',
  created_at timestamptz not null default now()
);

alter table public.circuits enable row level security;

create policy "select own circuits"
  on public.circuits for select
  using (auth.uid() = user_id);

create policy "insert own circuits"
  on public.circuits for insert
  with check (auth.uid() = user_id);

create policy "delete own circuits"
  on public.circuits for delete
  using (auth.uid() = user_id);
