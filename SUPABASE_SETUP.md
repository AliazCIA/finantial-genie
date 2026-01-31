# Supabase Setup (Auth + Datos por usuario)

Este proyecto puede correr en modo **local/offline** (Dexie/AsyncStorage) o en modo **Supabase** (datos en servidor por usuario).

## 1) Variables de entorno (Expo)

Configura estas variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

En Expo, las variables que empiezan con `EXPO_PUBLIC_` son accesibles desde el cliente.

## 2) Crear tablas + RLS (SQL)

En Supabase (SQL Editor), ejecuta:

```sql
-- Habilitar extensión para UUID (opcional)
create extension if not exists "uuid-ossp";

-- Tablas "JSON storage" por colección:
-- id = string (mantenemos ids actuales del cliente)
-- data = jsonb con el schema actual
-- created_at / updated_at = timestamps

create table if not exists public.transactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fixed_expenses (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.installment_purchases (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.installment_payments (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assets (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.liabilities (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.investments (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.investment_opportunities (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_cards (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recurring_expenses (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row Level Security
alter table public.transactions enable row level security;
alter table public.categories enable row level security;
alter table public.fixed_expenses enable row level security;
alter table public.installment_purchases enable row level security;
alter table public.installment_payments enable row level security;
alter table public.assets enable row level security;
alter table public.liabilities enable row level security;
alter table public.investments enable row level security;
alter table public.investment_opportunities enable row level security;
alter table public.credit_cards enable row level security;
alter table public.recurring_expenses enable row level security;

-- Políticas: el usuario solo accede a sus filas
do $$
declare
  t text;
begin
  foreach t in array array[
    'transactions','categories','fixed_expenses','installment_purchases','installment_payments',
    'assets','liabilities','investments','investment_opportunities','credit_cards','recurring_expenses'
  ]
  loop
    execute format('create policy if not exists %I_select on public.%I for select using (user_id = auth.uid())', t || '_select', t);
    execute format('create policy if not exists %I_insert on public.%I for insert with check (user_id = auth.uid())', t || '_insert', t);
    execute format('create policy if not exists %I_update on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t || '_update', t);
    execute format('create policy if not exists %I_delete on public.%I for delete using (user_id = auth.uid())', t || '_delete', t);
  end loop;
end $$;
```

## 3) Qué cambia en la app

- Si **hay** `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`, se usa Supabase para **web y móvil**.
- Si **no** están, la app sigue usando:
  - Web: IndexedDB (Dexie)
  - Mobile: AsyncStorage

