/**
 * تصدير عنصر DOM إلى PDF ومشاركته أو تنزيله.
 * يعتمد على html2canvas لالتقاط الواجهة كما تظهر (بما في ذلك العربية).
 */

/**
 * @param {HTMLElement} element
 */
export async function renderElementToPdf(element) {
  const html2canvas = (await import('html2canvas')).default
  const { jsPDF } = await import('jspdf')

  const canvas = await html2canvas(element, {
    scale: Math.min(2, (window.devicePixelRatio || 1) * 1.5),
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    ignoreElements: (node) =>
      Boolean(node.classList?.contains('no-print') || node.getAttribute?.('data-pdf-ignore') === 'true'),
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = pdf.internal.pageSize.getHeight()

  const imgProps = pdf.getImageProperties(imgData)
  const imgScaledHeight = (imgProps.height * pdfWidth) / imgProps.width

  let heightLeft = imgScaledHeight
  let position = 0

  pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgScaledHeight)
  heightLeft -= pdfHeight

  while (heightLeft > 0) {
    position = heightLeft - imgScaledHeight
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgScaledHeight)
    heightLeft -= pdfHeight
  }

  return pdf
}

/** @returns {Promise<Blob>} */
export async function elementToPdfBlob(element) {
  const pdf = await renderElementToPdf(element)
  return pdf.output('blob')
}

/**
 * @param {Blob} blob
 * @param {string} fileName
 * @returns {'shared'|'downloaded'}
 */
export async function shareOrDownloadPdf(blob, fileName) {
  const file = new File([blob], fileName, { type: 'application/pdf' })
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: fileName })
    return 'shared'
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.rel = 'noopener'
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
  return 'downloaded'
}
