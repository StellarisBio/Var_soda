import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js'
import bcrypt from 'bcryptjs'

export async function createTestDb(): Promise<SqlJsDatabase> {
  const SQL = await initSqlJs()
  const db = new SQL.Database()

  db.run('PRAGMA foreign_keys = ON')

  db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      phone TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      institution TEXT,
      role TEXT NOT NULL DEFAULT 'analyst' CHECK(role IN ('admin', 'reviewer', 'analyst')),
      avatar TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      token_version INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  db.run(`
    CREATE TABLE variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chromosome TEXT NOT NULL,
      position INTEGER NOT NULL,
      ref_allele TEXT NOT NULL,
      alt_allele TEXT NOT NULL,
      gene TEXT NOT NULL,
      transcript TEXT,
      cdna_change TEXT,
      protein_change TEXT,
      acmg_class TEXT NOT NULL,
      genome_build TEXT NOT NULL DEFAULT 'GRCh38',
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      pvs1_result TEXT,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  db.run(`
    CREATE TABLE acmg_evidences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      variant_id INTEGER NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      checked INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      UNIQUE(variant_id, code)
    );
  `)

  db.run(`
    CREATE TABLE reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      variant_id INTEGER NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
      reviewer_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL,
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  db.run(`
    CREATE TABLE variant_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      variant_id INTEGER NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      changes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  db.run(`
    CREATE TABLE verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target TEXT NOT NULL,
      code TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'email',
      purpose TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Seed a test admin
  const passwordHash = bcrypt.hashSync('TestAdmin123!', 10)
  db.run(
    "INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)",
    ['testadmin@test.com', passwordHash, 'Test Admin', 'admin']
  )

  // Seed a test analyst
  const analystHash = bcrypt.hashSync('TestAnalyst123!', 10)
  db.run(
    "INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)",
    ['analyst@test.com', analystHash, 'Test Analyst', 'analyst']
  )

  return db
}
