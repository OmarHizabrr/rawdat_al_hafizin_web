import { orderBy, query } from 'firebase/firestore'
import { DEFAULT_PLAN_TYPES } from '../data/defaultPlanTypes.js'
import { SITE_DESCRIPTION, SITE_NAME, SITE_OG_IMAGE_PATH, SITE_TITLE } from '../config/site.js'
import { normalizeContactPhones } from '../utils/contactPhones.js'
import { sanitizeCssColor, sanitizeImageUrl } from '../utils/brandingAssets.js'
import { firestoreApi } from './firestoreApi.js'

/** قيم افتراضية للهوية (تُدمج مع `site_config/main.branding`) */
export const DEFAULT_BRANDING = {
  siteName: SITE_NAME,
  siteTitle: SITE_TITLE,
  siteDescription: SITE_DESCRIPTION,
  ogImagePath: SITE_OG_IMAGE_PATH,
  logoUrl: '',
  themeLight: {},
  themeDark: {},
}

/** تصفية خريطة ألوان من Firestore */
export function normalizeBrandingThemeMap(input) {
  if (!input || typeof input !== 'object') return {}
  const out = {}
  for (const [k, v] of Object.entries(input)) {
    if (typeof k !== 'string' || !k.startsWith('--')) continue
    const c = sanitizeCssColor(String(v))
    if (c) out[k] = c
  }
  return out
}

function normalizePlanTypeDoc(id, data) {
  const value = String(data?.value ?? id ?? '').trim()
  const label = String(data?.label ?? '').trim() || value
  const hint = String(data?.hint ?? '').trim()
  const order = Number.isFinite(Number(data?.order)) ? Number(data.order) : 0
  return { id, value: value || id, label, hint, order }
}

/**
 * اشتراك مرتّب بأنواع الخطط.
 * @param {(rows: Array<{ id: string, value: string, label: string, hint: string, order: number }>) => void} onNext
 */
export function subscribePlanTypes(onNext, onError) {
  const col = firestoreApi.getPlanTypesCollection()
  const q = query(col, orderBy('order', 'asc'))
  return firestoreApi.subscribeSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => normalizePlanTypeDoc(d.id, d.data()))
      onNext(rows)
    },
    onError,
  )
}

export function subscribeSiteConfig(onNext, onError) {
  const ref = firestoreApi.getSiteConfigDoc()
  return firestoreApi.subscribeSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onNext(null)
        return
      }
      onNext(snap.data())
    },
    onError,
  )
}

/** دمج أنواع من Firestore مع الافتراض عند الفراغ */
export function resolvePlanTypes(firestoreRows) {
  if (!firestoreRows?.length) {
    return DEFAULT_PLAN_TYPES.map((r, i) => ({
      id: r.value,
      value: r.value,
      label: r.label,
      hint: r.hint,
      order: r.order ?? i,
    }))
  }
  return firestoreRows.map((r) => ({
    id: r.id,
    value: r.value,
    label: r.label,
    hint: r.hint,
    order: r.order,
  }))
}

export async function savePlanType(actor, { docId, value, label, hint, order }) {
  const v = String(value || '')
    .trim()
    .toLowerCase()
  if (!/^[a-z0-9_]+$/.test(v)) {
    throw new Error('INVALID_PLAN_TYPE_VALUE')
  }
  const id = docId || v
  const ref = firestoreApi.getPlanTypeDoc(id)
  await firestoreApi.setData({
    docRef: ref,
    data: { value: v, label: String(label || '').trim(), hint: String(hint || '').trim(), order: Number(order) || 0 },
    merge: true,
    userData: actor ?? {},
  })
}

export async function deletePlanType(actor, planTypeId) {
  await firestoreApi.deleteData(firestoreApi.getPlanTypeDoc(planTypeId))
}

/** يكتب الأنواع الافتراضية بمعرّفات مستقرة تساوي الحقل value */
export async function seedDefaultPlanTypes(actor) {
  for (const row of DEFAULT_PLAN_TYPES) {
    const ref = firestoreApi.getPlanTypeDoc(row.value)
    await firestoreApi.setData({
      docRef: ref,
      data: {
        value: row.value,
        label: row.label,
        hint: row.hint,
        order: row.order,
      },
      merge: true,
      userData: actor ?? {},
    })
  }
}

export async function patchSiteStrings(actor, partial) {
  const ref = firestoreApi.getSiteConfigDoc()
  const cur = (await firestoreApi.getData(ref)) || {}
  const prev = { ...(cur.strings || {}) }
  for (const [k, v] of Object.entries(partial)) {
    if (v == null || String(v).trim() === '') delete prev[k]
    else prev[k] = String(v)
  }
  await firestoreApi.setData({
    docRef: ref,
    data: { strings: prev },
    merge: true,
    userData: actor ?? {},
  })
}

export async function saveContactPhones(actor, phones) {
  const ref = firestoreApi.getSiteConfigDoc()
  const rows = normalizeContactPhones(phones)
  await firestoreApi.setData({
    docRef: ref,
    data: { contactPhones: rows.length ? rows : null },
    merge: true,
    userData: actor ?? {},
  })
}

export async function saveBranding(actor, branding) {
  const ref = firestoreApi.getSiteConfigDoc()
  const logoUrl = sanitizeImageUrl(branding.logoUrl)
  const ogRaw = String(branding.ogImagePath || '').trim()
  const ogSanitized = sanitizeImageUrl(ogRaw) || (ogRaw.startsWith('/') && !ogRaw.startsWith('//') ? ogRaw : '')
  const ogImagePath = ogSanitized || DEFAULT_BRANDING.ogImagePath
  const themeLight = normalizeBrandingThemeMap(branding.themeLight)
  const themeDark = normalizeBrandingThemeMap(branding.themeDark)
  await firestoreApi.setData({
    docRef: ref,
    data: {
      branding: {
        siteName: String(branding.siteName || '').trim(),
        siteTitle: String(branding.siteTitle || '').trim(),
        siteDescription: String(branding.siteDescription || '').trim(),
        ogImagePath,
        logoUrl: logoUrl || null,
        themeLight: Object.keys(themeLight).length ? themeLight : null,
        themeDark: Object.keys(themeDark).length ? themeDark : null,
      },
    },
    merge: true,
    userData: actor ?? {},
  })
}
