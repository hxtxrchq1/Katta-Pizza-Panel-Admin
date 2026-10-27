import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Local File Database Fallback setup
const DATA_DIR = path.resolve('./data');
const DB_FILE = path.join(DATA_DIR, 'local_db.json');

function initLocalDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
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
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2));
  }
}

function readLocalDb() {
  initLocalDb();
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function writeLocalDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Database pool setup
let pool = null;
let useLocalDb = false;

try {
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
} catch (e) {
  console.log("Database connection failed to configure, using local JSON storage fallback.");
  useLocalDb = true;
}

// Database initialization
async function initDb() {
  if (useLocalDb) return;
  try {
    const client = await pool.connect();
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS pizzas (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        price NUMERIC(10,2) NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS costs_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        cost NUMERIC(10,2) NOT NULL,
        category TEXT NOT NULL
      );
    `);

    await client.query(`
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
    `);

    // Ensure status, scheduled_time, payment_status, and quantity columns exist
    await client.query(`
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Completado';
    `);
    await client.query(`
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMPTZ;
    `);
    await client.query(`
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'Pagado';
    `);
    await client.query(`
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;
    `);

    // Create client loyalty manual adjustments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS client_loyalty (
        client_name TEXT PRIMARY KEY,
        manual_pizzas INTEGER NOT NULL DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        date TIMESTAMPTZ NOT NULL,
        description TEXT NOT NULL,
        amount NUMERIC(10,2) NOT NULL,
        impact TEXT NOT NULL
      );
    `);

    // Default settings
    const checkDelivery = await client.query("SELECT * FROM settings WHERE key = 'delivery_cost'");
    if (checkDelivery.rows.length === 0) {
      await client.query("INSERT INTO settings (key, value) VALUES ('delivery_cost', '6')");
    }

    const checkStamps = await client.query("SELECT * FROM settings WHERE key = 'stamps_required'");
    if (checkStamps.rows.length === 0) {
      await client.query("INSERT INTO settings (key, value) VALUES ('stamps_required', '5')");
    }

    // Default pizzas
    const checkPizzas = await client.query("SELECT * FROM pizzas");
    if (checkPizzas.rows.length === 0) {
      const defaultPizzas = [
        ['Margarita', 25],
        ['5 Quesos', 26],
        ['Champiñones con Tocino', 27],
        ['Americana', 26],
        ['Hawaiana', 26],
        ['Peperoni', 27],
        ['5 Quesos + Salsa', 28]
      ];
      for (const p of defaultPizzas) {
        await client.query("INSERT INTO pizzas (name, price) VALUES ($1, $2)", p);
      }
    }

    // Default costs items
    const checkCosts = await client.query("SELECT * FROM costs_items");
    if (checkCosts.rows.length === 0) {
      const defaultCosts = [
        ['b1', 'Masa Precocida Mediana (30x30)', 7.50, 'base'],
        ['e1', 'Caja Kraft Pizza', 1.50, 'empaque'],
        ['e2', 'Sticker Personalizado', 0.30, 'empaque'],
        ['e3', 'Sello / Papel Manteca', 0.20, 'empaque'],
        ['i1', 'Jamón', 1.80, 'ingrediente'],
        ['i2', 'Piña', 1.20, 'ingrediente'],
        ['i3', 'Tocino', 2.20, 'ingrediente'],
        ['i4', 'Salsa Boloñesa / Extra', 1.00, 'ingrediente'],
        ['i5', 'Champiñones', 1.50, 'ingrediente']
      ];
      for (const c of defaultCosts) {
        await client.query("INSERT INTO costs_items (id, name, cost, category) VALUES ($1, $2, $3, $4)", c);
      }
    }

    client.release();
    console.log("Supabase PostgreSQL tables checked/initialized successfully.");
  } catch (err) {
    console.error("Database connection failed. Falling back to local offline JSON database storage.");
    useLocalDb = true;
    initLocalDb();
  }
}

// API: Pizzas
app.get('/api/pizzas', async (req, res) => {
  if (useLocalDb) {
    const db = readLocalDb();
    return res.json(db.pizzas);
  }
  try {
    const result = await pool.query('SELECT * FROM pizzas ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
  try {
    const result = await pool.query(
      'INSERT INTO pizzas (name, price) VALUES ($1, $2) RETURNING *',
      [name, price]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/pizzas/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price } = req.body;
  if (useLocalDb) {
    const db = readLocalDb();
    db.pizzas = db.pizzas.map(p => p.id.toString() === id.toString() ? { ...p, name, price: parseFloat(price) } : p);
    writeLocalDb(db);
    const updated = db.pizzas.find(p => p.id.toString() === id.toString());
    return res.json(updated);
  }
  try {
    const result = await pool.query(
      'UPDATE pizzas SET name = $1, price = $2 WHERE id = $3 RETURNING *',
      [name, price, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/pizzas/:id', async (req, res) => {
  const { id } = req.params;
  if (useLocalDb) {
    const db = readLocalDb();
    db.pizzas = db.pizzas.filter(p => p.id.toString() !== id.toString());
    writeLocalDb(db);
    return res.status(204).send();
  }
  try {
    await pool.query('DELETE FROM pizzas WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Costs and Settings
app.get('/api/costs', async (req, res) => {
  if (useLocalDb) {
    const db = readLocalDb();
    return res.json({
      deliveryCost: parseFloat(db.settings.delivery_cost),
      stampsRequired: parseInt(db.settings.stamps_required || '5', 10),
      items: db.costs_items
    });
  }
  try {
    const itemsRes = await pool.query('SELECT * FROM costs_items');
    const deliveryRes = await pool.query("SELECT value FROM settings WHERE key = 'delivery_cost'");
    const stampsRes = await pool.query("SELECT value FROM settings WHERE key = 'stamps_required'");
    res.json({
      deliveryCost: parseFloat(deliveryRes.rows[0]?.value || '6'),
      stampsRequired: parseInt(stampsRes.rows[0]?.value || '5', 10),
      items: itemsRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/costs/items', async (req, res) => {
  const { id, name, cost, category } = req.body;
  if (useLocalDb) {
    const db = readLocalDb();
    const updatedItem = { id, name, cost: parseFloat(cost), category };
    db.costs_items = [...db.costs_items.filter(i => i.id !== id), updatedItem];
    writeLocalDb(db);
    return res.status(201).json(updatedItem);
  }
  try {
    const result = await pool.query(
      'INSERT INTO costs_items (id, name, cost, category) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = $2, cost = $3, category = $4 RETURNING *',
      [id, name, cost, category]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/costs/items/:id', async (req, res) => {
  const { id } = req.params;
  if (useLocalDb) {
    const db = readLocalDb();
    db.costs_items = db.costs_items.filter(item => item.id !== id);
    writeLocalDb(db);
    return res.status(204).send();
  }
  try {
    await pool.query('DELETE FROM costs_items WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/costs/delivery', async (req, res) => {
  const { cost } = req.body;
  if (useLocalDb) {
    const db = readLocalDb();
    db.settings.delivery_cost = cost.toString();
    writeLocalDb(db);
    return res.json({ success: true, deliveryCost: cost });
  }
  try {
    await pool.query(
      "INSERT INTO settings (key, value) VALUES ('delivery_cost', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
      [cost.toString()]
    );
    res.json({ success: true, deliveryCost: cost });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/costs/stamps', async (req, res) => {
  const { stamps } = req.body;
  if (useLocalDb) {
    const db = readLocalDb();
    db.settings.stamps_required = stamps.toString();
    writeLocalDb(db);
    return res.json({ success: true, stampsRequired: stamps });
  }
  try {
    await pool.query(
      "INSERT INTO settings (key, value) VALUES ('stamps_required', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
      [stamps.toString()]
    );
    res.json({ success: true, stampsRequired: stamps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Client loyalty manual adjustments
app.get('/api/loyalty', async (req, res) => {
  if (useLocalDb) {
    const db = readLocalDb();
    return res.json(db.loyalty || {});
  }
  try {
    const result = await pool.query('SELECT * FROM client_loyalty');
    const mapping = result.rows.reduce((acc, row) => {
      acc[row.client_name.toLowerCase()] = row.manual_pizzas;
      return acc;
    }, {});
    res.json(mapping);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/loyalty', async (req, res) => {
  const { clientName, manualPizzas } = req.body;
  const key = clientName.trim().toLowerCase();
  if (useLocalDb) {
    const db = readLocalDb();
    if (!db.loyalty) db.loyalty = {};
    db.loyalty[key] = parseInt(manualPizzas, 10) || 0;
    writeLocalDb(db);
    return res.json({ success: true, clientName, manualPizzas });
  }
  try {
    await pool.query(
      `INSERT INTO client_loyalty (client_name, manual_pizzas) 
       VALUES ($1, $2) 
       ON CONFLICT (client_name) DO UPDATE SET manual_pizzas = $2`,
      [key, parseInt(manualPizzas, 10) || 0]
    );
    res.json({ success: true, clientName, manualPizzas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Sales
app.get('/api/sales', async (req, res) => {
  if (useLocalDb) {
    const db = readLocalDb();
    return res.json(db.sales);
  }
  try {
    const result = await pool.query('SELECT * FROM sales ORDER BY date DESC');
    const camelCased = result.rows.map(row => ({
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sales', async (req, res) => {
  const s = req.body;
  if (useLocalDb) {
    const db = readLocalDb();
    const existsIndex = db.sales.findIndex(item => item.id === s.id);
    if (existsIndex !== -1) {
      db.sales[existsIndex] = s;
    } else {
      db.sales.unshift(s);
    }
    writeLocalDb(db);
    return res.status(201).json(s);
  }
  try {
    const result = await pool.query(
      `INSERT INTO sales (
        id, date, pizza_id, pizza_name, pizza_price, ingredients, 
        delivery_charged, total_charged, cost_of_production, cost_of_delivery, 
        total_cost, profit, payment_method, client_name, status, scheduled_time, payment_status, quantity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
       ON CONFLICT (id) DO UPDATE SET 
         date = $2,
         pizza_id = $3,
         pizza_name = $4,
         pizza_price = $5,
         ingredients = $6,
         delivery_charged = $7,
         total_charged = $8,
         cost_of_production = $9,
         cost_of_delivery = $10,
         total_cost = $11,
         profit = $12,
         payment_method = $13,
         client_name = $14,
         status = $15,
         scheduled_time = $16,
         payment_status = $17,
         quantity = $18
       RETURNING *`,
      [
        s.id, s.date, s.pizzaId, s.pizzaName, s.pizzaPrice, JSON.stringify(s.ingredients),
        s.deliveryCharged, s.totalCharged, s.costOfProduction, s.costOfDelivery,
        s.totalCost, s.profit, s.paymentMethod, s.clientName || '', s.status || 'Completado',
        s.scheduledTime || null, s.paymentStatus || 'Pagado', parseInt(s.quantity || '1', 10)
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sales/:id', async (req, res) => {
  const { id } = req.params;
  if (useLocalDb) {
    const db = readLocalDb();
    db.sales = db.sales.filter(s => s.id !== id);
    writeLocalDb(db);
    return res.status(204).send();
  }
  try {
    await pool.query('DELETE FROM sales WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Expenses
app.get('/api/expenses', async (req, res) => {
  if (useLocalDb) {
    const db = readLocalDb();
    return res.json(db.expenses);
  }
  try {
    const result = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
    const camelCased = result.rows.map(row => ({
      id: row.id,
      date: row.date,
      description: row.description,
      amount: parseFloat(row.amount),
      impact: row.impact
    }));
    res.json(camelCased);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  const e = req.body;
  if (useLocalDb) {
    const db = readLocalDb();
    const existsIndex = db.expenses.findIndex(item => item.id === e.id);
    if (existsIndex !== -1) {
      db.expenses[existsIndex] = e;
    } else {
      db.expenses.unshift(e);
    }
    writeLocalDb(db);
    return res.status(201).json(e);
  }
  try {
    const result = await pool.query(
      `INSERT INTO expenses (id, date, description, amount, impact) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (id) DO UPDATE SET date = $2, description = $3, amount = $4, impact = $5 
       RETURNING *`,
      [e.id, e.date, e.description, e.amount, e.impact]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;
  if (useLocalDb) {
    const db = readLocalDb();
    db.expenses = db.expenses.filter(e => e.id !== id);
    writeLocalDb(db);
    return res.status(204).send();
  }
  try {
    await pool.query('DELETE FROM expenses WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

initDb().then(() => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
});
