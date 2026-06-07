import { ArrowLeft, Pencil, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react'
import { HapticLink } from '../ui/HapticLink.jsx'
import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../context/useAuth.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { deletePlanType, savePlanType, seedDefaultPlanTypes, subscribePlanTypes } from '../services/siteConfigService.js'
import { CrossNav } from '../components/CrossNav.jsx'
import { AdminAdvancedPanel } from '../components/admin/AdminAdvancedPanel.jsx'
import { slugFromAdminLabel } from '../utils/adminSlug.js'
import { Button, Modal, NumberStepField, TextField, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

export default function AdminPlanTypesPage() {
  const { user } = useAuth()
  const { branding } = useSiteContent()
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [value, setValue] = useState('')
  const [label, setLabel] = useState('')
  const [hint, setHint] = useState('')
  const [order, setOrder] = useState(0)
  const [deleting, setDeleting] = useState(null)
  const [saveSubmitting, setSaveSubmitting] = useState(false)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [seedSubmitting, setSeedSubmitting] = useState(false)

  useEffect(() => {
    document.title = `أنواع الخطط — ${branding.siteTitle}`
  }, [branding.siteTitle])

  useEffect(() => {
    const unsub = subscribePlanTypes(setRows, () => {
      toast.warning('تعذّر تحميل أنواع الخطط. تحقق من الصلاحيات والاتصال.', 'تنبيه')
    })
    return () => unsub()
  }, [toast])

  const openAdd = () => {
    setEditingId(null)
    setValue('')
    setLabel('')
    setHint('')
    setOrder(rows.length ? Math.max(...rows.map((r) => r.order)) + 1 : 0)
    setEditorOpen(true)
  }

  const openEdit = (r) => {
    setEditingId(r.id)
    setValue(r.value)
    setLabel(r.label)
    setHint(r.hint)
    setOrder(r.order)
    setEditorOpen(true)
  }

  const handleSave = async () => {
    if (!user) return
    setSaveSubmitting(true)
    try {
      await savePlanType(user, {
        docId: editingId || undefined,
        value: editingId ? value : value.trim() || slugFromAdminLabel(label, 'plan'),
        label,
        hint,
        order,
      })
      toast.success(editingId ? 'تم تحديث النوع.' : 'تمت إضافة النوع.', 'تم')
      setEditorOpen(false)
    } catch (e) {
      if (e?.message === 'INVALID_PLAN_TYPE_VALUE') {
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
      await deletePlanType(user, deleting.id)
      toast.info('تم حذف النوع.', '')
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
      await seedDefaultPlanTypes(user)
      toast.success('تمت مزامنة الأنواع الثلاثة الافتراضية (حفظ، مراجعة، قراءة).', 'تم')
    } catch {
      toast.warning('تعذّر الحفظ. تحقق من الصلاحيات والاتصال.', 'تنبيه')
    } finally {
      setSeedSubmitting(false)
    }
  }

  const sorted = useMemo(() => [...rows].sort((a, b) => a.order - b.order || a.value.localeCompare(b.value)), [rows])

  const crossItems = [
    { to: '/app/admin', label: 'لوحة التحكم' },
    { to: '/app/plans', label: 'الخطط' },
    { to: '/app', label: 'الرئيسية' },
  ]

  return (
    <div className="rh-admin-plan-types">
      <header className="rh-admin-plan-types__hero card">
        <div className="rh-admin-plan-types__head-row">
          <HapticLink to="/app/admin" className="rh-admin-plan-types__back">
            <RhIcon as={ArrowLeft} size={18} strokeWidth={RH_ICON_STROKE} /> لوحة التحكم
          </HapticLink>
        </div>
        <h1 className="rh-admin-plan-types__title">أنواع الخطط</h1>
        <p className="rh-admin-plan-types__desc">
          تُعرض هذه الأنواع عند إنشاء خطة جديدة وفي شارة نوع الخطة. يُفضّل عدم تغيير الرمز الداخلي بعد
          استخدامه في خطط موجودة.
        </p>
        <div className="rh-admin-plan-types__toolbar">
          <Button type="button" variant="primary" icon={Plus} onClick={openAdd}>
            إضافة نوع
          </Button>
          <Button type="button" variant="secondary" icon={RefreshCw} loading={seedSubmitting} onClick={handleSeed}>
            مزامنة الأنواع الافتراضية الثلاثة
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
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={4} className="rh-admin-plan-types__empty">
                  لا توجد أنواع مخصّصة بعد — ستُستخدم الأنواع الافتراضية في الواجهة حتى تضيف أنواعاً أو تضغط
                  «مزامنة الأنواع الافتراضية».
                </td>
              </tr>
            ) : (
              sorted.map((r) => (
                <tr key={r.id}>
                  <td>{r.order}</td>
                  <td>{r.label}</td>
                  <td className="rh-admin-plan-types__hint">{r.hint || '—'}</td>
                  <td className="rh-admin-plan-types__actions">
                    <Button type="button" variant="secondary" size="sm" icon={Pencil} onClick={() => openEdit(r)}>
                      تعديل
                    </Button>
                    <Button type="button" variant="ghost" size="sm" icon={Trash2} onClick={() => setDeleting(r)}>
                      حذف
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={editorOpen}
        title={editingId ? 'تعديل نوع الخطة' : 'نوع خطة جديد'}
        onClose={() => !saveSubmitting && setEditorOpen(false)}
        size="sm"
        closeOnBackdrop={!saveSubmitting}
        closeOnEsc={!saveSubmitting}
        showClose={!saveSubmitting}
      >
        <TextField label="الاسم الظاهر للطلاب" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="مثال: خطة حفظ" />
        <TextField label="وصف قصير (اختياري)" value={hint} onChange={(e) => setHint(e.target.value)} placeholder="يظهر تحت الاسم عند اختيار النوع" />
        <NumberStepField label="ترتيب الظهور" value={order} onChange={setOrder} min={0} max={999} step={1} />
        <AdminAdvancedPanel>
          <TextField
            label="الرمز الداخلي"
            hint={editingId ? 'لا يُنصح بتغييره بعد إنشاء خطط بهذا النوع.' : 'يُولَّد تلقائياً من الاسم إن تُرك فارغاً.'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={Boolean(editingId)}
            dir="ltr"
          />
        </AdminAdvancedPanel>
        <div className="rh-admin-users__modal-actions">
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
        <p className="rh-admin-users__warn">سيتم حذف النوع «{deleting?.label}». الخطط القديمة قد تظهر بدون اسم نوع إن لم يُعاد ربطها.</p>
        <div className="rh-admin-users__modal-actions">
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
