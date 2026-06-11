import { Router, type Request, type Response } from 'express'
import db from '../database.js'
import { authenticate } from '../middleware/auth.js'
import type { DashboardStats } from '../../shared/types.js'

const router = Router()

/**
 * GET /api/dashboard/stats
 */
router.get('/stats', authenticate, (req: Request, res: Response): void => {
  try {
    const totalVariants = (db.prepare('SELECT COUNT(*) as count FROM variants').get() as any).count

    const monthlyNew = (db.prepare(
      "SELECT COUNT(*) as count FROM variants WHERE created_at >= datetime('now', '-30 days')"
    ).get() as any).count

    const pendingReview = (db.prepare(
      "SELECT COUNT(*) as count FROM variants WHERE status = 'pending'"
    ).get() as any).count

    const acmgRows = db.prepare(
      'SELECT acmg_class, COUNT(*) as count FROM variants GROUP BY acmg_class'
    ).all() as any[]

    const acmgDistribution: DashboardStats['acmgDistribution'] = {
      'Pathogenic': 0,
      'Likely Pathogenic': 0,
      'VUS': 0,
      'Likely Benign': 0,
      'Benign': 0,
    }

    for (const row of acmgRows) {
      if (row.acmg_class in acmgDistribution) {
        acmgDistribution[row.acmg_class as keyof typeof acmgDistribution] = row.count
      }
    }

    const stats: DashboardStats = {
      totalVariants,
      monthlyNew,
      pendingReview,
      acmgDistribution,
    }

    res.json({ success: true, data: stats })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取统计数据失败' })
  }
})

export default router
