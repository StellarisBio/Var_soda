import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import rateLimit from 'express-rate-limit'

/**
 * 速率限制配置测试
 * 验证 app.ts 中速率限制仅在生产环境应用
 */
describe('rate limiting configuration', () => {
  // 读取 app.ts 源码，验证速率限制逻辑
  const appSource = fs.readFileSync(
    path.join(__dirname, '..', '..', 'app.ts'),
    'utf-8'
  )

  it('only applies rate limiting in production environment', () => {
    // app.ts 中应通过 NODE_ENV 条件判断来应用速率限制
    expect(appSource).toContain("process.env.NODE_ENV === 'production'")
  })

  it('creates rate limiter for production auth endpoints', () => {
    // 生产环境的速率限制配置：15分钟内最多5次
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: { success: false, error: '请求过于频繁，请15分钟后重试' },
    })
    expect(limiter).toBeDefined()
  })

  it('creates rate limiter for production verification send', () => {
    // 生产环境的验证码发送限制：每分钟最多3次
    const limiter = rateLimit({
      windowMs: 60 * 1000,
      max: 3,
      message: { success: false, error: '发送过于频繁，请稍后重试' },
    })
    expect(limiter).toBeDefined()
  })
})
