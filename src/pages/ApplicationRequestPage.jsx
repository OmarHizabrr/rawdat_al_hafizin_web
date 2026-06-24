import { useEffect, useMemo, useState } from 'react'
import { HapticLink } from '../ui/HapticLink.jsx'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { useSiteContent } from '../context/useSiteContent.js'
import {
  loadMyProfileRequest,
  PROFILE_REQUEST_STATUS,
  subscribeMyProfileRequest,
  upsertMyProfileRequest,
} from '../services/profileRequestService.js'
import { ApplicationFormRenderer } from '../components/application/ApplicationFormRenderer.jsx'
import {
  buildDefaultFormValues,
  buildSubmissionPayload,
  getFormCompletionStats,
  mergeFormValuesFromRow,
  validateApplicationForm,
} from '../utils/applicationFormFields.js'
import { Check, Send } from 'lucide-react'
import { Button, Modal, useToast } from '../ui/index.js'
import {
  clearApplicationReviewSessionFlag,
  hasApplicationReviewSessionFlag,
} from '../utils/applicationReviewSession.js'

export default function ApplicationRequestPage() {
  const { user } = useAuth()
  const { branding, applicationFormFields } = useSiteContent()
  const toast = useToast()
  const navigate = useNavigate()
  const [formValues, setFormValues] = useState(() => buildDefaultFormValues(applicationFormFields, user))
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
        setFormValues(mergeFormValuesFromRow(d, applicationFormFields, user))
      }
    })
    const unsub = subscribeMyProfileRequest(
      user.uid,
      (d) => {
        setRow(d)
        if (d) setFormValues(mergeFormValuesFromRow(d, applicationFormFields, user))
      },
      () => {},
    )
    return () => {
      mounted = false
      unsub()
    }
  }, [user?.uid, user?.email, user?.displayName, applicationFormFields]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setFormValues((prev) => ({ ...buildDefaultFormValues(applicationFormFields, user), ...prev }))
  }, [applicationFormFields, user])

  useEffect(() => {
    if (row?.status === PROFILE_REQUEST_STATUS.REJECTED) setShowRejectedModal(true)
  }, [row?.status])

  const statusLabel = useMemo(() => {
    if (row?.status === PROFILE_REQUEST_STATUS.PENDING) return 'قيد المراجعة'
    if (row?.status === PROFILE_REQUEST_STATUS.REJECTED) return 'تم الاعتذار حالياً'
    if (row?.status === PROFILE_REQUEST_STATUS.APPROVED) return 'مقبول'
    return 'لم يُرسل بعد'
  }, [row?.status])

  const showPostLogoutApplicationBanner = useMemo(
    () =>
      hasApplicationReviewSessionFlag() &&
      String(user?.profileRequestStatus || '').trim() === PROFILE_REQUEST_STATUS.APPROVED,
    [user?.profileRequestStatus],
  )

  const completion = useMemo(
    () => getFormCompletionStats(applicationFormFields, formValues, user),
    [applicationFormFields, formValues, user],
  )

  const statusChipClass = useMemo(() => {
    if (row?.status === PROFILE_REQUEST_STATUS.APPROVED) return 'rh-app-request__status--approved'
    if (row?.status === PROFILE_REQUEST_STATUS.REJECTED) return 'rh-app-request__status--rejected'
    if (row?.status === PROFILE_REQUEST_STATUS.PENDING) return 'rh-app-request__status--pending'
    return 'rh-app-request__status--draft'
  }, [row?.status])

  const onChange = (key, value) => setFormValues((prev) => ({ ...prev, [key]: value }))

  const onSubmit = async () => {
    if (!user?.uid) return
    const validation = validateApplicationForm(applicationFormFields, formValues, user)
    if (!validation.ok) {
      if (validation.code === 'QURAN_MEMORIZATION_REQUIREMENT_NOT_MET') {
        toast.info(validation.message, 'تنبيه لطيف')
      } else {
        toast.warning(validation.message, 'تنبيه')
      }
      return
    }
    setSubmitting(true)
    try {
      const payload = buildSubmissionPayload(applicationFormFields, formValues, user)
      await upsertMyProfileRequest(user, payload)
      setSubmitSuccess(true)
      toast.success('تم إرسال طلبك بنجاح، وسيتم مراجعته قريباً بإذن الله.', 'تم')
    } catch (e) {
      if (e?.code === 'GENDER_REQUIRED') {
        toast.warning('يجب تحديد الجنس قبل إرسال الطلب.', 'تنبيه')
        return
      }
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
        {showPostLogoutApplicationBanner && (
          <section className="rh-settings-card rh-app-request-banner">
            <p className="rh-settings-desc">
              طُلب منك استعراض استمارة طلب الالتحاق بعد تسجيل الخروج (حسب إعداد نوع المستخدم). يمكنك مراجعة البيانات
              المحفوظة أو تحديثها ثم المتابعة إلى المنصة.
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                clearApplicationReviewSessionFlag()
                navigate('/app', { replace: true })
              }}
            >
              المتابعة إلى المنصة
            </Button>
          </section>
        )}
        <header className="rh-settings-header rh-app-request-header">
          <h1 className="rh-settings-title">طلب الالتحاق</h1>
          <p className="rh-settings-desc">
            نرجو تعبئة البيانات التالية بدقة. بعد الإرسال سيظهر الطلب في صفحة الطلبات لدى الإدارة للمراجعة.
          </p>
          <div className="rh-app-request__meta">
            <span className={['rh-app-request__status', statusChipClass].join(' ')}>{statusLabel}</span>
            <span className="rh-app-request__field-count">
              {applicationFormFields.length} حقل
              {completion.requiredTotal ? ` · ${completion.requiredFilled}/${completion.requiredTotal} إلزامي` : ''}
            </span>
          </div>
        </header>

        {row?.status === PROFILE_REQUEST_STATUS.APPROVED ? (
          <section className="rh-settings-card rh-app-request-banner" role="status">
            <p className="rh-settings-desc">
              تم قبول طلبك. ستجد تأكيداً أيضاً في{' '}
              <HapticLink to="/app/notifications">إشعاراتك</HapticLink> ثم يمكنك استخدام المنصة من القائمة حسب صلاحياتك.
            </p>
            <HapticLink to="/app" className="ui-btn ui-btn--primary">
              الدخول إلى الرئيسية
            </HapticLink>
          </section>
        ) : null}

        {row?.status === PROFILE_REQUEST_STATUS.REJECTED ? (
          <section className="rh-settings-card" role="region" aria-label="نتيجة المراجعة">
            <p className="rh-settings-desc">
              لم يُعتمد الطلب في آخر مراجعة.
              {row?.statusMessage ? (
                <>
                  {' '}
                  ملاحظة الإدارة: <strong>{row.statusMessage}</strong>
                </>
              ) : null}{' '}
              يمكنك تعديل البيانات أدناه وإعادة الإرسال. قد يكون وصلك أيضاً{' '}
              <HapticLink to="/app/notifications">إشعار</HapticLink> بنفس التفاصيل.
            </p>
          </section>
        ) : null}

        <section className="rh-settings-card rh-app-request-form">
          <div className="rh-app-request__progress" role="progressbar" aria-valuenow={completion.pct} aria-valuemin={0} aria-valuemax={100} aria-label="نسبة اكتمال الاستمارة">
            <div className="rh-app-request__progress-head">
              <span>اكتمال البيانات</span>
              <strong>{completion.pct}%</strong>
            </div>
            <div className="rh-app-request__progress-track">
              <div className="rh-app-request__progress-fill" style={{ width: `${completion.pct}%` }} />
            </div>
          </div>

          <ApplicationFormRenderer
            fields={applicationFormFields}
            values={formValues}
            onChange={onChange}
            user={user}
          />

          <div className="rh-settings-profile-form__actions rh-app-request-actions">
            <Button type="button" variant="primary" icon={Send} onClick={onSubmit} loading={submitting}>
              إرسال الطلب
            </Button>
            <HapticLink to="/app/welcome" className="ui-btn ui-btn--ghost">
              صفحة البداية
            </HapticLink>
          </div>

          {submitSuccess ? (
            <div className="rh-app-request-success">
              <p>تم إرسال الطلب. يمكنك الآن العودة إلى صفحة البداية متى شئت.</p>
              <HapticLink to="/app/welcome" className="ui-btn ui-btn--primary">
                الذهاب إلى صفحة البداية
              </HapticLink>
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
        <p className="rh-settings-footnote" style={{ marginBottom: 0 }}>
          يمكنك مراجعة الإشعارات في أي وقت من صفحة{' '}
          <HapticLink to="/app/notifications">إشعارات المنصة</HapticLink>.
        </p>
        <div className="rh-modal-footer rh-admin-users__modal-actions">
          <Button type="button" variant="primary" icon={Check} onClick={() => setShowRejectedModal(false)}>
            فهمت
          </Button>
        </div>
      </Modal>
    </div>
  )
}
