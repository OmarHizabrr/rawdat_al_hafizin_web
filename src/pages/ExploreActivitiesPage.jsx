import { Compass, Printer, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CrossNav } from '../components/CrossNav.jsx'
import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry.js'
import { isAdmin } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import {
  EXPLORE_SORT_OPTIONS,
  filterPublicActivitiesBySearch,
  sortPublicActivities,
  subscribePublicActivitiesForExplore,
} from '../services/exploreActivitiesService.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import { joinPublicActivity, loadActivities } from '../utils/activitiesStorage.js'
import {
  activityAudienceLabel,
  activityFormatLabel,
  activityKindLabel,
  activityMemberCountBadge,
  formatActivityDateTimeAr,
  formatActivityFirestoreMetaAr,
} from '../utils/activityLabels.js'
import { Button, ScrollArea, TextField, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

const PE = PERMISSION_PAGE_IDS.activities_explore

export default function ExploreActivitiesPage() {
  const { user } = useAuth()
  const { can, canAccessPage } = usePermissions()
  const { search } = useLocation()
  const { str, branding } = useSiteContent()
  const toast = useToast()
  const onPrint = useCallback(() => {
    if (typeof window !== 'undefined') window.print()
  }, [])
  const impersonateUid = getImpersonateUid(user, search)
  const viewUserId = impersonateUid || user?.uid || ''
  const actingAsUser = Boolean(user?.uid && impersonateUid && impersonateUid !== user.uid)

  const [rawRows, setRawRows] = useState([])
  const [searchQ, setSearchQ] = useState('')
  const [sortValue, setSortValue] = useState('newest')
  const [joinId, setJoinId] = useState('')
  const [myIds, setMyIds] = useState(() => new Set())
  const [joinByIdLoading, setJoinByIdLoading] = useState(false)
  const [joiningCardId, setJoiningCardId] = useState(null)

  const appLink = useCallback(
    (path) => withImpersonationQuery(path, impersonateUid),
    [impersonateUid],
  )

  useEffect(() => {
    document.title = str('activities.explore.doc_title')
  }, [str])

  useEffect(() => {
    if (!viewUserId) return undefined
    loadActivities(viewUserId).then((rows) => {
      setMyIds(new Set((rows || []).map((p) => p.id).filter(Boolean)))
    })
  }, [viewUserId])

  useEffect(() => {
    const unsub = subscribePublicActivitiesForExplore(
      (rows) => setRawRows(rows),
      () => setRawRows([]),
    )
    return () => unsub()
  }, [])

  const displayed = useMemo(() => {
    const filtered = filterPublicActivitiesBySearch(rawRows, searchQ)
    return sortPublicActivities(filtered, sortValue)
  }, [rawRows, searchQ, sortValue])

  const handleJoinById = async () => {
    const id = joinId.trim()
    if (!id || !viewUserId || !user) return
    setJoinByIdLoading(true)
    try {
      await joinPublicActivity(viewUserId, id, user)
      setJoinId('')
      setMyIds((prev) => new Set(prev).add(id))
      toast.success(str('activities.toast_join_success'), str('activities.toast_ok_title'))
    } catch (e) {
      const m = e?.message
      if (m === 'ACTIVITY_NOT_PUBLIC') toast.warning(str('activities.explore.toast_join_not_public_by_id'), '')
      else if (m === 'ALREADY_MEMBER') toast.info(str('activities.toast_join_already'), '')
      else if (m === 'ACTIVITY_NOT_FOUND') toast.warning(str('activities.toast_join_not_found'), '')
      else toast.warning(str('activities.toast_join_fail'), '')
    } finally {
      setJoinByIdLoading(false)
    }
  }

  const handleJoinCard = async (activityId) => {
    if (!viewUserId || !user) return
    setJoiningCardId(activityId)
    try {
      await joinPublicActivity(viewUserId, activityId, user)
      setMyIds((prev) => new Set(prev).add(activityId))
      toast.success(str('activities.toast_join_success'), str('activities.toast_ok_title'))
    } catch (e) {
      const m = e?.message
      if (m === 'ACTIVITY_NOT_PUBLIC') toast.warning(str('activities.explore.toast_join_not_public_card'), '')
      else if (m === 'ALREADY_MEMBER') toast.info(str('activities.toast_join_already'), '')
      else if (m === 'ACTIVITY_NOT_FOUND') toast.warning(str('activities.toast_join_not_found'), '')
      else toast.warning(str('activities.toast_join_fail'), '')
    } finally {
      setJoiningCardId(null)
    }
  }

  const crossItems = useMemo(() => {
    const base = [
      { to: appLink('/app'), label: str('layout.nav_home') },
      { to: appLink('/app/activities'), label: str('layout.nav_activities') },
      { to: appLink('/app/halakat'), label: str('layout.nav_halakat') },
      { to: appLink('/app/plans'), label: str('layout.nav_plans') },
    ]
    if (canAccessPage('exams')) {
      base.push({ to: appLink('/app/exams'), label: str('layout.nav_exams') })
    }
    if (canAccessPage('exams_explore')) {
      base.push({ to: appLink('/app/exams/explore'), label: str('layout.nav_exams_explore') })
    }
    if (canAccessPage('leave_request')) {
      base.push({ to: appLink('/app/leave-request'), label: str('layout.nav_leave_request') })
    }
    base.push({ to: appLink('/app/settings'), label: str('layout.nav_settings') })
    if (isAdmin(user)) {
      base.push({ to: '/app/admin', label: str('layout.nav_dashboard') })
    }
    return base
  }, [user, str, appLink, canAccessPage])

  return (
    <div className="rh-explore-plans rh-activities-explore-page">
      <div className="rh-print-only" aria-hidden="true">
        <p className="rh-print-only__title">{str('activities.explore.hero_title')}</p>
        <p className="rh-print-only__meta">
          {str('activities.print_stamp', {
            date: new Date().toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }),
            siteTitle: branding.siteTitle,
          })}
        </p>
      </div>
      <header className="rh-plans__hero no-print">
        <div className="rh-plans__hero-head">
          <div>
            <h1 className="rh-plans__title rh-explore-plans__title">
              <RhIcon as={Compass} size={28} strokeWidth={RH_ICON_STROKE} className="rh-explore-plans__title-icon" />
              {str('activities.explore.hero_title')}
            </h1>
            <p className="rh-plans__desc">
              {str('activities.explore.hero_lead')}
              {actingAsUser ? str('activities.explore.hero_lead_acting') : ''}
            </p>
            <CrossNav items={crossItems} className="rh-plans__cross" />
          </div>
          <div className="rh-explore-plans__hero-aside no-print">
            <Button type="button" variant="secondary" className="rh-explore-plans__print-btn" onClick={onPrint}>
              <RhIcon as={Printer} size={18} strokeWidth={RH_ICON_STROKE} />
              {str('activities.print_btn')}
            </Button>
            <Link className="ui-btn ui-btn--secondary rh-explore-plans__to-mine" to={appLink('/app/activities')}>
              {str('activities.explore.btn_mine')}
            </Link>
          </div>
        </div>
      </header>

      <section className="rh-settings-card rh-explore-plans__toolbar no-print">
        <div className="rh-explore-plans__toolbar-grid">
          <TextField
            label={str('activities.explore.search_label')}
            hint={str('activities.explore.search_hint')}
            placeholder={str('activities.explore.search_placeholder')}
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="explore-activities-sort">
              {str('activities.explore.sort_label')}
            </label>
            <select
              id="explore-activities-sort"
              className="ui-input"
              value={sortValue}
              onChange={(e) => setSortValue(e.target.value)}
            >
              {EXPLORE_SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {can(PE, 'explore_join_by_id') && (
          <div className="rh-explore-plans__join-inline">
            <TextField
              label={str('activities.explore.join_by_id_label')}
              placeholder={str('activities.explore.join_by_id_placeholder')}
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
            />
            <Button
              type="button"
              variant="primary"
              onClick={handleJoinById}
              loading={joinByIdLoading}
              disabled={!joinId.trim() || !viewUserId || joinByIdLoading}
            >
              {!joinByIdLoading && <RhIcon as={UserPlus} size={18} strokeWidth={RH_ICON_STROKE} />}
              {str('activities.explore.join_submit')}
            </Button>
          </div>
        )}
      </section>

      <p className="rh-explore-plans__count no-print">
        {displayed.length === rawRows.length
          ? str('activities.explore.count_all', { count: String(rawRows.length) })
          : str('activities.explore.count_filtered', {
              shown: String(displayed.length),
              total: String(rawRows.length),
            })}
      </p>

      {displayed.length === 0 ? (
        <section className="rh-settings-card rh-plans__empty">
          <h2 className="rh-settings-card__title">{str('activities.explore.empty_title')}</h2>
          <p className="rh-settings-card__subtitle">
            {rawRows.length === 0 ? str('activities.explore.empty_none') : str('activities.explore.empty_filter')}
          </p>
        </section>
      ) : (
        <ScrollArea className="rh-explore-plans__scroll" padded>
          <ul className="rh-explore-plans__list">
            {displayed.map((p) => {
              const inItem = myIds.has(p.id)
              return (
                <li key={p.id} className="rh-explore-plans__card">
                  <div className="rh-explore-plans__card-head">
                    <div className="rh-explore-plans__card-title-block">
                      <strong className="rh-explore-plans__card-name">
                        {p.name || str('activities.explore.card_unnamed')}
                      </strong>
                      <span className="rh-plans__saved-badges">
                        <span className="rh-plans__saved-badge">{activityKindLabel(p.activityKind)}</span>
                        <span className="rh-plans__saved-badge">
                          {activityFormatLabel(p.activityFormat, 'short')}
                        </span>
                        <span className="rh-plans__saved-badge">{activityMemberCountBadge(p.memberCount)}</span>
                      </span>
                    </div>
                    {can(PE, 'explore_join_card') ? (
                      <Button
                        type="button"
                        variant={inItem ? 'secondary' : 'primary'}
                        size="sm"
                        loading={joiningCardId === p.id}
                        disabled={inItem || joiningCardId !== null}
                        onClick={() => !inItem && handleJoinCard(p.id)}
                      >
                        {inItem ? str('activities.explore.card_joined') : str('activities.explore.card_join')}
                      </Button>
                    ) : (
                      <span className="rh-plans__saved-badge">
                        {inItem ? str('activities.explore.card_joined') : str('activities.explore.card_view_only')}
                      </span>
                    )}
                  </div>

                  {p.description ? <p className="rh-plans__saved-desc">{p.description}</p> : null}
                  {p.startAt && (
                    <p className="rh-plans__saved-meta">
                      {str('activities.explore.meta_schedule')} {formatActivityDateTimeAr(p.startAt)}
                      {p.endAt ? ` — ${formatActivityDateTimeAr(p.endAt)}` : ''}
                    </p>
                  )}
                  {p.location && (
                    <p className="rh-plans__saved-meta">
                      {str('activities.explore.meta_location')} {p.location}
                    </p>
                  )}
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
                      {str('activities.card_line_registration')}{' '}
                      {formatActivityDateTimeAr(p.registrationDeadline)}
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

                  <p className="rh-plans__saved-meta">
                    <span className="rh-explore-plans__label">{str('activities.explore.meta_id')}</span>{' '}
                    <code className="rh-plans__plan-id">{p.id}</code>
                  </p>

                  <div className="rh-explore-plans__creator">
                    {p.creatorPhoto ? (
                      <img src={p.creatorPhoto} alt="" className="rh-explore-plans__avatar" />
                    ) : (
                      <div className="rh-explore-plans__avatar rh-explore-plans__avatar--placeholder" aria-hidden />
                    )}
                    <div>
                      <p className="rh-explore-plans__creator-label">{str('activities.explore.creator_label')}</p>
                      <p className="rh-explore-plans__creator-name">{p.creatorDisplayName}</p>
                      {p.creatorEmail && <p className="rh-explore-plans__creator-email">{p.creatorEmail}</p>}
                    </div>
                  </div>

                  <p className="rh-explore-plans__meta-muted">
                    {str('activities.explore.meta_timestamps', {
                      created: formatActivityFirestoreMetaAr(p.createdAt),
                      updated: formatActivityFirestoreMetaAr(p.updatedAt),
                    })}
                  </p>
                </li>
              )
            })}
          </ul>
        </ScrollArea>
      )}
    </div>
  )
}
