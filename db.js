// Unified DB layer: Neon Pool (serverless) in production,
// node:sqlite (file) locally when DATABASE_URL is unset.
//
// Public surface:
//   db.dialect  → 'neon' | 'sqlite'
//   await db.all(sql, params)   → array of rows
//   await db.get(sql, params)   → first row or undefined
//   await db.run(sql, params)   → { lastInsertRowid, changes }
//
// All params use ? placeholders (sqlite style). For neon we convert
// to $1, $2, ... at call time.

const hasNeon = !!process.env.DATABASE_URL;

let driver;
let pool;          // neon Pool
let local;         // sqlite DatabaseSync

if (hasNeon) {
  const { Pool } = await import('@neondatabase/serverless');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  driver = 'neon';
  console.log('[db] driver: neon Pool (serverless postgres)');
} else {
  const { DatabaseSync } = await import('node:sqlite');
  const path = await import('node:path');
  const fs = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  local = new DatabaseSync(path.join(dataDir, 'app.db'));
  local.exec('PRAGMA journal_mode = WAL');
  local.exec('PRAGMA foreign_keys = ON');
  driver = 'sqlite';
  console.log('[db] driver: node:sqlite (local file)');
}

// Convert ? placeholders to $1, $2, ... for postgres
function toPg(text) {
  let i = 0;
  return text.replace(/\?/g, () => `$${++i}`);
}

const SCHEMA_SQLITE = `
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    read INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    itinerary TEXT NOT NULL,
    start_date TEXT NOT NULL,
    group_size INTEGER NOT NULL,
    tier TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    confirmed INTEGER DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_contacts_created ON contacts(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_subscribers_created ON subscribers(created_at DESC);
`;

const SCHEMA_POSTGRES = `
  CREATE TABLE IF NOT EXISTS contacts (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read INT DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    itinerary TEXT NOT NULL,
    start_date TEXT NOT NULL,
    group_size INT NOT NULL,
    tier TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS subscribers (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed INT DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_contacts_created ON contacts(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_subscribers_created ON subscribers(created_at DESC);
`;

// Init schema
if (driver === 'sqlite') {
  local.exec(SCHEMA_SQLITE);
} else {
  const client = await pool.connect();
  try {
    for (const stmt of SCHEMA_POSTGRES.split(';').map(s => s.trim()).filter(Boolean)) {
      await client.query(stmt);
    }
  } finally {
    client.release();
  }
}

export const db = {
  dialect: driver,

  async all(text, params = []) {
    if (driver === 'sqlite') {
      const stmt = local.prepare(text);
      return stmt.all(...params);
    } else {
      const { rows } = await pool.query(toPg(text), params);
      return rows;
    }
  },

  async get(text, params = []) {
    if (driver === 'sqlite') {
      const stmt = local.prepare(text);
      return stmt.get(...params);
    } else {
      const { rows } = await pool.query(toPg(text), params);
      return rows[0];
    }
  },

  async run(text, params = []) {
    if (driver === 'sqlite') {
      const stmt = local.prepare(text);
      const info = stmt.run(...params);
      return { lastInsertRowid: info.lastInsertRowid, changes: info.changes };
    } else {
      let sqlText = text;
      let returnsId = false;
      if (!/\bRETURNING\b/i.test(text) && /\bINSERT\s+INTO\b/i.test(text)) {
        sqlText = text.replace(/;?\s*$/, '') + ' RETURNING id';
        returnsId = true;
      }
      const { rows } = await pool.query(toPg(sqlText), params);
      if (returnsId) return { lastInsertRowid: rows[0]?.id ?? null, changes: rows.length };
      return { lastInsertRowid: null, changes: rows.length };
    }
  },
};
