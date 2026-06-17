import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * JWT 密钥配置测试
 * 验证开发环境缺少 JWT_SECRET 时使用默认值，而非抛出错误
 */
describe('JWT secret configuration', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('uses default secret in development when JWT_SECRET is not set', async () => {
    // 开发环境下未设置 JWT_SECRET 时应使用默认值，不抛出错误
    delete process.env.JWT_SECRET
    process.env.NODE_ENV = 'development'
    const { getJwtSecret } = await import('../../middleware/auth.js')
    // 应返回默认密钥，而非抛出错误
    const secret = getJwtSecret()
    expect(secret).toBeDefined()
    expect(typeof secret).toBe('string')
    expect(secret.length).toBeGreaterThan(0)
  })

  it('uses JWT_SECRET from environment when set', async () => {
    process.env.JWT_SECRET = 'my-test-secret-123'
    const { getJwtSecret } = await import('../../middleware/auth.js')
    expect(getJwtSecret()).toBe('my-test-secret-123')
    delete process.env.JWT_SECRET
  })
})
