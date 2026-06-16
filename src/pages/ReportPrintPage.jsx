import { Printer, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSiteContent } from '../context/useSiteContent.js'
import { loadPrintPayload, removePrintPayload } from '../utils/reportPrintPayload.js'
import '../styles/reportPrintPage.css'

function cellValue(value) {
  if (value == null || value === '') return '—'
  return String(value)
}

function PrintMetaGrid({ items }) {
  if (!items?.length) return null
  return (
    <dl className="rh-report-print__meta-grid">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="rh-report-print__meta-item">
          <dt className="rh-report-print__meta-label">{item.label}</dt>
          <dd className="rh-report-print__meta-value">{cellValue(item.value)}</dd>
        </div>
      ))}
    </dl>
  )
}

function PrintExecutiveSummary({ summary }) {
  if (!summary?.paragraphs?.length && !summary?.highlights?.length) return null
  return (
    <section className="rh-report-print__executive">
      <h2 className="rh-report-print__executive-title">الملخص التنفيذي</h2>
      {summary.paragraphs?.length ? (
        <div className="rh-report-print__executive-body">
          {summary.paragraphs.map((p, i) => (
            <p key={i} className="rh-report-print__executive-p">
              {p}
            </p>
          ))}
        </div>
      ) : null}
      {summary.highlights?.length ? (
        <ul className="rh-report-print__executive-highlights">
          {summary.highlights.map((h, i) => (
            <li key={`${h.label}-${i}`} className="rh-report-print__executive-highlight">
              <span>{h.label}</span>
              <strong>{cellValue(h.value)}</strong>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function PrintSection({ section, index }) {
  const columns = section?.columns || []
  const rows = section?.rows || []
  if (!columns.length || !rows.length) return null

  return (
    <section className="rh-report-print__section">
      <div className="rh-report-print__section-head">
        <h2 className="rh-report-print__section-title">
          <span className="rh-report-print__section-num">{index + 1}</span>
          {section.title || ''}
        </h2>
        <span className="rh-report-print__section-count">{rows.length} سجل</span>
      </div>
      <div className="rh-report-print__table-wrap">
        <table className="rh-report-print__table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.label || col.key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${section.title}-${rowIndex}`}>
                {columns.map((col) => (
                  <td key={col.key}>{cellValue(row?.[col.key])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function ReportPrintPage() {
  const [searchParams] = useSearchParams()
  const { branding } = useSiteContent()
  const payloadId = String(searchParams.get('id') || '').trim()
  const autoPrint = searchParams.get('auto') === '1'

  const [payload, setPayload] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = (attempt = 0) => {
      const data = loadPrintPayload(payloadId)
      if (data || attempt >= 4 || cancelled) {
        if (!cancelled) {
          setPayload(data)
          setLoaded(true)
          if (data?.documentTitle) document.title = data.documentTitle
        }
        return
      }
      window.setTimeout(() => load(attempt + 1), 120)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [payloadId])

  useEffect(() => {
    if (!autoPrint || !payload) return undefined
    const timer = window.setTimeout(() => {
      window.print()
    }, 500)
    return () => window.clearTimeout(timer)
  }, [autoPrint, payload])

  const sections = useMemo(
    () => (payload?.sections || []).filter((s) => s?.rows?.length && s?.columns?.length),
    [payload?.sections],
  )

  const kpis = useMemo(() => (payload?.kpis || []).filter((k) => k?.label), [payload?.kpis])

  const headerMeta = useMemo(() => {
    if (payload?.headerMeta?.length) return payload.headerMeta
    if (payload?.headerLines?.length) {
      return payload.headerLines.map((line) => {
        const idx = String(line).indexOf(':')
        if (idx < 0) return { label: 'معلومة', value: line }
        return { label: String(line).slice(0, idx).trim(), value: String(line).slice(idx + 1).trim() }
      })
    }
    return []
  }, [payload?.headerMeta, payload?.headerLines])

  const onPrint = useCallback(() => {
    window.print()
  }, [])

  const onClose = useCallback(() => {
    removePrintPayload(payloadId)
    window.close()
  }, [payloadId])

  if (!loaded) {
    return (
      <div className="rh-report-print">
        <p className="rh-report-print__empty">جاري تحميل مستند الطباعة…</p>
      </div>
    )
  }

  const hasSummary = Boolean(
    payload?.executiveSummary?.paragraphs?.length || payload?.executiveSummary?.highlights?.length,
  )

  if (!payload || (!sections.length && !kpis.length && !hasSummary)) {
    return (
      <div className="rh-report-print">
        <div className="rh-report-print__error">
          <h1>تعذّر فتح التقرير للطباعة</h1>
          <p>انتهت صلاحية البيانات أو لم تُحمَّل بشكل صحيح. ارجع للتقرير واضغط «طباعة» مرة أخرى.</p>
          <button type="button" className="rh-report-print__btn rh-report-print__btn--primary" onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    )
  }

  const brandTitle = payload.brandTitle || branding.siteTitle
  const footerLine = payload.footerLine || ''
  const logoSrc = branding.logoSrc

  return (
    <div className="rh-report-print">
      <div className="rh-report-print__toolbar no-print">
        <p className="rh-report-print__toolbar-title">{payload.documentTitle}</p>
        <p className="rh-report-print__toolbar-hint">معاينة قبل الطباعة — راجع التقرير ثم اضغط «طباعة».</p>
        <div className="rh-report-print__toolbar-actions">
          <button type="button" className="rh-report-print__btn rh-report-print__btn--primary" onClick={onPrint}>
            <Printer size={16} aria-hidden />
            طباعة
          </button>
          <button type="button" className="rh-report-print__btn" onClick={onClose}>
            <X size={16} aria-hidden />
            إغلاق
          </button>
        </div>
      </div>

      <div className="rh-report-print__stage">
        <article className="rh-report-print__paper">
          <header className="rh-report-print__doc-header">
            <div className="rh-report-print__doc-header-band">
              {logoSrc ? (
                <img src={logoSrc} alt="" className="rh-report-print__logo" />
              ) : null}
              <div className="rh-report-print__doc-header-text">
                {brandTitle ? <div className="rh-report-print__brand">{brandTitle}</div> : null}
                <h1 className="rh-report-print__title">{payload.documentTitle}</h1>
              </div>
              <div className="rh-report-print__doc-badge">تقرير رسمي</div>
            </div>
            {headerMeta.length ? <PrintMetaGrid items={headerMeta} /> : null}
          </header>

          <PrintExecutiveSummary summary={payload.executiveSummary} />

          {kpis.length ? (
            <div className="rh-report-print__kpis-block">
              <h2 className="rh-report-print__kpis-heading">المؤشرات الرئيسية</h2>
              <div className="rh-report-print__kpis">
                {kpis.map((kpi, index) => (
                  <div key={`${kpi.label}-${index}`} className="rh-report-print__kpi">
                    <strong>{cellValue(kpi.value)}</strong>
                    <span>{kpi.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {sections.length ? (
            <div className="rh-report-print__sections-block">
              <h2 className="rh-report-print__sections-heading">التفاصيل والجداول</h2>
              {sections.map((section, index) => (
                <PrintSection key={`${section.title}-${index}`} section={section} index={index} />
              ))}
            </div>
          ) : null}

          {footerLine ? <footer className="rh-report-print__footer">{footerLine}</footer> : null}
        </article>
      </div>
    </div>
  )
}
