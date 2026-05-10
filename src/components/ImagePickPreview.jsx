import { ImageIcon, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef } from 'react'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

function isLikelyDisplayableImageUrl(s) {
  const t = String(s ?? '').trim()
  if (!t || t.length > 2000) return false
  if (t.startsWith('blob:') || t.startsWith('data:image')) return true
  if (t.startsWith('/') && !t.startsWith('//')) return true
  try {
    const u = new URL(t)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * حقل اختيار صورة مع معاينة، زر إزالة (×) أعلى يمين المعاينة، والنقر على المنطقة لاستبدال الصورة.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {string} [props.hint]
 * @param {string} [props.accept]
 * @param {string} [props.remoteUrl] رابط معاينة محفوظ (من الخادم أو حقل نصي)
 * @param {File | null} [props.file]
 * @param {(f: File | null) => void} [props.onFileChange] مطلوب عند pickMode === 'file'
 * @param {() => void} [props.onClearRemote] عند الضغط على × وليس هناك ملف محلي — يُستدعى لمسح الرابط/صورة البعيدة
 * @param {'file'|'url'} [props.pickMode] file = رفع من الجهاز، url = معاينة رابط من الحقل النصي فقط
 * @param {() => void} [props.onHitClick] مع pickMode url: النقر على المنطقة (بدون ملف)
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.busy]
 * @param {boolean} [props.compact] معاينة أصغر (مثل النوافذ الجانبية)
 */
export function ImagePickPreview({
  label,
  hint,
  accept = 'image/*',
  remoteUrl = '',
  file = null,
  onFileChange = () => {},
  onClearRemote,
  pickMode = 'file',
  onHitClick,
  disabled = false,
  busy = false,
  compact = false,
}) {
  const inputRef = useRef(null)
  const inputId = useId()
  const urlOnly = pickMode === 'url'

  const blobUrl = useMemo(() => {
    if (urlOnly || !file) return null
    return URL.createObjectURL(file)
  }, [file, urlOnly])

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [blobUrl])

  const remoteSafe = useMemo(() => {
    const s = typeof remoteUrl === 'string' ? remoteUrl.trim() : ''
    return isLikelyDisplayableImageUrl(s) ? s : ''
  }, [remoteUrl])

  const displaySrc = urlOnly ? remoteSafe : blobUrl || remoteSafe
  const showClear = urlOnly ? Boolean(remoteSafe) : Boolean(file || remoteSafe)

  const handleClear = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled || busy) return
    if (!urlOnly && file) {
      onFileChange(null)
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    if (remoteSafe && typeof onClearRemote === 'function') {
      onClearRemote()
    }
  }

  const handleChange = (e) => {
    const f = e.target.files?.[0] ?? null
    onFileChange(f)
    e.target.value = ''
  }

  const openPicker = () => {
    if (disabled || busy) return
    if (urlOnly) {
      onHitClick?.()
      return
    }
    inputRef.current?.click()
  }

  const rootClass = ['rh-image-pick-preview__root', compact ? 'rh-image-pick-preview__root--compact' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div className={`ui-field ${rootClass}`}>
      <span className="ui-field__label" id={`${inputId}-label`}>
        {label}
      </span>
      <div
        className={[
          'rh-image-pick-preview',
          displaySrc ? 'rh-image-pick-preview--has-image' : '',
          disabled || busy ? 'rh-image-pick-preview--disabled' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {!urlOnly ? (
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={accept}
            className="rh-image-pick-preview__input"
            onChange={handleChange}
            disabled={disabled || busy}
            tabIndex={-1}
            aria-labelledby={`${inputId}-label`}
          />
        ) : null}
        <button
          type="button"
          className="rh-image-pick-preview__hit"
          onClick={openPicker}
          disabled={disabled || busy}
          aria-label={
            urlOnly
              ? displaySrc
                ? 'تعديل رابط الصورة في الحقل النصي'
                : 'الانتقال إلى حقل رابط الصورة'
              : displaySrc
                ? 'استبدال الصورة'
                : 'اختيار صورة'
          }
        >
          {displaySrc ? (
            <img src={displaySrc} alt="" className="rh-image-pick-preview__img" decoding="async" />
          ) : (
            <span className="rh-image-pick-preview__placeholder">
              <RhIcon as={ImageIcon} size={28} strokeWidth={RH_ICON_STROKE} aria-hidden />
              <span>{urlOnly ? 'اضغط للانتقال إلى حقل الرابط أعلاه' : 'اضغط لاختيار صورة'}</span>
            </span>
          )}
        </button>
        {showClear ? (
          <button
            type="button"
            className="rh-image-pick-preview__clear"
            onClick={handleClear}
            disabled={disabled || busy}
            aria-label="إزالة الصورة"
          >
            <RhIcon as={X} size={18} strokeWidth={2.25} aria-hidden />
          </button>
        ) : null}
      </div>
      {hint ? (
        <p className="ui-field__hint" id={`${inputId}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}
