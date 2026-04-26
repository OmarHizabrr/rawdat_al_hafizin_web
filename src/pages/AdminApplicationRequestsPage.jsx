import { CheckCircle2, Download, Trash2, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CrossNav } from '../components/CrossNav.jsx'
import { useAuth } from '../context/useAuth.js'
import { useSiteContent } from '../context/useSiteContent.js'
import {
  deleteProfileRequest,
  PROFILE_REQUEST_STATUS,
  reviewProfileRequest,
  subscribeAllProfileRequests,
} from '../services/profileRequestService.js'
import { downloadProfileRequestsCsv } from '../utils/downloadProfileRequestsCsv.js'
import { Button, Modal, SearchField, TextField, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

export default function AdminApplicationRequestsPage() {
  const { user } = useAuth()
  const { branding } = useSiteContent()
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [busyId, setBusyId] = useState('')
  const [rejectingRow, setRejectingRow] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    document.title = `طلبات الالتحاق — ${branding.siteTitle}`
  }, [branding.siteTitle])

  useEffect(() => {
    const unsub = subscribeAllProfileRequests(
      (list) => setRows(Array.isArray(list) ? list : []),
      () => setRows([]),
    )
    return () => unsub()
  }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((r) => {
      const hay =
        `${r.fullName} ${r.email} ${r.phone} ${r.nationality} ${r.city} ${r.occupation} ${r.userId}`.toLowerCase()
      return hay.includes(s)
    })
  }, [rows, q])

  const onApprove = async (row) => {
    if (!user?.uid || !row?.userId) return
    setBusyId(row.userId)
    try {
      await reviewProfileRequest(user, row.userId, PROFILE_REQUEST_STATUS.APPROVED, '')
      toast.success('تم قبول الطلب.', 'تم')
    } catch {
      toast.warning('تعذّر تحديث حالة الطلب.', 'تنبيه')
    } finally {
      setBusyId('')
    }
  }

  const onSaveCsv = () => {
    const res = downloadProfileRequestsCsv(filtered)
    if (!res.ok && res.reason === 'empty') {
      toast.info('لا توجد طلبات في القائمة الحالية للتصدير.', 'تنبيه')
      return
    }
    if (res.ok) {
      toast.success('تم تنزيل ملف الطلبات (CSV) إلى جهازك.', 'تم')
    }
  }

  const onConfirmDelete = async () => {
    if (!user?.uid || !deleteTarget?.userId) return
    setBusyId(deleteTarget.userId)
    try {
      await deleteProfileRequest(user, deleteTarget.userId)
      toast.success('تم حذف سجل طلب الالتحاق نهائياً.', 'تم')
      setDeleteTarget(null)
    } catch {
      toast.warning('تعذّر حذف الطلب. تحقق من صلاحياتك أو قواعد Firestore.', 'تنبيه')
    } finally {
      setBusyId('')
    }
  }

  const onReject = async () => {
    if (!user?.uid || !rejectingRow?.userId) return
    setBusyId(rejectingRow.userId)
    try {
      await reviewProfileRequest(
        user,
        rejectingRow.userId,
        PROFILE_REQUEST_STATUS.REJECTED,
        rejectReason.trim(),
      )
      toast.info('تم تحديث الطلب إلى مرفوض حالياً.', '')
      setRejectingRow(null)
      setRejectReason('')
    } catch {
      toast.warning('تعذّر تحديث الحالة.', 'تنبيه')
    } finally {
      setBusyId('')
    }
  }

  const crossItems = [
    { to: '/app/admin', label: 'لوحة التحكم' },
    { to: '/app/admin/users', label: 'المستخدمون' },
    { to: '/app', label: 'الرئيسية' },
  ]

  return (
    <div className="rh-admin-users">
      <header className="rh-admin-users__hero card">
        <h1 className="rh-admin-users__title">طلبات الالتحاق</h1>
        <p className="rh-admin-users__desc">
          جميع الطلبات الواردة من الطلاب تظهر هنا مع بياناتهم كاملة وصورة الحساب. يمكن القبول أو الرفض في أي وقت،
          كما يمكنك حفظ نسخة من الطلبات الظاهرة (بعد تطبيق البحث) كملف جدول يفتح في Excel، أو حذف سجل طلب
          نهائياً عند الحاجة.
        </p>
      </header>

      <CrossNav items={crossItems} className="rh-admin-users__cross" />

      <section className="card rh-admin-users__toolbar">
        <div className="rh-admin-applications__toolbar">
          <SearchField
            label="بحث"
            placeholder="ابحث بالاسم أو البريد أو الهاتف أو الجنسية أو الوظيفة..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="rh-admin-applications__search"
          />
          <div className="rh-admin-applications__save">
            <Button
              type="button"
              variant="secondary"
              onClick={onSaveCsv}
              disabled={filtered.length === 0}
              title="يصدّر الطلبات الظاهرة في القائمة حالياً (إن وُجد بحث، يُصدَّر المطابقة فقط)"
            >
              <RhIcon as={Download} size={18} strokeWidth={RH_ICON_STROKE} />
              حفظ الطلبات (Excel / CSV)
            </Button>
            <p className="rh-admin-applications__save-hint">
              {q.trim() ? 'سيتم تصدير النتائج المطابقة للبحث فقط.' : 'سيتم تصدير جميع الطلبات.'}
            </p>
          </div>
        </div>
      </section>

      <ul className="rh-admin-users__grid">
        {filtered.map((r) => (
          <li key={r.userId} className="card rh-admin-users__card">
            <div className="rh-admin-users__card-top">
              <span className="rh-admin-users__avatar" aria-hidden={!r.photoURL}>
                {r.photoURL ? <img src={r.photoURL} alt="" width={48} height={48} /> : (r.fullName || 'ط').charAt(0)}
              </span>
              <div className="rh-admin-users__card-head">
                <strong className="rh-admin-users__name">{r.fullName || 'بدون اسم'}</strong>
                <span className="rh-admin-users__email">{r.email || '—'}</span>
                <span className="rh-plans__saved-badge">
                  {r.status === PROFILE_REQUEST_STATUS.APPROVED
                    ? 'مقبول'
                    : r.status === PROFILE_REQUEST_STATUS.REJECTED
                      ? 'مرفوض حالياً'
                      : 'قيد المراجعة'}
                </span>
              </div>
            </div>

            <div className="rh-admin-users__row">
              <span><strong>رقم الهاتف:</strong> {r.phone || '—'}</span>
              <span><strong>الجنسية:</strong> {r.nationality || '—'}</span>
              <span><strong>الإقامة الدائمة:</strong> {r.permanentResidence || '—'}</span>
              <span><strong>المدينة/المحافظة:</strong> {r.city || '—'}</span>
              <span><strong>العمر:</strong> {r.age || '—'}</span>
              <span><strong>الجنس:</strong> {r.gender === 'female' ? 'أنثى' : 'ذكر'}</span>
              <span><strong>المستوى التعليمي:</strong> {r.educationLevel || '—'}</span>
              <span><strong>الوظيفة:</strong> {r.occupation || '—'}</span>
              <span><strong>الحفظ:</strong> {r.quranMemorizedJuz || 0} / 30 جزء</span>
            </div>

            <div className="rh-admin-users__row--actions">
              <Button
                type="button"
                size="sm"
                variant="primary"
                loading={busyId === r.userId}
                onClick={() => onApprove(r)}
              >
                <RhIcon as={CheckCircle2} size={16} strokeWidth={RH_ICON_STROKE} />
                قبول
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busyId === r.userId}
                onClick={() => {
                  setRejectingRow(r)
                  setRejectReason(r.statusMessage || '')
                }}
              >
                <RhIcon as={XCircle} size={16} strokeWidth={RH_ICON_STROKE} />
                رفض
              </Button>
              <Button
                type="button"
                size="sm"
                variant="danger"
                disabled={busyId === r.userId}
                onClick={() => setDeleteTarget(r)}
                title="حذف سجل طلب الالتحاق من قاعدة البيانات"
              >
                <RhIcon as={Trash2} size={16} strokeWidth={RH_ICON_STROKE} />
                حذف الطلب
              </Button>
              <Link to={`/app/plans?uid=${encodeURIComponent(r.userId)}`} className="ui-btn ui-btn--secondary ui-btn--sm">
                فتح خطط المستخدم
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <section className="card">
          <p className="rh-admin-users__empty">لا توجد طلبات مطابقة حالياً.</p>
        </section>
      ) : null}

      <Modal
        open={Boolean(deleteTarget)}
        title="حذف طلب الالتحاق"
        onClose={() => !busyId && setDeleteTarget(null)}
        size="sm"
        closeOnBackdrop={!busyId}
        closeOnEsc={!busyId}
        showClose={!busyId}
      >
        <p className="rh-settings-footnote" style={{ marginTop: 0 }}>
          سيتم <strong>حذف</strong> سجل الطلب فقط من «طلب الالتحاق» المخزن للمستخدم. يمكنه إعادة إرسال طلب جديد لاحقاً. لا
          يُلغي هذا حسابه في المنصة.
        </p>
        {deleteTarget ? (
          <p className="rh-plans__saved-meta" style={{ marginBottom: '0.5rem' }}>
            الطالب: {deleteTarget.fullName || '—'} — {deleteTarget.email || deleteTarget.userId}
          </p>
        ) : null}
        <div className="rh-admin-users__modal-actions">
          <Button
            type="button"
            variant="danger"
            onClick={onConfirmDelete}
            loading={busyId === deleteTarget?.userId}
            disabled={Boolean(busyId && busyId !== deleteTarget?.userId)}
          >
            نعم، حذف نهائياً
          </Button>
          <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)} disabled={Boolean(busyId)}>
            إلغاء
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(rejectingRow)}
        title="رفض الطلب حالياً"
        onClose={() => setRejectingRow(null)}
        size="sm"
      >
        <p className="rh-settings-footnote" style={{ marginTop: 0 }}>
          سيتم عرض رسالة لطيفة للطالب. يمكنك كتابة ملاحظة مختصرة تساعده على التحسين.
        </p>
        <TextField
          label="سبب مختصر (اختياري)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="مثال: يرجى استيفاء شرط الحفظ كاملاً ثم إعادة التقديم."
        />
        <div className="rh-admin-users__modal-actions">
          <Button type="button" variant="danger" onClick={onReject} loading={busyId === rejectingRow?.userId}>
            تأكيد الرفض
          </Button>
          <Button type="button" variant="ghost" onClick={() => setRejectingRow(null)}>
            إلغاء
          </Button>
        </div>
      </Modal>
    </div>
  )
}
