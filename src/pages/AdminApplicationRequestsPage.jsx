import { CheckCircle2, Download, Pencil, Save, Trash2, X, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CrossNav } from '../components/CrossNav.jsx'
import { useAuth } from '../context/useAuth.js'
import { COUNTRY_DIAL_OPTIONS_AR, COUNTRY_OPTIONS_AR } from '../data/countriesAr.js'
import { getQuranMemorizedJuzOptions } from '../data/quranJuzOptionsAr.js'
import { useSiteContent } from '../context/useSiteContent.js'
import {
  adminUpdateProfileRequestFields,
  deleteProfileRequest,
  PROFILE_REQUEST_STATUS,
  reviewProfileRequest,
  subscribeAllProfileRequests,
} from '../services/profileRequestService.js'
import { downloadProfileRequestsCsv } from '../utils/downloadProfileRequestsCsv.js'
import { Button, Modal, NumberStepField, SearchField, SearchableSelect, TextField, useToast } from '../ui/index.js'

const GENDER_OPTIONS = [
  { value: 'male', label: 'ذكر' },
  { value: 'female', label: 'أنثى' },
]

export default function AdminApplicationRequestsPage() {
  const { user } = useAuth()
  const { branding } = useSiteContent()
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState(PROFILE_REQUEST_STATUS.PENDING)
  const [busyId, setBusyId] = useState('')
  const [rejectingRow, setRejectingRow] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editingRow, setEditingRow] = useState(null)
  const [editForm, setEditForm] = useState(null)

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

  const quranJuzAdminOptions = useMemo(() => getQuranMemorizedJuzOptions({ includeZero: true }), [])

  const statusCounts = useMemo(() => {
    const out = {
      [PROFILE_REQUEST_STATUS.PENDING]: 0,
      [PROFILE_REQUEST_STATUS.APPROVED]: 0,
      [PROFILE_REQUEST_STATUS.REJECTED]: 0,
      all: rows.length,
    }
    for (const row of rows) {
      if (row?.status === PROFILE_REQUEST_STATUS.APPROVED) out[PROFILE_REQUEST_STATUS.APPROVED] += 1
      else if (row?.status === PROFILE_REQUEST_STATUS.REJECTED) out[PROFILE_REQUEST_STATUS.REJECTED] += 1
      else out[PROFILE_REQUEST_STATUS.PENDING] += 1
    }
    return out
  }, [rows])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    const statusMatched = rows.filter((r) => (
      statusFilter === 'all'
        ? true
        : (r?.status || PROFILE_REQUEST_STATUS.PENDING) === statusFilter
    ))
    const searchMatched = !s
      ? statusMatched
      : statusMatched.filter((r) => {
      const hay =
        `${r.fullName} ${r.email} ${r.phone} ${r.nationality} ${r.city} ${r.occupation} ${r.userId}`.toLowerCase()
      return hay.includes(s)
    })
    if (statusFilter !== 'all') return searchMatched
    const weight = {
      [PROFILE_REQUEST_STATUS.PENDING]: 0,
      [PROFILE_REQUEST_STATUS.APPROVED]: 1,
      [PROFILE_REQUEST_STATUS.REJECTED]: 2,
    }
    return [...searchMatched].sort((a, b) => {
      const wa = weight[a?.status] ?? 99
      const wb = weight[b?.status] ?? 99
      if (wa !== wb) return wa - wb
      const ta = Date.parse(String(a?.submittedAt || '')) || 0
      const tb = Date.parse(String(b?.submittedAt || '')) || 0
      return tb - ta
    })
  }, [rows, q, statusFilter])

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

  const openEdit = (row) => {
    setEditingRow(row)
    setEditForm({
      fullName: row?.fullName || '',
      phone: row?.phone || '',
      phoneCountry: row?.phoneCountry || 'SA',
      phoneDialCode: row?.phoneDialCode || '+966',
      nationality: row?.nationality || '',
      permanentResidence: row?.permanentResidence || '',
      city: row?.city || '',
      age: Number(row?.age) || 18,
      gender: row?.gender === 'female' ? 'female' : row?.gender === 'male' ? 'male' : '',
      educationLevel: row?.educationLevel || '',
      occupation: row?.occupation || '',
      quranMemorizedJuz: Math.max(0, Math.min(30, Number(row?.quranMemorizedJuz) || 0)),
    })
  }

  const onSaveEdit = async () => {
    if (!user?.uid || !editingRow?.userId || !editForm) return
    if (!String(editForm.fullName || '').trim()) {
      toast.warning('الاسم مطلوب.', 'تنبيه')
      return
    }
    if (editForm.gender !== 'male' && editForm.gender !== 'female') {
      toast.warning('حدد الجنس بشكل صحيح (ذكر/أنثى).', 'تنبيه')
      return
    }
    setBusyId(editingRow.userId)
    try {
      await adminUpdateProfileRequestFields(user, editingRow.userId, editForm)
      toast.success('تم تحديث بيانات الطلب.', 'تم')
      setEditingRow(null)
      setEditForm(null)
    } catch {
      toast.warning('تعذّر حفظ التعديلات.', 'تنبيه')
    } finally {
      setBusyId('')
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
    <div className="rh-admin-users rh-admin-users--application-requests">
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
          <div className="rh-admin-applications__filters" role="tablist" aria-label="فلترة حسب حالة الطلب">
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === PROFILE_REQUEST_STATUS.PENDING}
              className={[
                'rh-admin-applications__filter-btn',
                statusFilter === PROFILE_REQUEST_STATUS.PENDING ? 'rh-admin-applications__filter-btn--active' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => setStatusFilter(PROFILE_REQUEST_STATUS.PENDING)}
            >
              <span>قيد المراجعة</span>
              <strong>{statusCounts[PROFILE_REQUEST_STATUS.PENDING]}</strong>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === PROFILE_REQUEST_STATUS.APPROVED}
              className={[
                'rh-admin-applications__filter-btn',
                statusFilter === PROFILE_REQUEST_STATUS.APPROVED ? 'rh-admin-applications__filter-btn--active' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => setStatusFilter(PROFILE_REQUEST_STATUS.APPROVED)}
            >
              <span>المقبول</span>
              <strong>{statusCounts[PROFILE_REQUEST_STATUS.APPROVED]}</strong>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === PROFILE_REQUEST_STATUS.REJECTED}
              className={[
                'rh-admin-applications__filter-btn',
                statusFilter === PROFILE_REQUEST_STATUS.REJECTED ? 'rh-admin-applications__filter-btn--active' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => setStatusFilter(PROFILE_REQUEST_STATUS.REJECTED)}
            >
              <span>المرفوض</span>
              <strong>{statusCounts[PROFILE_REQUEST_STATUS.REJECTED]}</strong>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'all'}
              className={[
                'rh-admin-applications__filter-btn',
                statusFilter === 'all' ? 'rh-admin-applications__filter-btn--active' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => setStatusFilter('all')}
            >
              <span>الكل</span>
              <strong>{statusCounts.all}</strong>
            </button>
          </div>
          <div className="rh-admin-applications__save">
            <Button
              type="button"
              variant="secondary"
              icon={Download}
              onClick={onSaveCsv}
              disabled={filtered.length === 0}
              title="يصدّر الطلبات الظاهرة في القائمة حالياً (إن وُجد بحث، يُصدَّر المطابقة فقط)"
            >
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
                variant="secondary"
                icon={Pencil}
                disabled={busyId === r.userId}
                onClick={() => openEdit(r)}
              >
                تعديل البيانات
              </Button>
              <Button
                type="button"
                size="sm"
                variant="primary"
                icon={CheckCircle2}
                loading={busyId === r.userId}
                onClick={() => onApprove(r)}
              >
                قبول
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                icon={XCircle}
                disabled={busyId === r.userId}
                onClick={() => {
                  setRejectingRow(r)
                  setRejectReason(r.statusMessage || '')
                }}
              >
                رفض
              </Button>
              <Button
                type="button"
                size="sm"
                variant="danger"
                icon={Trash2}
                disabled={busyId === r.userId}
                onClick={() => setDeleteTarget(r)}
                title="حذف سجل طلب الالتحاق من قاعدة البيانات"
              >
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
            icon={Trash2}
            onClick={onConfirmDelete}
            loading={busyId === deleteTarget?.userId}
            disabled={Boolean(busyId && busyId !== deleteTarget?.userId)}
          >
            نعم، حذف نهائياً
          </Button>
          <Button type="button" variant="ghost" icon={X} onClick={() => setDeleteTarget(null)} disabled={Boolean(busyId)}>
            إلغاء
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(editingRow && editForm)}
        title="تعديل بيانات الطلب"
        onClose={() => {
          if (!busyId) {
            setEditingRow(null)
            setEditForm(null)
          }
        }}
        size="lg"
      >
        {editForm ? (
          <>
            <TextField
              label="الاسم الرباعي"
              value={editForm.fullName}
              onChange={(e) => setEditForm((prev) => ({ ...prev, fullName: e.target.value }))}
              required
            />
            <SearchableSelect
              label="مفتاح الدولة"
              options={COUNTRY_DIAL_OPTIONS_AR}
              value={editForm.phoneCountry}
              onChange={(v) => {
                const selected = COUNTRY_DIAL_OPTIONS_AR.find((opt) => opt.value === v)
                setEditForm((prev) => ({
                  ...prev,
                  phoneCountry: v,
                  phoneDialCode: selected?.dialCode || '',
                }))
              }}
              placeholder="اختر الدولة ومفتاحها"
              searchPlaceholder="ابحث عن الدولة..."
            />
            <TextField
              label="رقم الهاتف"
              value={editForm.phone}
              onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="مثال: +9665xxxxxxx"
            />
            <SearchableSelect
              label="الجنسية"
              options={COUNTRY_OPTIONS_AR}
              value={editForm.nationality}
              onChange={(v) => setEditForm((prev) => ({ ...prev, nationality: v }))}
              placeholder="اختر الجنسية"
              searchPlaceholder="ابحث عن دولة..."
            />
            <TextField
              label="مكان الإقامة الدائم"
              value={editForm.permanentResidence}
              onChange={(e) => setEditForm((prev) => ({ ...prev, permanentResidence: e.target.value }))}
            />
            <TextField
              label="المدينة/المحافظة"
              value={editForm.city}
              onChange={(e) => setEditForm((prev) => ({ ...prev, city: e.target.value }))}
            />
            <NumberStepField
              label="العمر"
              value={editForm.age}
              min={7}
              max={150}
              onChange={(v) => setEditForm((prev) => ({ ...prev, age: v }))}
            />
            <SearchableSelect
              label="الجنس"
              required
              options={GENDER_OPTIONS}
              value={editForm.gender}
              onChange={(v) => setEditForm((prev) => ({ ...prev, gender: v }))}
              placeholder="— اختر الجنس —"
              searchPlaceholder="ابحث..."
            />
            <TextField
              label="المستوى التعليمي"
              value={editForm.educationLevel}
              onChange={(e) => setEditForm((prev) => ({ ...prev, educationLevel: e.target.value }))}
            />
            <TextField
              label="الوظيفة"
              value={editForm.occupation}
              onChange={(e) => setEditForm((prev) => ({ ...prev, occupation: e.target.value }))}
            />
            <SearchableSelect
              className="rh-quran-juz-select"
              label="مقدار الحفظ (عدد الأجزاء)"
              hint="قائمة الأجزاء الثلاثين مع مدى كل جزء في المصحف وعدد السور التي يمر بها."
              options={quranJuzAdminOptions}
              value={
                Number.isFinite(Number(editForm.quranMemorizedJuz)) &&
                Number(editForm.quranMemorizedJuz) >= 0 &&
                Number(editForm.quranMemorizedJuz) <= 30
                  ? Number(editForm.quranMemorizedJuz)
                  : 0
              }
              onChange={(v) => setEditForm((prev) => ({ ...prev, quranMemorizedJuz: v }))}
              placeholder="اختر عدد الأجزاء"
              searchPlaceholder="بحث برقم الجزء أو السورة…"
            />
          </>
        ) : null}
        <div className="rh-admin-users__modal-actions">
          <Button type="button" variant="primary" icon={Save} loading={busyId === editingRow?.userId} onClick={onSaveEdit}>
            حفظ التعديلات
          </Button>
          <Button
            type="button"
            variant="ghost"
            icon={X}
            disabled={Boolean(busyId)}
            onClick={() => {
              setEditingRow(null)
              setEditForm(null)
            }}
          >
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
          <Button type="button" variant="danger" icon={XCircle} onClick={onReject} loading={busyId === rejectingRow?.userId}>
            تأكيد الرفض
          </Button>
          <Button type="button" variant="ghost" icon={X} onClick={() => setRejectingRow(null)}>
            إلغاء
          </Button>
        </div>
      </Modal>
    </div>
  )
}
