import { type Request, type Response, type NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { AuthPayload } from '../../shared/types.js'

const JWT_SECRET = process.env.JWT_SECRET || 'wes-variant-db-secret-key-2024'
const JWT_EXPIRES_IN = '7d'

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: '未提供认证令牌' })
    return
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload
    req.user = decoded
    next()
  } catch {
    res.status(401).json({ success: false, error: '令牌无效或已过期' })
  }
}
