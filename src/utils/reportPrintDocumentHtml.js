/** مستندات طباعة التقارير — قالب موحّد للعرض في نافذة الطباعة */

export function escapeHtml(text) {
  const s = String(text ?? '')
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function reportPrintDocumentStyles() {
  return `
    * { box-sizing: border-box; }
    body { font-family: Tahoma, Arial, sans-serif; padding: 14mm 12mm 18mm; color: #111; margin: 0; }
    .rh-print-doc__header {
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 2px solid #222;
    }
    .rh-print-doc__brand {
      font-size: 11px;
      letter-spacing: 0.02em;
      color: #444;
      margin-bottom: 6px;
    }
    .rh-print-doc__h1 { font-size: 17px; margin: 0 0 6px; font-weight: 700; color: #000; }
    .rh-print-doc__meta { font-size: 11px; color: #333; line-height: 1.65; }
    .rh-print-doc__meta > div { margin: 0 0 2px; }
    .rh-print-doc__footer {
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px solid #bbb;
      font-size: 10px;
      color: #555;
      text-align: center;
    }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #bbb; padding: 7px 8px; text-align: right; font-size: 12px; }
    th { background: #f0f0f0; font-weight: 600; }
    h2 { font-size: 15px; margin: 0 0 10px; font-weight: 700; }
  `
}

/**
 * @param {object} p
 * @param {string} p.documentTitle
 * @param {string} [p.brandTitle]
 * @param {string[]} [p.headerLines]
 * @param {string} p.tableTitle
 * @param {{ key: string, label: string }[]} p.columns
 * @param {Record<string, unknown>[]} p.rows
 * @param {string} [p.footerLine]
 */
export function buildStandaloneReportPrintHtml({
  documentTitle,
  brandTitle,
  headerLines = [],
  tableTitle,
  columns,
  rows,
  footerLine,
}) {
  const head = (columns || []).map((c) => `<th>${escapeHtml(c.label || '')}</th>`).join('')
  const body = (rows || [])
    .map((row) => {
      const cells = (columns || []).map((c) => `<td>${escapeHtml(row?.[c.key] ?? '—')}</td>`).join('')
      return `<tr>${cells}</tr>`
    })
    .join('')
  const metaHtml = headerLines.map((l) => `<div>${escapeHtml(l)}</div>`).join('')
  const brand = brandTitle ? `<div class="rh-print-doc__brand">${escapeHtml(brandTitle)}</div>` : ''
  const foot = footerLine ? `<div class="rh-print-doc__footer">${escapeHtml(footerLine)}</div>` : ''

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>${escapeHtml(
    documentTitle,
  )}</title><style>${reportPrintDocumentStyles()}</style></head><body>
  <div class="rh-print-doc__header">${brand}<h1 class="rh-print-doc__h1">${escapeHtml(tableTitle)}</h1><div class="rh-print-doc__meta">${metaHtml}</div></div>
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  ${foot}
  </body></html>`
}
