import { Bird, Heart, Star, Trash2, Pencil } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { CrossNav } from '../components/CrossNav.jsx'
import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry.js'
import { isAdmin } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import {
  createStudentFeeling,
  deleteStudentFeeling,
  loadRecentStudentFeelings,
  STUDENT_FEELING_MOODS,
  subscribeStudentFeelingsForUser,
  updateStudentFeeling,
} from '../services/studentFeelingsService.js'
import { TextAreaField, useToast } from '../ui/index.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

const FEELINGS_PAGE_ID = PERMISSION_PAGE_IDS.feelings

function StarRating({ value, onChange, disabled = false }) {
  return (
    <div className="rh-feelings__stars" role="radiogroup" aria-label="تقييم النجوم">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={['rh-feelings__star', n <= value ? 'is-active' : ''].filter(Boolean).join(' ')}
          aria-label={`تقييم ${n} من 5`}
          aria-checked={n === value}
          role="radio"
          disabled={disabled}
          onClick={() => onChange(n)}
        >
          <RhIcon as={Star} size={20} strokeWidth={RH_ICON_STROKE} />
        </button>
      ))}
    </div>
  )
}

export default function StudentFeelingsPage() {
  const { user } = useAuth()
  const { search } = useLocation()
  const [searchParams] = useSearchParams()
  const toast = useToast()
  const { str, branding } = useSiteContent()
  const { canAccessPage } = usePermissions()

  const uidParam = searchParams.get('uid')?.trim() || ''
  const contextUserId = useMemo(() => {
    if (!user?.uid) return ''
    if (uidParam && isAdmin(user)) return uidParam
    return user.uid
  }, [uidParam, user])

  const actingAsUser = Boolean(user?.uid && contextUserId && contextUserId !== user.uid)
  const impersonateUid = getImpersonateUid(user, search)
  const appLink = useCallback((path) => withImpersonationQuery(path, impersonateUid), [impersonateUid])

  const [text, setText] = useState('')
  const [rating, setRating] = useState(5)
  const [mood, setMood] = useState(STUDENT_FEELING_MOODS[0].id)
  const [busy, setBusy] = useState(false)
  const [rows, setRows] = useState([])
  const [editingId, setEditingId] = useState('')
  const [editingOwnerUid, setEditingOwnerUid] = useState('')

  useEffect(() => {
    document.title = actingAsUser ? `مشاعر الطلاب (نيابة) — ${branding.siteTitle}` : `مشاعر الطلاب — ${branding.siteTitle}`
  }, [actingAsUser, branding.siteTitle])

  useEffect(() => {
    if (!contextUserId) return undefined
    if (isAdmin(user) && !actingAsUser) {
      let cancelled = false
      const load = () =>
        loadRecentStudentFeelings(80)
          .then((list) => {
            if (!cancelled) setRows(list)
          })
          .catch(() => {
            if (!cancelled) setRows([])
          })
      load()
      const id = window.setInterval(load, 20_000)
      return () => {
        cancelled = true
        window.clearInterval(id)
      }
    }
    return subscribeStudentFeelingsForUser(contextUserId, setRows, () => {
      toast.warning('تعذّر تحميل المشاعر الآن. حاول بعد قليل.', 'تنبيه')
    })
  }, [actingAsUser, contextUserId, toast, user])

  const canWrite = canAccessPage(FEELINGS_PAGE_ID)

  const crossItems = useMemo(() => {
    const base = [
      { to: appLink('/app'), label: str('layout.nav_home') },
      { to: appLink('/app/plans'), label: str('layout.nav_plans') },
      { to: appLink('/app/awrad'), label: str('layout.nav_awrad') },
      { to: appLink('/app/settings'), label: str('layout.nav_settings') },
    ]
    if (canAccessPage('halakat')) base.push({ to: appLink('/app/halakat'), label: str('layout.nav_halakat') })
    if (canAccessPage('dawrat')) base.push({ to: appLink('/app/dawrat'), label: str('layout.nav_dawrat') })
    return base
  }, [appLink, canAccessPage, str])

  const resetDraft = () => {
    setText('')
    setRating(5)
    setMood(STUDENT_FEELING_MOODS[0].id)
    setEditingId('')
    setEditingOwnerUid('')
  }

  const onSubmit = async () => {
    if (!contextUserId || !canWrite) return
    const value = text.trim()
    if (!value) {
      toast.warning('اكتب وصف المشاعر أولاً.', 'تنبيه')
      return
    }
    setBusy(true)
    try {
      if (editingId) {
        const ownerUid = editingOwnerUid || contextUserId
        await updateStudentFeeling({
          actorUser: user,
          ownerUid,
          feelingId: editingId,
          text: value,
          rating,
          mood,
          isAdmin: isAdmin(user),
          userData: user || {},
        })
        toast.success('تم تحديث الشعور.', 'تم')
      } else {
        await createStudentFeeling({
          ownerUid: contextUserId,
          text: value,
          rating,
          mood,
          userData: user || {},
          profile: user || {},
        })
        toast.success('تم نشر الشعور بنجاح.', 'تم')
      }
      resetDraft()
    } catch (e) {
      const msg =
        e?.message === 'FEELING_TEXT_REQUIRED'
          ? 'النص مطلوب.'
          : 'تعذّر حفظ الشعور الآن. حاول مرة أخرى.'
      toast.warning(msg, 'تنبيه')
    } finally {
      setBusy(false)
    }
  }

  const onEdit = (row) => {
    if (!row) return
    setEditingId(row.id)
    setText(row.text || '')
    setRating(row.rating || 5)
    setMood(row.mood || STUDENT_FEELING_MOODS[0].id)
    setEditingOwnerUid(row.ownerUid || contextUserId)
  }

  const onDelete = async (row) => {
    if (!row || !contextUserId) return
    if (!window.confirm('تأكيد حذف هذا الشعور؟')) return
    setBusy(true)
    try {
      await deleteStudentFeeling({
        actorUser: user,
        ownerUid: row.ownerUid || contextUserId,
        feelingId: row.id,
        isAdmin: isAdmin(user),
      })
      if (editingId === row.id) resetDraft()
      toast.success('تم الحذف.', 'تم')
    } catch {
      toast.warning('تعذّر الحذف الآن.', 'تنبيه')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rh-feelings-page">
      <header className="rh-feelings-page__hero card">
        <div className="rh-feelings-page__hero-icon" aria-hidden>
          <RhIcon as={Bird} size={32} strokeWidth={RH_ICON_STROKE} />
        </div>
        <div>
          <h1 className="rh-feelings-page__title">مشاعر الطلاب</h1>
          <p className="rh-feelings-page__lead">
            مساحة لطيفة لكتابة شعورك اليوم مع تقييم بنظام النجوم. هذه المشاركات تظهر أيضًا في الرئيسية على شكل طيور
            جميلة تعطي انطباعًا مبهجًا.
          </p>
          <CrossNav items={crossItems} className="rh-feelings-page__cross" />
        </div>
      </header>

      <section className="rh-feelings card">
        <h2 className="rh-feelings__title">{editingId ? 'تعديل شعور' : 'اكتب شعورك الآن'}</h2>
        <TextAreaField
          label="وصف الشعور"
          hint="مثال: الحمد لله أنهيت وردي اليوم براحة."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="اكتب شعورك بلطف ووضوح…"
        />
        <div className="rh-feelings__grid">
          <div>
            <label className="ui-field__label">التقييم بالنجوم</label>
            <StarRating value={rating} onChange={setRating} disabled={!canWrite || busy} />
          </div>
          <div>
            <label className="ui-field__label">مزاج اليوم</label>
            <div className="rh-feelings__moods">
              {STUDENT_FEELING_MOODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={['rh-feelings__mood', mood === m.id ? 'is-active' : ''].filter(Boolean).join(' ')}
                  onClick={() => setMood(m.id)}
                  disabled={!canWrite || busy}
                >
                  <span aria-hidden>{m.bird}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rh-feelings__actions">
          <button type="button" className="ui-btn ui-btn--primary" onClick={onSubmit} disabled={!canWrite || busy}>
            <RhIcon as={Heart} size={18} strokeWidth={RH_ICON_STROKE} />
            {editingId ? 'حفظ التعديل' : 'نشر الشعور'}
          </button>
          {editingId ? (
            <button type="button" className="ui-btn ui-btn--ghost" onClick={resetDraft} disabled={busy}>
              إلغاء التعديل
            </button>
          ) : null}
        </div>
      </section>

      <section className="rh-feelings-feed card">
        <h2 className="rh-feelings-feed__title">آخر المشاعر</h2>
        {isAdmin(user) && !actingAsUser ? (
          <p className="rh-feelings-feed__hint">أنت كمشرف ترى هنا آخر مشاعر جميع الطلاب ويمكنك إدارتها.</p>
        ) : null}
        {rows.length === 0 ? (
          <p className="rh-feelings-feed__empty">
            لا توجد مشاعر بعد. ابدأ بأول مشاركة لطيفة، وستظهر في الرئيسية أيضًا.
          </p>
        ) : (
          <ul className="rh-feelings-feed__list">
            {rows.map((row) => (
              <li key={row.id} className="rh-feelings-item">
                <div className="rh-feelings-item__head">
                  <div className="rh-feelings-item__profile">
                    {row.photoURL ? (
                      <img src={row.photoURL} alt="" width={36} height={36} className="rh-feelings-item__avatar" />
                    ) : (
                      <span className="rh-feelings-item__avatar rh-feelings-item__avatar--fallback">{row.bird}</span>
                    )}
                    <div>
                      <strong>{row.displayName || 'طالب'}</strong>
                      <p>{row.moodLabel}</p>
                    </div>
                  </div>
                  <span className="rh-feelings-item__bird" aria-hidden>
                    {row.bird}
                  </span>
                </div>
                <p className="rh-feelings-item__text">{row.text}</p>
                <div className="rh-feelings-item__stars" aria-label={`التقييم ${row.rating} من 5`}>
                  {'★'.repeat(Math.max(1, row.rating))}
                  {'☆'.repeat(Math.max(0, 5 - Math.max(1, row.rating)))}
                </div>
                <div className="rh-feelings-item__actions">
                  <button type="button" className="ui-btn ui-btn--sm ui-btn--ghost" onClick={() => onEdit(row)} disabled={busy}>
                    <RhIcon as={Pencil} size={16} strokeWidth={RH_ICON_STROKE} />
                    تعديل
                  </button>
                  <button type="button" className="ui-btn ui-btn--sm ui-btn--ghost" onClick={() => onDelete(row)} disabled={busy}>
                    <RhIcon as={Trash2} size={16} strokeWidth={RH_ICON_STROKE} />
                    حذف
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="rh-feelings-feed__hint">
          يمكن لصاحب المشاركة تعديلها أو حذفها، ويمكن للمشرف إدارة المشاركات مباشرة أو عند العمل نيابة عن المستخدم.
          {' '}
          <Link to={appLink('/app')}>العودة للرئيسية</Link>
        </p>
      </section>
    </div>
  )
}
