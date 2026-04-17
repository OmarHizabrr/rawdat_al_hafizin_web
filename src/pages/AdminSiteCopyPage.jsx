import { ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SITE_STRING_REGISTRY } from '../data/siteStringRegistry.js'
import { useAuth } from '../context/useAuth.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { patchSiteStrings } from '../services/siteConfigService.js'
import { CrossNav } from '../components/CrossNav.jsx'
import { Button, SearchField, TextAreaField, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

export default function AdminSiteCopyPage() {
  const { user } = useAuth()
  const { branding, mergedStrings, registryDefaults } = useSiteContent()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [drafts, setDrafts] = useState({})
  const [savingKey, setSavingKey] = useState(null)

  useEffect(() => {
    document.title = `النصوص الثابتة — ${branding.siteTitle}`
  }, [branding.siteTitle])

  const setDraft = useCallback((key, val) => {
    setDrafts((d) => ({ ...d, [key]: val }))
  }, [])

  const valueFor = useCallback(
    (key) => {
      if (Object.prototype.hasOwnProperty.call(drafts, key)) return drafts[key]
      return mergedStrings[key] ?? ''
    },
    [drafts, mergedStrings],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SITE_STRING_REGISTRY
    return SITE_STRING_REGISTRY.filter((e) => {
      const hay = `${e.key} ${e.label} ${e.group} ${e.defaultValue}`.toLowerCase()
      return hay.includes(q)
    })
  }, [query])

  const byGroup = useMemo(() => {
    const m = new Map()
    for (const e of filtered) {
      if (!m.has(e.group)) m.set(e.group, [])
      m.get(e.group).push(e)
    }
    return [...m.entries()]
  }, [filtered])

  const saveOne = async (key) => {
    if (!user) return
    const raw = valueFor(key)
    const trimmed = String(raw).trim()
    const def = registryDefaults[key]
    setSavingKey(key)
    try {
      if (trimmed === def || trimmed === '') {
        await patchSiteStrings(user, { [key]: '' })
      } else {
        await patchSiteStrings(user, { [key]: trimmed })
      }
      setDrafts((d) => {
        const next = { ...d }
        delete next[key]
        return next
      })
      toast.success('تم حفظ النص.', 'تم')
    } catch {
      toast.warning('تعذّر الحفظ.', 'تنبيه')
    } finally {
      setSavingKey(null)
    }
  }

  const crossItems = [
    { to: '/app/admin', label: 'لوحة التحكم' },
    { to: '/app', label: 'الرئيسية' },
  ]

  return (
    <div className="rh-admin-copy">
      <header className="rh-admin-copy__hero card">
        <div className="rh-admin-copy__head-row">
          <Link to="/app/admin" className="rh-admin-plan-types__back">
            <RhIcon as={ArrowLeft} size={18} strokeWidth={RH_ICON_STROKE} /> لوحة التحكم
          </Link>
        </div>
        <h1 className="rh-admin-copy__title">النصوص الثابتة</h1>
        <p className="rh-admin-copy__desc">
          المفتاح ثابت في البرنامج؛ عدّل القيمة المعروضة فقط. لإعادة الافتراضي احذف محتوى الحقل واحفظ، أو اضبطه ليطابق
          النص الافتراضي المعروض أسفل الحقل.
        </p>
        <div className="rh-admin-copy__toolbar">
          <SearchField label="بحث" placeholder="مفتاح، عنوان المجموعة، أو جزء من النص…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </header>

      <CrossNav items={crossItems} className="rh-admin-dashboard__cross" />

      {byGroup.map(([group, entries]) => (
        <section key={group} className="rh-admin-copy__group card">
          <h2 className="rh-admin-copy__group-title">{group}</h2>
          <div className="rh-admin-copy__rows">
            {entries.map((e) => (
              <div key={e.key} className="rh-admin-copy__row">
                <div className="rh-admin-copy__meta">
                  <code className="rh-admin-copy__key">{e.key}</code>
                  <span className="rh-admin-copy__label">{e.label}</span>
                  <p className="rh-admin-copy__default">
                    <strong>الافتراضي:</strong> {e.defaultValue}
                  </p>
                </div>
                <TextAreaField
                  label="القيمة الحالية"
                  value={valueFor(e.key)}
                  onChange={(ev) => setDraft(e.key, ev.target.value)}
                  rows={e.key.includes('list') || e.key.includes('lead') || e.key.includes('p') ? 5 : 3}
                />
                <div className="rh-admin-copy__row-actions">
                  <Button type="button" variant="primary" size="sm" disabled={savingKey === e.key} onClick={() => saveOne(e.key)}>
                    {savingKey === e.key ? 'جاري الحفظ…' : 'حفظ'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDraft(e.key, e.defaultValue)
                    }}
                  >
                    ملء الافتراضي
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
