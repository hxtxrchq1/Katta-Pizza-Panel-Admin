import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────
// Supabase client (uses HTTP, works on Vercel)
// ─────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
let useLocalDb = false;

if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }
  });
  console.log('Supabase client initialized (HTTP mode).');
} else {
  console.log('No SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY — using in-memory fallback.');
  useLocalDb = true;
}

// ─────────────────────────────────────────────
// In-Memory / File fallback (local dev only)
// ─────────────────────────────────────────────
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve('./data');
const DB_FILE = path.join(DATA_DIR, 'local_db.json');
let memoryDb = null;

function initLocalDb() {
  if (memoryDb) return;
  const defaultDb = {
    settings: { delivery_cost: '6', stamps_required: '5' },
    pizzas: [
      { id: 1, name: 'Margarita', price: 25 },
      { id: 2, name: '5 Quesos', price: 26 },
      { id: 3, name: 'Champiñones con Tocino', price: 27 },
      { id: 4, name: 'Americana', price: 26 },
      { id: 5, name: 'Hawaiana', price: 26 },
      { id: 6, name: 'Peperoni', price: 27 },
      { id: 7, name: '5 Quesos + Salsa', price: 28 }
    ],
    costs_items: [
      { id: 'b1', name: 'Masa Precocida Mediana (30x30)', cost: 7.50, category: 'base' },
      { id: 'e1', name: 'Caja Kraft Pizza', cost: 1.50, category: 'empaque' },
      { id: 'e2', name: 'Sticker Personalizado', cost: 0.30, category: 'empaque' },
      { id: 'e3', name: 'Sello / Papel Manteca', cost: 0.20, category: 'empaque' },
      { id: 'i1', name: 'Jamón', cost: 1.80, category: 'ingrediente' },
      { id: 'i2', name: 'Piña', cost: 1.20, category: 'ingrediente' },
      { id: 'i3', name: 'Tocino', cost: 2.20, category: 'ingrediente' },
      { id: 'i4', name: 'Salsa Boloñesa / Extra', cost: 1.00, category: 'ingrediente' },
      { id: 'i5', name: 'Champiñones', cost: 1.50, category: 'ingrediente' }
    ],
    sales: [],
    expenses: [],
    loyalty: {}
  };
  if (!process.env.VERCEL) {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2));
      memoryDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      return;
    } catch (err) {
      console.error('Local file DB failed, using memory:', err.message);
    }
  }
  memoryDb = defaultDb;
}

function readLocalDb() { initLocalDb(); return memoryDb; }
function writeLocalDb(data) {
  memoryDb = data;
  if (!process.env.VERCEL) {
    try { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); } catch (_) {}
  }
}

// ─────────────────────────────────────────────
// API: Pizzas
// ─────────────────────────────────────────────
app.get('/api/pizzas', async (req, res) => {
  if (useLocalDb) return res.json(readLocalDb().pizzas);
  const { data, error } = await supabase.from('pizzas').select('*').order('id', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/pizzas', async (req, res) => {
  const { name, price } = req.body;
  if (useLocalDb) {
    const db = readLocalDb();
    const newPizza = { id: Date.now(), name, price: parseFloat(price) };
    db.pizzas.push(newPizza);
    writeLocalDb(db);
    return res.status(201).json(newPizza);
  }
  const { data, error } = await supabase.from('pizzas').insert({ name, price }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.put('/api/pizzas/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price } = req.body;
  if (useLocalDb) {
    const db = readLocalDb();
    db.pizzas = db.pizzas.map(p => p.id.toString() === id ? { ...p, name, price: parseFloat(price) } : p);
    writeLocalDb(db);
    return res.json(db.pizzas.find(p => p.id.toString() === id));
  }
  const { data, error } = await supabase.from('pizzas').update({ name, price }).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/pizzas/:id', async (req, res) => {
  const { id } = req.params;
  if (useLocalDb) {
    const db = readLocalDb();
    db.pizzas = db.pizzas.filter(p => p.id.toString() !== id);
    writeLocalDb(db);
    return res.status(204).send();
  }
  const { error } = await supabase.from('pizzas').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// ─────────────────────────────────────────────
// API: Costs & Settings
// ─────────────────────────────────────────────
app.get('/api/costs', async (req, res) => {
  if (useLocalDb) {
    const db = readLocalDb();
    return res.json({
      deliveryCost: parseFloat(db.settings.delivery_cost),
      stampsRequired: parseInt(db.settings.stamps_required || '5', 10),
      items: db.costs_items
    });
  }
  const [itemsRes, settingsRes] = await Promise.all([
    supabase.from('costs_items').select('*'),
    supabase.from('settings').select('*')
  ]);
  if (itemsRes.error) return res.status(500).json({ error: itemsRes.error.message });
  if (settingsRes.error) return res.status(500).json({ error: settingsRes.error.message });

  const settings = Object.fromEntries(settingsRes.data.map(s => [s.key, s.value]));
  res.json({
    deliveryCost: parseFloat(settings.delivery_cost || '6'),
    stampsRequired: parseInt(settings.stamps_required || '5', 10),
    items: itemsRes.data
  });
});

app.post('/api/costs/items', async (req, res) => {
  const { id, name, cost, category } = req.body;
  if (useLocalDb) {
    const db = readLocalDb();
    const item = { id, name, cost: parseFloat(cost), category };
    db.costs_items = [...db.costs_items.filter(i => i.id !== id), item];
    writeLocalDb(db);
    return res.status(201).json(item);
  }
  const { data, error } = await supabase
    .from('costs_items')
    .upsert({ id, name, cost, category })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.delete('/api/costs/items/:id', async (req, res) => {
  const { id } = req.params;
  if (useLocalDb) {
    const db = readLocalDb();
    db.costs_items = db.costs_items.filter(i => i.id !== id);
    writeLocalDb(db);
    return res.status(204).send();
  }
  const { error } = await supabase.from('costs_items').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

app.post('/api/costs/delivery', async (req, res) => {
  const { cost } = req.body;
  if (useLocalDb) {
    const db = readLocalDb();
    db.settings.delivery_cost = cost.toString();
    writeLocalDb(db);
    return res.json({ success: true, deliveryCost: cost });
  }
  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'delivery_cost', value: cost.toString() });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, deliveryCost: cost });
});

app.post('/api/costs/stamps', async (req, res) => {
  const { stamps } = req.body;
  if (useLocalDb) {
    const db = readLocalDb();
    db.settings.stamps_required = stamps.toString();
    writeLocalDb(db);
    return res.json({ success: true, stampsRequired: stamps });
  }
  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'stamps_required', value: stamps.toString() });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, stampsRequired: stamps });
});

// ─────────────────────────────────────────────
// API: Loyalty
// ─────────────────────────────────────────────
app.get('/api/loyalty', async (req, res) => {
  if (useLocalDb) return res.json(readLocalDb().loyalty || {});
  const { data, error } = await supabase.from('client_loyalty').select('*');
  if (error) return res.status(500).json({ error: error.message });
  const mapping = data.reduce((acc, row) => {
    acc[row.client_name.toLowerCase()] = row.manual_pizzas;
    return acc;
  }, {});
  res.json(mapping);
});

app.post('/api/loyalty', async (req, res) => {
  const { clientName, manualPizzas } = req.body;
  const key = clientName.trim().toLowerCase();
  if (useLocalDb) {
    const db = readLocalDb();
    if (!db.loyalty) db.loyalty = {};
    db.loyalty[key] = parseInt(manualPizzas, 10) || 0;
    writeLocalDb(db);
    return res.json({ success: true });
  }
  const { error } = await supabase
    .from('client_loyalty')
    .upsert({ client_name: key, manual_pizzas: parseInt(manualPizzas, 10) || 0 });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ─────────────────────────────────────────────
// API: Sales
// ─────────────────────────────────────────────
app.get('/api/sales', async (req, res) => {
  if (useLocalDb) return res.json(readLocalDb().sales);
  const { data, error } = await supabase.from('sales').select('*').order('date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  const camelCased = data.map(row => ({
    id: row.id,
    date: row.date,
    pizzaId: row.pizza_id,
    pizzaName: row.pizza_name,
    pizzaPrice: parseFloat(row.pizza_price),
    ingredients: row.ingredients,
    deliveryCharged: parseFloat(row.delivery_charged),
    totalCharged: parseFloat(row.total_charged),
    costOfProduction: parseFloat(row.cost_of_production),
    costOfDelivery: parseFloat(row.cost_of_delivery),
    totalCost: parseFloat(row.total_cost),
    profit: parseFloat(row.profit),
    paymentMethod: row.payment_method,
    clientName: row.client_name,
    status: row.status || 'Completado',
    scheduledTime: row.scheduled_time,
    paymentStatus: row.payment_status || 'Pagado',
    quantity: parseInt(row.quantity || '1', 10)
  }));
  res.json(camelCased);
});

app.post('/api/sales', async (req, res) => {
  const s = req.body;
  if (useLocalDb) {
    const db = readLocalDb();
    const idx = db.sales.findIndex(i => i.id === s.id);
    if (idx !== -1) db.sales[idx] = s;
    else db.sales.unshift(s);
    writeLocalDb(db);
    return res.status(201).json(s);
  }
  const { data, error } = await supabase.from('sales').upsert({
    id: s.id,
    date: s.date,
    pizza_id: s.pizzaId,
    pizza_name: s.pizzaName,
    pizza_price: s.pizzaPrice,
    ingredients: s.ingredients,
    delivery_charged: s.deliveryCharged,
    total_charged: s.totalCharged,
    cost_of_production: s.costOfProduction,
    cost_of_delivery: s.costOfDelivery,
    total_cost: s.totalCost,
    profit: s.profit,
    payment_method: s.paymentMethod,
    client_name: s.clientName || '',
    status: s.status || 'Completado',
    scheduled_time: s.scheduledTime || null,
    payment_status: s.paymentStatus || 'Pagado',
    quantity: parseInt(s.quantity || '1', 10)
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.delete('/api/sales/:id', async (req, res) => {
  const { id } = req.params;
  if (useLocalDb) {
    const db = readLocalDb();
    db.sales = db.sales.filter(s => s.id !== id);
    writeLocalDb(db);
    return res.status(204).send();
  }
  const { error } = await supabase.from('sales').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// ─────────────────────────────────────────────
// API: Expenses
// ─────────────────────────────────────────────
app.get('/api/expenses', async (req, res) => {
  if (useLocalDb) return res.json(readLocalDb().expenses);
  const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  const camelCased = data.map(row => ({
    id: row.id,
    date: row.date,
    description: row.description,
    amount: parseFloat(row.amount),
    impact: row.impact
  }));
  res.json(camelCased);
});

app.post('/api/expenses', async (req, res) => {
  const e = req.body;
  if (useLocalDb) {
    const db = readLocalDb();
    const idx = db.expenses.findIndex(i => i.id === e.id);
    if (idx !== -1) db.expenses[idx] = e;
    else db.expenses.unshift(e);
    writeLocalDb(db);
    return res.status(201).json(e);
  }
  const { data, error } = await supabase.from('expenses').upsert({
    id: e.id,
    date: e.date,
    description: e.description,
    amount: e.amount,
    impact: e.impact
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.delete('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;
  if (useLocalDb) {
    const db = readLocalDb();
    db.expenses = db.expenses.filter(e => e.id !== id);
    writeLocalDb(db);
    return res.status(204).send();
  }
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default app;
