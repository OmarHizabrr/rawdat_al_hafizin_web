import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildDefaultStringsMap } from '../data/siteStringRegistry.js'
import {
  DEFAULT_BRANDING,
  normalizeBrandingThemeMap,
  resolvePlanTypes,
  subscribePlanTypes,
  subscribeSiteConfig,
} from '../services/siteConfigService.js'
import { useTheme } from '../theme/useTheme.js'
import { normalizeContactPhones } from '../utils/contactPhones.js'
import { sanitizeCssColor, sanitizeImageUrl } from '../utils/brandingAssets.js'
import { SiteContentContext } from './siteContentContext.js'

const registryDefaults = buildDefaultStringsMap()
const EMPTY_THEME_MAP = Object.freeze({})

function interpolatePlaceholders(text, vars) {
  let out = String(text ?? '')
  for (const [k, val] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(val ?? ''))
  }
  return out
}

export function SiteContentProvider({ children }) {
  const { resolved: colorScheme } = useTheme()
  const [planTypeRows, setPlanTypeRows] = useState([])
  const [configData, setConfigData] = useState(null)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    const unsubTypes = subscribePlanTypes(
      (rows) => {
        setPlanTypeRows(rows)
        setLoadError(null)
      },
      () => setLoadError('plan_types'),
    )
    const unsubCfg = subscribeSiteConfig(
      (data) => {
        setConfigData(data)
        setLoadError(null)
      },
      () => setLoadError('site_config'),
    )
    return () => {
      unsubTypes()
      unsubCfg()
    }
  }, [])

  const planTypes = useMemo(() => resolvePlanTypes(planTypeRows), [planTypeRows])

  const contactPhones = useMemo(
    () => normalizeContactPhones(configData?.contactPhones),
    [configData?.contactPhones],
  )

  const branding = useMemo(() => {
    const b = configData?.branding || {}
    const logoRemote = sanitizeImageUrl(b.logoUrl)
    const logoSrc = logoRemote || '/logo.png'
    const ogRaw = String(b.ogImagePath || '').trim()
    const ogSanitized = sanitizeImageUrl(ogRaw) || (ogRaw.startsWith('/') && !ogRaw.startsWith('//') ? ogRaw : '')
    const tl = normalizeBrandingThemeMap(b.themeLight)
    const td = normalizeBrandingThemeMap(b.themeDark)
    return {
      siteName: String(b.siteName || '').trim() || DEFAULT_BRANDING.siteName,
      siteTitle: String(b.siteTitle || '').trim() || DEFAULT_BRANDING.siteTitle,
      siteDescription: String(b.siteDescription || '').trim() || DEFAULT_BRANDING.siteDescription,
      ogImagePath: ogSanitized || DEFAULT_BRANDING.ogImagePath,
      logoUrl: String(b.logoUrl ?? '').trim(),
      logoSrc,
      themeLight: Object.keys(tl).length ? tl : EMPTY_THEME_MAP,
      themeDark: Object.keys(td).length ? td : EMPTY_THEME_MAP,
    }
  }, [configData])

  useEffect(() => {
    const root = document.documentElement
    const map = colorScheme === 'dark' ? branding.themeDark : branding.themeLight
    const applied = []
    for (const [k, v] of Object.entries(map)) {
      if (!k.startsWith('--')) continue
      const val = sanitizeCssColor(v)
      if (!val) continue
      root.style.setProperty(k, val)
      applied.push(k)
    }
    return () => {
      for (const k of applied) root.style.removeProperty(k)
    }
  }, [colorScheme, branding.themeLight, branding.themeDark])

  const mergedStrings = useMemo(() => {
    const overrides = configData?.strings && typeof configData.strings === 'object' ? configData.strings : {}
    const out = { ...registryDefaults }
    for (const [k, v] of Object.entries(overrides)) {
      if (v != null && String(v).trim() !== '') out[k] = String(v)
    }
    return out
  }, [configData])

  const str = useCallback(
    (key, vars = {}) => {
      const raw = mergedStrings[key] ?? registryDefaults[key] ?? key
      return interpolatePlaceholders(raw, { siteName: branding.siteName, siteTitle: branding.siteTitle, ...vars })
    },
    [mergedStrings, branding.siteName, branding.siteTitle],
  )

  const typeLabel = useCallback(
    (value) => planTypes.find((t) => t.value === value)?.label ?? value,
    [planTypes],
  )

  const value = useMemo(
    () => ({
      planTypes,
      planTypeRows,
      branding,
      contactPhones,
      mergedStrings,
      str,
      typeLabel,
      loadError,
      registryDefaults,
    }),
    [planTypes, planTypeRows, branding, contactPhones, mergedStrings, str, typeLabel, loadError],
  )

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>
}
