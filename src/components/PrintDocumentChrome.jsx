/**
 * رأس وتذييل موحّدان للطباعة ولقطات PDF — نفس فئات rh-print-doc__* في index.css
 *
 * @param {object} props
 * @param {string} [props.brandTitle]
 * @param {import('react').ReactNode} [props.title]
 * @param {import('react').ReactNode} [props.meta]
 * @param {import('react').ReactNode} [props.footer]
 * @param {string} [props.headerClassName]
 * @param {string} [props.footerClassName]
 * @param {import('react').ReactNode} props.children
 */
export function PrintDocumentChrome({
  brandTitle,
  title,
  meta,
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
        {brandTitle ? <div className="rh-print-doc__brand">{brandTitle}</div> : null}
        {title != null && title !== false ? <h1 className="rh-print-doc__h1">{title}</h1> : null}
        {meta != null && meta !== false ? <div className="rh-print-doc__meta">{meta}</div> : null}
      </div>
      {children}
      {footer != null && footer !== false ? <div className={footCls}>{footer}</div> : null}
    </>
  )
}
