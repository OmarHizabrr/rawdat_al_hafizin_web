import { PROGRAM_BLOCK_CONTENT_MODE_VALUES } from '../data/programBlockContentModes.js'
import { buildDefaultStringsMap } from '../data/siteStringRegistry.js'

function lines(text) {
  return String(text || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

function normalizeMode(raw) {
  const m = String(raw || '').trim()
  return PROGRAM_BLOCK_CONTENT_MODE_VALUES.has(m) ? m : 'lead'
}

function parseDefinitions(body) {
  return lines(body).map((line) => {
    const sep = line.match(/^([^:|]+)[:|]\s*(.+)$/)
    if (sep) return { term: sep[1].trim(), definition: sep[2].trim() }
    return { term: '', definition: line }
  })
}

function parseLinks(body) {
  return lines(body)
    .map((line) => {
      const pipe = line.match(/^([^|]+)\|\s*(.+)$/)
      if (pipe) return { label: pipe[1].trim(), href: pipe[2].trim() }
      const dash = line.match(/^([^-]+)\s+-\s+(.+)$/)
      if (dash) return { label: dash[1].trim(), href: dash[2].trim() }
      return null
    })
    .filter(Boolean)
}

function parseCards(body) {
  return String(body || '')
    .split(/\n\s*\n/)
    .map((chunk) => {
      const chunkLines = lines(chunk)
      if (!chunkLines.length) return null
      const first = chunkLines[0]
      const titleMatch = first.match(/^(.+):\s*$/)
      const title = titleMatch ? titleMatch[1].trim() : first
      const bodyLines = titleMatch ? chunkLines.slice(1) : chunkLines.slice(1)
      return {
        title,
        body: bodyLines.join('\n').trim(),
      }
    })
    .filter((c) => c && c.title)
}

/** يُطبَّق على مستند واحد من Firestore */
export function normalizeProgramBlock(raw = {}, index = 0) {
  const id = String(raw.id || raw.blockId || `block-${index}`).trim() || `block-${index}`
  return {
    id,
    order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : index,
    title: String(raw.title || '').trim(),
    icon: String(raw.icon || 'BookOpenText').trim() || 'BookOpenText',
    contentMode: normalizeMode(raw.contentMode),
    body: String(raw.body ?? raw.content ?? '').trim(),
    enabled: raw.enabled !== false,
  }
}

export function sortProgramBlocks(blocks) {
  return [...blocks].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'ar'))
}

/** أقسام افتراضية من سجل النصوص (قبل أي تخصيص في Firestore) */
export function buildProgramBlocksFromStrings(strFn) {
  const str = typeof strFn === 'function' ? strFn : (k) => k
  return [
    {
      id: 'intro',
      order: 0,
      title: str('program.intro.title'),
      icon: 'BookOpenText',
      contentMode: 'lead',
      body: str('program.intro.lead'),
      enabled: true,
    },
    {
      id: 'goals',
      order: 1,
      title: str('program.goals.title'),
      icon: 'Target',
      contentMode: 'list',
      body: str('program.goals.list'),
      enabled: true,
    },
    {
      id: 'approach',
      order: 2,
      title: str('program.approach.title'),
      icon: 'Compass',
      contentMode: 'paragraphs',
      body: [str('program.approach.p1'), str('program.approach.p2')].filter(Boolean).join('\n'),
      enabled: true,
    },
    {
      id: 'content',
      order: 3,
      title: str('program.content.title'),
      icon: 'LibraryBig',
      contentMode: 'list',
      body: str('program.content.list'),
      enabled: true,
    },
    {
      id: 'features',
      order: 4,
      title: str('program.features.title'),
      icon: 'Sparkles',
      contentMode: 'list',
      body: str('program.features.list'),
      enabled: true,
    },
    {
      id: 'audience',
      order: 5,
      title: str('program.audience.title'),
      icon: 'Users',
      contentMode: 'list',
      body: str('program.audience.list'),
      enabled: true,
    },
    {
      id: 'message',
      order: 6,
      title: str('program.message.title'),
      icon: 'Sprout',
      contentMode: 'message',
      body: str('program.message.lead'),
      enabled: true,
    },
  ]
}

/** للزر «استيراد الافتراضي» في لوحة التحكم */
export function buildDefaultProgramBlocksForSeed() {
  const defaults = buildDefaultStringsMap()
  const str = (key) => defaults[key] ?? ''
  return buildProgramBlocksFromStrings(str)
}

/**
 * يُستخدم في الواجهة: إن وُجدت بلوكات في site_config تُعرض؛ وإلا النصوص الثابتة.
 */
export function resolveProgramBlocks(rawBlocks, strFn) {
  if (Array.isArray(rawBlocks) && rawBlocks.length > 0) {
    return sortProgramBlocks(
      rawBlocks.map((b, i) => normalizeProgramBlock(b, i)).filter((b) => b.enabled && b.title),
    )
  }
  return buildProgramBlocksFromStrings(strFn)
}

/** يحوّل body إلى بنية العرض في ProgramBlockContent */
export function programBlockToViewModel(block) {
  const body = String(block.body || '').trim()
  const mode = normalizeMode(block.contentMode)
  const base = { ...block, mode }

  if (mode === 'paragraphs') {
    return { ...base, paragraphs: lines(body) }
  }
  if (mode === 'list' || mode === 'numbered' || mode === 'checklist' || mode === 'steps' || mode === 'highlights') {
    return { ...base, items: lines(body) }
  }
  if (mode === 'definition') {
    return { ...base, definitions: parseDefinitions(body) }
  }
  if (mode === 'links') {
    return { ...base, links: parseLinks(body) }
  }
  if (mode === 'cards') {
    return { ...base, cards: parseCards(body) }
  }
  if (mode === 'badges') {
    return { ...base, badges: lines(body) }
  }
  if (mode === 'text') {
    const paras = lines(body)
    return { ...base, paragraphs: paras.length > 1 ? paras : null, text: body }
  }
  return { ...base, text: body }
}
