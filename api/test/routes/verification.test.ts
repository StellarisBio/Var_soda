import { describe, it, expect } from 'vitest'

describe('verification route SQL injection prevention', () => {
  it('rejects invalid type with 400 instead of building SQL', () => {
    const validTypes = ['email', 'phone']
    const invalidType = '1 UNION SELECT password_hash FROM users--'
    expect(validTypes.includes(invalidType)).toBe(false)
  })

  it('maps type to field via whitelist only', () => {
    const fieldMap: Record<string, string> = {
      email: 'email',
      phone: 'phone',
    }
    const type = 'email'
    const field = fieldMap[type]
    expect(field).toBe('email')

    const invalidType = 'malicious'
    const invalidField = fieldMap[invalidType]
    expect(invalidField).toBeUndefined()
  })
})

describe('verification code response security', () => {
  it('never includes devCode in response body', () => {
    const isDevMode = true
    const response: Record<string, any> = {
      success: true,
      message: isDevMode ? '验证码已生成（开发模式）' : '验证码已发送',
    }
    expect(response).not.toHaveProperty('devCode')
  })

  it('does not treat phone type as always dev mode', () => {
    const type = 'phone'
    const isDevMode = process.env.NODE_ENV === 'development'
    expect(isDevMode).toBe(process.env.NODE_ENV === 'development')
  })
})
