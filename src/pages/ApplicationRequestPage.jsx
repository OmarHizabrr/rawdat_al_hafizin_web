import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { COUNTRY_OPTIONS_AR } from '../data/countriesAr.js'
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
  { value: 'ابتدائي', label: 'ابتدائي' },
  { value: 'إعدادي', label: 'إعدادي' },
  { value: 'ثانوي', label: 'ثانوي' },
  { value: 'جامعي', label: 'جامعي' },
  { value: 'دراسات عليا', label: 'دراسات عليا' },
]

function defaultForm(user) {
  return {
    fullName: String(user?.displayName || '').trim(),
    phone: '',
    nationality: '',
    permanentResidence: '',
    city: '',
    age: 18,
    email: String(user?.email || '').trim(),
    gender: 'male',
    educationLevel: '',
    quranMemorizedJuz: 1,
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

  useEffect(() => {
    document.title = `طلب الالتحاق — ${branding.siteTitle}`
  }, [branding.siteTitle])

  useEffect(() => {
    if (!user?.uid) return undefined
    let mounted = true
    loadMyProfileRequest(user.uid).then((d) => {
      if (mounted && d) {
        setRow(d)
        setForm((prev) => ({ ...prev, ...d, email: user.email || d.email || '' }))
      }
    })
    const unsub = subscribeMyProfileRequest(
      user.uid,
      (d) => {
        setRow(d)
        if (d) setForm((prev) => ({ ...prev, ...d, email: user.email || d.email || '' }))
      },
      () => {},
    )
    return () => {
      mounted = false
      unsub()
    }
  }, [user?.uid, user?.email])

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
    if (Number(form.quranMemorizedJuz) < 30) {
      toast.info(
        'نعتذر، الشرط الحالي للقبول هو إتمام حفظ 30 جزءاً. نرحب بك دائماً بعد إتمام الشرط، ونسعد بتقديم الدعم لك.',
        'تنبيه لطيف',
      )
      return
    }
    setSubmitting(true)
    try {
      await upsertMyProfileRequest(user, form)
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
    <div className="rh-settings" style={{ maxWidth: '760px' }}>
      <header className="rh-settings-header">
        <h1 className="rh-settings-title">طلب الالتحاق</h1>
        <p className="rh-settings-desc">
          نرجو تعبئة البيانات التالية بدقة. بعد الإرسال سيظهر الطلب في صفحة الطلبات لدى الإدارة للمراجعة.
        </p>
        <p className="rh-settings-footnote">حالة الطلب الحالية: <strong>{statusLabel}</strong></p>
      </header>

      <section className="rh-settings-card">
        <TextField label="الاسم الرباعي" value={form.fullName} onChange={(e) => onChange('fullName', e.target.value)} />
        <TextField label="رقم الهاتف" value={form.phone} onChange={(e) => onChange('phone', e.target.value)} />
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
        <NumberStepField label="العمر" value={form.age} onChange={(v) => onChange('age', v)} min={10} max={100} />
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
        <NumberStepField
          label="مقدار حفظ القرآن (عدد الأجزاء)"
          hint="يشترط حالياً حفظ 30 جزءاً لقبول الطلب."
          value={form.quranMemorizedJuz}
          onChange={(v) => onChange('quranMemorizedJuz', v)}
          min={1}
          max={30}
        />

        <div className="rh-settings-profile-form__actions">
          <Button type="button" variant="primary" onClick={onSubmit} loading={submitting}>
            إرسال الطلب
          </Button>
          <Link to="/app/welcome" className="ui-btn ui-btn--ghost">
            صفحة البداية
          </Link>
        </div>
      </section>

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
