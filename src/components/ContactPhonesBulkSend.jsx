import { useCallback, useMemo, useState } from 'react'
import {
  normalizeContactPhones,
  normalizeTelegramHandle,
  smsHref,
  telegramSendUrl,
  whatsappSendUrl,
} from '../utils/contactPhones.js'
import { Button } from '../ui/index.js'
import { useToast } from '../ui/useToast.js'

/**
 * اختيار عدة جهات وعدة وسائل ثم فتح الروابط (تبويبات) بالتتابع.
 * @param {object} props
 * @param {unknown} props.phones
 * @param {string} props.messageBody
 * @param {string} [props.className]
 */
export function ContactPhonesBulkSend({ phones, messageBody, className = '' }) {
  const toast = useToast()
  const rows = useMemo(() => normalizeContactPhones(phones), [phones])
  // Default behavior: all contacts are selected unless explicitly deselected.
  const [deselectedIds, setDeselectedIds] = useState(() => new Set())
  const [chWa, setChWa] = useState(true)
  const [chSms, setChSms] = useState(true)
  const [chTg, setChTg] = useState(true)
  const [opening, setOpening] = useState(false)

  const toggleContact = useCallback((id) => {
    setDeselectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setDeselectedIds(new Set())
  }, [])

  const clearAll = useCallback(() => {
    setDeselectedIds(new Set(rows.map((r) => r.id)))
  }, [rows])

  const openChannels = useCallback(() => {
    const text = String(messageBody ?? '')
    const selectedRows = rows.filter((r) => !deselectedIds.has(r.id))
    if (!selectedRows.length) {
      toast.warning('حدّد جهة تواصل واحدة على الأقل.', 'تنبيه')
      return
    }
    if (!chWa && !chSms && !chTg) {
      toast.warning('فعّل وسيلة واحدة على الأقل (واتساب، تيليجرام، أو رسالة نصية).', 'تنبيه')
      return
    }

    /** @type {string[]} */
    const urls = []
    for (const row of selectedRows) {
      if (chWa && row.phone) {
        const u = whatsappSendUrl(row.phone, text)
        if (u) urls.push(u)
      }
      if (chSms && row.phone) {
        const u = smsHref(row.phone, text)
        if (u) urls.push(u)
      }
      if (chTg && row.telegram) {
        const u = telegramSendUrl(row.telegram, text)
        if (u) urls.push(u)
      }
    }

    if (!urls.length) {
      toast.warning(
        'لا توجد وسيلة متاحة للجهات المحددة (مثلاً تيليجرام غير مضبوط أو لا يوجد رقم للرسائل).',
        'تنبيه',
      )
      return
    }

    setOpening(true)
    urls.forEach((url, i) => {
      window.setTimeout(() => {
        window.open(url, '_blank', 'noopener,noreferrer')
        if (i === urls.length - 1) {
          setOpening(false)
          toast.info(
            `طُلب فتح ${urls.length} رابطاً في تبويبات جديدة. إن لم تظهر، اسمح للمتصفح بالنوافذ المنبثقة لهذا الموقع.`,
            '',
          )
        }
      }, i * 550)
    })
  }, [rows, deselectedIds, chWa, chSms, chTg, messageBody, toast])

  if (!rows.length) return null

  return (
    <section className={['rh-contact-bulk', className].filter(Boolean).join(' ')}>
      <div className="rh-contact-bulk__head">
        <h2 className="rh-contact-bulk__title">إرسال الطلب دفعة واحدة</h2>
        <p className="rh-contact-bulk__subtitle">
          حدّد الجهات والوسائل، ثم اضغط الزر فيفتح المتصفح التبويبات بالتتابع (واتساب، تيليجرام، رسالة نصية) مع
          نفس نص الطلب أعلاه.
        </p>
      </div>

      <div className="rh-contact-bulk__channels">
        <span className="rh-contact-bulk__channels-label">الوسائل:</span>
        <label className="rh-contact-bulk__toggle">
          <input type="checkbox" checked={chWa} onChange={(e) => setChWa(e.target.checked)} />
          واتساب
        </label>
        <label className="rh-contact-bulk__toggle">
          <input type="checkbox" checked={chTg} onChange={(e) => setChTg(e.target.checked)} />
          تيليجرام
        </label>
        <label className="rh-contact-bulk__toggle">
          <input type="checkbox" checked={chSms} onChange={(e) => setChSms(e.target.checked)} />
          رسالة نصية
        </label>
      </div>

      <div className="rh-contact-bulk__pick-actions">
        <button type="button" className="rh-contact-bulk__linkish" onClick={selectAll}>
          تحديد الكل
        </button>
        <button type="button" className="rh-contact-bulk__linkish" onClick={clearAll}>
          إلغاء التحديد
        </button>
      </div>

      <ul className="rh-contact-bulk__list">
        {rows.map((row) => {
          const hasWa = Boolean(row.phone)
          const hasSms = Boolean(row.phone)
          const hasTg = Boolean(normalizeTelegramHandle(row.telegram))
          const label = row.label?.trim() || 'جهة تواصل'
          return (
            <li key={row.id} className="rh-contact-bulk__row">
              <label className="rh-contact-bulk__check">
                <input
                  type="checkbox"
                  checked={!deselectedIds.has(row.id)}
                  onChange={() => toggleContact(row.id)}
                />
                <span className="rh-contact-bulk__check-main">
                  <strong>{label}</strong>
                  {row.phone ? (
                    <span className="rh-contact-bulk__meta" dir="ltr">
                      {row.phone}
                    </span>
                  ) : null}
                  {row.telegram ? (
                    <span className="rh-contact-bulk__meta" dir="ltr">
                      تيليجرام: {row.telegram}
                    </span>
                  ) : null}
                </span>
              </label>
              <span className="rh-contact-bulk__badges">
                {hasWa ? <span className="rh-contact-bulk__badge">واتساب</span> : null}
                {hasTg ? <span className="rh-contact-bulk__badge rh-contact-bulk__badge--tg">تيليجرام</span> : null}
                {hasSms ? <span className="rh-contact-bulk__badge">SMS</span> : null}
                {!hasWa && !hasTg ? (
                  <span className="rh-contact-bulk__badge rh-contact-bulk__badge--muted">لا وسيلة متاحة</span>
                ) : null}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="rh-contact-bulk__footer">
        <Button type="button" variant="primary" loading={opening} disabled={opening} onClick={openChannels}>
          فتح قنوات الإرسال المختارة
        </Button>
      </div>
    </section>
  )
}
