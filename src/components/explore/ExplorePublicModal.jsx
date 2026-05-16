import { Compass, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth.js'
import { usePermissions } from '../../context/usePermissions.js'
import { useSiteContent } from '../../context/useSiteContent.js'
import { getImpersonateUid } from '../../utils/impersonation.js'
import { Button, Modal, TextField, useToast } from '../../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../../ui/RhIcon.jsx'
import { EXPLORE_KIND_CONFIG } from './explorePublicKinds.js'
import { ExplorePublicItemCard } from './ExplorePublicItemCard.jsx'

function ExploreModalLoading({ label }) {
  return (
    <div className="rh-explore-modal__loading" role="status" aria-live="polite" aria-busy="true">
      <div className="rh-spinner" aria-hidden />
      <p>{label}</p>
    </div>
  )
}

/**
 * @param {object} props
 * @param {import('./explorePublicKinds.js').ExploreKind} props.kind
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 */
export function ExplorePublicModal({ kind, open, onClose }) {
  const { user } = useAuth()
  const { can } = usePermissions()
  const { search } = useLocation()
  const { str } = useSiteContent()
  const toast = useToast()
  const config = EXPLORE_KIND_CONFIG[kind]
  const PE = config.permissionPageId

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
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    setSearchQ('')
    setSortValue('newest')
    setJoinId('')
    setListLoading(true)
    setListError(false)
    setRawRows([])
    const unsub = config.subscribe(
      (rows) => {
        setRawRows(rows)
        setListLoading(false)
        setListError(false)
      },
      () => {
        setRawRows([])
        setListLoading(false)
        setListError(true)
      },
    )
    return () => unsub()
  }, [open, config])

  useEffect(() => {
    if (!open || !viewUserId) return undefined
    config.loadMyIds(viewUserId).then(setMyIds)
  }, [open, viewUserId, config])

  const displayed = useMemo(() => {
    const filtered = config.filter(rawRows, searchQ)
    return config.sort(filtered, sortValue)
  }, [rawRows, searchQ, sortValue, config])

  const canJoinById = can(PE, 'explore_join_by_id')
  const canJoinCard = can(PE, 'explore_join_card')

  const handleJoinById = async () => {
    const id = joinId.trim()
    if (!id || !viewUserId || !user) return
    setJoinByIdLoading(true)
    try {
      await config.join(viewUserId, id, user)
      setJoinId('')
      setMyIds((prev) => new Set(prev).add(id))
      toast.success(
        kind === 'activities' ? str('activities.toast_join_success') : 'تم الانضمام.',
        kind === 'activities' ? str('activities.toast_ok_title') : 'تم',
      )
    } catch (e) {
      config.joinErrorToast(e?.message, toast, str)
    } finally {
      setJoinByIdLoading(false)
    }
  }

  const handleJoinCard = async (itemId) => {
    if (!viewUserId || !user) return
    setJoiningCardId(itemId)
    try {
      await config.join(viewUserId, itemId, user)
      setMyIds((prev) => new Set(prev).add(itemId))
      toast.success(
        kind === 'activities' ? str('activities.toast_join_success') : 'تم الانضمام.',
        kind === 'activities' ? str('activities.toast_ok_title') : 'تم',
      )
    } catch (e) {
      if (e?.message === 'ALREADY_MEMBER') {
        toast.info(kind === 'activities' ? str('activities.toast_join_already') : 'أنت مضاف مسبقاً.', '')
      } else if (kind === 'activities' && e?.message === 'ACTIVITY_NOT_PUBLIC') {
        toast.warning(str('activities.explore.toast_join_not_public_card'), '')
      } else {
        config.joinErrorToast(e?.message, toast, str)
      }
    } finally {
      setJoiningCardId(null)
    }
  }

  const title =
    kind === 'activities' ? str('activities.explore.hero_title') : config.title

  const description =
    kind === 'activities'
      ? `${str('activities.explore.hero_lead')}${actingAsUser ? str('activities.explore.hero_lead_acting') : ''}`
      : `${config.description}${actingAsUser ? ' أنت تعمل نيابة عن مستخدم: الانضمام يُسجَّل لحسابه.' : ''}`

  const loadingLabel =
    kind === 'activities' ? str('activities.explore.loading') : 'جاري تحميل العروض العامة…'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="rh-explore-modal__title">
          <RhIcon as={Compass} size={22} strokeWidth={RH_ICON_STROKE} className="rh-explore-plans__title-icon" />
          {title}
        </span>
      }
      size="lg"
      className="rh-explore-modal"
      contentClassName="ui-modal__content--explore"
    >
      <div className="rh-explore-modal__body">
        <p className="rh-explore-modal__lead">{description}</p>

        <section className="rh-explore-modal__toolbar" aria-disabled={listLoading}>
        <div className="rh-explore-plans__toolbar-grid">
          <TextField
            label={kind === 'activities' ? str('activities.explore.search_label') : 'بحث'}
            hint={kind === 'activities' ? str('activities.explore.search_hint') : config.searchHint}
            placeholder={kind === 'activities' ? str('activities.explore.search_placeholder') : 'ابحث…'}
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            disabled={listLoading}
          />
          <div className="ui-field">
            <label className="ui-field__label" htmlFor={`explore-modal-sort-${kind}`}>
              {kind === 'activities' ? str('activities.explore.sort_label') : 'الترتيب'}
            </label>
            <select
              id={`explore-modal-sort-${kind}`}
              className="ui-input"
              value={sortValue}
              onChange={(e) => setSortValue(e.target.value)}
              disabled={listLoading}
            >
              {config.sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {canJoinById ? (
          <div className="rh-explore-plans__join-inline">
            <TextField
              label={
                kind === 'activities'
                  ? str('activities.explore.join_by_id_label')
                  : config.joinByIdLabel
              }
              placeholder={
                kind === 'activities'
                  ? str('activities.explore.join_by_id_placeholder')
                  : config.joinByIdPlaceholder
              }
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
            />
            <Button
              type="button"
              variant="primary"
              icon={UserPlus}
              onClick={handleJoinById}
              loading={joinByIdLoading}
              disabled={listLoading || !joinId.trim() || !viewUserId || joinByIdLoading}
            >
              {kind === 'activities' ? str('activities.explore.join_submit') : 'انضمام'}
            </Button>
          </div>
        ) : null}
      </section>

        {!listLoading ? (
          <p className="rh-explore-plans__count">
            {kind === 'activities'
              ? displayed.length === rawRows.length
                ? str('activities.explore.count_all', { count: String(rawRows.length) })
                : str('activities.explore.count_filtered', {
                    shown: String(displayed.length),
                    total: String(rawRows.length),
                  })
              : config.countLabel(displayed.length, rawRows.length)}
          </p>
        ) : null}

        <div className="rh-explore-modal__results">
          {listLoading ? (
            <ExploreModalLoading label={loadingLabel} />
          ) : listError ? (
            <section className="rh-settings-card rh-plans__empty rh-explore-modal__empty">
              <h3 className="rh-settings-card__title">تعذر تحميل البيانات</h3>
              <p className="rh-settings-card__subtitle">تحقق من الاتصال ثم أغلق النافذة وافتحها مجدداً.</p>
            </section>
          ) : displayed.length === 0 ? (
            <section className="rh-settings-card rh-plans__empty rh-explore-modal__empty">
              <h3 className="rh-settings-card__title">
                {kind === 'activities' ? str('activities.explore.empty_title') : 'لا توجد نتائج'}
              </h3>
              <p className="rh-settings-card__subtitle">
                {rawRows.length === 0
                  ? kind === 'activities'
                    ? str('activities.explore.empty_none')
                    : config.emptyNone
                  : kind === 'activities'
                    ? str('activities.explore.empty_filter')
                    : config.emptyFilter}
              </p>
            </section>
          ) : (
            <ul className="rh-explore-modal__list">
              {displayed.map((p) => (
                <ExplorePublicItemCard
                  key={p.id}
                  kind={kind}
                  item={p}
                  inItem={myIds.has(p.id)}
                  canJoin={canJoinCard}
                  joining={joiningCardId === p.id}
                  onJoin={() => handleJoinCard(p.id)}
                  impersonateUid={impersonateUid}
                  str={str}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}
