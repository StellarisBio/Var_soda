import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js'
import bcrypt from 'bcryptjs'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbDir = path.join(__dirname, '..', 'data')
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const dbPath = path.join(dbDir, 'wes-variant.db')

/**
 * 兼容 better-sqlite3 的 Statement 包装器
 */
class StatementWrapper {
  private db: SqlJsDatabase
  private sql: string
  private inTransaction: () => boolean

  constructor(db: SqlJsDatabase, sql: string, inTransaction: () => boolean) {
    this.db = db
    this.sql = sql
    this.inTransaction = inTransaction
  }

  run(...params: any[]): { changes: number; lastInsertRowid: number | bigint } {
    this.db.run(this.sql, params as any[])
    const changes = this.db.getRowsModified()
    // 使用 prepare+step 代替 exec，避免 sql.js exec 隐式提交事务
    const stmt = this.db.prepare('SELECT last_insert_rowid() as id')
    stmt.step()
    const lastInsertRowid = stmt.get()[0] as number
    stmt.free()
    // 非事务操作后立即保存到磁盘
    if (!this.inTransaction()) {
      saveDb()
    }
    return { changes, lastInsertRowid }
  }

  get(...params: any[]): any {
    const stmt = this.db.prepare(this.sql)
    stmt.bind(params as any[])
    let result: any = undefined
    if (stmt.step()) {
      const columns = stmt.getColumnNames()
      const values = stmt.get()
      result = {}
      for (let i = 0; i < columns.length; i++) {
        result[columns[i]] = typeof values[i] === 'bigint' ? Number(values[i]) : values[i]
      }
    }
    stmt.free()
    return result
  }

  all(...params: any[]): any[] {
    const stmt = this.db.prepare(this.sql)
    stmt.bind(params as any[])
    const results: any[] = []
    while (stmt.step()) {
      const columns = stmt.getColumnNames()
      const values = stmt.get()
      const row: any = {}
      for (let i = 0; i < columns.length; i++) {
        row[columns[i]] = typeof values[i] === 'bigint' ? Number(values[i]) : values[i]
      }
      results.push(row)
    }
    stmt.free()
    return results
  }
}

/**
 * 兼容 better-sqlite3 的 Database 包装器
 */
class DatabaseWrapper {
  private db: SqlJsDatabase
  private _inTransaction = false

  constructor(db: SqlJsDatabase) {
    this.db = db
  }

  pragma(str: string): void {
    this.db.run(`PRAGMA ${str}`)
  }

  exec(sql: string): void {
    this.db.run(sql)
    saveDb()
  }

  prepare(sql: string): StatementWrapper {
    return new StatementWrapper(this.db, sql, () => this._inTransaction)
  }

  transaction(fn: (...args: any[]) => any): (...args: any[]) => any {
    return (...args: any[]) => {
      this.db.run('BEGIN TRANSACTION')
      this._inTransaction = true
      try {
        const result = fn(...args)
        this.db.run('COMMIT')
        this._inTransaction = false
        saveDb()
        return result
      } catch (err) {
        this._inTransaction = false
        this.db.run('ROLLBACK')
        throw err
      }
    }
  }
}

let dbInstance: DatabaseWrapper | null = null
let rawDb: SqlJsDatabase | null = null

/**
 * 保存数据库到磁盘
 */
function saveDb(): void {
  if (rawDb) {
    const data = rawDb.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  }
}

/**
 * 初始化数据库（异步，因为 sql.js 需要加载 WASM）
 */
export async function initDatabase(): Promise<DatabaseWrapper> {
  const SQL = await initSqlJs()

  // 如果已有数据库文件，加载它
  let db: SqlJsDatabase
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  rawDb = db

  // Enable WAL mode (sql.js 不完全支持 WAL，使用 DELETE 模式代替)
  db.run('PRAGMA journal_mode = DELETE')
  db.run('PRAGMA foreign_keys = ON')

  // Create tables
  db.run(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  institution TEXT,
  role TEXT NOT NULL DEFAULT 'analyst' CHECK(role IN ('admin', 'reviewer', 'analyst')),
  avatar TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`)

  db.run(`
CREATE TABLE IF NOT EXISTS variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chromosome TEXT NOT NULL,
  position INTEGER NOT NULL,
  ref_allele TEXT NOT NULL,
  alt_allele TEXT NOT NULL,
  gene TEXT NOT NULL,
  transcript TEXT,
  cdna_change TEXT,
  protein_change TEXT,
  acmg_class TEXT NOT NULL CHECK(acmg_class IN ('Pathogenic', 'Likely Pathogenic', 'VUS', 'Likely Benign', 'Benign')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`)

  db.run('CREATE INDEX IF NOT EXISTS idx_variants_gene ON variants(gene)')
  db.run('CREATE INDEX IF NOT EXISTS idx_variants_chromosome_position ON variants(chromosome, position)')
  db.run('CREATE INDEX IF NOT EXISTS idx_variants_acmg_class ON variants(acmg_class)')
  db.run('CREATE INDEX IF NOT EXISTS idx_variants_status ON variants(status)')
  db.run('CREATE INDEX IF NOT EXISTS idx_variants_cdna ON variants(cdna_change)')
  db.run('CREATE INDEX IF NOT EXISTS idx_variants_protein ON variants(protein_change)')

  db.run(`
CREATE TABLE IF NOT EXISTS acmg_evidences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  variant_id INTEGER NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  checked INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  UNIQUE(variant_id, code)
);
`)

  db.run(`
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  variant_id INTEGER NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  reviewer_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK(status IN ('approved', 'rejected')),
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`)

  db.run(`
CREATE TABLE IF NOT EXISTS variant_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  variant_id INTEGER NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  changes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`)

  // Seed admin user if not exists
  const stmt = db.prepare('SELECT id FROM users WHERE email = ?')
  stmt.bind(['admin@wes-db.com'])
  const adminExists = stmt.step()
  stmt.free()

  if (!adminExists) {
    const passwordHash = bcrypt.hashSync('admin123', 10)
    db.run("INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)", [
      'admin@wes-db.com', passwordHash, '系统管理员', 'admin'
    ])
  }

  // 迁移：为已有的 variants 表添加 genome_build 列
  const variantColumns = db.exec("PRAGMA table_info(variants)")
  if (variantColumns.length > 0) {
    const columnNames = variantColumns[0].values.map((col: any) => col[1])
    if (!columnNames.includes('genome_build')) {
      db.run("ALTER TABLE variants ADD COLUMN genome_build TEXT NOT NULL DEFAULT 'GRCh38' CHECK(genome_build IN ('GRCh37', 'GRCh38'))")
    }
  }

  // 迁移：为已有的 users 表添加缺失的列
  const userColumns = db.exec("PRAGMA table_info(users)")
  if (userColumns.length > 0) {
    const columnNames = userColumns[0].values.map((col: any) => col[1])
    if (!columnNames.includes('phone')) {
      db.run('ALTER TABLE users ADD COLUMN phone TEXT UNIQUE')
    }
    if (!columnNames.includes('avatar')) {
      db.run('ALTER TABLE users ADD COLUMN avatar TEXT')
    }
  }

  // 迁移：为已有的 verification_codes 表更新结构
  const vcColumns = db.exec("PRAGMA table_info(verification_codes)")
  if (vcColumns.length > 0) {
    const columnNames = vcColumns[0].values.map((col: any) => col[1])
    const needsMigration = !columnNames.includes('type') || !columnNames.includes('target')
    if (needsMigration) {
      // 旧表结构（有 email 列，无 type/target 列），需要重建
      db.run('ALTER TABLE verification_codes RENAME TO verification_codes_old')
      db.run(`
CREATE TABLE verification_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'email' CHECK(type IN ('email', 'phone')),
  purpose TEXT NOT NULL CHECK(purpose IN ('register', 'reset_password', 'login')),
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
      `)
      // 迁移旧数据：email → target, 补 type='email'
      const hasEmailCol = columnNames.includes('email')
      if (hasEmailCol) {
        db.run(`INSERT INTO verification_codes (id, target, code, type, purpose, expires_at, used, created_at)
          SELECT id, email, code, 'email', purpose, expires_at, used, created_at FROM verification_codes_old`)
      } else {
        db.run(`INSERT INTO verification_codes SELECT * FROM verification_codes_old`)
      }
      db.run('DROP TABLE verification_codes_old')
    } else {
      // 已有 target 和 type 列，但 purpose 的 CHECK 约束可能不含 'login'
      // 尝试插入 login purpose 的验证码来检测，如果失败则重建
      try {
        db.run(`INSERT INTO verification_codes (target, code, type, purpose, expires_at)
          VALUES ('__test__', '000000', 'email', 'login', datetime('now', '+1 minute'))`)
        // 成功说明约束已包含 login，删除测试数据
        db.run(`DELETE FROM verification_codes WHERE target = '__test__'`)
      } catch {
        // CHECK 约束不含 login，需要重建
        db.run('ALTER TABLE verification_codes RENAME TO verification_codes_old')
        db.run(`
CREATE TABLE verification_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'email' CHECK(type IN ('email', 'phone')),
  purpose TEXT NOT NULL CHECK(purpose IN ('register', 'reset_password', 'login')),
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
        `)
        db.run(`INSERT INTO verification_codes SELECT * FROM verification_codes_old`)
        db.run('DROP TABLE verification_codes_old')
      }
    }
  }

  // 验证码表
  db.run(`
CREATE TABLE IF NOT EXISTS verification_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'email' CHECK(type IN ('email', 'phone')),
  purpose TEXT NOT NULL CHECK(purpose IN ('register', 'reset_password', 'login')),
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`)

  db.run('CREATE INDEX IF NOT EXISTS idx_verification_codes_target ON verification_codes(target)')
  db.run('CREATE INDEX IF NOT EXISTS idx_verification_codes_target_purpose ON verification_codes(target, purpose)')

  // 保存到磁盘
  saveDb()

  dbInstance = new DatabaseWrapper(db)
  return dbInstance
}

/**
 * 获取数据库实例
 */
export function getDb(): DatabaseWrapper {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return dbInstance
}

/**
 * 获取原始 sql.js 数据库实例（用于批量操作等高性能场景）
 */
export function getRawDb(): SqlJsDatabase {
  if (!rawDb) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return rawDb
}

/**
 * 手动保存数据库到磁盘
 */
export function saveDbSync(): void {
  saveDb()
}

export default dbInstance!
