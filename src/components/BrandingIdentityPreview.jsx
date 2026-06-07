/**
 * معاينة مختصرة لتسمية الموقع والشعار (بدون ألوان مخصّصة).
 */
export function BrandingIdentityPreview({ siteName, siteTitle, siteDescription, logoSrc }) {
  const name = siteName.trim() || 'اسم الموقع'
  const title = siteTitle.trim() || 'عنوان الموقع في المتصفح'
  const desc = siteDescription.trim() || 'وصف الموقع يظهر عند مشاركة الرابط…'

  return (
    <div className="rh-branding-mini-preview card" aria-label="معاينة تسمية الموقع">
      <p className="rh-branding-mini-preview__label">معاينة حية</p>
      <div className="rh-branding-mini-preview__browser">
        <div className="rh-branding-mini-preview__tab">
          <img src={logoSrc} alt="" width={14} height={14} className="rh-branding-mini-preview__tab-logo" />
          <span className="rh-branding-mini-preview__tab-title">الرئيسية — {title}</span>
        </div>
      </div>
      <div className="rh-branding-mini-preview__hero">
        <img src={logoSrc} alt="" width={56} height={56} className="rh-branding-mini-preview__logo" />
        <div className="rh-branding-mini-preview__copy">
          <strong className="rh-branding-mini-preview__name">{name}</strong>
          <span className="rh-branding-mini-preview__subtitle">{title}</span>
          <p className="rh-branding-mini-preview__desc">{desc}</p>
        </div>
      </div>
    </div>
  )
}
