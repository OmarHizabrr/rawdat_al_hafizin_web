import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { isValidPhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js/min'
import { COUNTRY_DIAL_OPTIONS_AR, COUNTRY_OPTIONS_AR } from '../data/countriesAr.js'
import {
  loadMyProfileRequest,
  PROFILE_REQUEST_STATUS,
  subscribeMyProfileRequest,
  upsertMyProfileRequest,
} from '../services/profileRequestService.js'
import { Button, Modal, NumberStepField, SearchableSelect, TextField, useToast } from '../ui/index.js'

const GENDER_OPTIONS = [
  { value: 'male', label: 'ذكر' },
  { value: 'female', label: 'أنثى' },
]

const EDUCATION_OPTIONS = [
  { value: 'أمي', label: 'أمي' },
  { value: 'يقرأ ويكتب', label: 'يقرأ ويكتب' },
  { value: 'روضة', label: 'روضة' },
  { value: 'ابتدائي', label: 'ابتدائي' },
  { value: 'إعدادي', label: 'إعدادي' },
  { value: 'ثانوي', label: 'ثانوي' },
  { value: 'دبلوم', label: 'دبلوم' },
  { value: 'جامعي', label: 'جامعي' },
  { value: 'ماجستير', label: 'ماجستير' },
  { value: 'دكتوراه', label: 'دكتوراه' },
  { value: 'دراسات عليا', label: 'دراسات عليا' },
  { value: 'أخرى', label: 'أخرى' },
]

function dialCodeForRegion(regionCode) {
  return COUNTRY_DIAL_OPTIONS_AR.find((o) => o.value === regionCode)?.dialCode || ''
}

function clampAge(age) {
  const n = Number(age)
  if (!Number.isFinite(n)) return 18
  return Math.max(7, Math.min(150, n))
}

/**
 * تجهيز حقول الهاتف للعرض: أرقام وطنية + دولة/مفتاح (أي سجل قديم بصيغة دولية كاملة).
 */
function phoneDisplayFieldsFromRow(d) {
  if (!d) return {}
  const raw = String(d.phone || '').trim()
  const regionFromRow =
    d.phoneCountry && COUNTRY_DIAL_OPTIONS_AR.some((o) => o.value === d.phoneCountry) ? d.phoneCountry : 'SA'

  if (!raw) {
    return {
      phone: '',
      phoneCountry: regionFromRow,
      phoneDialCode: dialCodeForRegion(regionFromRow) || '+966',
    }
  }

  const intl = parsePhoneNumberFromString(raw)
  if (intl) {
    return {
      phone: String(intl.nationalNumber).replace(/\D/g, '').slice(0, 15),
      phoneCountry: intl.country || regionFromRow,
      phoneDialCode: `+${intl.countryCallingCode}`,
    }
  }

  const local = parsePhoneNumberFromString(raw, regionFromRow)
  if (local) {
    return {
      phone: String(local.nationalNumber).replace(/\D/g, '').slice(0, 15),
      phoneCountry: local.country || regionFromRow,
      phoneDialCode: `+${local.countryCallingCode}`,
    }
  }

  const opt = COUNTRY_DIAL_OPTIONS_AR.find((o) => o.value === d.phoneCountry)
  return {
    phone: raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, 15),
    phoneCountry: regionFromRow,
    phoneDialCode: opt?.dialCode || d.phoneDialCode || dialCodeForRegion(regionFromRow) || '+966',
  }
}

function defaultForm(user) {
  return {
    fullName: String(user?.displayName || '').trim(),
    phone: '',
    phoneCountry: 'SA',
    phoneDialCode: '+966',
    nationality: '',
    permanentResidence: '',
    city: '',
    age: 18,
    email: String(user?.email || '').trim(),
    gender: 'male',
    educationLevel: '',
    occupation: '',
    quranMemorizedJuz: 30,
  }
}

export default function ApplicationRequestPage() {
  const { user } = useAuth()
  const { branding } = useSiteContent()
  const toast = useToast()
  const [form, setForm] = useState(() => defaultForm(user))
  const [row, setRow] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [showRejectedModal, setShowRejectedModal] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => {
    document.title = `طلب الالتحاق — ${branding.siteTitle}`
  }, [branding.siteTitle])

  useEffect(() => {
    if (!user?.uid) return undefined
    let mounted = true
    loadMyProfileRequest(user.uid).then((d) => {
      if (mounted && d) {
        setRow(d)
        setForm(() => {
          const next = { ...defaultForm(user), ...d, email: user.email || d.email || '', ...phoneDisplayFieldsFromRow(d) }
          return { ...next, age: clampAge(d.age) }
        })
      }
    })
    const unsub = subscribeMyProfileRequest(
      user.uid,
      (d) => {
        setRow(d)
        if (d) {
          setForm((prev) => ({
            ...prev,
            ...d,
            email: user.email || d.email || '',
            ...phoneDisplayFieldsFromRow(d),
            age: clampAge(d.age),
          }))
        }
      },
      () => {},
    )
    return () => {
      mounted = false
      unsub()
    }
  }, [user?.uid, user?.email, user?.displayName]) // eslint-disable-line react-hooks/exhaustive-deps -- الاشتراك مرتبط بتحديد المستخدم عبر uid

  useEffect(() => {
    if (row?.status === PROFILE_REQUEST_STATUS.REJECTED) setShowRejectedModal(true)
  }, [row?.status])

  const statusLabel = useMemo(() => {
    if (row?.status === PROFILE_REQUEST_STATUS.PENDING) return 'قيد المراجعة'
    if (row?.status === PROFILE_REQUEST_STATUS.REJECTED) return 'تم الاعتذار حالياً'
    if (row?.status === PROFILE_REQUEST_STATUS.APPROVED) return 'مقبول'
    return 'لم يُرسل بعد'
  }, [row?.status])

  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const onSubmit = async () => {
    if (!user?.uid) return
    const selectedPhoneCountry = COUNTRY_DIAL_OPTIONS_AR.find((opt) => opt.value === form.phoneCountry) || null
    const rawPhone = String(form.phone || '').replace(/\D/g, '').trim()

    if (!selectedPhoneCountry) {
      toast.warning('يرجى اختيار مفتاح الدولة لرقم الهاتف.', 'تنبيه')
      return
    }
    if (!rawPhone) {
      toast.warning('رقم الهاتف حقل إجباري.', 'تنبيه')
      return
    }
    if (rawPhone.length < 6) {
      toast.warning('رقم الهاتف قصير جداً. أدخل الرقم كاملاً دون مفتاح الدولة (أو مع + والصيغة الدولية).', 'تنبيه')
      return
    }

    const localPhone = rawPhone.replace(/^0+/, '')
    const normalizedPhone = `${selectedPhoneCountry.dialCode}${localPhone}`

    if (!isValidPhoneNumber(normalizedPhone)) {
      toast.warning('رقم الهاتف غير مكتمل أو غير صالح. تحقق من المفتاح والرقم.', 'تنبيه')
      return
    }

    if (!String(form.occupation || '').trim()) {
      toast.warning('يرجى إدخال الوظيفة (حقل إجباري).', 'تنبيه')
      return
    }

    if (Number(form.quranMemorizedJuz) < 30) {
      toast.info(
        'نعتذر، الشرط الحالي للقبول هو إتمام حفظ 30 جزءاً. نرحب بك دائماً بعد إتمام الشرط، ونسعد بتقديم الدعم لك.',
        'تنبيه لطيف',
      )
      return
    }
    setSubmitting(true)
    try {
      await upsertMyProfileRequest(user, {
        ...form,
        phone: normalizedPhone,
        phoneCountry: selectedPhoneCountry.value,
        phoneDialCode: selectedPhoneCountry.dialCode,
      })
      setSubmitSuccess(true)
      toast.success('تم إرسال طلبك بنجاح، وسيتم مراجعته قريباً بإذن الله.', 'تم')
    } catch (e) {
      if (e?.code === 'QURAN_MEMORIZATION_REQUIREMENT_NOT_MET') {
        toast.info(
          'نعتذر، الشرط الحالي للقبول هو إتمام حفظ 30 جزءاً. عند إتمام الشرط يمكنك التقديم مباشرة.',
          'تنبيه',
        )
      } else {
        toast.warning('تعذّر إرسال الطلب حالياً. حاول مرة أخرى بعد قليل.', 'تنبيه')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rh-login-page rh-app-request-page">
      <div className="rh-app-request-card">
        <header className="rh-settings-header rh-app-request-header">
          <h1 className="rh-settings-title">طلب الالتحاق</h1>
          <p className="rh-settings-desc">
          نرجو تعبئة البيانات التالية بدقة. بعد الإرسال سيظهر الطلب في صفحة الطلبات لدى الإدارة للمراجعة.
          </p>
          <p className="rh-settings-footnote">حالة الطلب الحالية: <strong>{statusLabel}</strong></p>
        </header>

        <section className="rh-settings-card rh-app-request-form">
          <TextField label="الاسم الرباعي" value={form.fullName} onChange={(e) => onChange('fullName', e.target.value)} />
          <SearchableSelect
            label="مفتاح الدولة"
            required
            options={COUNTRY_DIAL_OPTIONS_AR}
            value={form.phoneCountry}
            onChange={(v) => {
              const selected = COUNTRY_DIAL_OPTIONS_AR.find((opt) => opt.value === v)
              onChange('phoneCountry', v)
              onChange('phoneDialCode', selected?.dialCode || '')
            }}
            placeholder="اختر الدولة ومفتاحها"
            searchPlaceholder="ابحث عن الدولة..."
          />
          <TextField
            label="رقم الهاتف (بدون مفتاح الدولة)"
            required
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            dir="ltr"
            value={form.phone}
            onChange={(e) => onChange('phone', e.target.value.replace(/\D/g, '').slice(0, 15))}
            hint={form.phoneDialCode ? `سيتم الحفظ: ${form.phoneDialCode} ثم رقمك` : 'اختر مفتاح الدولة أولاً'}
          />
          <SearchableSelect
            label="الجنسية"
            options={COUNTRY_OPTIONS_AR}
            value={form.nationality}
            onChange={(v) => onChange('nationality', v)}
            placeholder="اختر الجنسية"
            searchPlaceholder="ابحث عن دولة..."
          />
          <TextField
            label="مكان الإقامة الدائم"
            value={form.permanentResidence}
            onChange={(e) => onChange('permanentResidence', e.target.value)}
          />
          <TextField label="المحافظة أو المدينة" value={form.city} onChange={(e) => onChange('city', e.target.value)} />
          <NumberStepField label="العمر" value={form.age} onChange={(v) => onChange('age', v)} min={7} max={150} />
          <TextField label="البريد الإلكتروني" value={user?.email || form.email} disabled />
          <SearchableSelect
            label="الجنس"
            options={GENDER_OPTIONS}
            value={form.gender}
            onChange={(v) => onChange('gender', v)}
            placeholder="اختر الجنس"
            searchPlaceholder="ابحث..."
          />
          <SearchableSelect
            label="المستوى التعليمي"
            options={EDUCATION_OPTIONS}
            value={form.educationLevel}
            onChange={(v) => onChange('educationLevel', v)}
            placeholder="اختر المستوى"
            searchPlaceholder="ابحث..."
          />
          <TextField
            label="الوظيفة"
            required
            value={form.occupation}
            onChange={(e) => onChange('occupation', e.target.value)}
            placeholder="مثال: طالب — موظف — معلم..."
          />
          <NumberStepField
            label="مقدار حفظ القرآن (عدد الأجزاء)"
            hint="يشترط حالياً حفظ 30 جزءاً لقبول الطلب."
            value={form.quranMemorizedJuz}
            onChange={(v) => onChange('quranMemorizedJuz', v)}
            min={1}
            max={30}
          />

          <div className="rh-settings-profile-form__actions rh-app-request-actions">
            <Button type="button" variant="primary" onClick={onSubmit} loading={submitting}>
              إرسال الطلب
            </Button>
            <Link to="/app/welcome" className="ui-btn ui-btn--ghost">
              صفحة البداية
            </Link>
          </div>

          {submitSuccess ? (
            <div className="rh-app-request-success">
              <p>تم إرسال الطلب. يمكنك الآن العودة إلى صفحة البداية متى شئت.</p>
              <Link to="/app/welcome" className="ui-btn ui-btn--primary">
                الذهاب إلى صفحة البداية
              </Link>
            </div>
          ) : null}
        </section>
      </div>

      <Modal
        open={showRejectedModal && row?.status === PROFILE_REQUEST_STATUS.REJECTED}
        title="نعتذر لعدم القبول حالياً"
        onClose={() => setShowRejectedModal(false)}
        size="sm"
      >
        <p className="rh-settings-footnote" style={{ marginTop: 0 }}>
          نشكرك على رغبتك في الالتحاق. في الوقت الحالي لم يتم قبول الطلب، ويمكنك التقديم مرة أخرى بعد استيفاء
          المتطلبات أو تحديث البيانات.
        </p>
        {row?.statusMessage ? <p className="rh-settings-footnote">{row.statusMessage}</p> : null}
        <div className="rh-admin-users__modal-actions">
          <Button type="button" variant="primary" onClick={() => setShowRejectedModal(false)}>
            فهمت
          </Button>
        </div>
      </Modal>
    </div>
  )
}
