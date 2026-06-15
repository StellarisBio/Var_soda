import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'
import { sendVerificationEmail } from '../email.js'

const router = Router()

/**
 * POST /api/verification/send
 * 发送验证码（邮箱或手机）
 */
router.post('/send', async (req: Request, res: Response): Promise<void> => {
  try {
    const { target, type, purpose } = req.body as {
      target: string
      type: 'email' | 'phone'
      purpose: 'register' | 'reset_password' | 'login'
    }

    if (!target || !type || !purpose) {
      res.status(400).json({ success: false, error: '目标、类型和用途为必填项' })
      return
    }

    if (!['email', 'phone'].includes(type)) {
      res.status(400).json({ success: false, error: '无效的类型' })
      return
    }

    if (!['register', 'reset_password', 'login'].includes(purpose)) {
      res.status(400).json({ success: false, error: '无效的用途' })
      return
    }

    // 手机号格式验证
    if (type === 'phone' && !/^1[3-9]\d{9}$/.test(target)) {
      res.status(400).json({ success: false, error: '手机号格式不正确' })
      return
    }

    // 邮箱格式验证
    if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      res.status(400).json({ success: false, error: '邮箱格式不正确' })
      return
    }

    const db = getDb()

    // 注册时检查是否已存在
    if (purpose === 'register') {
      const field = type === 'email' ? 'email' : 'phone'
      const existing = db.prepare(`SELECT id FROM users WHERE ${field} = ?`).get(target)
      if (existing) {
        res.status(409).json({ success: false, error: type === 'email' ? '该邮箱已被注册' : '该手机号已被注册' })
        return
      }
    }

    // 重置密码时检查是否存在
    if (purpose === 'reset_password') {
      const field = type === 'email' ? 'email' : 'phone'
      const existing = db.prepare(`SELECT id FROM users WHERE ${field} = ?`).get(target)
      if (!existing) {
        res.status(404).json({ success: false, error: type === 'email' ? '该邮箱未注册' : '该手机号未注册' })
        return
      }
    }

    // 手机登录时检查是否存在
    if (purpose === 'login' && type === 'phone') {
      const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(target)
      if (!existing) {
        res.status(404).json({ success: false, error: '该手机号未注册' })
        return
      }
    }

    // 检查发送频率（60秒内不能重复发送）
    const recent = db.prepare(
      "SELECT id FROM verification_codes WHERE target = ? AND type = ? AND purpose = ? AND created_at > datetime('now', '-60 seconds') AND used = 0"
    ).get(target, type, purpose)
    if (recent) {
      res.status(429).json({ success: false, error: '发送过于频繁，请60秒后重试' })
      return
    }

    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // 过期时间 10 分钟
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19)

    // 保存验证码
    db.prepare(
      'INSERT INTO verification_codes (target, code, type, purpose, expires_at) VALUES (?, ?, ?, ?, ?)'
    ).run(target, code, type, purpose, expiresAt)

    // 发送验证码
    let sent = false
    const isDevMode = type === 'phone' ? true : (!process.env.SMTP_HOST || !process.env.SMTP_USER)

    if (type === 'email') {
      sent = await sendVerificationEmail(target, code, purpose as 'register' | 'reset_password')
    } else {
      // 手机验证码：开发模式输出到控制台
      console.log(`[DEV MODE] SMS code for ${target} (${purpose}): ${code}`)
      sent = true
    }

    if (!sent && !isDevMode) {
      res.status(500).json({ success: false, error: '验证码发送失败，请稍后重试' })
      return
    }

    res.json({
      success: true,
      message: isDevMode ? '验证码已生成（开发模式）' : '验证码已发送',
      ...(isDevMode ? { devCode: code } : {}),
    })
  } catch (error) {
    console.error('Send verification code error:', error)
    res.status(500).json({ success: false, error: '发送验证码失败' })
  }
})

/**
 * POST /api/verification/verify
 * 验证验证码
 */
router.post('/verify', (req: Request, res: Response): void => {
  try {
    const { target, code, type, purpose } = req.body as {
      target: string
      code: string
      type: 'email' | 'phone'
      purpose: 'register' | 'reset_password' | 'login'
    }

    if (!target || !code || !type || !purpose) {
      res.status(400).json({ success: false, error: '目标、验证码、类型和用途为必填项' })
      return
    }

    const db = getDb()

    const record = db.prepare(
      "SELECT * FROM verification_codes WHERE target = ? AND code = ? AND type = ? AND purpose = ? AND used = 0 AND expires_at > datetime('now') ORDER BY created_at DESC LIMIT 1"
    ).get(target, code, type, purpose) as any

    if (!record) {
      res.status(400).json({ success: false, error: '验证码无效或已过期' })
      return
    }

    db.prepare('UPDATE verification_codes SET used = 1 WHERE id = ?').run(record.id)

    res.json({ success: true, message: '验证码验证成功' })
  } catch (error) {
    res.status(500).json({ success: false, error: '验证码验证失败' })
  }
})

export default router
