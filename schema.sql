-- ================================================
-- SYK MOTOS — Ejecutar en Supabase SQL Editor
-- ================================================

CREATE TABLE IF NOT EXISTS clientes (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patente      VARCHAR UNIQUE NOT NULL,
  nombre_dueño VARCHAR,
  telefono     VARCHAR,
  modelo_moto  VARCHAR,
  dni          VARCHAR,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trabajos (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patente_id       VARCHAR REFERENCES clientes(patente) ON UPDATE CASCADE ON DELETE CASCADE,
  fecha            TIMESTAMP DEFAULT NOW(),
  detalle_trabajo  TEXT,
  repuestos_usados TEXT,
  costo_repuestos  NUMERIC DEFAULT 0,
  precio_cobrado   NUMERIC DEFAULT 0,
  ganancia_neta    NUMERIC DEFAULT 0,
  estado           VARCHAR DEFAULT 'En Taller',
  metodo_pago      VARCHAR DEFAULT 'Efectivo',
  informe_final    TEXT,
  repuestos_jsonb  JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS inventario (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre               VARCHAR NOT NULL,
  categoria            VARCHAR,
  cantidad             INTEGER DEFAULT 0,
  precio_costo         NUMERIC DEFAULT 0,
  precio_venta         NUMERIC DEFAULT 0,
  ultima_actualizacion TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS caja_movimientos (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha       TIMESTAMP DEFAULT NOW(),
  tipo        VARCHAR NOT NULL,
  concepto    TEXT NOT NULL,
  monto       NUMERIC DEFAULT 0,
  metodo_pago VARCHAR DEFAULT 'Efectivo',
  trabajo_id  UUID REFERENCES trabajos(id) NULL
);

-- Columnas nuevas sobre tablas existentes (idempotente)
ALTER TABLE clientes  ADD COLUMN IF NOT EXISTS dni          VARCHAR;
ALTER TABLE trabajos  ADD COLUMN IF NOT EXISTS estado          VARCHAR DEFAULT 'En Taller';
ALTER TABLE trabajos  ADD COLUMN IF NOT EXISTS metodo_pago     VARCHAR DEFAULT 'Efectivo';
ALTER TABLE trabajos  ADD COLUMN IF NOT EXISTS informe_final   TEXT;
ALTER TABLE trabajos  ADD COLUMN IF NOT EXISTS repuestos_jsonb   JSONB DEFAULT '[]'::jsonb;
ALTER TABLE trabajos  ADD COLUMN IF NOT EXISTS kilometraje       VARCHAR;
ALTER TABLE trabajos  ADD COLUMN IF NOT EXISTS mano_de_obra      NUMERIC DEFAULT 0;
ALTER TABLE trabajos  ADD COLUMN IF NOT EXISTS sena              NUMERIC DEFAULT 0;
ALTER TABLE trabajos  ADD COLUMN IF NOT EXISTS saldo_pendiente   NUMERIC DEFAULT 0;
ALTER TABLE trabajos  ADD COLUMN IF NOT EXISTS mano_obra_incluida BOOLEAN DEFAULT false;

-- Habilitar RLS
ALTER TABLE clientes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE trabajos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario       ENABLE ROW LEVEL SECURITY;
ALTER TABLE caja_movimientos ENABLE ROW LEVEL SECURITY;

-- Políticas públicas
DROP POLICY IF EXISTS "clientes_public_all"   ON clientes;
DROP POLICY IF EXISTS "trabajos_public_all"   ON trabajos;
DROP POLICY IF EXISTS "inventario_public_all" ON inventario;
DROP POLICY IF EXISTS "caja_public_all"       ON caja_movimientos;

CREATE POLICY "clientes_public_all"
  ON clientes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "trabajos_public_all"
  ON trabajos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "inventario_public_all"
  ON inventario FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "caja_public_all"
  ON caja_movimientos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
