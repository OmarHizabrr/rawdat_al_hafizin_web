import { storePrintPayload } from './reportPrintPayload.js'

/**
 * فتح صفحة طباعة مستقلة (HTML+CSS) في تبويب جديد.
 * @param {object} payload
 * @param {{ autoPrint?: boolean }} [options]
 * @returns {boolean}
 */
export function openReportPrintPage(payload, { autoPrint = true } = {}) {
  if (typeof window === 'undefined' || !payload) return false
  const id = storePrintPayload(payload)
  if (!id) return false

  const params = new URLSearchParams({ id })
  if (autoPrint) params.set('auto', '1')

  const url = `${window.location.origin}/app/reports/print?${params.toString()}`
  const win = window.open(url, '_blank', 'noopener,noreferrer')
  return Boolean(win)
}

export function buildPrintHeaderLines(printContext) {
  const headerLines = []
  if (printContext?.reportTypeLabel) headerLines.push(`نوع التقرير: ${printContext.reportTypeLabel}`)
  if (printContext?.entityName) headerLines.push(`الكيان: ${printContext.entityName}`)
  if (printContext?.fromYmd || printContext?.toYmd) {
    headerLines.push(`الفترة (تقويم أم القرى): ${printContext.fromYmd || '—'} → ${printContext.toYmd || '—'}`)
  }
  return headerLines
}

export function buildPrintFooterLine(printContext) {
  const stamp = new Date().toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' })
  return printContext?.siteTitle ? `${printContext.siteTitle} · ${stamp}` : stamp
}

/**
 * @param {object} p
 * @param {string} p.documentTitle
 * @param {{ label: string, value: string|number }[]} [p.kpis]
 * @param {{ title: string, columns: { key: string, label: string }[], rows: Record<string, unknown>[] }[]} p.sections
 * @param {object} [p.printContext]
 * @param {{ autoPrint?: boolean }} [options]
 */
export function printMultiSectionReport({ documentTitle, sections, kpis, printContext }, options) {
  const printable = (sections || []).filter((s) => s?.rows?.length)
  const hasKpis = Boolean(kpis?.length)
  if (!printable.length && !hasKpis) return false

  return openReportPrintPage(
    {
      documentTitle,
      brandTitle: printContext?.siteTitle,
      headerLines: buildPrintHeaderLines(printContext),
      footerLine: buildPrintFooterLine(printContext),
      kpis: kpis || [],
      sections: printable,
    },
    options,
  )
}

/**
 * @param {object} p
 * @param {string} p.title
 * @param {{ key: string, label: string }[]} p.columns
 * @param {Record<string, unknown>[]} p.rows
 * @param {object} [p.printContext]
 * @param {{ autoPrint?: boolean }} [options]
 */
export function printSingleTable({ title, columns, rows, printContext }, options) {
  if (!rows?.length) return false

  return openReportPrintPage(
    {
      documentTitle: title,
      brandTitle: printContext?.siteTitle,
      headerLines: buildPrintHeaderLines(printContext),
      footerLine: buildPrintFooterLine(printContext),
      kpis: [],
      sections: [{ title, columns, rows }],
    },
    options,
  )
}

/** @deprecated استخدم openReportPrintPage — للتوافق مع أي استدعاءات قديمة */
export function openPrintDocument() {
  return false
}
