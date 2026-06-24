import { ArrowRight, Globe, MessageCircle, Pencil, Plus, Save, Send, Trash2, Users, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CrossNav } from '../components/CrossNav.jsx'
import { ImagePickPreview } from '../components/ImagePickPreview.jsx'
import { useAuth } from '../context/useAuth.js'
import { useSiteContent } from '../context/useSiteContent.js'
import {
  deleteJoinGroup,
  JOIN_GROUP_GENDER,
  JOIN_GROUP_PLATFORM,
  loadJoinGroupMemberCounts,
  loadJoinGroupMembersWithProfiles,
  saveJoinGroup,
  subscribeJoinGroups,
} from '../services/joinGroupsService.js'
import { joinGroupImageErrorMessage, uploadJoinGroupImage } from '../services/joinGroupMediaStorage.js'
import { formatArDateTime } from '../utils/formatDateTimeAr.js'
import { Button, Modal, ScrollArea, SearchField, TextAreaField, TextField, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

function platformLabel(v) {
  if (v === JOIN_GROUP_PLATFORM.WHATSAPP) return 'واتساب'
  if (v === JOIN_GROUP_PLATFORM.TELEGRAM) return 'تليجرام'
  if (v === JOIN_GROUP_PLATFORM.FACEBOOK) return 'فيسبوك'
  if (v === JOIN_GROUP_PLATFORM.DISCORD) return 'ديسكورد'
  return 'أخرى'
}

function genderLabel(v) {
  if (v === JOIN_GROUP_GENDER.MEN) return 'ذكور'
  if (v === JOIN_GROUP_GENDER.WOMEN) return 'إناث'
  return 'الكل'
}

function platformIcon(v) {
  if (v === JOIN_GROUP_PLATFORM.TELEGRAM) return Send
  if (v === JOIN_GROUP_PLATFORM.DISCORD) return Users
  if (v === JOIN_GROUP_PLATFORM.FACEBOOK) return Globe
  return MessageCircle
}

export default function AdminJoinGroupsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { str } = useSiteContent()
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [busy, setBusy] = useState(false)
  const [deletingRow, setDeletingRow] = useState(null)
  const [membersModal, setMembersModal] = useState(null)
  const [membersRows, setMembersRows] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [memberCounts, setMemberCounts] = useState({})

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [platform, setPlatform] = useState(JOIN_GROUP_PLATFORM.WHATSAPP)
  const [genderType, setGenderType] = useState(JOIN_GROUP_GENDER.ALL)
  const [joinUrl, setJoinUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [maxAppearances, setMaxAppearances] = useState(1)
  const [visibleOnHome, setVisibleOnHome] = useState(true)

  useEffect(() => {
    const unsub = subscribeJoinGroups(
      (list) => setRows(Array.isArray(list) ? list : []),
      () => setRows([]),
    )
    return () => unsub()
  }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((r) => `${r.name} ${r.description} ${r.joinUrl}`.toLowerCase().includes(s))
  }, [rows, q])
  const stats = useMemo(() => {
    const total = rows.length
    const visible = rows.filter((r) => r.visibleOnHome !== false).length
    const hidden = total - visible
    const totalMembers = Object.values(memberCounts).reduce((acc, v) => acc + Number(v || 0), 0)
    return { total, visible, hidden, totalMembers }
  }, [rows, memberCounts])

  useEffect(() => {
    if (rows.length === 0) {
      setMemberCounts({})
      return
    }
    let cancelled = false
    const ids = rows.map((r) => r.id)
    loadJoinGroupMemberCounts(ids)
      .then((map) => {
        if (!cancelled) setMemberCounts(map)
      })
      .catch(() => {
        if (!cancelled) setMemberCounts({})
      })
    return () => {
      cancelled = true
    }
  }, [rows])

  const crossItems = [
    { to: '/app/admin', label: str('layout.nav_admin') },
    { to: '/app/admin/users', label: 'المستخدمون' },
    { to: '/app', label: 'الرئيسية' },
  ]

  const resetEditor = () => {
    setEditingRow(null)
    setName('')
    setDescription('')
    setPlatform(JOIN_GROUP_PLATFORM.WHATSAPP)
    setGenderType(JOIN_GROUP_GENDER.ALL)
    setJoinUrl('')
    setImageUrl('')
    setImageFile(null)
    setMaxAppearances(1)
    setVisibleOnHome(true)
  }

  const openEdit = (row) => {
    setEditingRow(row)
    setName(row.name || '')
    setDescription(row.description || '')
    setPlatform(row.platform || JOIN_GROUP_PLATFORM.WHATSAPP)
    setGenderType(row.genderType || JOIN_GROUP_GENDER.ALL)
    setJoinUrl(row.joinUrl || '')
    setImageUrl(row.imageUrl || '')
    setImageFile(null)
    setMaxAppearances(Math.max(1, Number(row.maxAppearances || 1)))
    setVisibleOnHome(row.visibleOnHome !== false)
    setEditorOpen(true)
  }

  const openAdd = () => {
    resetEditor()
    setEditorOpen(true)
  }

  const onSave = async () => {
    if (!user?.uid) return
    if (!name.trim()) {
      toast.warning('اسم المجموعة مطلوب.', 'تنبيه')
      return
    }
    if (!joinUrl.trim()) {
      toast.warning('رابط المجموعة مطلوب.', 'تنبيه')
      return
    }
    setBusy(true)
    try {
      let finalImageUrl = imageUrl.trim()
      if (imageFile) {
        finalImageUrl = await uploadJoinGroupImage(user.uid, imageFile)
      }
      await saveJoinGroup(user, {
        id: editingRow?.id || '',
        name: name.trim(),
        description: description.trim(),
        platform,
        genderType,
        joinUrl: joinUrl.trim(),
        imageUrl: finalImageUrl,
        maxAppearances: Math.max(1, Number(maxAppearances || 1)),
        visibleOnHome,
      })
      toast.success(editingRow ? 'تم تحديث المجموعة.' : 'تم إنشاء المجموعة.', 'تم')
      setEditorOpen(false)
      resetEditor()
    } catch (err) {
      toast.warning(imageFile ? joinGroupImageErrorMessage(err) : 'تعذّر حفظ المجموعة.', 'تنبيه')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rh-admin-users rh-admin-users--join-groups">
      <header className="rh-admin-users__hero card">
        <h1 className="rh-admin-users__title">إدارة المجموعات</h1>
        <p className="rh-admin-users__desc">
          إدارة مجموعات الانضمام الخارجية (واتساب/تليجرام/غيرها)، مع النوع (ذكور/إناث/الكل)، الإظهار في الرئيسية،
          واستعراض الأعضاء المنضمين.
        </p>
      </header>

      <CrossNav items={crossItems} className="rh-admin-users__cross" />

      <section className="rh-admin-applications__filters" aria-label="إحصائيات المجموعات">
        <button type="button" className="rh-admin-applications__filter-btn" disabled>
          كل المجموعات <span>{stats.total}</span>
        </button>
        <button type="button" className="rh-admin-applications__filter-btn" disabled>
          ظاهرة في الرئيسية <span>{stats.visible}</span>
        </button>
        <button type="button" className="rh-admin-applications__filter-btn" disabled>
          مخفية من الرئيسية <span>{stats.hidden}</span>
        </button>
        <button type="button" className="rh-admin-applications__filter-btn" disabled>
          إجمالي الأعضاء <span>{stats.totalMembers}</span>
        </button>
      </section>

      <section className="card rh-admin-users__toolbar">
        <div className="rh-admin-applications__toolbar">
          <SearchField
            label="بحث"
            placeholder="ابحث بالاسم أو الوصف أو الرابط..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="rh-admin-applications__search"
          />
          <Button type="button" variant="primary" icon={Plus} onClick={openAdd}>
            إضافة مجموعة
          </Button>
        </div>
      </section>

      <ul className="rh-admin-users__grid">
        {filtered.map((r) => {
          const Icon = platformIcon(r.platform)
          return (
            <li key={r.id} className="card rh-admin-users__card">
              <div className="rh-admin-users__card-top">
                <span className={['rh-admin-users__avatar', `rh-join-platform-badge--${r.platform || 'other'}`].join(' ')} aria-hidden>
                  {r.imageUrl ? <img src={r.imageUrl} alt="" width={48} height={48} /> : <RhIcon as={Icon} size={22} strokeWidth={RH_ICON_STROKE} />}
                </span>
                <div className="rh-admin-users__card-head">
                  <strong className="rh-admin-users__name">{r.name || 'مجموعة بدون اسم'}</strong>
                  <span className="rh-admin-users__email">{platformLabel(r.platform)} · {genderLabel(r.genderType)}</span>
                  <span className="rh-plans__saved-badge">{r.visibleOnHome ? 'ظاهرة بالرئيسية' : 'مخفية من الرئيسية'}</span>
                </div>
              </div>
              {r.description ? <p className="rh-plans__saved-desc">{r.description}</p> : null}
              <p className="rh-plans__saved-meta">
                رابط: <a href={r.joinUrl} target="_blank" rel="noreferrer">{r.joinUrl}</a>
              </p>
              <p className="rh-plans__saved-meta">عدد مرات الظهور لكل طالب: {Math.max(1, Number(r.maxAppearances || 1))}</p>
              <p className="rh-plans__saved-meta">عدد الأعضاء: {memberCounts[r.id] || 0}</p>
              <div className="rh-admin-users__row--actions">
                <Button type="button" size="sm" variant="secondary" icon={ArrowRight} onClick={() => navigate(`/app/admin/groups/${encodeURIComponent(r.id)}`)}>
                  التفاصيل
                </Button>
                <Button type="button" size="sm" variant="secondary" icon={Users} onClick={async () => {
                  setMembersModal(r)
                  setMembersLoading(true)
                  try {
                    const members = await loadJoinGroupMembersWithProfiles(r.id)
                    setMembersRows(members)
                  } finally {
                    setMembersLoading(false)
                  }
                }}>
                  الأعضاء
                </Button>
                <Button type="button" size="sm" variant="ghost" icon={Pencil} onClick={() => openEdit(r)}>
                  تعديل
                </Button>
                <Button type="button" size="sm" variant="danger" icon={Trash2} onClick={() => setDeletingRow(r)}>
                  حذف
                </Button>
              </div>
            </li>
          )
        })}
      </ul>

      {filtered.length === 0 && <section className="card"><p className="rh-admin-users__empty">لا توجد مجموعات حالياً.</p></section>}

      <Modal
        open={editorOpen}
        title={editingRow ? 'تعديل المجموعة' : 'إضافة مجموعة'}
        onClose={() => !busy && setEditorOpen(false)}
        size="lg"
        closeOnBackdrop={!busy}
        closeOnEsc={!busy}
        showClose={!busy}
      >
        <ScrollArea className="rh-plans__editor-scroll" padded>
          <TextField label="اسم المجموعة" value={name} onChange={(e) => setName(e.target.value)} required />
          <TextAreaField label="وصف مختصر" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          <div className="rh-plans__dates-grid">
            <div className="ui-field">
              <label className="ui-field__label" htmlFor="join-group-platform">نوع المجموعة</label>
              <select id="join-group-platform" className="ui-input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                <option value={JOIN_GROUP_PLATFORM.WHATSAPP}>واتساب</option>
                <option value={JOIN_GROUP_PLATFORM.TELEGRAM}>تليجرام</option>
                <option value={JOIN_GROUP_PLATFORM.FACEBOOK}>فيسبوك</option>
                <option value={JOIN_GROUP_PLATFORM.DISCORD}>ديسكورد</option>
                <option value={JOIN_GROUP_PLATFORM.OTHER}>أخرى</option>
              </select>
            </div>
            <div className="ui-field">
              <label className="ui-field__label" htmlFor="join-group-gender">نوع المستهدف</label>
              <select id="join-group-gender" className="ui-input" value={genderType} onChange={(e) => setGenderType(e.target.value)}>
                <option value={JOIN_GROUP_GENDER.MEN}>ذكور</option>
                <option value={JOIN_GROUP_GENDER.WOMEN}>إناث</option>
                <option value={JOIN_GROUP_GENDER.ALL}>الكل</option>
              </select>
            </div>
          </div>
          <TextField label="رابط الانضمام" value={joinUrl} onChange={(e) => setJoinUrl(e.target.value)} placeholder="https://..." required />
          <TextField label="رابط الصورة (اختياري)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://.../image.jpg" />
          <ImagePickPreview
            label="صورة الغلاف من الجهاز (اختياري)"
            hint="تظهر معاينة للرابط أو للملف المختار. اضغط على الصورة لاستبدالها، و× لإزالة المعاينة والرابط معاً. عند الحفظ يُرفع الملف إن وُجد."
            accept="image/*"
            remoteUrl={imageUrl}
            file={imageFile}
            onFileChange={setImageFile}
            onClearRemote={() => {
              setImageUrl('')
            }}
            disabled={busy}
            busy={busy}
          />
          <div className="rh-plans__dates-grid">
            <TextField
              label="عدد مرات الظهور/الانضمام"
              type="number"
              value={String(maxAppearances)}
              onChange={(e) => setMaxAppearances(Math.max(1, Number(e.target.value || 1)))}
            />
            <div className="ui-field">
              <label className="ui-field__label" htmlFor="join-group-visible">الظهور في الرئيسية</label>
              <select id="join-group-visible" className="ui-input" value={visibleOnHome ? 'yes' : 'no'} onChange={(e) => setVisibleOnHome(e.target.value === 'yes')}>
                <option value="yes">تظهر للطلاب</option>
                <option value="no">مخفية</option>
              </select>
            </div>
          </div>
        </ScrollArea>
        <div className="rh-modal-footer rh-plans__actions">
          <Button type="button" variant="primary" icon={Save} loading={busy} onClick={onSave}>حفظ</Button>
          <Button type="button" variant="ghost" icon={X} disabled={busy} onClick={() => setEditorOpen(false)}>إلغاء</Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(deletingRow)}
        title="حذف المجموعة"
        onClose={() => setDeletingRow(null)}
        size="sm"
      >
        <p className="rh-plans__warn rh-plans__warn--confirm">هل تريد حذف هذه المجموعة نهائياً؟</p>
        <div className="rh-modal-footer rh-plans__actions">
          <Button type="button" variant="danger" icon={Trash2} onClick={async () => {
            if (!deletingRow || !user?.uid) return
            setBusy(true)
            try {
              await deleteJoinGroup(user, deletingRow.id)
              toast.success('تم حذف المجموعة.', 'تم')
              setDeletingRow(null)
            } catch {
              toast.warning('تعذّر حذف المجموعة.', 'تنبيه')
            } finally {
              setBusy(false)
            }
          }}>حذف</Button>
          <Button type="button" variant="ghost" icon={X} onClick={() => setDeletingRow(null)}>إلغاء</Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(membersModal)}
        title={membersModal ? `الأعضاء: ${membersModal.name}` : ''}
        onClose={() => {
          setMembersModal(null)
          setMembersRows([])
        }}
        size="lg"
      >
        {membersLoading ? (
          <p>جاري التحميل…</p>
        ) : membersRows.length === 0 ? (
          <p className="rh-admin-users__empty">لا يوجد أعضاء بعد.</p>
        ) : (
          <ul className="rh-members-chat-list">
            {membersRows.map((m) => (
              <li key={m.userId} className="rh-members-chat__item">
                <div className="rh-members-chat__main">
                  <strong>{m.displayName || m.userId}</strong>
                  <span className="rh-members-chat__sub">{m.email || m.userId}</span>
                  <span className="rh-members-chat__sub">
                    الدور: {m.role || '—'} · الجنس: {m.gender === 'female' ? 'أنثى' : m.gender === 'male' ? 'ذكر' : '—'}
                  </span>
                </div>
                <span className="rh-plans__saved-badge">
                  {m.joinedAt ? formatArDateTime(m.joinedAt) : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  )
}
