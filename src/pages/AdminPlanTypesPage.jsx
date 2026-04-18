import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { deletePlanType, savePlanType, seedDefaultPlanTypes, subscribePlanTypes } from '../services/siteConfigService.js'
import { CrossNav } from '../components/CrossNav.jsx'
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
      toast.warning('تعذّر تحميل أنواع الخطط. تحقق من قواعد Firestore.', 'تنبيه')
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
        value,
        label,
        hint,
        order,
      })
      toast.success(editingId ? 'تم تحديث النوع.' : 'تمت إضافة النوع.', 'تم')
      setEditorOpen(false)
    } catch (e) {
      if (e?.message === 'INVALID_PLAN_TYPE_VALUE') {
        toast.warning('المعرّف الداخلي يجب أن يحتوي أحرفاً إنجليزية صغيرة وأرقاماً وشرطة سفلية فقط.', 'تنبيه')
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
      toast.warning('تعذّر الكتابة إلى Firestore.', 'تنبيه')
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
          <Link to="/app/admin" className="rh-admin-plan-types__back">
            <RhIcon as={ArrowLeft} size={18} strokeWidth={RH_ICON_STROKE} /> لوحة التحكم
          </Link>
        </div>
        <h1 className="rh-admin-plan-types__title">أنواع الخطط</h1>
        <p className="rh-admin-plan-types__desc">
          تُعرض هذه الأنواع في صفحة الخطط عند إنشاء خطة جديدة، وكشارة نوع الخطة في القائمة. المعرّف الداخلي (
          <code className="rh-admin-dashboard__code">value</code>) يُخزَّن مع كل خطة؛ يُفضّل عدم تغييره بعد الاستخدام.
        </p>
        <div className="rh-admin-plan-types__toolbar">
          <Button type="button" variant="primary" onClick={openAdd}>
            <RhIcon as={Plus} size={18} strokeWidth={RH_ICON_STROKE} />
            إضافة نوع
          </Button>
          <Button type="button" variant="secondary" loading={seedSubmitting} onClick={handleSeed}>
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
              <th>المعرّف</th>
              <th>العنوان</th>
              <th>الوصف المختصر</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="rh-admin-plan-types__empty">
                  لا توجد أنواع في Firestore بعد — ستُستخدم الأنواع الافتراضية في الواجهة حتى تضيف صفوفاً هنا أو تضغط
                  «مزامنة الأنواع الافتراضية».
                </td>
              </tr>
            ) : (
              sorted.map((r) => (
                <tr key={r.id}>
                  <td>{r.order}</td>
                  <td>
                    <code>{r.value}</code>
                  </td>
                  <td>{r.label}</td>
                  <td className="rh-admin-plan-types__hint">{r.hint || '—'}</td>
                  <td className="rh-admin-plan-types__actions">
                    <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(r)}>
                      <RhIcon as={Pencil} size={16} strokeWidth={RH_ICON_STROKE} />
                      تعديل
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setDeleting(r)}>
                      <RhIcon as={Trash2} size={16} strokeWidth={RH_ICON_STROKE} />
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
        <TextField
          label="المعرّف الداخلي (value)"
          hint="إنجليزي صغير، أرقام، _ فقط — يُفضّل عدم تغييره بعد الإنشاء."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={Boolean(editingId)}
        />
        <TextField label="العنوان المعروض" value={label} onChange={(e) => setLabel(e.target.value)} />
        <TextField label="وصف قصير (اختياري)" value={hint} onChange={(e) => setHint(e.target.value)} />
        <NumberStepField label="الترتيب" value={order} onChange={setOrder} min={0} max={999} step={1} />
        <div className="rh-admin-users__modal-actions">
          <Button type="button" variant="primary" loading={saveSubmitting} onClick={handleSave}>
            حفظ
          </Button>
          <Button type="button" variant="ghost" disabled={saveSubmitting} onClick={() => setEditorOpen(false)}>
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
        <p className="rh-admin-users__warn">سيتم حذف النوع «{deleting?.label}» ({deleting?.value}). الخطط القديمة قد تعرض المعرّف الخام إن لم يعد مسجّلاً.</p>
        <div className="rh-admin-users__modal-actions">
          <Button type="button" variant="danger" loading={deleteSubmitting} onClick={handleDelete}>
            حذف
          </Button>
          <Button type="button" variant="ghost" disabled={deleteSubmitting} onClick={() => setDeleting(null)}>
            إلغاء
          </Button>
        </div>
      </Modal>
    </div>
  )
}
