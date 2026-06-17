import { type Request, type Response, type NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { AuthPayload } from '../../shared/types.js'
import { getDb } from '../database.js'

let cachedSecret: string | null = null

// 开发环境默认 JWT 密钥（仅用于本地开发，生产环境必须设置 JWT_SECRET）
const DEV_DEFAULT_SECRET = 'wes-variant-db-dev-secret-key-2024'

export function getJwtSecret(): string {
  if (cachedSecret) return cachedSecret
  const secret = process.env.JWT_SECRET
  if (!secret) {
    // 开发环境使用默认密钥，生产环境必须设置
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production. Set it in .env')
    }
    // 开发环境使用默认密钥
    cachedSecret = DEV_DEFAULT_SECRET
    return cachedSecret
  }
  cachedSecret = secret
  return cachedSecret
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' })
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: '未提供认证令牌' })
    return
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthPayload
    // 验证 token_version 是否与数据库一致
    const db = getDb()
    const user = db.prepare('SELECT token_version FROM users WHERE id = ? AND is_active = 1').get(decoded.id) as any
    if (!user || user.token_version !== decoded.tokenVersion) {
      res.status(401).json({ success: false, error: '令牌已失效，请重新登录' })
      return
    }
    req.user = decoded
    next()
  } catch {
    res.status(401).json({ success: false, error: '令牌无效或已过期' })
  }
}
