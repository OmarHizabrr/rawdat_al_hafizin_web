import { buildMultiSectionReportPrintHtml, buildStandaloneReportPrintHtml } from './reportPrintDocumentHtml.js'

/**
 * فتح نافذة طباعة موثوقة (تنتظر تحميل المحتوى قبل print).
 * @param {string} html
 */
export function openPrintDocument(html) {
  if (typeof window === 'undefined' || !html) return false
  const win = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900')
  if (!win) return false
  win.document.open()
  win.document.write(html)
  win.document.close()
  win.focus()
  const trigger = () => {
    try {
      win.print()
    } catch {
      /* ignore */
    }
  }
  if (win.document.readyState === 'complete') {
    win.setTimeout(trigger, 250)
  } else {
    win.addEventListener('load', () => win.setTimeout(trigger, 250), { once: true })
  }
  return true
}

/**
 * @param {object} p
 * @param {string} p.title
 * @param {{ key: string, label: string }[]} p.columns
 * @param {Record<string, unknown>[]} p.rows
 * @param {object} [p.printContext]
 */
export function printSingleTable({ title, columns, rows, printContext }) {
  if (!rows?.length) return false
  const headerLines = buildPrintHeaderLines(printContext)
  const footerLine = buildPrintFooterLine(printContext)
  const html = buildStandaloneReportPrintHtml({
    documentTitle: title,
    brandTitle: printContext?.siteTitle,
    headerLines,
    tableTitle: title,
    columns,
    rows,
    footerLine,
  })
  return openPrintDocument(html)
}

/**
 * @param {object} p
 * @param {string} p.documentTitle
 * @param {{ title: string, columns: { key: string, label: string }[], rows: Record<string, unknown>[] }[]} p.sections
 * @param {object} [p.printContext]
 */
export function printMultiSectionReport({ documentTitle, sections, printContext }) {
  const printable = (sections || []).filter((s) => s?.rows?.length)
  if (!printable.length) return false
  const html = buildMultiSectionReportPrintHtml({
    documentTitle,
    brandTitle: printContext?.siteTitle,
    headerLines: buildPrintHeaderLines(printContext),
    sections: printable,
    footerLine: buildPrintFooterLine(printContext),
  })
  return openPrintDocument(html)
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
