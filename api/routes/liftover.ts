import { Router, type Request, type Response } from 'express'

const router = Router()

// GeneBe API 配置
const GENEBE_API_BASE = 'https://api.genebe.net/cloud/api-public/v1'
const GENEBE_EMAIL = '2514560667@qq.com'
const GENEBE_API_KEY = 'ak-jV2sYrfwbpkFWRV0wz7TS7FnT7sBdUEN'

/**
 * 处理 GeneBe API 返回结果：0-based→1-based，chr 前缀，保留用户输入的 ref/alt
 */
function processVariants(data: any, inputRef?: string, inputAlt?: string, inputVariants?: any[]) {
  if (!data.variants || !Array.isArray(data.variants)) return

  data.variants = data.variants.map((v: any, i: number) => {
    const ref = inputVariants
      ? (inputVariants[i]?.ref || inputVariants[i]?.ref_allele || v.ref)
      : (inputRef || v.ref)
    const alt = inputVariants
      ? (inputVariants[i]?.alt || inputVariants[i]?.alt_allele || v.alt)
      : (inputAlt || v.alt)

    return {
      ...v,
      chr: v.chr && !v.chr.startsWith('chr') ? `chr${v.chr}` : v.chr,
      // POST 字符串数组格式返回 1-based 坐标，无需转换
      ref,
      alt,
    }
  })
}

/**
 * GET /api/liftover - Liftover 单个变体
 * 参数: chr, pos, ref, alt, from (hg19/hg38), dest (hg19/hg38)
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { chr, pos, ref, alt, from, dest } = req.query

    if (!chr || !pos || !ref || !alt || !from || !dest) {
      res.status(400).json({ success: false, error: '缺少必填参数 (chr, pos, ref, alt, from, dest)' })
      return
    }

    const validGenomes = ['hg19', 'hg38', 't2t']
    if (!validGenomes.includes(from as string) || !validGenomes.includes(dest as string)) {
      res.status(400).json({ success: false, error: 'from/dest 必须为 hg19, hg38 或 t2t' })
      return
    }

    if (from === dest) {
      res.status(400).json({ success: false, error: '源基因组版本和目标基因组版本不能相同' })
      return
    }

    // 使用 POST 方式调用 GeneBe API（字符串数组格式，用 - 分隔）
    // GET 方式用 : 分隔时某些变体会返回空结果
    const chrNum = (chr as string).replace(/^chr/i, '')
    const queryStr = `${chrNum}-${pos}-${ref}-${alt}`
    const url = `${GENEBE_API_BASE}/liftover?from=${from}&dest=${dest}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${GENEBE_EMAIL}:${GENEBE_API_KEY}`).toString('base64'),
      },
      body: JSON.stringify([queryStr]),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GeneBe API error:', response.status, errorText)
      res.status(response.status).json({ success: false, error: `GeneBe API 请求失败: ${response.status}` })
      return
    }

    const data = await response.json()
    processVariants(data, ref as string, alt as string)

    res.json({ success: true, data })
  } catch (error: any) {
    console.error('Liftover error:', error)
    res.status(500).json({ success: false, error: error.message || 'Liftover 转换失败' })
  }
})

/**
 * POST /api/liftover - Liftover 多个变体
 * 参数: from, dest (query)
 * Body: 变体数组 [{chr, pos, ref, alt}, ...]
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, dest } = req.query
    const variants = req.body

    if (!from || !dest) {
      res.status(400).json({ success: false, error: '缺少必填参数 (from, dest)' })
      return
    }

    const validGenomes = ['hg19', 'hg38', 't2t']
    if (!validGenomes.includes(from as string) || !validGenomes.includes(dest as string)) {
      res.status(400).json({ success: false, error: 'from/dest 必须为 hg19, hg38 或 t2t' })
      return
    }

    if (from === dest) {
      res.status(400).json({ success: false, error: '源基因组版本和目标基因组版本不能相同' })
      return
    }

    if (!Array.isArray(variants) || variants.length === 0) {
      res.status(400).json({ success: false, error: '请提供变体数组' })
      return
    }

    if (variants.length > 1000) {
      res.status(400).json({ success: false, error: '单次最多转换 1000 个变体' })
      return
    }

    // 构造 GeneBe 格式的字符串数组（用 - 分隔）
    const genebeQueries = variants.map(v => {
      const chrNum = (v.chr || v.chromosome || '').replace(/^chr/i, '')
      const pos = v.pos || v.position
      const ref = v.ref || v.ref_allele
      const alt = v.alt || v.alt_allele
      return `${chrNum}-${pos}-${ref}-${alt}`
    })

    const url = `${GENEBE_API_BASE}/liftover?from=${from}&dest=${dest}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${GENEBE_EMAIL}:${GENEBE_API_KEY}`).toString('base64'),
      },
      body: JSON.stringify(genebeQueries),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GeneBe API error:', response.status, errorText)
      res.status(response.status).json({ success: false, error: `GeneBe API 请求失败: ${response.status}` })
      return
    }

    const data = await response.json()
    processVariants(data, undefined, undefined, variants)

    res.json({ success: true, data })
  } catch (error: any) {
    console.error('Liftover error:', error)
    res.status(500).json({ success: false, error: error.message || 'Liftover 转换失败' })
  }
})

export default router
