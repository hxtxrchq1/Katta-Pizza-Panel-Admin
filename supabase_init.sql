-- ============================================================
-- KATTA PIZZA - Script de inicialización de base de datos
-- Pegar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Tabla de configuración general
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Tabla de pizzas
CREATE TABLE IF NOT EXISTS pizzas (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  price NUMERIC(10,2) NOT NULL
);

-- Tabla de ítems de costos de producción
CREATE TABLE IF NOT EXISTS costs_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cost NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL
);

-- Tabla de ventas
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  date TIMESTAMPTZ NOT NULL,
  pizza_id TEXT NOT NULL,
  pizza_name TEXT NOT NULL,
  pizza_price NUMERIC(10,2) NOT NULL,
  ingredients JSONB NOT NULL,
  delivery_charged NUMERIC(10,2) NOT NULL,
  total_charged NUMERIC(10,2) NOT NULL,
  cost_of_production NUMERIC(10,2) NOT NULL,
  cost_of_delivery NUMERIC(10,2) NOT NULL,
  total_cost NUMERIC(10,2) NOT NULL,
  profit NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  client_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Completado',
  scheduled_time TIMESTAMPTZ,
  payment_status TEXT NOT NULL DEFAULT 'Pagado',
  quantity INTEGER NOT NULL DEFAULT 1
);

-- Tabla de fidelización de clientes
CREATE TABLE IF NOT EXISTS client_loyalty (
  client_name TEXT PRIMARY KEY,
  manual_pizzas INTEGER NOT NULL DEFAULT 0
);

-- Tabla de gastos
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  date TIMESTAMPTZ NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  impact TEXT NOT NULL
);

-- ============================================================
-- DATOS INICIALES (SEED)
-- ============================================================

-- Configuración por defecto
INSERT INTO settings (key, value) VALUES ('delivery_cost', '6') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('stamps_required', '5') ON CONFLICT (key) DO NOTHING;

-- Pizzas por defecto
INSERT INTO pizzas (name, price) VALUES
  ('Margarita', 25),
  ('5 Quesos', 26),
  ('Champiñones con Tocino', 27),
  ('Americana', 26),
  ('Hawaiana', 26),
  ('Peperoni', 27),
  ('5 Quesos + Salsa', 28)
ON CONFLICT (name) DO NOTHING;

-- Ítems de costos por defecto
INSERT INTO costs_items (id, name, cost, category) VALUES
  ('b1', 'Masa Precocida Mediana (30x30)', 7.50, 'base'),
  ('e1', 'Caja Kraft Pizza', 1.50, 'empaque'),
  ('e2', 'Sticker Personalizado', 0.30, 'empaque'),
  ('e3', 'Sello / Papel Manteca', 0.20, 'empaque'),
  ('i1', 'Jamón', 1.80, 'ingrediente'),
  ('i2', 'Piña', 1.20, 'ingrediente'),
  ('i3', 'Tocino', 2.20, 'ingrediente'),
  ('i4', 'Salsa Boloñesa / Extra', 1.00, 'ingrediente'),
  ('i5', 'Champiñones', 1.50, 'ingrediente')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- VERIFICACIÓN: Confirmar que las tablas se crearon
-- ============================================================
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
