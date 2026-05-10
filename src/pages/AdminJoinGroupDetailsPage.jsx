import {
  ArrowLeft,
  ArrowRight,
  Download,
  ExternalLink,
  Globe,
  MessageCircle,
  RefreshCw,
  Send,
  Trash2,
  UserMinus,
  Users,
  X,
} from 'lucide-react'
import { HapticLink } from '../ui/HapticLink.jsx'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CrossNav } from '../components/CrossNav.jsx'
import { useAuth } from '../context/useAuth.js'
import {
  getJoinGroupById,
  loadJoinGroupAuditEvents,
  loadJoinGroupMembersWithProfiles,
  removeJoinGroupMember,
} from '../services/joinGroupsService.js'
import { Button, Modal, SearchField, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

function platformLabel(v) {
  if (v === 'whatsapp') return 'واتساب'
  if (v === 'telegram') return 'تليجرام'
  if (v === 'facebook') return 'فيسبوك'
  if (v === 'discord') return 'ديسكورد'
  return 'أخرى'
}

function platformIcon(v) {
  if (v === 'telegram') return Send
  if (v === 'discord') return Users
  if (v === 'facebook') return Globe
  return MessageCircle
}

function genderLabel(v) {
  if (v === 'men') return 'ذكور'
  if (v === 'women') return 'إناث'
  return 'الكل'
}

function csvSafe(v) {
  const text = String(v ?? '')
  const escaped = text.replace(/"/g, '""')
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped
}

function isProtectedRole(role) {
  const norm = String(role || '').toLowerCase()
  return norm === 'owner' || norm === 'admin'
}

export default function AdminJoinGroupDetailsPage() {
  const { user } = useAuth()
  const { groupId = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [memberFilter, setMemberFilter] = useState('all')
  const [memberSearch, setMemberSearch] = useState('')
  const [memberSort, setMemberSort] = useState('joined_desc')
  const [removingUserId, setRemovingUserId] = useState('')
  const [pendingRemoveMember, setPendingRemoveMember] = useState(null)
  const [auditRows, setAuditRows] = useState([])
  const [auditLoading, setAuditLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getJoinGroupById(groupId)
      .then((row) => {
        if (!cancelled) setGroup(row)
      })
      .catch(() => {
        if (!cancelled) setGroup(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [groupId])

  useEffect(() => {
    let cancelled = false
    setAuditLoading(true)
    loadJoinGroupAuditEvents(groupId, 50)
      .then((rows) => {
        if (!cancelled) setAuditRows(Array.isArray(rows) ? rows : [])
      })
      .catch(() => {
        if (!cancelled) setAuditRows([])
      })
      .finally(() => {
        if (!cancelled) setAuditLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [groupId])

  useEffect(() => {
    let cancelled = false
    setMembersLoading(true)
    loadJoinGroupMembersWithProfiles(groupId)
      .then((rows) => {
        if (!cancelled) {
          const sorted = [...rows].sort((a, b) => String(b.joinedAt || '').localeCompare(String(a.joinedAt || '')))
          setMembers(sorted)
        }
      })
      .catch(() => {
        if (!cancelled) setMembers([])
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [groupId])

  const crossItems = useMemo(
    () => [
      { to: '/app/admin', label: 'لوحة التحكم' },
      { to: '/app/admin/groups', label: 'إدارة المجموعات' },
    ],
    [],
  )
  const filteredMembers = useMemo(() => {
    let rows = [...members]
    if (memberFilter === 'male' || memberFilter === 'female') {
      rows = rows.filter((m) => String(m.gender || '').toLowerCase() === memberFilter)
    }
    if (memberFilter === 'admins') {
      rows = rows.filter((m) => ['admin', 'owner'].includes(String(m.role || '').toLowerCase()))
    }
    const q = memberSearch.trim().toLowerCase()
    if (q) {
      rows = rows.filter((m) =>
        `${m.displayName || ''} ${m.email || ''} ${m.userId || ''} ${m.role || ''}`.toLowerCase().includes(q),
      )
    }
    if (memberSort === 'name_asc') {
      rows.sort((a, b) => String(a.displayName || a.userId).localeCompare(String(b.displayName || b.userId), 'ar'))
    } else if (memberSort === 'role_asc') {
      rows.sort((a, b) => String(a.role || '').localeCompare(String(b.role || ''), 'ar'))
    } else if (memberSort === 'joined_asc') {
      rows.sort((a, b) => String(a.joinedAt || '').localeCompare(String(b.joinedAt || '')))
    } else {
      rows.sort((a, b) => String(b.joinedAt || '').localeCompare(String(a.joinedAt || '')))
    }
    return rows
  }, [members, memberFilter, memberSearch, memberSort])
  const memberStats = useMemo(() => {
    const total = members.length
    const male = members.filter((m) => String(m.gender || '').toLowerCase() === 'male').length
    const female = members.filter((m) => String(m.gender || '').toLowerCase() === 'female').length
    const admins = members.filter((m) => ['admin', 'owner'].includes(String(m.role || '').toLowerCase())).length
    return { total, male, female, admins }
  }, [members])
  const PlatformIcon = platformIcon(group?.platform)

  if (loading) {
    return (
      <section className="card">
        <p>جاري تحميل تفاصيل المجموعة…</p>
      </section>
    )
  }

  if (!group) {
    return (
      <section className="card">
        <p>لم يتم العثور على المجموعة المطلوبة.</p>
        <div className="rh-plans__actions">
          <Button type="button" icon={ArrowLeft} onClick={() => navigate('/app/admin/groups')}>
            العودة لإدارة المجموعات
          </Button>
        </div>
      </section>
    )
  }

  return (
    <div className="rh-admin-users rh-admin-users--join-group-details">
      <header className="rh-admin-users__hero card">
        <h1 className="rh-admin-users__title">تفاصيل المجموعة</h1>
        <p className="rh-admin-users__desc">{group.name}</p>
      </header>
      <CrossNav items={crossItems} className="rh-admin-users__cross" />

      <section className="card">
        <div className="rh-admin-users__card-top">
          <span className={['rh-admin-users__avatar', `rh-join-platform-badge--${group.platform || 'other'}`].join(' ')} aria-hidden>
            {group.imageUrl ? <img src={group.imageUrl} alt="" width={56} height={56} /> : <RhIcon as={PlatformIcon} size={24} strokeWidth={RH_ICON_STROKE} />}
          </span>
          <div className="rh-admin-users__card-head">
            <strong className="rh-admin-users__name">{group.name}</strong>
            <span className="rh-admin-users__email">
              {platformLabel(group.platform)} · {genderLabel(group.genderType)}
            </span>
            <span className="rh-plans__saved-badge">
              {group.visibleOnHome ? 'ظاهرة في الرئيسية' : 'مخفية من الرئيسية'}
            </span>
          </div>
        </div>
        {group.description ? <p className="rh-plans__saved-desc">{group.description}</p> : null}
        <div className="rh-admin-users__row--actions">
          <Button type="button" variant="secondary" icon={ArrowRight} onClick={() => navigate('/app/admin/groups')}>
            العودة
          </Button>
          <Button
            type="button"
            variant="ghost"
            icon={ExternalLink}
            onClick={() => {
              if (!group.joinUrl) return
              window.open(group.joinUrl, '_blank', 'noopener,noreferrer')
            }}
          >
            فتح رابط المجموعة
          </Button>
          <Button
            type="button"
            variant="ghost"
            icon={Download}
            onClick={() => {
              const headers = ['uid', 'name', 'email', 'role', 'gender', 'joinedAt']
              const lines = [headers.join(',')]
              for (const m of members) {
                lines.push([
                  csvSafe(m.userId),
                  csvSafe(m.displayName),
                  csvSafe(m.email),
                  csvSafe(m.role),
                  csvSafe(m.gender),
                  csvSafe(m.joinedAt ? new Date(m.joinedAt).toISOString() : ''),
                ].join(','))
              }
              const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
              const a = document.createElement('a')
              a.href = URL.createObjectURL(blob)
              a.download = `group-members-${group.id}.csv`
              document.body.appendChild(a)
              a.click()
              a.remove()
              URL.revokeObjectURL(a.href)
              toast.success('تم تنزيل CSV للأعضاء.', 'تم')
            }}
          >
            تنزيل CSV
          </Button>
        </div>
      </section>

      <section className="card">
        <div className="rh-settings-card__head">
          <h2 className="rh-settings-card__title">الأعضاء ({members.length})</h2>
          <p className="rh-settings-card__subtitle">المستخدمون الذين انضموا فعلياً لهذه المجموعة.</p>
        </div>
        <div className="rh-admin-applications__filters" aria-label="فلترة الأعضاء">
          <button type="button" className={['rh-admin-applications__filter-btn', memberFilter === 'all' ? 'rh-admin-applications__filter-btn--active' : ''].join(' ')} onClick={() => setMemberFilter('all')}>
            الكل <span>{memberStats.total}</span>
          </button>
          <button type="button" className={['rh-admin-applications__filter-btn', memberFilter === 'male' ? 'rh-admin-applications__filter-btn--active' : ''].join(' ')} onClick={() => setMemberFilter('male')}>
            ذكور <span>{memberStats.male}</span>
          </button>
          <button type="button" className={['rh-admin-applications__filter-btn', memberFilter === 'female' ? 'rh-admin-applications__filter-btn--active' : ''].join(' ')} onClick={() => setMemberFilter('female')}>
            إناث <span>{memberStats.female}</span>
          </button>
          <button type="button" className={['rh-admin-applications__filter-btn', memberFilter === 'admins' ? 'rh-admin-applications__filter-btn--active' : ''].join(' ')} onClick={() => setMemberFilter('admins')}>
            مشرفون <span>{memberStats.admins}</span>
          </button>
        </div>
        <div className="rh-admin-applications__toolbar">
          <SearchField
            label="بحث بالأعضاء"
            placeholder="ابحث بالاسم أو البريد أو UID..."
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            className="rh-admin-applications__search"
          />
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="join-group-member-sort">الترتيب</label>
            <select id="join-group-member-sort" className="ui-input" value={memberSort} onChange={(e) => setMemberSort(e.target.value)}>
              <option value="joined_desc">الأحدث انضماماً</option>
              <option value="joined_asc">الأقدم انضماماً</option>
              <option value="name_asc">الاسم (أ-ي)</option>
              <option value="role_asc">الدور</option>
            </select>
          </div>
        </div>
        {membersLoading ? (
          <p>جاري تحميل الأعضاء…</p>
        ) : members.length === 0 ? (
          <p className="rh-admin-users__empty">لا يوجد أعضاء حتى الآن.</p>
        ) : filteredMembers.length === 0 ? (
          <p className="rh-admin-users__empty">لا يوجد أعضاء ضمن هذا الفلتر.</p>
        ) : (
          <ul className="rh-members-chat-list">
            {filteredMembers.map((m) => (
              <li key={m.userId} className="rh-members-chat__item">
                <div className="rh-members-chat__main">
                  <strong>{m.displayName || m.userId}</strong>
                  <span className="rh-members-chat__sub">{m.email || m.userId}</span>
                  <span className="rh-members-chat__sub">
                    الدور: {m.role || '—'} · الجنس: {m.gender || '—'}
                  </span>
                </div>
                <span className="rh-plans__saved-badge">
                  {m.joinedAt ? new Date(m.joinedAt).toLocaleString('ar-SA') : '—'}
                </span>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  loading={removingUserId === m.userId}
                  disabled={isProtectedRole(m.role) || Boolean(removingUserId && removingUserId !== m.userId)}
                  onClick={() => {
                    if (isProtectedRole(m.role)) {
                      toast.warning('لا يمكن حذف المالك/المشرف من هذه الصفحة.', 'تنبيه')
                      return
                    }
                    setPendingRemoveMember(m)
                  }}
                >
                  إزالة
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="rh-plans__actions">
          <HapticLink to="/app/admin/groups">عودة إلى القائمة</HapticLink>
          <Button type="button" variant="ghost" icon={RefreshCw} onClick={() => toast.success('تم تحديث البيانات.', 'تم')}>
            تحديث يدوي
          </Button>
        </div>
      </section>

      <Modal
        open={Boolean(pendingRemoveMember)}
        title="تأكيد إزالة العضو"
        onClose={() => setPendingRemoveMember(null)}
        size="sm"
      >
        <p className="rh-plans__warn rh-plans__warn--confirm">
          هل تريد إزالة العضو{' '}
          <strong>{pendingRemoveMember?.displayName || pendingRemoveMember?.userId || '—'}</strong>
          {' '}من هذه المجموعة؟
        </p>
        <div className="rh-plans__actions">
          <Button
            type="button"
            variant="danger"
            icon={UserMinus}
            loading={Boolean(removingUserId)}
            onClick={async () => {
              const target = pendingRemoveMember
              if (!target || !user?.uid) return
              setRemovingUserId(target.userId)
              try {
                await removeJoinGroupMember(user, group.id, target.userId, {
                  targetDisplayName: target.displayName || '',
                  targetEmail: target.email || '',
                })
                setMembers((prev) => prev.filter((x) => x.userId !== target.userId))
                setAuditRows((prev) => [
                  {
                    id: `local-${Date.now()}`,
                    type: 'member_removed',
                    targetUserId: target.userId,
                    targetDisplayName: target.displayName || '',
                    targetEmail: target.email || '',
                    actorUserId: user.uid,
                    actorDisplayName: user.displayName || '',
                    actorEmail: user.email || '',
                    at: new Date().toISOString(),
                  },
                  ...prev,
                ])
                setPendingRemoveMember(null)
                toast.success('تمت إزالة العضو من المجموعة.', 'تم')
              } catch {
                toast.warning('تعذّر إزالة العضو.', 'تنبيه')
              } finally {
                setRemovingUserId('')
              }
            }}
          >
            تأكيد الإزالة
          </Button>
          <Button type="button" variant="ghost" icon={X} disabled={Boolean(removingUserId)} onClick={() => setPendingRemoveMember(null)}>
            إلغاء
          </Button>
        </div>
      </Modal>

      <section className="card">
        <div className="rh-settings-card__head">
          <h2 className="rh-settings-card__title">سجل النشاط</h2>
          <p className="rh-settings-card__subtitle">عمليات الإدارة الأخيرة على أعضاء المجموعة.</p>
        </div>
        {auditLoading ? (
          <p>جاري تحميل السجل…</p>
        ) : auditRows.length === 0 ? (
          <p className="rh-admin-users__empty">لا توجد أحداث بعد.</p>
        ) : (
          <ul className="rh-members-chat-list">
            {auditRows.map((ev) => (
              <li key={ev.id} className="rh-members-chat__item">
                <div className="rh-members-chat__main">
                  <strong>{ev.type === 'member_removed' ? 'إزالة عضو من المجموعة' : 'حدث إداري'}</strong>
                  <span className="rh-members-chat__sub">
                    العضو: {ev.targetDisplayName || ev.targetUserId || '—'}
                    {ev.targetEmail ? ` · ${ev.targetEmail}` : ''}
                  </span>
                  <span className="rh-members-chat__sub">
                    بواسطة: {ev.actorDisplayName || ev.actorUserId || '—'}
                    {ev.actorEmail ? ` · ${ev.actorEmail}` : ''}
                  </span>
                </div>
                <span className="rh-plans__saved-badge">
                  {ev.at ? new Date(ev.at).toLocaleString('ar-SA') : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
