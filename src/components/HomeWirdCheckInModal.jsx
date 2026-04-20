import { BellRing, BookOpenCheck, Sparkles, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { autoLogDefaultWird, buildAutoDefaultWirdAddRequest } from '../utils/autoLogDefaultWird.js'
import { localYmd } from '../utils/planDailyQuota.js'
import { clampProgressPercent, computePlanProgress } from '../utils/planProgress.js'
import { Button, Modal, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

export function HomeWirdCheckInModal({
  open,
  onClose,
  activePlan,
  awrad,
  contextUserId,
  user,
  onSnooze,
  onDismissNo,
}) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const built = useMemo(() => {
    if (!open || !activePlan?.id) return null
    return buildAutoDefaultWirdAddRequest(activePlan, awrad, localYmd())
  }, [open, activePlan, awrad])

  const progress = useMemo(() => computePlanProgress(activePlan, awrad), [activePlan, awrad])
  const achievedPages = progress?.achievedPages ?? 0
  const targetPages = progress?.targetPages ?? 0

  const handleYes = async () => {
    if (!built?.ok || !contextUserId) return
    setBusy(true)
    try {
      const res = await autoLogDefaultWird({
        plan: activePlan,
        awrad,
        contextUserId,
        user,
        formYmd: localYmd(),
      })
      if (!res.ok) {
        toast.warning(res.message || 'تعذّر التسجيل.', 'تنبيه')
        return
      }
      const nextAchieved = achievedPages + res.computedPages
      const nextPercent = clampProgressPercent(nextAchieved, targetPages)
      toast.success(
        `تم تسجيل ${res.computedPages} صفحات تلقائياً. وصلت إلى ${nextAchieved}/${targetPages || '—'} (${nextPercent.toFixed(1)}%).`,
        'بارك الله فيك',
      )
      onClose()
    } catch {
      toast.warning('تعذّر حفظ الورد. تحقق من الاتصال وحاول مرة أخرى.', 'تنبيه')
    } finally {
      setBusy(false)
    }
  }

  const handleSnooze = () => {
    onSnooze?.()
    onClose()
  }

  const handleNo = () => {
    onDismissNo?.()
    onClose()
  }

  if (!open || !activePlan || !built?.ok) return null

  const { computedPages, nextFromPage, recordingYmd } = built
  const toPage = nextFromPage + computedPages - 1

  return (
    <Modal
      open={open}
      title={null}
      ariaLabel="هل أكملت وردك اليوم؟"
      onClose={() => {}}
      size="md"
      closeOnBackdrop={false}
      closeOnEsc={false}
      showClose={false}
      className="rh-checkin-modal"
      contentClassName="rh-checkin-modal__sheet"
    >
      <div className="rh-checkin-modal__hero">
        <div className="rh-checkin-modal__glow" aria-hidden />
        <div className="rh-checkin-modal__icon-wrap">
          <RhIcon as={BookOpenCheck} size={32} strokeWidth={RH_ICON_STROKE} className="rh-checkin-modal__icon" />
        </div>
        <p className="rh-checkin-modal__kicker">
          <RhIcon as={Sparkles} size={14} strokeWidth={2} aria-hidden />
          خطتك الرئيسية
        </p>
        <h2 className="rh-checkin-modal__title">هل أكملت وردك اليوم؟</h2>
        <p className="rh-checkin-modal__plan-name">{activePlan.name}</p>
      </div>

      <div className="rh-checkin-modal__preview">
        <p className="rh-checkin-modal__preview-label">عند اختيار «نعم» نُسجّل لك تلقائياً</p>
        <div className="rh-checkin-modal__chips">
          <span className="rh-checkin-modal__chip rh-checkin-modal__chip--pages">
            <strong>{computedPages}</strong>
            <span>صفحات</span>
          </span>
          <span className="rh-checkin-modal__chip">
            <span className="rh-checkin-modal__chip-muted">من</span>
            <strong>{nextFromPage}</strong>
            <span className="rh-checkin-modal__chip-muted">إلى</span>
            <strong>{toPage}</strong>
          </span>
          {recordingYmd && (
            <span className="rh-checkin-modal__chip rh-checkin-modal__chip--date">
              <span>تاريخ التسجيل</span>
              <strong>{recordingYmd}</strong>
            </span>
          )}
        </div>
        <p className="rh-checkin-modal__hint">
          يطابق هذا التسجيل الورد المقترح في خطتك. يمكنك لاحقاً تعديل التفاصيل من صفحة الأوراد إن لزم.
        </p>
      </div>

      <div className="rh-checkin-modal__actions">
        <Button
          type="button"
          className="rh-checkin-modal__btn-yes"
          onClick={handleYes}
          loading={busy}
          disabled={busy}
        >
          {!busy && <RhIcon as={BookOpenCheck} size={18} strokeWidth={RH_ICON_STROKE} />}
          نعم، أكملت — سجّل الآن
        </Button>
        <div className="rh-checkin-modal__row2">
          <Button type="button" variant="ghost" onClick={handleSnooze} disabled={busy}>
            <RhIcon as={BellRing} size={16} strokeWidth={RH_ICON_STROKE} />
            ذكّرني بعد دقيقتين
          </Button>
          <Button type="button" variant="ghost" onClick={handleNo} disabled={busy}>
            <RhIcon as={XCircle} size={16} strokeWidth={RH_ICON_STROKE} />
            لم أكمل بعد
          </Button>
        </div>
      </div>
    </Modal>
  )
}
