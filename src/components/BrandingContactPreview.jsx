/**
 * معاينة مختصرة لأرقام التواصل كما تظهر للمستخدم.
 */
export function BrandingContactPreview({ rows }) {
  const visible = rows.filter((r) => String(r.phone || '').trim() || String(r.telegram || '').trim())

  return (
    <div className="rh-branding-mini-preview card" aria-label="معاينة أرقام التواصل">
      <p className="rh-branding-mini-preview__label">معاينة حية</p>
      {visible.length === 0 ? (
        <p className="rh-branding-contact-preview__empty">أضف رقماً أو تيليجرام لترى شكل العرض.</p>
      ) : (
        <ul className="rh-branding-contact-preview__list">
          {visible.map((row) => (
            <li key={row.id} className="rh-branding-contact-preview__item">
              <strong>{row.label.trim() || 'تواصل'}</strong>
              {row.phone.trim() ? <span>جوال: {row.phone.trim()}</span> : null}
              {row.telegram.trim() ? <span>تيليجرام: {row.telegram.trim()}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
