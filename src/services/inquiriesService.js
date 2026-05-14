import { getApp } from 'firebase/app'
import { limit, orderBy, query, where } from 'firebase/firestore'
import { firestoreApi } from './firestoreApi.js'

/**
 * استفسارات المنصة — مجموعة `inquiries`.
 * تأكد من قواعد Firestore: قراءة/كتابة حسب الدور، وفهرس مركّب لـ studentUid + createTimes.
 */
export const INQUIRY_KIND = 'platform_inquiry'

/** مواصفة الفهرس المركّب لاستعلام «استفساراتي» (where + orderBy). */
export const INQUIRIES_MY_LIST_INDEX_SPEC = {
  collectionGroup: 'inquiries',
  queryScope: 'COLLECTION',
  fields: [
    { fieldPath: 'studentUid', order: 'ASCENDING' },
    { fieldPath: 'createTimes', order: 'DESCENDING' },
  ],
}

/**
 * يطبع في الـ console رابط صفحة الفهارس ومواصفة الفهرس (للنسخ أو للنقر على الرابط من المتصفح).
 * يُستدعى عند فتح صفحة الاستفسارات.
 */
export function logInquiriesFirestoreIndexesHelp() {
  if (typeof window === 'undefined' || typeof console === 'undefined') return
  let projectId = ''
  try {
    projectId = getApp().options?.projectId || ''
  } catch {
    return
  }
  if (!projectId) return

  const indexesTab = `https://console.firebase.google.com/project/${encodeURIComponent(projectId)}/firestore/indexes`
  const indexesJson = {
    indexes: [INQUIRIES_MY_LIST_INDEX_SPEC],
    fieldOverrides: [],
  }

  console.info(
    '%c[inquiries] فهرس Firestore للاستعلام: studentUid == … + createTimes تنازلي',
    'font-weight:bold;color:#0284c7',
  )
  console.info('%cافتح «الفهارس» في وحدة التحكم (انقر على السطر التالي):', 'color:var(--rh-text-muted,inherit)')
  console.info(indexesTab)
  console.info(
    '%cأو أضف إلى firestore.indexes.json ثم نشر الفهارس:',
    'color:var(--rh-text-muted,inherit)',
  )
  console.info(JSON.stringify(indexesJson, null, 2))
}

/**
 * إن احتوت رسالة الخطأ على رابط إنشاء فهرس من Firestore، يُطبع في الـ console لسهولة النقر.
 * @param {unknown} err
 * @param {string} [context]
 */
export function logFirestoreIndexErrorIfAny(err, context = '') {
  if (typeof console === 'undefined') return
  const msg = err && typeof err === 'object' && 'message' in err ? String(err.message) : String(err || '')
  const match = msg.match(/https:\/\/[^\s"'<>]+/)
  if (!match) return
  const prefix = context ? `[inquiries/${context}] ` : '[inquiries] '
  console.warn(
    `${prefix}رابط إنشاء الفهرس (من Firestore — انقر إن ظهر كرابطاً في المتصفح):`,
  )
  console.info(match[0])
}

function toMs(v) {
  if (!v) return 0
  if (typeof v.toMillis === 'function') return v.toMillis()
  const n = Date.parse(String(v))
  return Number.isFinite(n) ? n : 0
}

function normalizeInquiryDoc(snap) {
  const data = snap?.data?.() || {}
  if (data.kind !== INQUIRY_KIND) return null
  const answer = (data.answer || '').toString().trim()
  return {
    id: snap.id,
    studentUid: (data.studentUid || '').toString(),
    studentDisplayName: (data.studentDisplayName || '').toString(),
    studentPhotoURL: (data.studentPhotoURL || '').toString(),
    showStudentPublic: data.showStudentPublic !== false,
    question: (data.question || '').toString(),
    answer,
    hasAnswer: Boolean(answer),
    answeredByUid: (data.answeredByUid || '').toString(),
    answeredByName: (data.answeredByName || '').toString(),
    answeredByPhotoURL: (data.answeredByPhotoURL || '').toString(),
    showResponderPublic: data.showResponderPublic !== false,
    createTimes: data.createTimes || null,
    updatedTimes: data.updatedTimes || null,
  }
}

function sortByCreateDesc(a, b) {
  return toMs(b.createTimes) - toMs(a.createTimes)
}

/**
 * @param {string} studentUid
 * @param {(rows: ReturnType<typeof normalizeInquiryDoc>[]) => void} onNext
 * @param {(e: unknown) => void} [onError]
 */
export function subscribeMyInquiries(studentUid, onNext, onError) {
  if (!studentUid) return () => {}
  const col = firestoreApi.getInquiriesCollection()
  const q = query(col, where('studentUid', '==', studentUid), orderBy('createTimes', 'desc'), limit(120))
  return firestoreApi.subscribeSnapshot(
    q,
    (snapshot) => {
      const rows = snapshot.docs.map((d) => normalizeInquiryDoc(d)).filter(Boolean).sort(sortByCreateDesc)
      onNext(rows)
    },
    onError,
  )
}

/**
 * @param {(rows: ReturnType<typeof normalizeInquiryDoc>[]) => void} onNext
 * @param {(e: unknown) => void} [onError]
 */
export function subscribeAllInquiries(onNext, onError) {
  const col = firestoreApi.getInquiriesCollection()
  const q = query(col, orderBy('createTimes', 'desc'), limit(200))
  return firestoreApi.subscribeSnapshot(
    q,
    (snapshot) => {
      const rows = snapshot.docs.map((d) => normalizeInquiryDoc(d)).filter(Boolean).sort(sortByCreateDesc)
      onNext(rows)
    },
    onError,
  )
}

/**
 * @param {{
 *   studentUid: string
 *   question: string
 *   showStudentPublic: boolean
 *   userData: { uid?: string, displayName?: string, photoURL?: string }
 * }} p
 */
export async function createInquiry({ studentUid, question, showStudentPublic, userData }) {
  if (!studentUid) throw new Error('INQUIRY_STUDENT_REQUIRED')
  const q = (question || '').toString().trim()
  if (!q) throw new Error('INQUIRY_TEXT_REQUIRED')
  const id = `inq_${firestoreApi.getNewId('inquiries')}`
  const ref = firestoreApi.getInquiryDoc(id)
  await firestoreApi.setData({
    docRef: ref,
    data: {
      kind: INQUIRY_KIND,
      studentUid,
      studentDisplayName: (userData?.displayName || '').toString(),
      studentPhotoURL: (userData?.photoURL || '').toString(),
      showStudentPublic: Boolean(showStudentPublic),
      question: q,
      answer: '',
      answeredByUid: '',
      answeredByName: '',
      answeredByPhotoURL: '',
      showResponderPublic: true,
    },
    merge: true,
    userData: userData || {},
  })
  return id
}

/**
 * @param {{
 *   inquiryId: string
 *   studentUid: string
 *   question: string
 *   userData: { uid?: string, displayName?: string, photoURL?: string }
 * }} p
 */
export async function updateOwnInquiry({ inquiryId, studentUid, question, userData }) {
  if (!inquiryId || !studentUid) throw new Error('INQUIRY_UPDATE_BAD_ARGS')
  const q = (question || '').toString().trim()
  if (!q) throw new Error('INQUIRY_TEXT_REQUIRED')
  const ref = firestoreApi.getInquiryDoc(inquiryId)
  const existing = await firestoreApi.getData(ref)
  if (!existing || existing.kind !== INQUIRY_KIND) throw new Error('INQUIRY_NOT_FOUND')
  if ((existing.studentUid || '') !== studentUid) throw new Error('INQUIRY_FORBIDDEN')
  if ((existing.answer || '').toString().trim()) throw new Error('INQUIRY_ALREADY_ANSWERED')
  await firestoreApi.updateData({
    docRef: ref,
    data: {
      question: q,
      studentDisplayName: (userData?.displayName || '').toString(),
      studentPhotoURL: (userData?.photoURL || '').toString(),
    },
    userData: userData || {},
  })
}

/**
 * @param {{
 *   inquiryId: string
 *   answer: string
 *   showResponderPublic: boolean
 *   userData: { uid?: string, displayName?: string, photoURL?: string }
 * }} p
 */
export async function replyToInquiry({ inquiryId, answer, showResponderPublic, userData }) {
  if (!inquiryId) throw new Error('INQUIRY_ID_REQUIRED')
  const a = (answer || '').toString().trim()
  if (!a) throw new Error('INQUIRY_ANSWER_REQUIRED')
  const ref = firestoreApi.getInquiryDoc(inquiryId)
  const existing = await firestoreApi.getData(ref)
  if (!existing || existing.kind !== INQUIRY_KIND) throw new Error('INQUIRY_NOT_FOUND')
  await firestoreApi.updateData({
    docRef: ref,
    data: {
      answer: a,
      answeredByUid: (userData?.uid || '').toString(),
      answeredByName: (userData?.displayName || '').toString(),
      answeredByPhotoURL: (userData?.photoURL || '').toString(),
      showResponderPublic: Boolean(showResponderPublic),
    },
    userData: userData || {},
  })
}
