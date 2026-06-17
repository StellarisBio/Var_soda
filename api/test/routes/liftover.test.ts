import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('GeneBe credentials configuration', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('throws if GENEBE_EMAIL or GENEBE_API_KEY is not set', async () => {
    delete process.env.GENEBE_EMAIL
    delete process.env.GENEBE_API_KEY
    const { getGenebeCredentials } = await import('../../routes/liftover.js')
    expect(() => getGenebeCredentials()).toThrow(/GENEBE/)
  })

  it('reads credentials from environment', async () => {
    process.env.GENEBE_EMAIL = 'test@example.com'
    process.env.GENEBE_API_KEY = 'ak-test-key'
    const { getGenebeCredentials } = await import('../../routes/liftover.js')
    const creds = getGenebeCredentials()
    expect(creds.email).toBe('test@example.com')
    expect(creds.apiKey).toBe('ak-test-key')
    delete process.env.GENEBE_EMAIL
    delete process.env.GENEBE_API_KEY
  })
})
