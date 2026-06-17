import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { getDb } from '../database.js'
import { authenticate, generateToken } from '../middleware/auth.js'
import type { UserPublic } from '../../shared/types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 头像上传配置
const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'avatars')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

/**
 * 验证文件内容是否为有效图片（通过魔数）
 */
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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('仅支持 JPG、PNG、GIF、WebP 格式'))
    }
  },
})

const router = Router()

function toPublicUser(user: any): UserPublic {
  const { password_hash, ...rest } = user
  return rest
}

/**
 * 验证验证码的辅助函数
 */
function verifyCode(db: any, target: string, code: string, type: 'email' | 'phone', purpose: 'register' | 'reset_password' | 'login'): boolean {
  const record = db.prepare(
    "SELECT * FROM verification_codes WHERE target = ? AND code = ? AND type = ? AND purpose = ? AND used = 0 AND expires_at > datetime('now') ORDER BY created_at DESC LIMIT 1"
  ).get(target, code, type, purpose) as any

  if (!record) return false

  db.prepare('UPDATE verification_codes SET used = 1 WHERE id = ?').run(record.id)
  return true
}

/**
 * POST /api/auth/register
 * 支持邮箱或手机号注册
 */
router.post('/register', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { email, phone, password, name, institution, verificationCode, verificationType } = req.body

    if (!password || !name) {
      res.status(400).json({ success: false, error: '密码和姓名为必填项' })
      return
    }

    if (!email && !phone) {
      res.status(400).json({ success: false, error: '邮箱或手机号至少填写一项' })
      return
    }

    if (!verificationCode) {
      res.status(400).json({ success: false, error: '请输入验证码' })
      return
    }

    const vType: 'email' | 'phone' = verificationType || (phone ? 'phone' : 'email')
    const vTarget = vType === 'phone' ? phone : email

    // 验证验证码
    if (!verifyCode(db, vTarget, verificationCode, vType, 'register')) {
      res.status(400).json({ success: false, error: '验证码无效或已过期' })
      return
    }

    // 检查重复
    if (email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
      if (existing) {
        res.status(409).json({ success: false, error: '该邮箱已被注册' })
        return
      }
    }
    if (phone) {
      const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone)
      if (existing) {
        res.status(409).json({ success: false, error: '该手机号已被注册' })
        return
      }
    }

    const passwordHash = bcrypt.hashSync(password, 10)
    const result = db.prepare(
      'INSERT INTO users (email, phone, password_hash, name, institution) VALUES (?, ?, ?, ?, ?)'
    ).run(email || null, phone || null, passwordHash, name, institution || null)

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as any
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tokenVersion: user.token_version || 0,
    })

    res.status(201).json({ success: true, data: { user: toPublicUser(user), token } })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ success: false, error: '注册失败' })
  }
})

/**
 * POST /api/auth/login
 * 支持邮箱+密码 或 手机号+验证码 登录
 */
router.post('/login', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { email, phone, password, verificationCode, loginType } = req.body

    // 手机验证码登录
    if (loginType === 'phone') {
      if (!phone || !verificationCode) {
        res.status(400).json({ success: false, error: '手机号和验证码为必填项' })
        return
      }

      if (!verifyCode(db, phone, verificationCode, 'phone', 'login')) {
        res.status(400).json({ success: false, error: '验证码无效或已过期' })
        return
      }

      const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as any
      if (!user) {
        res.status(401).json({ success: false, error: '该手机号未注册' })
        return
      }

      if (!user.is_active) {
        res.status(403).json({ success: false, error: '账号已被禁用' })
        return
      }

      const token = generateToken({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tokenVersion: user.token_version || 0,
      })

      res.json({ success: true, data: { user: toPublicUser(user), token } })
      return
    }

    // 邮箱密码登录
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
      tokenVersion: user.token_version || 0,
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
    const db = getDb()
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

/**
 * PUT /api/auth/profile - 修改个人资料
 */
router.put('/profile', authenticate, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { name, institution, phone, verificationCode } = req.body

    if (!name) {
      res.status(400).json({ success: false, error: '姓名不能为空' })
      return
    }

    // 如果修改手机号，必须提供验证码
    let phoneToUpdate: string | null = null
    if (phone) {
      if (!verificationCode) {
        res.status(400).json({ success: false, error: '修改手机号需要验证码' })
        return
      }

      // 验证验证码
      const record = db.prepare(
        "SELECT * FROM verification_codes WHERE target = ? AND code = ? AND type = 'phone' AND purpose = 'login' AND used = 0 AND expires_at > datetime('now') ORDER BY created_at DESC LIMIT 1"
      ).get(phone, verificationCode) as any

      if (!record) {
        res.status(400).json({ success: false, error: '验证码无效或已过期' })
        return
      }

      db.prepare('UPDATE verification_codes SET used = 1 WHERE id = ?').run(record.id)

      // 检查是否已被其他用户使用
      const existing = db.prepare('SELECT id FROM users WHERE phone = ? AND id != ?').get(phone, req.user!.id)
      if (existing) {
        res.status(409).json({ success: false, error: '该手机号已被其他用户使用' })
        return
      }
      phoneToUpdate = phone
    }

    db.prepare("UPDATE users SET name = ?, institution = ?, phone = ?, updated_at = datetime('now') WHERE id = ?")
      .run(name, institution || null, phoneToUpdate, req.user!.id)

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any
    res.json({ success: true, data: toPublicUser(user) })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新个人资料失败' })
  }
})

/**
 * PUT /api/auth/change-password - 修改密码
 */
router.put('/change-password', authenticate, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, error: '当前密码和新密码为必填项' })
      return
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, error: '新密码至少6个字符' })
      return
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      res.status(400).json({ success: false, error: '当前密码错误' })
      return
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10)
    db.prepare("UPDATE users SET password_hash = ?, token_version = token_version + 1, updated_at = datetime('now') WHERE id = ?")
      .run(passwordHash, req.user!.id)

    res.json({ success: true, message: '密码修改成功' })
  } catch (error) {
    res.status(500).json({ success: false, error: '修改密码失败' })
  }
})

/**
 * POST /api/auth/reset-password
 */
router.post('/reset-password', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { target, type, newPassword, verificationCode } = req.body

    if (!newPassword) {
      res.status(400).json({ success: false, error: '新密码为必填项' })
      return
    }

    if (!verificationCode) {
      res.status(400).json({ success: false, error: '请输入验证码' })
      return
    }

    if (!target || !type) {
      res.status(400).json({ success: false, error: '请提供邮箱或手机号' })
      return
    }

    const vType: 'email' | 'phone' = type

    if (!verifyCode(db, target, verificationCode, vType, 'reset_password')) {
      res.status(400).json({ success: false, error: '验证码无效或已过期' })
      return
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, error: '密码至少6个字符' })
      return
    }

    // 查找用户
    let user: any
    if (vType === 'email') {
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(target)
    } else {
      user = db.prepare('SELECT * FROM users WHERE phone = ?').get(target)
    }

    if (!user) {
      res.status(404).json({ success: false, error: '账号不存在' })
      return
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10)
    db.prepare("UPDATE users SET password_hash = ?, token_version = token_version + 1, updated_at = datetime('now') WHERE id = ?")
      .run(passwordHash, user.id)

    res.json({ success: true, message: '密码重置成功' })
  } catch (error) {
    res.status(500).json({ success: false, error: '重置密码失败' })
  }
})

/**
 * POST /api/auth/avatar - 上传头像
 */
router.post('/avatar', authenticate, upload.single('avatar'), (req: Request, res: Response): void => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: '请选择图片文件' })
      return
    }

    // 验证文件内容是否为有效图片（通过魔数）
    if (!isValidImageMagic(req.file.buffer)) {
      res.status(400).json({ success: false, error: '文件内容不是有效的图片' })
      return
    }

    const db = getDb()

    // 使用随机 UUID 作为文件名，避免泄露 user id
    const ext = path.extname(req.file.originalname).toLowerCase()
    const filename = `${crypto.randomUUID()}${ext}`
    const filepath = path.join(uploadsDir, filename)
    fs.writeFileSync(filepath, req.file.buffer)

    const avatarPath = `/uploads/avatars/${filename}`

    // 删除旧头像（使用 basename 防止路径遍历）
    const oldUser = db.prepare('SELECT avatar FROM users WHERE id = ?').get(req.user!.id) as any
    if (oldUser?.avatar) {
      const oldFilename = path.basename(oldUser.avatar)
      const oldFilePath = path.join(uploadsDir, oldFilename)
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath)
      }
    }

    db.prepare("UPDATE users SET avatar = ?, updated_at = datetime('now') WHERE id = ?")
      .run(avatarPath, req.user!.id)

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any
    res.json({ success: true, data: { avatar: avatarPath, user: toPublicUser(user) } })
  } catch (error) {
    res.status(500).json({ success: false, error: '上传头像失败' })
  }
})

export default router
