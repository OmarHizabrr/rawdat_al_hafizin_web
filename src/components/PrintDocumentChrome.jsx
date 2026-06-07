/**
 * رأس وتذييل موحّدان للطباعة ولقطات PDF — نفس فئات rh-print-doc__* في index.css
 *
 * @param {object} props
 * @param {string} [props.brandTitle]
 * @param {string} [props.logoSrc]
 * @param {import('react').ReactNode} [props.title]
 * @param {import('react').ReactNode} [props.meta]
 * @param {{ label: string, value: import('react').ReactNode }[]} [props.metaItems]
 * @param {import('react').ReactNode} [props.footer]
 * @param {string} [props.headerClassName]
 * @param {string} [props.footerClassName]
 * @param {import('react').ReactNode} props.children
 */
export function PrintDocumentChrome({
  brandTitle,
  logoSrc,
  title,
  meta,
  metaItems,
  footer,
  children,
  headerClassName = '',
  footerClassName = '',
}) {
  const headCls = ['rh-print-doc__header', headerClassName].filter(Boolean).join(' ')
  const footCls = ['rh-print-doc__footer', footerClassName].filter(Boolean).join(' ')

  return (
    <>
      <div className={headCls}>
        <div className="rh-print-doc__header-band">
          {logoSrc ? <img src={logoSrc} alt="" className="rh-print-doc__logo" /> : null}
          <div className="rh-print-doc__header-main">
            {brandTitle ? <div className="rh-print-doc__brand">{brandTitle}</div> : null}
            {title != null && title !== false ? <h1 className="rh-print-doc__h1">{title}</h1> : null}
          </div>
          <span className="rh-print-doc__badge">تقرير رسمي</span>
        </div>
        {metaItems?.length ? (
          <dl className="rh-print-doc__meta-grid">
            {metaItems.map((item, index) => (
              <div key={`${item.label}-${index}`} className="rh-print-doc__meta-item">
                <dt className="rh-print-doc__meta-label">{item.label}</dt>
                <dd className="rh-print-doc__meta-value">{item.value ?? '—'}</dd>
              </div>
            ))}
          </dl>
        ) : meta != null && meta !== false ? (
          <div className="rh-print-doc__meta">{meta}</div>
        ) : null}
      </div>
      {children}
      {footer != null && footer !== false ? <div className={footCls}>{footer}</div> : null}
    </>
  )
}
