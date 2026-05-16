import { Check, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { HapticLink } from '../../ui/HapticLink.jsx'
import { RemoteTasmeeProviderIcon } from '../RemoteTasmeeProviderIcon.jsx'
import { PlanResourceLinksBlock } from '../PlanResourceLinksBlock.jsx'
import { useSiteContent } from '../../context/useSiteContent.js'
import { DAILY_LOGGING_STRICT_CARRYOVER } from '../../utils/planDailyQuota.js'
import { halakaSessionDisplay } from '../../utils/datePeriodAr.js'
import {
  activityAudienceLabel,
  activityFormatLabel,
  activityKindLabel,
  activityMemberCountBadge,
  formatActivityDateTimeAr,
  formatActivityFirestoreMetaAr,
} from '../../utils/activityLabels.js'
import {
  formatExamVolumeSpecsSummaryLines,
  totalResolvedPagesFromExamVolumeSpecs,
} from '../../utils/examVolumeSpec.js'
import { remoteTasmeeProviderBrandSuffix } from '../../utils/remoteTasmeeProviderIcons.js'
import {
  remoteTasmeeMediaLabelAr,
  remoteTasmeeProviderLabelAr,
} from '../../utils/remoteTasmeeStorage.js'
import { sanitizeImageUrl } from '../../utils/brandingAssets.js'
import { withImpersonationQuery } from '../../utils/impersonation.js'
import { Button } from '../../ui/index.js'

const WEEKDAYS = [
  { d: 0, label: 'الأحد' },
  { d: 1, label: 'الإثنين' },
  { d: 2, label: 'الثلاثاء' },
  { d: 3, label: 'الأربعاء' },
  { d: 4, label: 'الخميس' },
  { d: 5, label: 'الجمعة' },
  { d: 6, label: 'السبت' },
]

const DELIVERY_LABELS = {
  online: 'عن بُعد',
  onsite: 'ميداني',
  hybrid: 'ميداني وعن بُعد',
}

function weekdayArrLabel(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0 || arr.length >= 7) return 'كل الأيام'
  return [...arr]
    .sort((a, b) => a - b)
    .map((d) => WEEKDAYS.find((w) => w.d === d)?.label || d)
    .join('، ')
}

function formatReminderAr(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return hhmm
  const d = new Date()
  d.setHours(Number(m[1]), Number(m[2]), 0, 0)
  return d.toLocaleTimeString('ar-SA', { hour: 'numeric', minute: '2-digit' })
}

function dawraLines(p, listKey, textKey) {
  const arr = Array.isArray(p[listKey]) ? p[listKey].filter((x) => typeof x === 'string') : []
  if (arr.length) return arr
  return String(p[textKey] || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function deliveryLabel(mode) {
  return DELIVERY_LABELS[mode] || mode || '—'
}

function itemCoverUrl(p) {
  const raw = p.coverImage || p.imageUrl || p.bannerUrl || ''
  return sanitizeImageUrl(raw)
}

function creatorPhotoUrl(p) {
  const raw =
    p.creatorPhoto || p.creatorPhotoURL || p.photoURL || p.createdByImageUrl || ''
  return sanitizeImageUrl(raw)
}

function hasCreatorInfo(p) {
  return Boolean(
    String(p.creatorDisplayName || '').trim() ||
      String(p.creatorEmail || '').trim() ||
      String(p.creatorUid || '').trim() ||
      creatorPhotoUrl(p),
  )
}


function ExploreSafeImage({ src, className, wrapClassName, alt = '' }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return null
  const img = (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
  return wrapClassName ? <div className={wrapClassName}>{img}</div> : img
}

function ExploreAvatar({ src, alt = '' }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return <div className="rh-explore-plans__avatar rh-explore-plans__avatar--placeholder" aria-hidden />
  }
  return (
    <img
      src={src}
      alt={alt}
      className="rh-explore-plans__avatar"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}

function ExploreCardShell({ coverUrl, title, badges, joinControl, children }) {
  return (
    <li className="rh-explore-modal__card">
      <ExploreSafeImage
        src={coverUrl}
        className="rh-explore-modal__card-cover"
        wrapClassName="rh-explore-modal__card-cover-wrap"
        alt={title ? `غلاف: ${title}` : ''}
      />
      <div className="rh-explore-modal__card-body">
        <div className="rh-explore-modal__card-head">
          <div className="rh-explore-modal__card-title-block">
            <strong className="rh-explore-modal__card-name">{title}</strong>
            {badges ? <span className="rh-plans__saved-badges">{badges}</span> : null}
          </div>
          {joinControl}
        </div>
        {children}
      </div>
    </li>
  )
}

function CreatorBlock({ p, showCreator = true }) {
  if (!showCreator || !hasCreatorInfo(p)) return null
  const photo = creatorPhotoUrl(p)
  return (
    <div className="rh-explore-plans__creator">
      <ExploreAvatar
        src={photo}
        alt={p.creatorDisplayName ? `صورة المنشئ: ${p.creatorDisplayName}` : ''}
      />
      <div>
        <p className="rh-explore-plans__creator-label">المنشئ</p>
        <p className="rh-explore-plans__creator-name">{p.creatorDisplayName}</p>
        {p.creatorEmail ? <p className="rh-explore-plans__creator-email">{p.creatorEmail}</p> : null}
        {p.creatorUid ? (
          <p className="rh-explore-plans__creator-uid">
            <span className="rh-explore-plans__label">uid:</span>{' '}
            <code className="rh-plans__plan-id">{p.creatorUid}</code>
          </p>
        ) : null}
      </div>
    </div>
  )
}

function JoinControl({ inItem, canJoin, joining, onJoin, joinedLabel = 'أنت منضم', joinLabel = 'انضمام' }) {
  if (canJoin) {
    return (
      <Button
        type="button"
        variant={inItem ? 'secondary' : 'primary'}
        size="sm"
        icon={inItem ? Check : UserPlus}
        loading={joining}
        disabled={inItem || joining}
        onClick={() => !inItem && onJoin()}
      >
        {inItem ? joinedLabel : joinLabel}
      </Button>
    )
  }
  return <span className="rh-plans__saved-badge">{inItem ? joinedLabel : 'عرض فقط'}</span>
}

/**
 * @param {object} props
 * @param {import('./explorePublicKinds.js').ExploreKind} props.kind
 */
export function ExplorePublicItemCard({
  kind,
  item: p,
  inItem,
  canJoin,
  joining,
  onJoin,
  impersonateUid,
  str,
  showCreator = true,
}) {
  const { typeLabel } = useSiteContent()
  const joinControl = (
    <JoinControl
      inItem={inItem}
      canJoin={canJoin}
      joining={joining}
      onJoin={onJoin}
      joinedLabel={kind === 'activities' ? str('activities.explore.card_joined') : 'أنت منضم'}
      joinLabel={kind === 'activities' ? str('activities.explore.card_join') : 'انضمام'}
    />
  )

  const idLine = (
    <p className="rh-plans__saved-meta">
      <span className="rh-explore-plans__label">
        {kind === 'activities' ? str('activities.explore.meta_id') : 'المعرف:'}
      </span>{' '}
      <code className="rh-plans__plan-id">{p.id}</code>
    </p>
  )

  if (kind === 'plans') {
    const typeLbl = typeLabel(p.planType)
    return (
      <ExploreCardShell
        coverUrl={itemCoverUrl(p)}
        title={p.name || 'خطة بدون اسم'}
        badges={
          <>
            <span className="rh-plans__saved-badge">{typeLbl}</span>
            <span className="rh-plans__saved-badge">{p.memberCount ?? 0} عضواً</span>
          </>
        }
        joinControl={joinControl}
      >
        {idLine}
        <CreatorBlock p={p} showCreator={showCreator} />
        <ul className="rh-explore-plans__facts">
          <li>
            <strong>الورد اليومي:</strong> {p.dailyPages ?? '—'} صفحة
          </li>
          <li>
            <strong>سياسة التسجيل:</strong>{' '}
            {p.dailyLoggingMode === DAILY_LOGGING_STRICT_CARRYOVER
              ? 'تراكمي (لا تجاوز يومي إلا بتعويض الغياب)'
              : 'تجاوز يومي مسموح'}
          </li>
          <li>
            <strong>تاريخ الورد:</strong>{' '}
            {p.allowCustomRecordingDate
              ? 'يمكن اختيار يوم التسجيل في النموذج'
              : 'دائماً اليوم المحلي عند التسجيل'}
          </li>
          <li>
            <strong>الحد الأدنى للدفعة:</strong>{' '}
            {p.allowBelowDailyPages === false
              ? 'اشتراط الورد اليومي كاملاً عند الإمكان'
              : 'مسموح أقل من الورد اليومي'}
          </li>
          <li>
            <strong>إجمالي الصفحات:</strong> {p.totalTargetPages ?? '—'}
          </li>
          {p.scheduleStartYmd ? (
            <li>
              <strong>بداية الاحتساب:</strong> {p.scheduleStartYmd}
            </li>
          ) : null}
          {p.reminderTime ? (
            <li>
              <strong>التذكير:</strong> {formatReminderAr(p.reminderTime)}
            </li>
          ) : null}
          {p.useDateRange && p.dateStart && p.dateEnd ? (
            <li>
              <strong>الفترة:</strong> {p.dateStart} → {p.dateEnd}
            </li>
          ) : null}
          {p.weekdayLabels ? (
            <li>
              <strong>أيام الأسبوع:</strong> {p.weekdayLabels}
            </li>
          ) : null}
        </ul>
        {Array.isArray(p.volumes) && p.volumes.length > 0 ? (
          <div className="rh-explore-plans__volumes">
            <p className="rh-explore-plans__label">المجلدات</p>
            <ul className="rh-plans__saved-vols">
              {p.volumes.map((v) => (
                <li key={v.id}>
                  {v.label || v.id}: {v.pagesTarget ?? v.pages ?? '—'} صفحة
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <PlanResourceLinksBlock links={p.resourceLinks} />
        <p className="rh-explore-plans__meta-muted">
          أُنشئت: {p.createdAt ? String(p.createdAt) : '—'} · حُدّثت:{' '}
          {p.updatedAt ? String(p.updatedAt) : '—'}
        </p>
      </ExploreCardShell>
    )
  }

  if (kind === 'halakat') {
    const sessionDisp = halakaSessionDisplay(p)
    return (
      <ExploreCardShell
        coverUrl={itemCoverUrl(p)}
        title={p.name || 'حلقة بدون اسم'}
        badges={
          <>
            <span className="rh-plans__saved-badge">{p.genderType === 'women' ? 'نساء' : 'رجال'}</span>
            <span className="rh-plans__saved-badge">{p.memberCount ?? 0} عضواً</span>
          </>
        }
        joinControl={joinControl}
      >
        {p.description ? <p className="rh-plans__saved-desc">{p.description}</p> : null}
        {idLine}
        <CreatorBlock p={p} showCreator={showCreator} />
        <ul className="rh-explore-plans__facts">
          {p.location ? (
            <li>
              <strong>المكان:</strong> {p.location}
            </li>
          ) : null}
          <li>
            <strong>أيام التسميع:</strong> {weekdayArrLabel(p.tasmeeWeekdays)}
          </li>
          <li>
            <strong>أيام المراجعة:</strong> {weekdayArrLabel(p.reviewWeekdays)}
          </li>
          {sessionDisp ? (
            <li>
              <strong>موعد الحلقة:</strong> {sessionDisp.startLabel} — {sessionDisp.endLabel} (
              {sessionDisp.durationLabel})
            </li>
          ) : null}
        </ul>
        <p className="rh-explore-plans__meta-muted">
          أُنشئت: {p.createdAt ? String(p.createdAt) : '—'} · حُدّثت:{' '}
          {p.updatedAt ? String(p.updatedAt) : '—'}
        </p>
      </ExploreCardShell>
    )
  }

  if (kind === 'remote_tasmee') {
    return (
      <ExploreCardShell
        coverUrl={itemCoverUrl(p)}
        title={
          <span className="rh-explore-modal__card-title-row">
            <span
              className={[
                'rh-remote-tasmee-provider-mark',
                `rh-remote-tasmee-provider-mark--${remoteTasmeeProviderBrandSuffix(p.provider)}`,
              ].join(' ')}
              title={remoteTasmeeProviderLabelAr(p.provider)}
            >
              <RemoteTasmeeProviderIcon provider={p.provider} size={18} aria-hidden />
            </span>
            {p.title || 'بث بدون عنوان'}
          </span>
        }
        badges={
          <>
            <span className="rh-plans__saved-badge">{remoteTasmeeMediaLabelAr(p.mediaType)}</span>
            <span className="rh-plans__saved-badge">{remoteTasmeeProviderLabelAr(p.provider)}</span>
            <span className="rh-plans__saved-badge">{p.memberCount ?? 0} عضواً</span>
          </>
        }
        joinControl={joinControl}
      >
        {p.description ? <p className="rh-plans__saved-desc">{p.description}</p> : null}
        {p.linkedExamId ? (
          <p className="rh-plans__saved-meta">
            <span className="rh-explore-plans__label">اختبار مرتبط:</span>{' '}
            {p.linkedExamTitle ? <strong>{p.linkedExamTitle}</strong> : null}
            {p.linkedExamTitle ? ' · ' : null}
            <code className="rh-plans__plan-id">{p.linkedExamId}</code>
          </p>
        ) : null}
        {idLine}
        <CreatorBlock p={p} showCreator={showCreator} />
        {inItem ? (
          <p style={{ marginTop: '0.75rem' }}>
            <HapticLink
              className="ui-btn ui-btn--secondary ui-btn--sm"
              to={withImpersonationQuery(`/app/remote-tasmee/${encodeURIComponent(p.id)}`, impersonateUid)}
            >
              فتح صفحة البث والرابط
            </HapticLink>
          </p>
        ) : null}
        <p className="rh-explore-plans__meta-muted">
          أُنشئت: {p.createdAt ? String(p.createdAt) : '—'} · حُدّثت:{' '}
          {p.updatedAt ? String(p.updatedAt) : '—'}
        </p>
      </ExploreCardShell>
    )
  }

  if (kind === 'exams') {
    const volLines = formatExamVolumeSpecsSummaryLines(p.examVolumeSpecs)
    const volTotal = totalResolvedPagesFromExamVolumeSpecs(p.examVolumeSpecs)
    return (
      <ExploreCardShell
        coverUrl={itemCoverUrl(p)}
        title={p.name || 'مجموعة بدون اسم'}
        badges={<span className="rh-plans__saved-badge">{p.memberCount ?? 0} عضواً</span>}
        joinControl={joinControl}
      >
        {p.description ? <p className="rh-plans__saved-desc">{p.description}</p> : null}
        {volLines.length > 0 ? (
          <>
            <ul className="rh-plans__saved-vols">
              {volLines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            {volTotal > 0 ? (
              <p className="rh-plans__saved-meta rh-exam-volumes-total">
                المجموع التقريبي: <strong>{volTotal}</strong> صفحة
              </p>
            ) : null}
          </>
        ) : null}
        {idLine}
        <CreatorBlock p={p} showCreator={showCreator} />
        <p className="rh-explore-plans__meta-muted">
          أُنشئت: {p.createdAt ? String(p.createdAt) : '—'} · حُدّثت:{' '}
          {p.updatedAt ? String(p.updatedAt) : '—'}
        </p>
      </ExploreCardShell>
    )
  }

  if (kind === 'dawrat') {
    return (
      <ExploreCardShell
        coverUrl={itemCoverUrl(p)}
        title={p.title || 'دورة بدون عنوان'}
        badges={
          <>
            <span className="rh-plans__saved-badge">{deliveryLabel(p.deliveryMode)}</span>
            <span className="rh-plans__saved-badge">{p.memberCount ?? 0} عضواً</span>
          </>
        }
        joinControl={joinControl}
      >
        {p.description ? <p className="rh-plans__saved-desc">{p.description}</p> : null}
        {idLine}
        <CreatorBlock p={p} showCreator={showCreator} />
        <ul className="rh-explore-plans__facts">
          <li>
            <strong>التكلفة:</strong> {p.costLabel || '—'}
          </li>
          <li>
            <strong>آلية العرض:</strong> {deliveryLabel(p.deliveryMode)}
          </li>
          {(p.registrationStart || p.registrationEnd) && (
            <li>
              <strong>التسجيل:</strong> {p.registrationStart || '—'} → {p.registrationEnd || '—'}
              {typeof p.registrationPeriodDays === 'number' && p.registrationPeriodDays > 0
                ? ` (${p.registrationPeriodDays} يوماً)`
                : ''}
            </li>
          )}
          {(p.courseStart || p.courseEnd) && (
            <li>
              <strong>الدورة:</strong> {p.courseStart || '—'} → {p.courseEnd || '—'}
              {typeof p.coursePeriodDays === 'number' && p.coursePeriodDays > 0
                ? ` (${p.coursePeriodDays} يوماً)`
                : ''}
            </li>
          )}
        </ul>
        {dawraLines(p, 'benefitsList', 'benefitsText').length > 0 ? (
          <div className="rh-explore-plans__volumes">
            <p className="rh-explore-plans__label">المميزات</p>
            <ul className="rh-plans__saved-vols">
              {dawraLines(p, 'benefitsList', 'benefitsText').map((line, i) => (
                <li key={`bf-${i}`}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {dawraLines(p, 'conditionsList', 'conditionsText').length > 0 ? (
          <div className="rh-explore-plans__volumes">
            <p className="rh-explore-plans__label">الشروط</p>
            <ul className="rh-plans__saved-vols">
              {dawraLines(p, 'conditionsList', 'conditionsText').map((line, i) => (
                <li key={`cd-${i}`}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="rh-explore-plans__meta-muted">
          أُنشئت: {p.createdAt ? String(p.createdAt) : '—'} · حُدّثت:{' '}
          {p.updatedAt ? String(p.updatedAt) : '—'}
        </p>
      </ExploreCardShell>
    )
  }

  if (kind === 'activities') {
    return (
      <ExploreCardShell
        coverUrl={itemCoverUrl(p)}
        title={p.name || str('activities.explore.card_unnamed')}
        badges={
          <>
            <span className="rh-plans__saved-badge">{activityKindLabel(p.activityKind)}</span>
            <span className="rh-plans__saved-badge">{activityFormatLabel(p.activityFormat, 'short')}</span>
            <span className="rh-plans__saved-badge">{activityMemberCountBadge(p.memberCount)}</span>
          </>
        }
        joinControl={joinControl}
      >
        {p.description ? <p className="rh-plans__saved-desc">{p.description}</p> : null}
        {p.startAt ? (
          <p className="rh-plans__saved-meta">
            {str('activities.explore.meta_schedule')} {formatActivityDateTimeAr(p.startAt)}
            {p.endAt ? ` — ${formatActivityDateTimeAr(p.endAt)}` : ''}
          </p>
        ) : null}
        {p.location ? (
          <p className="rh-plans__saved-meta">
            {str('activities.explore.meta_location')} {p.location}
          </p>
        ) : null}
        {p.feeInfo ? (
          <p className="rh-plans__saved-meta">
            {str('activities.explore.meta_fee')} {p.feeInfo}
          </p>
        ) : null}
        <p className="rh-plans__saved-meta">
          {str('activities.card_line_audience')} {activityAudienceLabel(p.targetAudience)}
        </p>
        {p.registrationDeadline ? (
          <p className="rh-plans__saved-meta">
            {str('activities.card_line_registration')} {formatActivityDateTimeAr(p.registrationDeadline)}
          </p>
        ) : null}
        {p.maxParticipants != null && Number(p.maxParticipants) > 0 ? (
          <p className="rh-plans__saved-meta">
            {str('activities.card_line_max_participants')} {p.maxParticipants}
          </p>
        ) : null}
        {p.requirements ? (
          <p className="rh-plans__saved-meta">
            {str('activities.card_line_requirements')} {p.requirements}
          </p>
        ) : null}
        {(p.contactName || p.contactPhone) && (
          <p className="rh-plans__saved-meta">
            {str('activities.card_line_contact')}{' '}
            {[p.contactName, p.contactPhone].filter(Boolean).join(' — ')}
          </p>
        )}
        {idLine}
        <CreatorBlock p={p} showCreator={showCreator} />
        <p className="rh-explore-plans__meta-muted">
          {str('activities.explore.meta_timestamps', {
            created: formatActivityFirestoreMetaAr(p.createdAt),
            updated: formatActivityFirestoreMetaAr(p.updatedAt),
          })}
        </p>
      </ExploreCardShell>
    )
  }

  return null
}
