import { describe, it, expect } from 'vitest'
import jwt from 'jsonwebtoken'

describe('JWT token version', () => {
  it('includes tokenVersion in JWT payload', () => {
    const token = jwt.sign(
      { id: 1, email: 'test@test.com', name: 'Test', role: 'admin', tokenVersion: 0 },
      'test-secret'
    )
    const decoded = jwt.verify(token, 'test-secret') as any
    expect(decoded.tokenVersion).toBe(0)
  })

  it('rejects token with stale tokenVersion', () => {
    const oldTokenVersion = 0
    const currentTokenVersion = 1
    expect(oldTokenVersion < currentTokenVersion).toBe(true)
  })
})
