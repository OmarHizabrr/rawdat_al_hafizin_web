import {
  BookOpen,
  CheckCircle2,
  Coffee,
  Flame,
  Loader2,
  NotebookPen,
  Sunrise,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HomeWirdCheckInModal } from '../HomeWirdCheckInModal.jsx'
import { HomeWirdModal } from '../HomeWirdModal.jsx'
import { useAuth } from '../../context/useAuth.js'
import { usePermissions } from '../../context/usePermissions.js'
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry.js'
import { buildAutoDefaultWirdAddRequest } from '../../utils/autoLogDefaultWird.js'
import {
  getHomeWirdDashboardInsight,
  getHomeWirdDayStatus,
  shouldShowHomeLogWirdCumulative,
} from '../../utils/homeWirdStatus.js'
import {
  isCheckinDismissedForDay,
  isCheckinSnoozed,
  setCheckinDismissNo,
  setCheckinSnooze,
} from '../../utils/homeWirdCheckinStorage.js'
import { localYmd } from '../../utils/planDailyQuota.js'
import { computePlanProgress } from '../../utils/planProgress.js'
import { buildBacklogDays, markBacklogDoneForPlan } from '../../utils/planBacklog.js'
import { Button, Modal, useToast } from '../../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../../ui/RhIcon.jsx'

const PH = PERMISSION_PAGE_IDS.home

const MOOD_BADGE_LABEL = {
  rest: 'يوم راحة',
  done: 'ممتاز!',
  steady: 'ثابت',
  catchup: 'لنلحق التأخر',
  late: 'حان التعويض',
}

function MoodIcon({ mood }) {
  const common = { size: 32, strokeWidth: 1.65 }
  switch (mood) {
    case 'rest':
      return <Coffee {...common} />
    case 'done':
      return <CheckCircle2 {...common} />
    case 'late':
      return <Flame {...common} />
    case 'catchup':
      return <Sunrise {...common} />
    default:
      return <BookOpen {...common} />
  }
}

export function PlanWirdTaskDetail({
  plan,
  awrad = [],
  contextUserId,
  isDefaultPlan = false,
}) {
  const { user } = useAuth()
  const { can } = usePermissions()
  const toast = useToast()
  const [homeNow, setHomeNow] = useState(() => new Date())
  const [wirdModalOpen, setWirdModalOpen] = useState(false)
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [backfillBusyYmd, setBackfillBusyYmd] = useState('')
  const [backlogConfirmYmd, setBacklogConfirmYmd] = useState('')
  const prevShouldOfferCheckInRef = useRef(false)

  const canLogWird = can(PH, 'home_log_wird')

  useEffect(() => {
    const id = window.setInterval(() => setHomeNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const homeWirdStatus = useMemo(
    () => getHomeWirdDayStatus(plan, awrad, homeNow),
    [plan, awrad, homeNow],
  )
  const showLogWirdCumulative = useMemo(
    () => shouldShowHomeLogWirdCumulative(plan, awrad, homeWirdStatus.todayYmd),
    [plan, awrad, homeWirdStatus.todayYmd],
  )
  const dashInsight = useMemo(
    () => getHomeWirdDashboardInsight(plan, awrad, homeWirdStatus),
    [plan, awrad, homeWirdStatus],
  )
  const progress = useMemo(() => computePlanProgress(plan, awrad), [plan, awrad])
  const pct = progress?.progressPercent ?? 0
  const backlogDays = useMemo(
    () => buildBacklogDays(plan, awrad, homeWirdStatus.todayYmd, 21),
    [plan, awrad, homeWirdStatus.todayYmd],
  )
  const pendingBacklogDay = useMemo(
    () => backlogDays.find((d) => d.ymd === backlogConfirmYmd) || null,
    [backlogDays, backlogConfirmYmd],
  )

  const shouldOfferCheckIn = useMemo(() => {
    homeNow.getTime()
    if (!isDefaultPlan || !plan?.id || !contextUserId) return false
    if (!canLogWird) return false
    if (!showLogWirdCumulative) return false
    if (wirdModalOpen) return false
    if (!homeWirdStatus.appliesToday || homeWirdStatus.isComplete) return false
    const ymd = homeWirdStatus.todayYmd
    if (isCheckinDismissedForDay(contextUserId, ymd, plan.id)) return false
    if (isCheckinSnoozed(contextUserId, ymd, plan.id)) return false
    if (!buildAutoDefaultWirdAddRequest(plan, awrad, localYmd()).ok) return false
    return true
  }, [
    isDefaultPlan,
    plan,
    contextUserId,
    canLogWird,
    wirdModalOpen,
    showLogWirdCumulative,
    homeWirdStatus,
    awrad,
    homeNow,
  ])

  useEffect(() => {
    if (!shouldOfferCheckIn) {
      setCheckInOpen(false)
      prevShouldOfferCheckInRef.current = false
      return undefined
    }
    if (!prevShouldOfferCheckInRef.current) {
      prevShouldOfferCheckInRef.current = true
      const t = window.setTimeout(() => setCheckInOpen(true), 550)
      return () => window.clearTimeout(t)
    }
    return undefined
  }, [shouldOfferCheckIn])

  const markBacklogDone = useCallback(
    async (targetYmd) => {
      if (!plan?.id || !contextUserId || !user || !targetYmd || backfillBusyYmd) return
      setBackfillBusyYmd(targetYmd)
      try {
        const res = await markBacklogDoneForPlan({
          plan,
          awrad,
          contextUserId,
          user,
          targetYmd,
        })
        if (res.ok) {
          toast.success(
            `تم تسجيل إنجاز يوم ${targetYmd} (${res.pagesToAdd} صفحة).`,
            'بارك الله فيك',
          )
        } else if (res.reason === 'complete') {
          toast.success('هذا اليوم مكتمل بالفعل.', 'تم')
        } else if (res.reason === 'quota') {
          toast.warning(
            'لا يمكن تسجيل هذا اليوم الآن لأن التعويض التراكمي مكتمل عبر الأيام التالية.',
            'تنبيه',
          )
        }
      } catch {
        toast.warning('تعذّر تسجيل إنجاز اليوم السابق. حاول مرة أخرى.', 'تنبيه')
      } finally {
        setBackfillBusyYmd('')
      }
    },
    [plan, contextUserId, user, backfillBusyYmd, awrad, toast],
  )

  if (!plan?.id) return null

  return (
    <div className="rh-plan-wird-detail">
      <div className={`rh-plan-wird-detail__hero rh-plan-wird-detail__hero--${dashInsight.mood}`}>
        <div className="rh-plan-wird-detail__hero-icon" aria-hidden>
          <MoodIcon mood={dashInsight.mood} />
        </div>
        <div>
          <span className={`rh-plan-wird-detail__badge rh-plan-wird-detail__badge--${dashInsight.mood}`}>
            {MOOD_BADGE_LABEL[dashInsight.mood]}
          </span>
          <h3 className="rh-plan-wird-detail__headline">{dashInsight.headline}</h3>
          {dashInsight.detailLines.length > 0 ? (
            <ul className="rh-plan-wird-detail__bullets">
              {dashInsight.detailLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {(dashInsight.yesterdayApplies || dashInsight.todayApplies) && (
        <div className="rh-plan-wird-detail__chips">
          {dashInsight.yesterdayApplies ? (
            <span className="rh-plan-wird-detail__chip">
              أمس: {dashInsight.yesterdayLogged} / {dashInsight.dailyPages} صفحة
            </span>
          ) : null}
          {dashInsight.todayApplies ? (
            <span className="rh-plan-wird-detail__chip rh-plan-wird-detail__chip--today">
              اليوم: {dashInsight.todayLogged} / {dashInsight.dailyPages} صفحة
            </span>
          ) : null}
        </div>
      )}

      <div className="rh-plan-wird-detail__progress">
        <div className="rh-plan-wird-detail__progress-head">
          <span>{pct.toFixed(1)}%</span>
          <span>إنجاز الخطة</span>
        </div>
        <div className="rh-plan-wird-detail__bar">
          <div className="rh-plan-wird-detail__bar-fill" style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      </div>

      {canLogWird && backlogDays.length > 0 ? (
        <div className="rh-plan-wird-detail__backlog">
          <p className="rh-plan-wird-detail__backlog-title">أيام تحتاج إنجاز/تعويض</p>
          <div className="rh-plan-wird-detail__backlog-list">
            {backlogDays.slice(0, 6).map((d) => (
              <button
                key={d.ymd}
                type="button"
                className={[
                  'rh-plan-wird-detail__backlog-item',
                  d.isToday ? 'rh-plan-wird-detail__backlog-item--today' : '',
                  backfillBusyYmd === d.ymd ? 'rh-plan-wird-detail__backlog-item--busy' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setBacklogConfirmYmd(d.ymd)}
                disabled={backfillBusyYmd !== '' && backfillBusyYmd !== d.ymd}
              >
                <span>{d.weekdayLabel} — {d.ymd}</span>
                <span>المتبقي: {d.missing} صفحة</span>
                <span>
                  {backfillBusyYmd === d.ymd ? (
                    <RhIcon as={Loader2} size={14} className="ui-btn__spinner" />
                  ) : (
                    <RhIcon as={CheckCircle2} size={14} strokeWidth={2} />
                  )}
                  {backfillBusyYmd === d.ymd
                    ? 'جارٍ التسجيل…'
                    : d.isToday
                      ? 'إكمال ورد اليوم'
                      : 'تأكيد الإنجاز'}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {canLogWird && showLogWirdCumulative ? (
        <Button
          type="button"
          variant="primary"
          icon={NotebookPen}
          onClick={() => setWirdModalOpen(true)}
        >
          تسجيل الورد
        </Button>
      ) : null}

      <HomeWirdModal
        open={wirdModalOpen && canLogWird && showLogWirdCumulative}
        onClose={() => setWirdModalOpen(false)}
        activePlan={plan}
        awrad={awrad}
        contextUserId={contextUserId}
        user={user}
      />

      <Modal
        open={Boolean(backlogConfirmYmd)}
        onClose={() => {
          if (!backfillBusyYmd) setBacklogConfirmYmd('')
        }}
        title="تأكيد إنجاز الورد"
        size="sm"
      >
        <p>
          هل أنت متأكد أنك أنجزت ورد يوم{' '}
          <strong>
            {pendingBacklogDay?.weekdayLabel} — {pendingBacklogDay?.ymd}
          </strong>
          ؟
        </p>
        <div className="rh-task-actions" style={{ marginTop: 'var(--rh-space-4)' }}>
          <Button
            type="button"
            icon={CheckCircle2}
            onClick={async () => {
              if (!pendingBacklogDay?.ymd) return
              await markBacklogDone(pendingBacklogDay.ymd)
              setBacklogConfirmYmd('')
            }}
            disabled={Boolean(backfillBusyYmd)}
            loading={Boolean(backfillBusyYmd)}
          >
            تأكيد الإنجاز
          </Button>
          <Button
            type="button"
            variant="ghost"
            icon={X}
            onClick={() => setBacklogConfirmYmd('')}
            disabled={Boolean(backfillBusyYmd)}
          >
            إلغاء
          </Button>
        </div>
      </Modal>

      {isDefaultPlan ? (
        <HomeWirdCheckInModal
          open={checkInOpen && shouldOfferCheckIn && canLogWird}
          onClose={() => setCheckInOpen(false)}
          activePlan={plan}
          awrad={awrad}
          contextUserId={contextUserId}
          user={user}
          onSnooze={() => {
            setCheckinSnooze(contextUserId, homeWirdStatus.todayYmd, plan.id)
          }}
          onDismissNo={() => {
            setCheckinDismissNo(contextUserId, homeWirdStatus.todayYmd, plan.id)
          }}
        />
      ) : null}
    </div>
  )
}
