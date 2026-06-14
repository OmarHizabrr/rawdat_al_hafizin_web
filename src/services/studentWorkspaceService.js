import { firestoreApi } from './firestoreApi.js'
import { loadHalakaSessions } from '../utils/halakatStorage.js'
import { pickRelevantHalakaSession } from '../utils/halakaAttendanceTask.js'

async function mergeMemberDocExtras(kind, groupId, memberUid) {
  if (!groupId || !memberUid) return {}
  if (kind !== 'activity' && kind !== 'exam' && kind !== 'dawra') return {}
  try {
    const mem = await firestoreApi.getData(firestoreApi.getGroupMemberDoc(groupId, memberUid))
    if (!mem || typeof mem !== 'object') return {}
    if (kind === 'activity' || kind === 'dawra') {
      return {
        memberContributionText: String(mem.memberContributionText || '').trim(),
        memberContributionUpdatedAt: mem.memberContributionUpdatedAt || '',
      }
    }
    return {
      examSelfReportStatus: String(mem.examSelfReportStatus || '').trim(),
      examSelfReportNotes: String(mem.examSelfReportNotes || '').trim(),
      examSelfReportUpdatedAt: mem.examSelfReportUpdatedAt || '',
    }
  } catch {
    return {}
  }
}

async function loadMembershipRows(userId, kind) {
  const mirrorCollection =
    kind === 'halaka'
      ? firestoreApi.getUserHalakatCollection(userId)
      : kind === 'plan'
        ? firestoreApi.getUserPlansCollection(userId)
        : kind === 'exam'
          ? firestoreApi.getUserExamsCollection(userId)
          : kind === 'activity'
            ? firestoreApi.getUserActivitiesCollection(userId)
            : firestoreApi.getUserDawratCollection(userId)

  const roleField =
    kind === 'halaka'
      ? 'halakaRole'
      : kind === 'plan'
        ? 'planRole'
        : kind === 'exam'
          ? 'examRole'
          : kind === 'activity'
            ? 'activityRole'
            : 'dawraRole'

  const canonicalRef = (id) => {
    if (kind === 'halaka') return firestoreApi.getHalakaCanonicalDoc(id)
    if (kind === 'plan') return firestoreApi.getPlanCanonicalDoc(id)
    if (kind === 'exam') return firestoreApi.getExamCanonicalDoc(id)
    if (kind === 'activity') return firestoreApi.getActivityCanonicalDoc(id)
    if (kind === 'dawra') return firestoreApi.getDawraCanonicalDoc(id)
    return null
  }

  const mirrorDocs = await firestoreApi.getDocuments(mirrorCollection)
  const rows = await Promise.all(
    mirrorDocs.map(async (docSnap) => {
      const mirror = docSnap.data() || {}
      const canonical = await firestoreApi.getData(canonicalRef(docSnap.id))
      if (!canonical) return null
      const extras = await mergeMemberDocExtras(kind, docSnap.id, userId)
      return {
        id: docSnap.id,
        ...canonical,
        [roleField]: mirror.role || '',
        joinedAt: mirror.joinedAt || '',
        ...extras,
      }
    }),
  )
  return rows.filter(Boolean)
}

async function loadHalakaAttendanceSnapshot(userId, halaka) {
  if (!userId || !halaka?.id) return null
  const sessions = await loadHalakaSessions(halaka.id)
  const session = pickRelevantHalakaSession(sessions)
  if (!session) {
    return { halakaId: halaka.id, session: null, attendance: null }
  }
  const attendance = await firestoreApi.getData(
    firestoreApi.getHalakaSessionAttendanceDoc(halaka.id, session.id, userId),
  )
  return {
    halakaId: halaka.id,
    session,
    attendance: attendance && typeof attendance === 'object' ? attendance : null,
  }
}

/** تحميل ارتباطات الطالب (خطط، حلقات، اختبارات، أنشطة، دورات) */
export async function loadStudentWorkspaceMemberships(userId) {
  const uid = String(userId || '').trim()
  if (!uid) {
    return { plans: [], halakat: [], exams: [], activities: [], dawrat: [], halakaSnapshots: [] }
  }
  const [plans, halakat, exams, activities, dawrat] = await Promise.all([
    loadMembershipRows(uid, 'plan'),
    loadMembershipRows(uid, 'halakat'),
    loadMembershipRows(uid, 'exam'),
    loadMembershipRows(uid, 'activity'),
    loadMembershipRows(uid, 'dawra'),
  ])
  const halakaSnapshots = await Promise.all(
    halakat.slice(0, 6).map((h) => loadHalakaAttendanceSnapshot(uid, h)),
  )
  return {
    plans,
    halakat,
    exams,
    activities,
    dawrat,
    halakaSnapshots: halakaSnapshots.filter(Boolean),
  }
}
