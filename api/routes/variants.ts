import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import { getDb, getRawDb, saveDbSync } from '../database.js'
import { authenticate } from '../middleware/auth.js'
import type { Variant, VariantDetail, ACMGEvidence, Review, HistoryRecord } from '../../shared/types.js'

const router = Router()

// CSV 文件上传配置
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase()
    if (ext.endsWith('.csv') || ext.endsWith('.txt')) {
      cb(null, true)
    } else {
      cb(new Error('仅支持 CSV 文件'))
    }
  },
})

/**
 * 解析 CSV 文本为行数组
 */
function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(line => line.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
  const rows: string[][] = []

  for (let i = 1; i < lines.length; i++) {
    const row: string[] = []
    let current = ''
    let inQuotes = false

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    row.push(current.trim())
    if (row.some(cell => cell !== '')) {
      rows.push(row)
    }
  }

  return { headers, rows }
}

// CSV 列名映射（支持中英文列名）
const COLUMN_MAP: Record<string, string> = {
  'chromosome': 'chromosome', 'chr': 'chromosome', '染色体': 'chromosome',
  'position': 'position', 'pos': 'position', '位置': 'position',
  'ref_allele': 'ref_allele', 'ref': 'ref_allele', 'refallele': 'ref_allele', '参考等位基因': 'ref_allele',
  'alt_allele': 'alt_allele', 'alt': 'alt_allele', 'altallele': 'alt_allele', '变异等位基因': 'alt_allele',
  'gene': 'gene', '基因': 'gene',
  'transcript': 'transcript', '转录本': 'transcript',
  'cdna_change': 'cdna_change', 'cdna': 'cdna_change', 'cdnachange': 'cdna_change', 'cdna变化': 'cdna_change',
  'protein_change': 'protein_change', 'protein': 'protein_change', 'proteinchange': 'protein_change', '蛋白质变化': 'protein_change',
  'acmg_class': 'acmg_class', 'acmg': 'acmg_class', 'acmgclass': 'acmg_class', 'acmg分类': 'acmg_class',
  'genome_build': 'genome_build', 'genomebuild': 'genome_build', '基因组版本': 'genome_build', '参考基因组': 'genome_build',
  'notes': 'notes', '备注': 'notes',
}

const VALID_ACMG = ['Pathogenic', 'Likely Pathogenic', 'VUS', 'Likely Benign', 'Benign']

/**
 * POST /api/variants/import - 批量导入变体（CSV 文件）
 */
router.post('/import', authenticate, csvUpload.single('file'), (req: Request, res: Response): void => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: '请选择 CSV 文件' })
      return
    }

    const text = req.file.buffer.toString('utf-8')
    const { headers, rows } = parseCSV(text)

    if (headers.length === 0 || rows.length === 0) {
      res.status(400).json({ success: false, error: 'CSV 文件为空或格式不正确' })
      return
    }

    // 映射列名
    const fieldIndices: Record<string, number> = {}
    headers.forEach((header, index) => {
      const mapped = COLUMN_MAP[header]
      if (mapped) {
        fieldIndices[mapped] = index
      }
    })

    // 检查必填列
    const requiredFields = ['chromosome', 'position', 'ref_allele', 'alt_allele', 'gene', 'acmg_class']
    const missingFields = requiredFields.filter(f => fieldIndices[f] === undefined)
    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        error: `CSV 缺少必填列: ${missingFields.join(', ')}`,
      })
      return
    }

    // 使用原生 sql.js API 进行批量插入，避免兼容层问题
    const rawDb = getRawDb()
    rawDb.run('BEGIN TRANSACTION')

    let imported = 0
    let skipped = 0
    const errors: { row: number; reason: string }[] = []

    try {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const getValue = (field: string): string => {
          const idx = fieldIndices[field]
          return idx !== undefined ? (row[idx] || '') : ''
        }

        const chromosome = getValue('chromosome')
        const positionStr = getValue('position')
        const ref_allele = getValue('ref_allele')
        const alt_allele = getValue('alt_allele')
        const gene = getValue('gene')
        const acmg_class = getValue('acmg_class')

        // 验证必填字段
        if (!chromosome || !positionStr || !ref_allele || !alt_allele || !gene || !acmg_class) {
          skipped++
          errors.push({ row: i + 2, reason: '缺少必填字段' })
          continue
        }

        // 验证 position 是数字
        const position = parseInt(positionStr)
        if (isNaN(position)) {
          skipped++
          errors.push({ row: i + 2, reason: `位置不是有效数字: ${positionStr}` })
          continue
        }

        // 验证 ACMG 分类
        if (!VALID_ACMG.includes(acmg_class)) {
          skipped++
          errors.push({ row: i + 2, reason: `无效的 ACMG 分类: ${acmg_class}` })
          continue
        }

        try {
          const genomeBuild = getValue('genome_build')
          const finalGenomeBuild = (genomeBuild === 'GRCh37' || genomeBuild === 'GRCh38') ? genomeBuild : 'GRCh38'
          rawDb.run(
            'INSERT INTO variants (chromosome, position, ref_allele, alt_allele, gene, transcript, cdna_change, protein_change, acmg_class, genome_build, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [chromosome, position, ref_allele, alt_allele, gene,
             getValue('transcript') || null, getValue('cdna_change') || null,
             getValue('protein_change') || null, acmg_class, finalGenomeBuild,
             getValue('notes') || null,
             req.user!.id]
          )
          const rowidResult = rawDb.exec('SELECT last_insert_rowid() as id')
          const variantId = rowidResult.length > 0 && rowidResult[0].values.length > 0
            ? rowidResult[0].values[0][0] : 0

          rawDb.run(
            'INSERT INTO variant_history (variant_id, user_id, action, changes) VALUES (?, ?, ?, ?)',
            [variantId, req.user!.id, '批量导入', null]
          )
          imported++
        } catch (err: any) {
          skipped++
          errors.push({ row: i + 2, reason: err.message || '插入失败' })
        }
      }

      rawDb.run('COMMIT')
      saveDbSync()
    } catch (err) {
      rawDb.run('ROLLBACK')
      throw err
    }

    res.json({
      success: true,
      data: {
        imported,
        skipped,
        total: rows.length,
        errors: errors.slice(0, 20),
      },
    })
  } catch (error: any) {
    console.error('Import error:', error)
    if (error.message === '仅支持 CSV 文件') {
      res.status(400).json({ success: false, error: error.message })
      return
    }
    res.status(500).json({ success: false, error: error.message || '批量导入失败' })
  }
})

/**
 * GET /api/variants - List variants with pagination, search, and filter
 */
router.get('/', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20))
    const search = req.query.search as string || ''
    const acmgClass = req.query.acmgClass as string || ''
    const status = req.query.status as string || ''
    const gene = req.query.gene as string || ''
    const genomeBuild = req.query.genomeBuild as string || ''

    const conditions: string[] = []
    const params: any[] = []

    if (search) {
      conditions.push('(v.gene LIKE ? OR v.cdna_change LIKE ? OR v.protein_change LIKE ?)')
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
    if (acmgClass) {
      conditions.push('v.acmg_class = ?')
      params.push(acmgClass)
    }
    if (status) {
      conditions.push('v.status = ?')
      params.push(status)
    }
    if (gene) {
      conditions.push('v.gene = ?')
      params.push(gene)
    }
    if (genomeBuild) {
      conditions.push('v.genome_build = ?')
      params.push(genomeBuild)
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    const totalRow = db.prepare(`SELECT COUNT(*) as count FROM variants v ${whereClause}`).get(...params) as any
    const total = totalRow.count

    const offset = (page - 1) * pageSize
    const variants = db.prepare(
      `SELECT v.*, u.name as creatorName FROM variants v LEFT JOIN users u ON v.created_by = u.id ${whereClause} ORDER BY v.created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, pageSize, offset) as any[]

    res.json({
      success: true,
      data: {
        total,
        page,
        pageSize,
        data: variants,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取变体列表失败' })
  }
})

/**
 * GET /api/variants/:id - Get variant detail
 */
router.get('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const variant = db.prepare(
      'SELECT v.*, u.name as creatorName FROM variants v LEFT JOIN users u ON v.created_by = u.id WHERE v.id = ?'
    ).get(req.params.id) as any

    if (!variant) {
      res.status(404).json({ success: false, error: '变体不存在' })
      return
    }

    const evidences = db.prepare('SELECT * FROM acmg_evidences WHERE variant_id = ?').all(variant.id) as ACMGEvidence[]
    const reviews = db.prepare(
      'SELECT r.*, u.name as reviewerName FROM reviews r LEFT JOIN users u ON r.reviewer_id = u.id WHERE r.variant_id = ? ORDER BY r.created_at DESC'
    ).all(variant.id) as any[]
    const history = db.prepare(
      'SELECT h.*, u.name as userName FROM variant_history h LEFT JOIN users u ON h.user_id = u.id WHERE h.variant_id = ? ORDER BY h.created_at DESC'
    ).all(variant.id) as any[]

    const detail: VariantDetail = {
      ...variant,
      evidences,
      reviews,
      history,
    }

    res.json({ success: true, data: detail })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取变体详情失败' })
  }
})

/**
 * POST /api/variants - Create variant
 */
router.post('/', authenticate, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const {
      chromosome, position, ref_allele, alt_allele,
      gene, transcript, cdna_change, protein_change,
      acmg_class, genome_build, notes, evidences,
    } = req.body

    if (!chromosome || !position || !ref_allele || !alt_allele || !gene || !acmg_class) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }

    const finalGenomeBuild = (genome_build === 'GRCh37' || genome_build === 'GRCh38') ? genome_build : 'GRCh38'

    const insertVariant = db.prepare(`
      INSERT INTO variants (chromosome, position, ref_allele, alt_allele, gene, transcript, cdna_change, protein_change, acmg_class, genome_build, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const insertEvidence = db.prepare(`
      INSERT INTO acmg_evidences (variant_id, code, checked, description)
      VALUES (?, ?, ?, ?)
    `)

    const insertHistory = db.prepare(`
      INSERT INTO variant_history (variant_id, user_id, action, changes)
      VALUES (?, ?, ?, ?)
    `)

    const transaction = db.transaction(() => {
      const result = insertVariant.run(
        chromosome, position, ref_allele, alt_allele,
        gene, transcript || null, cdna_change || null, protein_change || null,
        acmg_class, finalGenomeBuild, notes || null, req.user!.id
      )

      const variantId = result.lastInsertRowid

      if (evidences && Array.isArray(evidences)) {
        for (const ev of evidences) {
          insertEvidence.run(variantId, ev.code, ev.checked ? 1 : 0, ev.description || null)
        }
      }

      insertHistory.run(variantId, req.user!.id, '创建变体', null)

      return variantId
    })

    const variantId = transaction()
    const variant = db.prepare(
      'SELECT v.*, u.name as creatorName FROM variants v LEFT JOIN users u ON v.created_by = u.id WHERE v.id = ?'
    ).get(variantId)

    res.status(201).json({ success: true, data: variant })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建变体失败' })
  }
})

/**
 * PUT /api/variants/:id - Update variant
 */
router.put('/:id', authenticate, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const variant = db.prepare('SELECT * FROM variants WHERE id = ?').get(req.params.id) as any
    if (!variant) {
      res.status(404).json({ success: false, error: '变体不存在' })
      return
    }

    const userRole = req.user!.role
    const userId = req.user!.id
    if (variant.created_by !== userId && userRole !== 'admin' && userRole !== 'reviewer') {
      res.status(403).json({ success: false, error: '无权修改此变体' })
      return
    }

    const {
      chromosome, position, ref_allele, alt_allele,
      gene, transcript, cdna_change, protein_change,
      acmg_class, genome_build, notes, status, evidences,
    } = req.body

    // Track changes
    const changes: string[] = []
    const fields: Record<string, any> = {}

    if (chromosome !== undefined && chromosome !== variant.chromosome) { fields.chromosome = chromosome; changes.push(`染色体: ${variant.chromosome} → ${chromosome}`) }
    if (position !== undefined && position !== variant.position) { fields.position = position; changes.push(`位置: ${variant.position} → ${position}`) }
    if (ref_allele !== undefined && ref_allele !== variant.ref_allele) { fields.ref_allele = ref_allele; changes.push(`参考等位基因: ${variant.ref_allele} → ${ref_allele}`) }
    if (alt_allele !== undefined && alt_allele !== variant.alt_allele) { fields.alt_allele = alt_allele; changes.push(`变异等位基因: ${variant.alt_allele} → ${alt_allele}`) }
    if (gene !== undefined && gene !== variant.gene) { fields.gene = gene; changes.push(`基因: ${variant.gene} → ${gene}`) }
    if (transcript !== undefined && transcript !== variant.transcript) { fields.transcript = transcript; changes.push(`转录本: ${variant.transcript} → ${transcript}`) }
    if (cdna_change !== undefined && cdna_change !== variant.cdna_change) { fields.cdna_change = cdna_change; changes.push(`cDNA变化: ${variant.cdna_change} → ${cdna_change}`) }
    if (protein_change !== undefined && protein_change !== variant.protein_change) { fields.protein_change = protein_change; changes.push(`蛋白质变化: ${variant.protein_change} → ${protein_change}`) }
    if (acmg_class !== undefined && acmg_class !== variant.acmg_class) { fields.acmg_class = acmg_class; changes.push(`ACMG分类: ${variant.acmg_class} → ${acmg_class}`) }
    if (genome_build !== undefined && genome_build !== variant.genome_build) { fields.genome_build = genome_build; changes.push(`基因组版本: ${variant.genome_build} → ${genome_build}`) }
    if (notes !== undefined && notes !== variant.notes) { fields.notes = notes; changes.push(`备注已更新`) }
    if (status !== undefined && status !== variant.status) { fields.status = status; changes.push(`状态: ${variant.status} → ${status}`) }

    const setClauses: string[] = []
    const values: any[] = []

    for (const [key, value] of Object.entries(fields)) {
      setClauses.push(`${key} = ?`)
      values.push(value)
    }

    const deleteEvidences = db.prepare('DELETE FROM acmg_evidences WHERE variant_id = ?')
    const insertEvidence = db.prepare('INSERT INTO acmg_evidences (variant_id, code, checked, description) VALUES (?, ?, ?, ?)')
    const insertHistory = db.prepare('INSERT INTO variant_history (variant_id, user_id, action, changes) VALUES (?, ?, ?, ?)')

    const transaction = db.transaction(() => {
      if (setClauses.length > 0) {
        setClauses.push("updated_at = datetime('now')")
        values.push(req.params.id)
        db.prepare(`UPDATE variants SET ${setClauses.join(', ')} WHERE id = ?`).run(...values)
      }

      if (evidences && Array.isArray(evidences)) {
        deleteEvidences.run(req.params.id)
        for (const ev of evidences) {
          insertEvidence.run(parseInt(req.params.id), ev.code, ev.checked ? 1 : 0, ev.description || null)
        }
        changes.push('ACMG证据已更新')
      }

      if (changes.length > 0 || (evidences && Array.isArray(evidences))) {
        insertHistory.run(
          parseInt(req.params.id),
          userId,
          '更新变体',
          changes.length > 0 ? JSON.stringify(changes) : null
        )
      }
    })

    transaction()

    const updated = db.prepare(
      'SELECT v.*, u.name as creatorName FROM variants v LEFT JOIN users u ON v.created_by = u.id WHERE v.id = ?'
    ).get(req.params.id)

    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新变体失败' })
  }
})

/**
 * DELETE /api/variants/:id - Delete variant (admin only)
 */
router.delete('/:id', authenticate, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    if (req.user!.role !== 'admin') {
      res.status(403).json({ success: false, error: '仅管理员可删除变体' })
      return
    }

    const variant = db.prepare('SELECT * FROM variants WHERE id = ?').get(req.params.id) as any
    if (!variant) {
      res.status(404).json({ success: false, error: '变体不存在' })
      return
    }

    db.prepare('DELETE FROM variants WHERE id = ?').run(req.params.id)

    res.json({ success: true, data: null })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除变体失败' })
  }
})

/**
 * POST /api/variants/:id/review - Review variant
 */
router.post('/:id/review', authenticate, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const userRole = req.user!.role
    if (userRole !== 'admin' && userRole !== 'reviewer') {
      res.status(403).json({ success: false, error: '仅审核员或管理员可审核变体' })
      return
    }

    const variant = db.prepare('SELECT * FROM variants WHERE id = ?').get(req.params.id) as any
    if (!variant) {
      res.status(404).json({ success: false, error: '变体不存在' })
      return
    }

    const { status, comment } = req.body
    if (!status || (status !== 'approved' && status !== 'rejected')) {
      res.status(400).json({ success: false, error: '审核状态必须为 approved 或 rejected' })
      return
    }

    const insertReview = db.prepare(
      'INSERT INTO reviews (variant_id, reviewer_id, status, comment) VALUES (?, ?, ?, ?)'
    )
    const updateVariantStatus = db.prepare(
      "UPDATE variants SET status = ?, updated_at = datetime('now') WHERE id = ?"
    )
    const insertHistory = db.prepare(
      'INSERT INTO variant_history (variant_id, user_id, action, changes) VALUES (?, ?, ?, ?)'
    )

    const transaction = db.transaction(() => {
      insertReview.run(parseInt(req.params.id), req.user!.id, status, comment || null)
      updateVariantStatus.run(status, req.params.id)
      insertHistory.run(
        parseInt(req.params.id),
        req.user!.id,
        '审核变体',
        JSON.stringify([`状态变更为: ${status === 'approved' ? '已通过' : '已拒绝'}`])
      )
    })

    transaction()

    const updated = db.prepare(
      'SELECT v.*, u.name as creatorName FROM variants v LEFT JOIN users u ON v.created_by = u.id WHERE v.id = ?'
    ).get(req.params.id)

    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: '审核变体失败' })
  }
})

export default router
