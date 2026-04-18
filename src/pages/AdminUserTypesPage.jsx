import { Shield, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSiteContent } from '../context/useSiteContent.js'
import { useAuth } from '../context/useAuth.js'
import { isAdmin } from '../config/roles.js'
import { PERMISSION_PAGES } from '../config/permissionRegistry.js'
import { firestoreApi } from '../services/firestoreApi.js'
import {
  deletePermissionProfile,
  savePermissionProfile,
  subscribePermissionProfiles,
} from '../services/permissionProfilesService.js'
import { CrossNav } from '../components/CrossNav.jsx'
import { Button, Modal, TextField, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

function emptyPagesMap() {
  return {}
}

export default function AdminUserTypesPage() {
  const { user } = useAuth()
  const { branding, str } = useSiteContent()
  const toast = useToast()
  const [list, setList] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [nameDraft, setNameDraft] = useState('')
  const [pagesDraft, setPagesDraft] = useState(emptyPagesMap)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busyDelete, setBusyDelete] = useState(false)

  useEffect(() => {
    document.title = `أنواع المستخدمين والصلاحيات — ${branding.siteTitle}`
  }, [branding.siteTitle])

  useEffect(() => {
    if (!isAdmin(user)) return undefined
    const unsub = subscribePermissionProfiles(setList, () => {
      toast.warning('تعذّر تحميل أنواع المستخدمين. تحقق من قواعد Firestore لمجموعة permission_profiles.', 'تنبيه')
    })
    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  const selected = useMemo(() => list.find((p) => p.id === selectedId) ?? null, [list, selectedId])

  useEffect(() => {
    if (!selected) {
      setNameDraft('')
      setPagesDraft(emptyPagesMap())
      return
    }
    setNameDraft(selected.name || '')
    setPagesDraft(
      selected.pages && typeof selected.pages === 'object'
        ? JSON.parse(JSON.stringify(selected.pages))
        : emptyPagesMap(),
    )
  }, [selected])

  const adminCrossItems = useMemo(
    () => [
      { to: '/app/admin', label: str('layout.nav_dashboard') },
      { to: '/app/admin/users', label: str('layout.nav_users') },
      { to: '/app', label: str('layout.nav_home') },
    ],
    [str],
  )

  const setPageAllowed = (pageId, allowed) => {
    setPagesDraft((prev) => {
      const next = { ...prev }
      if (!allowed) {
        delete next[pageId]
        return next
      }
      next[pageId] = { actions: { ...(next[pageId]?.actions || {}) } }
      return next
    })
  }

  const setAction = (pageId, actionId, value) => {
    setPagesDraft((prev) => {
      const cur = prev[pageId] || { actions: {} }
      const actions = { ...cur.actions, [actionId]: value }
      return { ...prev, [pageId]: { ...cur, actions } }
    })
  }

  const enableAllActions = (pageId) => {
    const pageDef = PERMISSION_PAGES.find((p) => p.id === pageId)
    if (!pageDef) return
    setPagesDraft((prev) => {
      const actions = {}
      for (const a of pageDef.actions) actions[a.id] = true
      return { ...prev, [pageId]: { actions } }
    })
  }

  const clearAllActions = (pageId) => {
    setPagesDraft((prev) => ({
      ...prev,
      [pageId]: { actions: {} },
    }))
  }

  const onCreate = () => {
    const id = firestoreApi.getNewId('permission_profiles')
    setSelectedId(id)
    setNameDraft('نوع جديد')
    setPagesDraft(emptyPagesMap())
  }

  const onSave = async () => {
    if (!user || !selectedId || !isAdmin(user)) return
    const n = nameDraft.trim()
    if (!n) {
      toast.warning('أدخل اسماً للنوع.', 'تنبيه')
      return
    }
    setSaving(true)
    try {
      await savePermissionProfile(user, selectedId, { name: n, pages: pagesDraft })
      toast.success('تم حفظ نوع المستخدم.', 'تم')
    } catch {
      toast.warning('تعذّر الحفظ. تحقق من الصلاحيات على permission_profiles.', 'تنبيه')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget || !user) return
    setBusyDelete(true)
    try {
      await deletePermissionProfile(user, deleteTarget.id)
      toast.info('تم حذف النوع. راجع المستخدمين المعيّنين له.', '')
      if (selectedId === deleteTarget.id) setSelectedId(null)
      setDeleteTarget(null)
    } catch {
      toast.warning('تعذّر الحذف.', 'تنبيه')
      setDeleteTarget(null)
    } finally {
      setBusyDelete(false)
    }
  }

  if (!isAdmin(user)) return null

  return (
    <div className="rh-admin-users rh-admin-user-types">
      <header className="rh-admin-users__hero card">
        <h1 className="rh-admin-users__title">أنواع المستخدمين والصلاحيات</h1>
        <p className="rh-admin-users__desc">
          أنشئ أنواعاً مثل «طالب» أو «معلم»، وحدد الصفحات الظاهرة في القائمة، ثم فعّل أزرار الإضافة والتعديل والحذف
          وغيرها لكل صفحة. المستخدمون بدون نوع مخصّص يحتفظون بصلاحيات كاملة كالسابق. يُخزَّن النوع في Firestore تحت{' '}
          <code className="rh-admin-users__code">permission_profiles</code> ويُربَط بالحقل{' '}
          <code className="rh-admin-users__code">permissionProfileId</code> في مستند المستخدم. تأكد من السماح بالقراءة
          والكتابة لهذه المجموعة لحسابات المشرف في قواعد الأمان.
        </p>
        <CrossNav items={adminCrossItems} className="rh-admin-users__cross" />
      </header>

      <div className="rh-admin-user-types__layout">
        <aside className="rh-admin-user-types__list card">
          <div className="rh-admin-user-types__list-head">
            <h2 className="rh-admin-user-types__h2">الأنواع</h2>
            <Button type="button" size="sm" variant="secondary" onClick={onCreate}>
              + نوع جديد
            </Button>
          </div>
          <ul className="rh-admin-user-types__ul">
            {list.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={[
                    'rh-admin-user-types__pick',
                    p.id === selectedId ? 'rh-admin-user-types__pick--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => setSelectedId(p.id)}
                >
                  {p.name || p.id}
                </button>
              </li>
            ))}
          </ul>
          {list.length === 0 && <p className="rh-admin-users__empty">لا توجد أنواع بعد. أنشئ أول نوع.</p>}
        </aside>

        <section className="rh-admin-user-types__editor card">
          {!selectedId ? (
            <p className="rh-admin-users__empty">اختر نوعاً من القائمة أو أنشئ نوعاً جديداً.</p>
          ) : (
            <>
              <div className="rh-admin-user-types__editor-head">
                <span className="rh-admin-user-types__shield" aria-hidden>
                  <RhIcon as={Shield} size={22} strokeWidth={RH_ICON_STROKE} />
                </span>
                <TextField label="اسم النوع" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
                <span className="rh-admin-user-types__id">
                  المعرّف: <code className="rh-admin-users__code">{selectedId}</code>
                </span>
              </div>

              <div className="rh-admin-user-types__actions-row">
                <Button type="button" variant="primary" onClick={onSave} loading={saving} disabled={saving}>
                  حفظ
                </Button>
                {selected && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="rh-admin-user-types__danger"
                    onClick={() => setDeleteTarget(selected)}
                  >
                    <RhIcon as={Trash2} size={18} strokeWidth={RH_ICON_STROKE} />
                    حذف النوع
                  </Button>
                )}
              </div>

              <div className="rh-admin-user-types__pages">
                {PERMISSION_PAGES.map((pg) => {
                  const allowed = Boolean(pagesDraft[pg.id])
                  return (
                    <details key={pg.id} className="rh-admin-user-types__page-block" open={allowed}>
                      <summary className="rh-admin-user-types__summary">
                        <label className="rh-admin-user-types__page-toggle">
                          <input
                            type="checkbox"
                            checked={allowed}
                            onChange={(e) => {
                              e.stopPropagation()
                              setPageAllowed(pg.id, e.target.checked)
                            }}
                          />
                          <span>{pg.label}</span>
                        </label>
                      </summary>
                      {allowed && (
                        <div className="rh-admin-user-types__actions-grid">
                          <div className="rh-admin-user-types__bulk">
                            <button type="button" className="rh-link-btn" onClick={() => enableAllActions(pg.id)}>
                              تفعيل كل الأزرار
                            </button>
                            <button type="button" className="rh-link-btn" onClick={() => clearAllActions(pg.id)}>
                              إلغاء الكل (مطلع فقط)
                            </button>
                          </div>
                          {pg.actions.length === 0 ? (
                            <p className="rh-admin-user-types__hint">هذه الصفحة للعرض فقط (لا أزرار مسجّلة).</p>
                          ) : (
                            <ul className="rh-admin-user-types__check-list">
                              {pg.actions.map((a) => (
                                <li key={a.id}>
                                  <label className="rh-admin-user-types__check">
                                    <input
                                      type="checkbox"
                                      checked={pagesDraft[pg.id]?.actions?.[a.id] === true}
                                      onChange={(e) => setAction(pg.id, a.id, e.target.checked)}
                                    />
                                    <span>{a.label}</span>
                                  </label>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </details>
                  )
                })}
              </div>
            </>
          )}
        </section>
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        title="حذف نوع المستخدم"
        onClose={() => !busyDelete && setDeleteTarget(null)}
        size="sm"
        closeOnBackdrop={!busyDelete}
        closeOnEsc={!busyDelete}
        showClose={!busyDelete}
      >
        <p className="rh-admin-users__warn">
          حذف «{deleteTarget?.name || deleteTarget?.id}» قد يترك مستخدمين بمعرّف نوع غير موجود. عدِل إسنادهم من صفحة
          المستخدمين.
        </p>
        <div className="rh-admin-users__modal-actions">
          <Button type="button" variant="danger" loading={busyDelete} onClick={confirmDelete}>
            حذف
          </Button>
          <Button type="button" variant="ghost" disabled={busyDelete} onClick={() => setDeleteTarget(null)}>
            إلغاء
          </Button>
        </div>
      </Modal>
    </div>
  )
}
