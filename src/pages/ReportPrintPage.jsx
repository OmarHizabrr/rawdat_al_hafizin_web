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

function PrintSection({ section }) {
  const columns = section?.columns || []
  const rows = section?.rows || []
  if (!columns.length || !rows.length) return null

  return (
    <section className="rh-report-print__section">
      <h2 className="rh-report-print__section-title">{section.title || ''}</h2>
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
    const data = loadPrintPayload(payloadId)
    setPayload(data)
    setLoaded(true)
    if (data?.documentTitle) {
      document.title = data.documentTitle
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

  if (!payload || (!sections.length && !kpis.length)) {
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
  const headerLines = payload.headerLines || []
  const footerLine = payload.footerLine || ''

  return (
    <div className="rh-report-print">
      <div className="rh-report-print__toolbar no-print">
        <p className="rh-report-print__toolbar-title">{payload.documentTitle}</p>
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
          <header>
            {brandTitle ? <div className="rh-report-print__brand">{brandTitle}</div> : null}
            <h1 className="rh-report-print__title">{payload.documentTitle}</h1>
            {headerLines.length ? (
              <div className="rh-report-print__meta">
                {headerLines.map((line, index) => (
                  <div key={index} className="rh-report-print__meta-row">
                    {line}
                  </div>
                ))}
              </div>
            ) : null}
          </header>

          {kpis.length ? (
            <div className="rh-report-print__kpis">
              {kpis.map((kpi, index) => (
                <div key={`${kpi.label}-${index}`} className="rh-report-print__kpi">
                  <strong>{cellValue(kpi.value)}</strong>
                  <span>{kpi.label}</span>
                </div>
              ))}
            </div>
          ) : null}

          {sections.map((section, index) => (
            <PrintSection key={`${section.title}-${index}`} section={section} />
          ))}

          {footerLine ? <footer className="rh-report-print__footer">{footerLine}</footer> : null}
        </article>
      </div>
    </div>
  )
}
