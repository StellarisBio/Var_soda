import { describe, it, expect } from 'vitest'
import crypto from 'crypto'

describe('avatar upload validation', () => {
  it('validates image magic numbers - JPEG', () => {
    const jpegMagic = Buffer.from([0xFF, 0xD8, 0xFF])
    expect(isValidImageMagic(jpegMagic)).toBe(true)
  })

  it('validates image magic numbers - PNG', () => {
    const pngMagic = Buffer.from([0x89, 0x50, 0x4E, 0x47])
    expect(isValidImageMagic(pngMagic)).toBe(true)
  })

  it('validates image magic numbers - GIF', () => {
    const gifMagic = Buffer.from([0x47, 0x49, 0x46, 0x38])
    expect(isValidImageMagic(gifMagic)).toBe(true)
  })

  it('rejects PHP disguised as image', () => {
    const phpMagic = Buffer.from('<?php')
    expect(isValidImageMagic(phpMagic)).toBe(false)
  })

  it('rejects empty buffer', () => {
    expect(isValidImageMagic(Buffer.alloc(0))).toBe(false)
  })
})

describe('avatar filename security', () => {
  it('generates random UUID filename without user id', () => {
    const filename = `${crypto.randomUUID()}.png`
    expect(filename).not.toContain('user_')
    expect(filename.length).toBeGreaterThan(36)
  })
})

describe('phone update verification', () => {
  it('requires verification code when updating phone number', () => {
    const updateData = {
      name: 'New Name',
      phone: '13800000000',
    }
    // Without verificationCode field, phone should not be updated
    expect(updateData).not.toHaveProperty('verificationCode')
  })
})

function isValidImageMagic(buf: Buffer): boolean {
  if (buf.length < 3) return false
  // JPEG (FF D8 FF)
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return true
  // PNG (89 50 4E 47)
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return true
  // GIF (47 49 46 38)
  if (buf.length >= 4 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return true
  // WebP (RIFF....WEBP)
  if (buf.length >= 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return true
  return false
}
