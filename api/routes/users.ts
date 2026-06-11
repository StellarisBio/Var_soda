import { Router, type Request, type Response } from 'express'
import db from '../database.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

/**
 * GET /api/users - List all users (admin only)
 */
router.get('/', authenticate, (req: Request, res: Response): void => {
  try {
    if (req.user!.role !== 'admin') {
      res.status(403).json({ success: false, error: '仅管理员可查看用户列表' })
      return
    }

    const users = db.prepare('SELECT id, email, name, institution, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC').all()

    res.json({ success: true, data: users })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取用户列表失败' })
  }
})

/**
 * PUT /api/users/:id - Update user role/active status (admin only)
 */
router.put('/:id', authenticate, (req: Request, res: Response): void => {
  try {
    if (req.user!.role !== 'admin') {
      res.status(403).json({ success: false, error: '仅管理员可修改用户信息' })
      return
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    const { role, is_active } = req.body

    if (role !== undefined && !['admin', 'reviewer', 'analyst'].includes(role)) {
      res.status(400).json({ success: false, error: '无效的角色' })
      return
    }

    if (is_active !== undefined && ![0, 1].includes(is_active)) {
      res.status(400).json({ success: false, error: '无效的激活状态' })
      return
    }

    const updates: string[] = []
    const values: any[] = []

    if (role !== undefined) {
      updates.push('role = ?')
      values.push(role)
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?')
      values.push(is_active)
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: '没有需要更新的字段' })
      return
    }

    updates.push("updated_at = datetime('now')")
    values.push(req.params.id)

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values)

    const updated = db.prepare('SELECT id, email, name, institution, role, is_active, created_at, updated_at FROM users WHERE id = ?').get(req.params.id)

    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新用户信息失败' })
  }
})

export default router
