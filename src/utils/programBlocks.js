import { buildDefaultStringsMap } from '../data/siteStringRegistry.js'

const VALID_MODES = new Set(['lead', 'message', 'list', 'paragraphs'])

function lines(text) {
  return String(text || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

function normalizeMode(raw) {
  const m = String(raw || '').trim()
  return VALID_MODES.has(m) ? m : 'lead'
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

/** يحوّل body إلى بنية العرض في ProgramSections */
export function programBlockToViewModel(block) {
  const body = String(block.body || '').trim()
  const mode = normalizeMode(block.contentMode)
  if (mode === 'list') {
    return { ...block, mode, list: lines(body) }
  }
  if (mode === 'paragraphs') {
    return { ...block, mode, paragraphs: lines(body) }
  }
  if (mode === 'message') {
    return { ...block, mode, lead: body }
  }
  return { ...block, mode: 'lead', lead: body }
}
