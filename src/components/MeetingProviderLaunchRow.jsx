import { REMOTE_TASMEE_PROVIDER } from '../utils/remoteTasmeeStorage.js'
import { remoteTasmeeProviderLucideIcon } from '../utils/remoteTasmeeProviderIcons.js'
import { runMeetingProviderLaunch } from '../utils/meetingProviderLaunch.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

const ROW = [
  {
    id: REMOTE_TASMEE_PROVIDER.GOOGLE_MEET,
    ariaLabel: 'فتح جوجل ميت لإنشاء اجتماع',
    title: 'جوجل ميت — فتح meet.new لإنشاء اجتماع، ثم انسخ الرابط إلى الحقل',
    className: 'rh-meeting-launch__btn--google',
    shortLabel: 'ميت',
  },
  {
    id: REMOTE_TASMEE_PROVIDER.ZOOM,
    ariaLabel: 'فتح زووم لبدء اجتماع',
    title: 'زووم — فتح صفحة بدء الاجتماع، ثم انسخ رابط الدعوة إلى الحقل',
    className: 'rh-meeting-launch__btn--zoom',
    shortLabel: 'زووم',
  },
  {
    id: REMOTE_TASMEE_PROVIDER.TEAMS,
    ariaLabel: 'فتح مايكروسوفت تيمز لاجتماع جديد',
    title: 'Microsoft Teams — فتح اجتماع جديد، ثم انسخ الرابط إلى الحقل',
    className: 'rh-meeting-launch__btn--teams',
    shortLabel: 'تيمز',
  },
  {
    id: REMOTE_TASMEE_PROVIDER.JITSI,
    ariaLabel: 'إنشاء غرفة جيتسي وملء الرابط',
    title: 'جيتسي — إنشاء غرفة فورية: يُملأ الرابط تلقائياً ويُنسخ للحافظة',
    className: 'rh-meeting-launch__btn--jitsi',
    shortLabel: 'جيتسي',
  },
  {
    id: REMOTE_TASMEE_PROVIDER.DISCORD,
    ariaLabel: 'فتح ديسكورد',
    title: 'ديسكورد — فتح التطبيق/الموقع، أنشئ رابط دعوة والصقه في الحقل',
    className: 'rh-meeting-launch__btn--discord',
    shortLabel: 'ديسكورد',
  },
  {
    id: REMOTE_TASMEE_PROVIDER.WEBEX,
    ariaLabel: 'فتح Webex',
    title: 'Webex — فتح صفحة الاجتماع، ثم انسخ الرابط إلى الحقل',
    className: 'rh-meeting-launch__btn--webex',
    shortLabel: 'Webex',
  },
]

/**
 * @param {{ mediaType: string, setMeetingUrl: (s: string) => void, setProvider: (s: string) => void, onLaunched: (mode: 'filled' | 'opened', providerId: string) => void, disabled?: boolean }} props
 */
export function MeetingProviderLaunchRow({ mediaType, setMeetingUrl, setProvider, onLaunched, disabled }) {
  return (
    <div className="rh-meeting-launch">
      <p className="rh-meeting-launch__hint">
        إنشاء سريع: اختر التطبيق بالأيقونة والاسم المختصر. <strong>جيتسي</strong> يملأ حقل الرابط وينسخه تلقائياً؛ باقي الخدمات
        تفتح صفحة الإنشاء ثم تنسخ الرابط يدوياً إلى الحقل.
      </p>
      <div className="rh-meeting-launch__row" role="group" aria-label="تطبيقات الاجتماع">
        {ROW.map(({ id, ariaLabel, title, className, shortLabel }) => {
          const Icon = remoteTasmeeProviderLucideIcon(id)
          return (
            <button
              key={id}
              type="button"
              className={['rh-meeting-launch__btn', className].filter(Boolean).join(' ')}
              aria-label={ariaLabel}
              title={title}
              disabled={disabled}
              onClick={async () => {
                const mode = await runMeetingProviderLaunch(id, {
                  setMeetingUrl,
                  setProvider,
                  mediaType,
                })
                onLaunched(mode, id)
              }}
            >
              <RhIcon as={Icon} size={20} strokeWidth={RH_ICON_STROKE} aria-hidden className="rh-meeting-launch__btn-icon" />
              <span className="rh-meeting-launch__btn-label">{shortLabel}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
