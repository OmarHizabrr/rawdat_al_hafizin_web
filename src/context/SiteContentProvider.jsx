import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildDefaultStringsMap } from '../data/siteStringRegistry.js'
import { DEFAULT_BRANDING, resolvePlanTypes, subscribePlanTypes, subscribeSiteConfig } from '../services/siteConfigService.js'
import { SiteContentContext } from './siteContentContext.js'

const registryDefaults = buildDefaultStringsMap()

function interpolatePlaceholders(text, vars) {
  let out = String(text ?? '')
  for (const [k, val] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(val ?? ''))
  }
  return out
}

export function SiteContentProvider({ children }) {
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

  const branding = useMemo(() => {
    const b = configData?.branding || {}
    return {
      siteName: String(b.siteName || '').trim() || DEFAULT_BRANDING.siteName,
      siteTitle: String(b.siteTitle || '').trim() || DEFAULT_BRANDING.siteTitle,
      siteDescription: String(b.siteDescription || '').trim() || DEFAULT_BRANDING.siteDescription,
      ogImagePath: String(b.ogImagePath || '').trim() || DEFAULT_BRANDING.ogImagePath,
    }
  }, [configData])

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
      mergedStrings,
      str,
      typeLabel,
      loadError,
      registryDefaults,
    }),
    [planTypes, planTypeRows, branding, mergedStrings, str, typeLabel, loadError],
  )

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>
}
