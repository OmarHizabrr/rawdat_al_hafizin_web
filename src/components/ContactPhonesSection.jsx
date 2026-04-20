import { MessageCircle, Phone } from 'lucide-react'
import { normalizeContactPhones, smsHref, whatsappSendUrl } from '../utils/contactPhones.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

/**
 * @param {object} props
 * @param {unknown} props.phones
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {string} [props.prefillBody]
 * @param {string} [props.className]
 */
export function ContactPhonesSection({
  phones,
  title = 'أرقام التواصل',
  subtitle = 'واتساب مباشرة، أو رسالة نصية إن لم يتوفر التطبيق.',
  prefillBody = '',
  className = '',
}) {
  const rows = normalizeContactPhones(phones)
  if (!rows.length) return null

  return (
    <section className={['rh-contact-phones', className].filter(Boolean).join(' ')}>
      <div className="rh-contact-phones__head">
        <h2 className="rh-contact-phones__title">{title}</h2>
        {subtitle ? <p className="rh-contact-phones__subtitle">{subtitle}</p> : null}
      </div>
      <ul className="rh-contact-phones__list">
        {rows.map((row) => {
          const wa = whatsappSendUrl(row.phone, prefillBody)
          const sms = smsHref(row.phone, prefillBody)
          const label = row.label?.trim() || 'تواصل'
          return (
            <li key={row.id} className="rh-contact-phones__card">
              <div className="rh-contact-phones__card-main">
                <span className="rh-contact-phones__label">{label}</span>
                <span className="rh-contact-phones__number" dir="ltr">
                  {row.phone}
                </span>
              </div>
              <div className="rh-contact-phones__actions">
                {wa ? (
                  <a className="rh-contact-phones__btn rh-contact-phones__btn--wa" href={wa} target="_blank" rel="noopener noreferrer">
                    <RhIcon as={MessageCircle} size={18} strokeWidth={RH_ICON_STROKE} />
                    واتساب
                  </a>
                ) : null}
                {sms ? (
                  <a className="rh-contact-phones__btn rh-contact-phones__btn--sms" href={sms}>
                    <RhIcon as={Phone} size={18} strokeWidth={RH_ICON_STROKE} />
                    رسالة نصية
                  </a>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
