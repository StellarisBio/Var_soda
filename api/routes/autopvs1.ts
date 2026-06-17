import { Router, type Request, type Response } from 'express'

const router = Router()

const AUTOPVS1_BASE = 'https://autopvs1.bgi.com'

/**
 * 验证变异输入，防止 SSRF 和注入
 */
function validateVariantInput(chr: string, pos: string, ref: string, alt: string): string | null {
  if (!/^[0-9XYMT]{1,3}$/i.test(chr)) {
    return '染色体格式无效'
  }
  if (!/^\d+$/.test(pos)) {
    return '位置必须为正整数'
  }
  if (!/^[ATCG]+$/i.test(ref)) {
    return '参考等位基因只能包含 ATCG'
  }
  if (!/^[ATCG]+$/i.test(alt)) {
    return '变异等位基因只能包含 ATCG'
  }
  return null
}

/**
 * 将 GRCh37/GRCh38 转换为 AutoPVS1 使用的 hg19/hg38
 */
function toHgVersion(build: string): string {
  if (build === 'GRCh37') return 'hg19'
  if (build === 'GRCh38') return 'hg38'
  if (build.startsWith('hg')) return build
  return 'hg38'
}

/**
 * 从 HTML 中提取文本内容（去除标签）
 */
function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 从 AutoPVS1 HTML 页面解析结构化数据
 */
function parseAutoPVS1Html(html: string, chromosome: string, position: string, ref: string, alt: string, genomeBuild: string) {
  const result: any = {
    chromosome,
    position: parseInt(position),
    ref,
    alt,
    genomeBuild,
    variantType: null,
    gene: null,
    pli: null,
    haploinsufficiency: null,
    chgvs: null,
    phgvs: null,
    exon: null,
    intron: null,
    incompatible: false,
    incompatibilityMessage: null,
    preliminaryPath: null,
    preliminaryStrength: null,
    adjustedStrength: null,
    flowchartTree: [],
    footnotes: [],
    diseaseMechanisms: [],
    externalLinks: {},
  }

  // 检查是否不兼容
  const incompatMatch = html.match(/variant type is incompatible with recommendations for interpreting the PVS1 criterion/i)
  if (incompatMatch) {
    result.incompatible = true
    // 提取不兼容消息中的变异类型
    const typeMatch = html.match(/<h3[^>]*>\s*(Missense|Synonymous|Intron|UTR[^:]*|Splice Region|Upstream|Downstream)[^<]*:/i)
    if (typeMatch) {
      result.variantType = typeMatch[1].trim()
    }
    // 提取基因（<b>Gene:</b> <a ...><i>GENE</i></a>）
    const geneMatch = html.match(/<b>\s*Gene:\s*<\/b>\s*<a[^>]*><i>([^<]+)<\/i><\/a>/i)
      || html.match(/<b>\s*Gene:\s*<\/b>\s*<a[^>]*>([^<]+)<\/a>/i)
    if (geneMatch) result.gene = geneMatch[1].trim()
    // cHGVS
    const chgvsMatch = html.match(/<b>\s*cHGVS:\s*<\/b>\s*([^<]+)/i)
    if (chgvsMatch) result.chgvs = stripTags(chgvsMatch[1]).trim()
    // pHGVS
    const phgvsMatch = html.match(/<b>\s*pHGVS:\s*<\/b>\s*([^<]+)/i)
    if (phgvsMatch) result.phgvs = stripTags(phgvsMatch[1]).trim()
    // gnomAD 链接
    const gnomadMatch = html.match(/href="(https:\/\/gnomad[^"]+)"/i)
    if (gnomadMatch) result.externalLinks.gnomAD = gnomadMatch[1]
    return result
  }

  // 提取变异类型（从 h3 标签，如 "Nonsense: X-82763936-A-T"）
  const h3Match = html.match(/<h3[^>]*>\s*([^:]+):\s*[^<]*<\/h3>/i)
  if (h3Match) {
    result.variantType = h3Match[1].trim()
  }

  // 提取基因（<b>Gene:</b> <a ...><i>POU3F4</i></a>，可能有换行）
  const geneMatch = html.match(/<b>\s*Gene:\s*<\/b>\s*<a[^>]*>\s*<i>([^<]+)<\/i>/i)
    || html.match(/<b>\s*Gene:\s*<\/b>\s*<a[^>]*>\s*([^<]+)/i)
  if (geneMatch) result.gene = geneMatch[1].trim()

  // 提取 pLI（<b>pLI:</b>  0.72）
  const pliMatch = html.match(/<b>\s*pLI:\s*<\/b>\s*([^<]+)/i)
  if (pliMatch) result.pli = parseFloat(pliMatch[1].trim())

  // 提取 Haploinsufficiency（<b>Haploinsufficiency:</b> <a ...>None</a>）
  const haploMatch = html.match(/<b>\s*Haploinsufficiency:\s*<\/b>\s*<a[^>]*>([^<]*)<\/a>/i)
    || html.match(/<b>\s*Haploinsufficiency:\s*<\/b>\s*([^<]+)/i)
  if (haploMatch) result.haploinsufficiency = haploMatch[1].trim()

  // 提取 cHGVS（<b>cHGVS:</b>  NM_000307.5:c.604A&gt;T）
  const chgvsMatch = html.match(/<b>\s*cHGVS:\s*<\/b>\s*([^<]+)/i)
  if (chgvsMatch) result.chgvs = stripTags(chgvsMatch[1]).trim()

  // 提取 pHGVS
  const phgvsMatch = html.match(/<b>\s*pHGVS:\s*<\/b>\s*([^<]+)/i)
  if (phgvsMatch) result.phgvs = stripTags(phgvsMatch[1]).trim()

  // 提取 Exon
  const exonMatch = html.match(/<b>\s*Exon:\s*<\/b>\s*([^<]+)/i)
  if (exonMatch) result.exon = exonMatch[1].trim()

  // 提取 Intron
  const intronMatch = html.match(/<b>\s*Intron:\s*<\/b>\s*([^<]+)/i)
  if (intronMatch) result.intron = intronMatch[1].trim()

  // 提取 PVS1 Flowchart 部分（在 <figure> 标签内）
  const figureMatch = html.match(/<figure>([\s\S]*?)<\/figure>/i)
  if (figureMatch) {
    const flowHtml = figureMatch[1]

    // 提取 Preliminary Decision Path（在 <figcaption> 中）
    const figcaptionMatch = flowHtml.match(/<figcaption>([\s\S]*?)<\/figcaption>/i)
    if (figcaptionMatch) {
      const captionText = stripTags(figcaptionMatch[1]).trim()
      // "Preliminary Decision Path: NF5"
      const pathMatch = captionText.match(/Preliminary Decision Path:\s*(\S+)/i)
      if (pathMatch) result.preliminaryPath = pathMatch[1].trim()
    }

    // 解析嵌套的 <ul>/<li> 结构为树
    result.flowchartTree = parseListTree(flowHtml)
  }

  // 提取脚注（在 </figure> 之后，格式: <b style="...">#1</b> 文本...<br>）
  const figureEndMatch = html.match(/<\/figure>/i)
  if (figureEndMatch) {
    const afterFigure = html.substring(figureEndMatch.index! + figureEndMatch[0].length)
    // 脚注格式: <b style="color:#CD5C5C;">#1</b> 文本...<br>
    const footnoteMatches = afterFigure.matchAll(/<b[^>]*>\s*#(\d+)\s*<\/b>\s*([\s\S]*?)(?=<b[^>]*>\s*#\d+|<\/div>|<br>)/gi)
    for (const m of footnoteMatches) {
      const noteText = stripTags(m[2]).trim()
      if (noteText) {
        // 避免重复
        if (!result.footnotes.some((f: any) => f.number === parseInt(m[1]))) {
          result.footnotes.push({ number: parseInt(m[1]), text: noteText })
        }
      }
    }
  }

  // 提取初步强度（从流程图树中查找最后一个叶子节点）
  const strengthValues = ['PVS1', 'Very Strong', 'Strong', 'Moderate', 'Supporting']
  function findStrengthInTree(nodes: any[]): string | null {
    for (const node of nodes) {
      const textLower = node.text.toLowerCase().trim()
      if (strengthValues.some(s => textLower === s.toLowerCase())) {
        return node.text.trim()
      }
      if (node.children && node.children.length > 0) {
        const found = findStrengthInTree(node.children)
        if (found) return found
      }
    }
    return null
  }
  const foundStrength = findStrengthInTree(result.flowchartTree)
  if (foundStrength) result.preliminaryStrength = foundStrength

  // 提取 Disease Mechanism 部分
  const diseaseSection = html.match(/Disease Mechanism[\s\S]*?<\/table>/i)
  if (diseaseSection) {
    const diseaseHtml = diseaseSection[0]

    // 提取表格行
    const trMatches = diseaseHtml.matchAll(/<tr>\s*([\s\S]*?)<\/tr>/gi)
    let isFirstRow = true
    for (const m of trMatches) {
      if (isFirstRow) { isFirstRow = false; continue } // 跳过表头
      const tdMatches = m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)
      const cells: string[] = []
      for (const td of tdMatches) {
        cells.push(stripTags(td[1]).trim())
      }
      if (cells.length >= 6) {
        result.diseaseMechanisms.push({
          gene: cells[0],
          disease: cells[1],
          inheritance: cells[2],
          clinicalValidity: cells[3],
          consideration: cells[4],
          adjustedStrength: cells[5],
        })
      }
    }

    // 提取调整后的强度
    if (result.diseaseMechanisms.length > 0) {
      result.adjustedStrength = result.diseaseMechanisms[0].adjustedStrength
    }
  }

  // 提取外部链接
  const gnomadMatch = html.match(/href="(https:\/\/gnomad[^"]+)"/i)
  if (gnomadMatch) result.externalLinks.gnomAD = gnomadMatch[1]
  const clinvarMatch = html.match(/href="(https:\/\/www\.ncbi\.nlm\.nih\.gov\/clinvar[^"]+)"/i)
  if (clinvarMatch) result.externalLinks.clinVar = clinvarMatch[1]
  const omimMatch = html.match(/href="(https:\/\/mirror\.omim[^"]+)"/i)
  if (omimMatch) result.externalLinks.omim = omimMatch[1]

  return result
}

/**
 * 递归解析 HTML 中的 <ul>/<li> 嵌套结构为树
 */
function parseListTree(html: string): any[] {
  // 找到第一个 <ul> 的起始位置
  const ulStart = html.search(/<ul[^>]*>/i)
  if (ulStart === -1) return []

  // 找到匹配的最外层 </ul>（需要计算嵌套深度）
  let depth = 0
  let pos = ulStart
  let ulEnd = -1
  const ulOpenRegex = /<ul[^>]*>/gi
  const ulCloseRegex = /<\/ul>/gi

  while (pos < html.length) {
    ulOpenRegex.lastIndex = pos
    ulCloseRegex.lastIndex = pos
    const openMatch = ulOpenRegex.exec(html)
    const closeMatch = ulCloseRegex.exec(html)

    if (!closeMatch) break

    if (openMatch && openMatch.index < closeMatch.index) {
      depth++
      pos = openMatch.index + openMatch[0].length
    } else {
      depth--
      if (depth === 0) {
        ulEnd = closeMatch.index
        break
      }
      pos = closeMatch.index + closeMatch[0].length
    }
  }

  if (ulEnd === -1) return []

  // 提取最外层 <ul> 和 </ul> 之间的内容
  const ulContent = html.substring(ulStart, ulEnd + 6)
  const innerMatch = ulContent.match(/<ul[^>]*>([\s\S]*)<\/ul>/i)
  if (!innerMatch) return []

  return parseListItems(innerMatch[1])
}

function parseListItems(html: string): any[] {
  const items: any[] = []
  // 匹配 <li>...</li>，需要处理嵌套
  let remaining = html
  while (remaining.length > 0) {
    const liStart = remaining.indexOf('<li')
    if (liStart === -1) break

    // 找到对应的 </li>（通过计数嵌套深度）
    let depth = 0
    let pos = liStart
    let endPos = -1
    while (pos < remaining.length) {
      const openIdx = remaining.indexOf('<li', pos)
      const closeIdx = remaining.indexOf('</li>', pos)
      if (closeIdx === -1) break
      if (openIdx !== -1 && openIdx < closeIdx) {
        depth++
        pos = openIdx + 3
      } else {
        depth--
        if (depth === 0) {
          endPos = closeIdx
          break
        }
        pos = closeIdx + 5
      }
    }

    if (endPos === -1) break

    // 提取 li 标签内容（从 <li...> 到匹配的 </li>）
    const liFull = remaining.substring(liStart, endPos + 5)
    // 找到 <li...> 标签的结束 >
    const liTagEnd = liFull.indexOf('>', liStart - liStart + 3)
    if (liTagEnd === -1) {
      remaining = remaining.substring(endPos + 5)
      continue
    }

    // li 标签内部内容（从 <li...> 之后到最后一个 </li> 之前）
    const liInner = liFull.substring(liTagEnd + 1, liFull.length - 5)

    // 提取嵌套的 <ul>
    const nestedUlMatch = liInner.match(/<ul[^>]*>([\s\S]*?)<\/ul>/i)
    let children: any[] = []
    if (nestedUlMatch) {
      // 需要找到匹配的最外层 </ul>
      const ulContent = extractOuterUl(liInner)
      if (ulContent) {
        children = parseListItems(ulContent)
      }
    }

    // 从文本中移除嵌套 ul
    const liText = stripTags(liInner.replace(/<ul[^>]*>[\s\S]*?<\/ul>/i, '')).trim()

    if (liText || children.length > 0) {
      items.push({ text: liText, children })
    }

    remaining = remaining.substring(endPos + 5)
  }

  return items
}

/**
 * 提取最外层 <ul>...</ul> 之间的内容
 */
function extractOuterUl(html: string): string | null {
  const ulStart = html.search(/<ul[^>]*>/i)
  if (ulStart === -1) return null

  let depth = 0
  let pos = ulStart
  let ulEnd = -1
  const ulOpenRegex = /<ul[^>]*>/gi
  const ulCloseRegex = /<\/ul>/gi

  while (pos < html.length) {
    ulOpenRegex.lastIndex = pos
    ulCloseRegex.lastIndex = pos
    const openMatch = ulOpenRegex.exec(html)
    const closeMatch = ulCloseRegex.exec(html)

    if (!closeMatch) break

    if (openMatch && openMatch.index < closeMatch.index) {
      depth++
      pos = openMatch.index + openMatch[0].length
    } else {
      depth--
      if (depth === 0) {
        ulEnd = closeMatch.index
        break
      }
      pos = closeMatch.index + closeMatch[0].length
    }
  }

  if (ulEnd === -1) return null

  const ulOpenEnd = html.indexOf('>', ulStart) + 1
  return html.substring(ulOpenEnd, ulEnd)
}

/**
 * GET /api/autopvs1/analyze - 分析变异的 PVS1 分类
 * 参数: chromosome, position, ref, alt, genome_build
 */
router.get('/analyze', async (req: Request, res: Response): Promise<void> => {
  try {
    const { chromosome, position, ref, alt, genome_build } = req.query

    if (!chromosome || !position || !ref || !alt) {
      res.status(400).json({ success: false, error: '缺少必填参数 (chromosome, position, ref, alt)' })
      return
    }

    const genomeBuild = (genome_build as string) || 'GRCh38'
    const hgVersion = toHgVersion(genomeBuild)

    // 去除染色体前缀的 chr
    const chrNum = (chromosome as string).replace(/^chr/i, '')

    // 验证输入，防止 SSRF
    const validationError = validateVariantInput(chrNum, position as string, ref as string, alt as string)
    if (validationError) {
      res.status(400).json({ success: false, error: validationError })
      return
    }

    // 构造 AutoPVS1 URL
    const url = `${AUTOPVS1_BASE}/variant/${hgVersion}/${chrNum}-${position}-${ref}-${alt}`

    // 调用 AutoPVS1 网页服务
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(30000), // 30秒超时
    })

    if (!response.ok) {
      res.status(502).json({ success: false, error: `AutoPVS1 服务请求失败: ${response.status}` })
      return
    }

    const html = await response.text()

    // 解析 HTML
    const analysisResult = parseAutoPVS1Html(html, chrNum, position as string, ref as string, alt as string, genomeBuild)

    // 生成 AutoPVS1 外部链接
    analysisResult.autopvs1Url = url

    res.json({ success: true, data: analysisResult })
  } catch (error: any) {
    console.error('AutoPVS1 analysis error:', error)
    if (error.name === 'TimeoutError') {
      res.status(504).json({ success: false, error: 'AutoPVS1 分析超时，请稍后重试' })
      return
    }
    res.status(500).json({ success: false, error: error.message || 'AutoPVS1 分析失败' })
  }
})

/**
 * POST /api/autopvs1/save - 保存 PVS1 分析结果到变异记录
 */
router.post('/save', async (req: Request, res: Response): Promise<void> => {
  try {
    const { getDb } = await import('../database.js')
    const { authenticate } = await import('../middleware/auth.js')

    // 手动验证认证
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: '未登录' })
      return
    }

    const jwt = (await import('jsonwebtoken')).default
    const { getJwtSecret } = await import('../middleware/auth.js')
    const jwtSecret = getJwtSecret()
    let userId: number
    try {
      const decoded = jwt.verify(authHeader.slice(7), jwtSecret) as any
      userId = decoded.id
    } catch {
      res.status(401).json({ success: false, error: '登录已过期' })
      return
    }

    const { variantId, pvs1Result } = req.body

    if (!variantId || !pvs1Result) {
      res.status(400).json({ success: false, error: '缺少必填参数 (variantId, pvs1Result)' })
      return
    }

    const db = getDb()

    // 检查变异是否存在
    const variant = db.prepare('SELECT * FROM variants WHERE id = ?').get(variantId) as any
    if (!variant) {
      res.status(404).json({ success: false, error: '变异不存在' })
      return
    }

    // 保存 PVS1 结果
    db.prepare("UPDATE variants SET pvs1_result = ?, updated_at = datetime('now') WHERE id = ?").run(
      JSON.stringify(pvs1Result),
      variantId
    )

    // 记录历史
    db.prepare(
      'INSERT INTO variant_history (variant_id, user_id, action, changes) VALUES (?, ?, ?, ?)'
    ).run(variantId, userId, 'AutoPVS1分析', JSON.stringify([`PVS1分析结果已保存: ${pvs1Result.adjustedStrength || pvs1Result.preliminaryStrength || '未知'}`]))

    res.json({ success: true, data: null })
  } catch (error: any) {
    console.error('Save PVS1 result error:', error)
    res.status(500).json({ success: false, error: error.message || '保存 PVS1 结果失败' })
  }
})

export default router
