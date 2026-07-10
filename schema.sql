-- ================================================
-- SYK MOTOS — Ejecutar en Supabase SQL Editor
-- ================================================

create table if not exists clientes (
  id           uuid default gen_random_uuid() primary key,
  patente      varchar unique not null,
  nombre_dueño varchar,
  telefono     varchar,
  modelo_moto  varchar,
  created_at   timestamp default now()
);

create table if not exists trabajos (
  id               uuid default gen_random_uuid() primary key,
  patente_id       varchar references clientes(patente) on update cascade on delete cascade,
  fecha            timestamp default now(),
  detalle_trabajo  text,
  repuestos_usados text,
  costo_repuestos  numeric default 0,
  precio_cobrado   numeric default 0,
  ganancia_neta    numeric default 0
);

-- Habilitar RLS
alter table clientes enable row level security;
alter table trabajos  enable row level security;

-- Políticas públicas (sin auth requerida)
drop policy if exists "clientes_public_all" on clientes;
drop policy if exists "trabajos_public_all" on trabajos;

create policy "clientes_public_all"
  on clientes for all to anon, authenticated
  using (true) with check (true);

create policy "trabajos_public_all"
  on trabajos for all to anon, authenticated
  using (true) with check (true);
