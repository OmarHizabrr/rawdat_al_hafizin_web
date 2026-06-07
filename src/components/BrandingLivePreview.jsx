import { BookOpen, Home, Settings } from 'lucide-react'

import { buildPreviewDomStyle } from '../data/brandingPresets.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

/**
 * معاينة حية للهوية (مسودة النموذج فقط — لا تُحفظ حتى تضغط حفظ).
 */
export function BrandingLivePreview({ previewMode, onPreviewMode, themeLight, themeDark, siteName, siteTitle, logoSrc }) {
  const draft = previewMode === 'dark' ? themeDark : themeLight
  const style = buildPreviewDomStyle(draft, previewMode)
  const title = siteTitle == null ? '' : String(siteTitle)
  const titleShort = title.length > 72 ? `${title.slice(0, 72)}…` : title

  return (
    <div className="rh-live-preview card" style={style}>
      <div className="rh-live-preview__head">
        <h3 className="rh-live-preview__title">معاينة حية</h3>
        <p className="rh-live-preview__subtitle">تنعكس تعديلاتك فوراً — اختر الوضع:</p>
        <div className="rh-live-preview__mode" role="group" aria-label="وضع المعاينة">
          <button
            type="button"
            className={['rh-live-preview__mode-btn', previewMode === 'light' ? 'rh-live-preview__mode-btn--active' : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => onPreviewMode('light')}
          >
            فاتح
          </button>
          <button
            type="button"
            className={['rh-live-preview__mode-btn', previewMode === 'dark' ? 'rh-live-preview__mode-btn--active' : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => onPreviewMode('dark')}
          >
            داكن
          </button>
        </div>
      </div>

      <div className="rh-live-preview__scroll rh-themed-scroll">
        <div className="rh-live-preview__page">
          <header className="hero rh-live-preview__hero">
            <div className="hero-inner">
              <img className="logo" src={logoSrc} alt="" width={72} height={72} />
              <p className="eyebrow">سطر تعريفي (مثال)</p>
              <h1>{siteName.trim() || 'اسم الموقع'}</h1>
              <p className="subtitle">{titleShort || 'عنوان الموقع في المتصفح'}</p>
              <button type="button" className="cta ui-btn ui-btn--primary ui-btn--sm" disabled tabIndex={-1}>
                زر دعوة
              </button>
            </div>
          </header>

          <main className="content rh-live-preview__content">
            <section className="card rh-live-preview__sample-card">
              <h2 className="rh-live-preview__heading">بطاقة داخل المنصة</h2>
              <p className="lead">نص رئيسي في الفقرات والبطاقات.</p>
              <p className="rh-live-preview__muted">نص ثانوي — مثل التلميحات تحت الحقول.</p>
              <p className="rh-live-preview__link-row">
                <a href="#preview" className="rh-live-preview__inline-link" onClick={(e) => e.preventDefault()}>
                  رابط داخل النص
                </a>
              </p>
              <div className="rh-live-preview__chips" aria-hidden>
                <span className="rh-live-preview__chip rh-live-preview__chip--success">نجاح</span>
                <span className="rh-live-preview__chip rh-live-preview__chip--warning">تحذير</span>
                <span className="rh-live-preview__chip rh-live-preview__chip--danger">خطر</span>
              </div>
            </section>

            <div className="ui-field rh-live-preview__field">
              <span className="ui-field__label">حقل نموذجي</span>
              <div className="rh-live-preview__fake-input">نص توضيحي داخل الحقل…</div>
              <p className="ui-field__hint">تلميح تحت الحقل.</p>
            </div>

            <div className="rh-live-preview__mock-app">
              <aside className="rh-live-preview__mock-side" aria-hidden>
                <div className="rh-live-preview__mock-brand">
                  <img src={logoSrc} alt="" width={28} height={28} className="rh-live-preview__mock-logo" />
                  <span className="rh-live-preview__mock-site">{siteName.trim() || 'الموقع'}</span>
                </div>
                <nav className="rh-live-preview__mock-nav" aria-label="معاينة القائمة">
                  <span className="rh-nav-link rh-nav-link--active" role="presentation">
                    <span className="rh-nav-link__icon">
                      <RhIcon as={Home} size={14} strokeWidth={RH_ICON_STROKE} />
                    </span>
                    <span className="rh-nav-link__label">الرئيسية</span>
                  </span>
                  <span className="rh-nav-link" role="presentation">
                    <span className="rh-nav-link__icon">
                      <RhIcon as={BookOpen} size={14} strokeWidth={RH_ICON_STROKE} />
                    </span>
                    <span className="rh-nav-link__label">الخطط</span>
                  </span>
                  <span className="rh-nav-link" role="presentation">
                    <span className="rh-nav-link__icon">
                      <RhIcon as={Settings} size={14} strokeWidth={RH_ICON_STROKE} />
                    </span>
                    <span className="rh-nav-link__label">الإعدادات</span>
                  </span>
                </nav>
              </aside>
              <div className="rh-live-preview__mock-main">
                <div className="rh-live-preview__mock-topbar">شريط علوي</div>
                <div className="rh-live-preview__mock-card">
                  <strong className="rh-live-preview__heading">محتوى الصفحة</strong>
                  <p className="rh-live-preview__muted">أزرار حقيقية كما في الموقع:</p>
                  <div className="rh-live-preview__mock-btns">
                    <button type="button" className="ui-btn ui-btn--primary ui-btn--sm" disabled tabIndex={-1}>
                      أساسي
                    </button>
                    <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" disabled tabIndex={-1}>
                      ثانوي
                    </button>
                    <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" disabled tabIndex={-1}>
                      شفاف
                    </button>
                    <button type="button" className="ui-btn ui-btn--danger ui-btn--sm" disabled tabIndex={-1}>
                      خطر
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
