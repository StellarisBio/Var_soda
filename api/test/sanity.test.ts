import { describe, it, expect } from 'vitest'
import { createTestDb } from './setup.js'

describe('test infrastructure', () => {
  it('creates an in-memory database with seeded users', async () => {
    const db = await createTestDb()
    const stmt = db.prepare('SELECT COUNT(*) as count FROM users')
    stmt.step()
    const row = stmt.get()
    stmt.free()
    expect(row[0]).toBe(2) // admin + analyst
  })
})
