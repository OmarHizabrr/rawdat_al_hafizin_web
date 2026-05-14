import { limit, orderBy, query, where } from 'firebase/firestore'
import { firestoreApi } from './firestoreApi.js'

/**
 * استفسارات المنصة — مجموعة `inquiries`.
 * تأكد من قواعد Firestore: قراءة/كتابة حسب الدور، وفهرس مركّب لـ studentUid + createTimes.
 */
export const INQUIRY_KIND = 'platform_inquiry'

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
