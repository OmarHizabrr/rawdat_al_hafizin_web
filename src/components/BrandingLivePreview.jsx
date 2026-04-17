import { buildPreviewDomStyle } from '../data/brandingPresets.js'

/**
 * معاينة حية للهوية (مسودة النموذج فقط — لا تُحفظ حتى تضغط حفظ).
 * @param {'light' | 'dark'} props.previewMode
 * @param {(m: 'light' | 'dark') => void} props.onPreviewMode
 * @param {Record<string, string>} props.themeLight
 * @param {Record<string, string>} props.themeDark
 * @param {string} props.siteName
 * @param {string} props.siteTitle
 * @param {string} props.logoSrc
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
        <p className="rh-live-preview__subtitle">تنعكس تعديلاتك هنا قبل الحفظ — للوضع الذي تختاره:</p>
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

      <div className="rh-live-preview__scroll">
        <div className="rh-live-preview__page">
          <header className="hero rh-live-preview__hero">
            <div className="hero-inner">
              <img className="logo" src={logoSrc} alt="" width={72} height={72} />
              <p className="eyebrow">سطر تعريفي (مثال)</p>
              <h1>{siteName.trim() || 'اسم الموقع'}</h1>
              <p className="subtitle">{titleShort || 'عنوان الموقع في المتصفح'}</p>
              <button type="button" className="cta" disabled tabIndex={-1}>
                زر دعوة (مثال)
              </button>
            </div>
          </header>

          <main className="content rh-live-preview__content">
            <section className="card">
              <h2>بطاقة داخل المنصة</h2>
              <p className="lead">هذا النص يوضّح لون النص الرئيسي والثانوي في البطاقات.</p>
              <p style={{ color: 'var(--rh-text-muted)', fontSize: '0.9rem' }}>نص ثانوي — مثل التلميحات في النماذج.</p>
            </section>

            <div className="rh-live-preview__mock-app">
              <aside className="rh-live-preview__mock-side" aria-hidden>
                <div className="rh-live-preview__mock-brand">
                  <img src={logoSrc} alt="" width={28} height={28} className="rh-live-preview__mock-logo" />
                  <span className="rh-live-preview__mock-site">{siteName.trim() || 'الموقع'}</span>
                </div>
                <div className="rh-live-preview__mock-nav">
                  <span className="rh-live-preview__mock-link rh-live-preview__mock-link--on">الرئيسية</span>
                  <span className="rh-live-preview__mock-link">الخطط</span>
                  <span className="rh-live-preview__mock-link">الإعدادات</span>
                </div>
              </aside>
              <div className="rh-live-preview__mock-main">
                <div className="rh-live-preview__mock-topbar">شريط علوي (مثال)</div>
                <div className="rh-live-preview__mock-card">
                  <strong>محتوى الصفحة</strong>
                  <p>أزرار وألوان أساسية:</p>
                  <div className="rh-live-preview__mock-btns">
                    <button type="button" className="rh-live-preview__btn rh-live-preview__btn--primary">
                      أساسي
                    </button>
                    <button type="button" className="rh-live-preview__btn rh-live-preview__btn--secondary">
                      ثانوي
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
