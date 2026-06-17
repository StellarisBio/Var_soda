import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'

/**
 * 数据库种子数据测试
 * 验证 database.ts 中管理员账户使用硬编码的 admin@wes-db.com / admin123
 * 而非依赖 ADMIN_PASSWORD 环境变量
 */
describe('database seeding configuration', () => {
  // 读取 database.ts 源码，验证种子数据逻辑
  // database.ts 位于 api/ 目录，测试文件位于 api/test/ 目录
  const dbSource = fs.readFileSync(
    path.join(__dirname, '..', 'database.ts'),
    'utf-8'
  )

  it('uses hardcoded admin123 as default admin password', () => {
    // 源码中应包含硬编码的 admin123 密码
    expect(dbSource).toContain("bcrypt.hashSync('admin123'")
  })

  it('uses admin@wes-db.com as default admin email', () => {
    // 源码中应使用 admin@wes-db.com 作为管理员邮箱
    expect(dbSource).toContain('admin@wes-db.com')
  })

  it('does not depend on ADMIN_PASSWORD env var', () => {
    // 源码中不应依赖 ADMIN_PASSWORD 环境变量
    expect(dbSource).not.toContain('process.env.ADMIN_PASSWORD')
  })
})

/**
 * 密码哈希验证
 * 确保 admin123 能正确生成和验证 bcrypt 哈希
 */
describe('admin password hashing', () => {
  it('correctly hashes and verifies admin123', () => {
    const password = 'admin123'
    const hash = bcrypt.hashSync(password, 10)
    expect(bcrypt.compareSync('admin123', hash)).toBe(true)
    expect(bcrypt.compareSync('wrong', hash)).toBe(false)
  })
})
