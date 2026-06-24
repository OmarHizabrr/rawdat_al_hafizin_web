import { ArrowLeft, Pencil, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react'
import { HapticLink } from '../ui/HapticLink.jsx'
import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../context/useAuth.js'
import { useSiteContent } from '../context/useSiteContent.js'
import {
  deleteTaskCategorySmart,
  resolveTaskCategoriesForAdmin,
  saveTaskCategory,
  seedDefaultTaskCategories,
  subscribeTaskCategories,
} from '../services/siteConfigService.js'
import { CrossNav } from '../components/CrossNav.jsx'
import { AdminAdvancedPanel } from '../components/admin/AdminAdvancedPanel.jsx'
import { slugFromAdminLabel } from '../utils/adminSlug.js'
import { Button, Modal, NumberStepField, TextField, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

export default function AdminTaskCategoriesPage() {
  const { user } = useAuth()
  const { branding, str } = useSiteContent()
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [value, setValue] = useState('')
  const [label, setLabel] = useState('')
  const [hint, setHint] = useState('')
  const [order, setOrder] = useState(0)
  const [enabled, setEnabled] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [saveSubmitting, setSaveSubmitting] = useState(false)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [seedSubmitting, setSeedSubmitting] = useState(false)

  useEffect(() => {
    document.title = `أقسام الواجبات — ${branding.siteTitle}`
  }, [branding.siteTitle])

  useEffect(() => {
    const unsub = subscribeTaskCategories(setRows, () => {
      toast.warning('تعذّر تحميل أقسام الواجبات. تحقق من الصلاحيات والاتصال.', 'تنبيه')
    })
    return () => unsub()
  }, [toast])

  const openAdd = () => {
    const merged = resolveTaskCategoriesForAdmin(rows)
    setEditingId(null)
    setValue('')
    setLabel('')
    setHint('')
    setOrder(merged.length ? Math.max(...merged.map((r) => r.order)) + 1 : 0)
    setEnabled(true)
    setEditorOpen(true)
  }

  const openEdit = (r) => {
    setEditingId(r.id)
    setValue(r.value)
    setLabel(r.label)
    setHint(r.hint)
    setOrder(r.order)
    setEnabled(r.enabled !== false)
    setEditorOpen(true)
  }

  const handleSave = async () => {
    if (!user) return
    setSaveSubmitting(true)
    try {
      await saveTaskCategory(user, {
        docId: editingId || undefined,
        value: editingId ? value : value.trim() || slugFromAdminLabel(label, 'task'),
        label,
        hint,
        order,
        enabled,
      })
      toast.success(editingId ? 'تم تحديث القسم.' : 'تمت إضافة القسم.', 'تم')
      setEditorOpen(false)
    } catch (e) {
      if (e?.message === 'INVALID_TASK_CATEGORY_VALUE') {
        toast.warning('الرمز الداخلي يجب أن يحتوي حروفاً إنجليزية وأرقاماً وشرطة سفلية فقط.', 'تنبيه')
      } else {
        toast.warning('تعذّر الحفظ. تحقق من الصلاحيات.', 'تنبيه')
      }
    } finally {
      setSaveSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!user || !deleting) return
    setDeleteSubmitting(true)
    try {
      await deleteTaskCategorySmart(user, deleting)
      toast.info(deleting.isDefault ? 'تم إخفاء القسم عن الطلاب.' : 'تم حذف القسم.', '')
      setDeleting(null)
    } catch {
      toast.warning('تعذّر الحذف.', 'تنبيه')
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const handleSeed = async () => {
    if (!user) return
    setSeedSubmitting(true)
    try {
      await seedDefaultTaskCategories(user)
      toast.success('تمت مزامنة الأقسام الافتراضية (سماع، حفظ، تكرار، ربط).', 'تم')
    } catch {
      toast.warning('تعذّر الحفظ. تحقق من الصلاحيات والاتصال.', 'تنبيه')
    } finally {
      setSeedSubmitting(false)
    }
  }

  const sorted = useMemo(
    () => resolveTaskCategoriesForAdmin(rows),
    [rows],
  )

  const crossItems = [
    { to: '/app/admin', label: str('layout.nav_admin') },
    { to: '/app/tasks', label: str('layout.nav_tasks') },
    { to: '/app', label: 'الرئيسية' },
  ]

  return (
    <div className="rh-admin-plan-types">
      <header className="rh-admin-plan-types__hero card">
        <div className="rh-admin-plan-types__head-row">
          <HapticLink to="/app/admin" className="rh-admin-plan-types__back">
            <RhIcon as={ArrowLeft} size={18} strokeWidth={RH_ICON_STROKE} /> {str('layout.nav_admin')}
          </HapticLink>
        </div>
        <h1 className="rh-admin-plan-types__title">أقسام الواجبات</h1>
        <p className="rh-admin-plan-types__desc">
          تظهر هذه الأقسام في صفحة الواجبات للطلاب. الأقسام الافتراضية (سماع، حفظ، تكرار، ربط) قابلة للتعديل والحذف
          مباشرة — عند حذف قسم افتراضي يُخفى عن الطلاب ويمكن إعادة إظهاره من التعديل.
        </p>
        <div className="rh-admin-plan-types__toolbar">
          <Button type="button" variant="primary" icon={Plus} onClick={openAdd}>
            إضافة قسم
          </Button>
          <Button type="button" variant="secondary" icon={RefreshCw} loading={seedSubmitting} onClick={handleSeed}>
            مزامنة الأقسام الافتراضية
          </Button>
        </div>
      </header>

      <CrossNav items={crossItems} className="rh-admin-dashboard__cross" />

      <div className="rh-admin-plan-types__table-wrap card">
        <table className="rh-admin-plan-types__table">
          <thead>
            <tr>
              <th>الترتيب</th>
              <th>الاسم الظاهر</th>
              <th>الوصف المختصر</th>
              <th>الظهور</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id}>
                <td>{r.order}</td>
                <td>
                  {r.label}
                  {r.isDefault ? (
                    <span className="rh-task-chip" style={{ marginInlineStart: '0.35rem' }}>
                      افتراضي
                    </span>
                  ) : null}
                </td>
                <td className="rh-admin-plan-types__hint">{r.hint || '—'}</td>
                <td>{r.enabled !== false ? 'ظاهر' : 'مخفي'}</td>
                <td className="rh-admin-plan-types__actions">
                  <Button type="button" variant="secondary" size="sm" icon={Pencil} onClick={() => openEdit(r)}>
                    تعديل
                  </Button>
                  <Button type="button" variant="ghost" size="sm" icon={Trash2} onClick={() => setDeleting(r)}>
                    حذف
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={editorOpen}
        title={editingId ? 'تعديل قسم الواجب' : 'قسم واجب جديد'}
        onClose={() => !saveSubmitting && setEditorOpen(false)}
        size="sm"
        contentClassName="ui-modal__content--plan-members"
        closeOnBackdrop={!saveSubmitting}
        closeOnEsc={!saveSubmitting}
        showClose={!saveSubmitting}
      >
        <div className="ui-modal__body">
        <TextField label="الاسم الظاهر للطلاب" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="مثال: سماع" />
        <TextField label="وصف قصير (اختياري)" value={hint} onChange={(e) => setHint(e.target.value)} placeholder="يظهر تحت الاسم في صفحة الواجبات" />
        <NumberStepField label="ترتيب الظهور" value={order} onChange={setOrder} min={0} max={999} step={1} />
        <label className="ui-field" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <span>ظاهر للطلاب</span>
        </label>
        <AdminAdvancedPanel>
          <TextField
            label="الرمز الداخلي"
            hint={editingId ? 'لا يُنصح بتغييره بعد تسجيلات طلاب بهذا القسم.' : 'يُولَّد تلقائياً من الاسم إن تُرك فارغاً.'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={Boolean(editingId)}
            dir="ltr"
          />
        </AdminAdvancedPanel>
        </div>
        <div className="rh-modal-footer rh-admin-users__modal-actions">
          <Button type="button" variant="primary" icon={Save} loading={saveSubmitting} onClick={handleSave}>
            حفظ
          </Button>
          <Button type="button" variant="ghost" icon={X} disabled={saveSubmitting} onClick={() => setEditorOpen(false)}>
            إلغاء
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleting)}
        title="تأكيد الحذف"
        onClose={() => !deleteSubmitting && setDeleting(null)}
        size="sm"
        closeOnBackdrop={!deleteSubmitting}
        closeOnEsc={!deleteSubmitting}
        showClose={!deleteSubmitting}
      >
        <p className="rh-admin-users__warn">
          {deleting?.isDefault
            ? `سيتم إخفاء القسم «${deleting?.label}» عن الطلاب. يمكنك إعادة إظهاره لاحقاً من التعديل وتفعيل «ظاهر للطلاب».`
            : `سيتم حذف القسم «${deleting?.label}». التسجيلات السابقة قد تبقى في التقارير دون اسم قسم واضح.`}
        </p>
        <div className="rh-modal-footer rh-admin-users__modal-actions">
          <Button type="button" variant="danger" icon={Trash2} loading={deleteSubmitting} onClick={handleDelete}>
            حذف
          </Button>
          <Button type="button" variant="ghost" icon={X} disabled={deleteSubmitting} onClick={() => setDeleting(null)}>
            إلغاء
          </Button>
        </div>
      </Modal>
    </div>
  )
}
