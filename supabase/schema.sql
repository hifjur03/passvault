-- PassVault database schema
-- Run this once in the Supabase SQL editor.
--
-- The server only ever stores:
--   * the salt used for PBKDF2 (not secret)
--   * an encrypted verifier blob (to check the master password)
--   * the encrypted vault blob
-- It never sees the master password, the derived key, or plaintext entries.

create table if not exists public.vaults (
  user_id uuid primary key references auth.users (id) on delete cascade,
  salt text not null,
  verifier text not null,
  verifier_iv text not null,
  data text,
  data_iv text,
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.vaults enable row level security;

-- Each user can only read and write their own row.
drop policy if exists "Users manage their own vault" on public.vaults;
create policy "Users manage their own vault"
  on public.vaults
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Optional: keep updated_at fresh on every write.
create or replace function public.touch_vault_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vaults_touch_updated_at on public.vaults;
create trigger vaults_touch_updated_at
  before update on public.vaults
  for each row
  execute function public.touch_vault_updated_at();
