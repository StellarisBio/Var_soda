import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import db from '../database.js'
import { authenticate, generateToken } from '../middleware/auth.js'
import type { UserPublic } from '../../shared/types.js'

const router = Router()

function toPublicUser(user: any): UserPublic {
  const { password_hash, ...rest } = user
  return rest
}

/**
 * POST /api/auth/register
 */
router.post('/register', (req: Request, res: Response): void => {
  try {
    const { email, password, name, institution } = req.body

    if (!email || !password || !name) {
      res.status(400).json({ success: false, error: '邮箱、密码和姓名为必填项' })
      return
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existing) {
      res.status(409).json({ success: false, error: '该邮箱已被注册' })
      return
    }

    const passwordHash = bcrypt.hashSync(password, 10)
    const result = db.prepare(
      'INSERT INTO users (email, password_hash, name, institution) VALUES (?, ?, ?, ?)'
    ).run(email, passwordHash, name, institution || null)

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as any
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    res.status(201).json({ success: true, data: { user: toPublicUser(user), token } })
  } catch (error) {
    res.status(500).json({ success: false, error: '注册失败' })
  }
})

/**
 * POST /api/auth/login
 */
router.post('/login', (req: Request, res: Response): void => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({ success: false, error: '邮箱和密码为必填项' })
      return
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any
    if (!user) {
      res.status(401).json({ success: false, error: '邮箱或密码错误' })
      return
    }

    if (!user.is_active) {
      res.status(403).json({ success: false, error: '账号已被禁用' })
      return
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      res.status(401).json({ success: false, error: '邮箱或密码错误' })
      return
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    res.json({ success: true, data: { user: toPublicUser(user), token } })
  } catch (error) {
    res.status(500).json({ success: false, error: '登录失败' })
  }
})

/**
 * GET /api/auth/me
 */
router.get('/me', authenticate, (req: Request, res: Response): void => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }
    res.json({ success: true, data: toPublicUser(user) })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取用户信息失败' })
  }
})

export default router
