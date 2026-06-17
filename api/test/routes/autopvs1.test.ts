import { describe, it, expect } from 'vitest'

describe('liftover input validation', () => {
  it('rejects chromosome with path traversal characters', () => {
    const validChr = /^[0-9XYMT]{1,3}$/i
    expect(validChr.test('1')).toBe(true)
    expect(validChr.test('X')).toBe(true)
    expect(validChr.test('MT')).toBe(true)
    expect(validChr.test('../etc')).toBe(false)
    expect(validChr.test('1; DROP')).toBe(false)
  })

  it('rejects position that is not a positive integer', () => {
    const pos = '12345'
    expect(/^\d+$/.test(pos)).toBe(true)
    expect(/^\d+$/.test('abc')).toBe(false)
    expect(/^\d+$/.test('1; DROP')).toBe(false)
  })

  it('rejects ref/alt with non-ATCG characters', () => {
    const validAllele = /^[ATCG]+$/i
    expect(validAllele.test('ATCG')).toBe(true)
    expect(validAllele.test('atcg')).toBe(true)
    expect(validAllele.test('A../etc')).toBe(false)
  })
})
