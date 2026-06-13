import { firestoreApi } from './firestoreApi.js'
import { normalizeRole } from '../config/roles.js'
import { loadAwrad } from '../utils/awradStorage.js'
import { loadPlanMembersWithProfiles } from '../utils/plansStorage.js'
import {
  loadHalakaSessions,
  loadHalakatMembersWithProfiles,
  loadSessionAttendance,
} from '../utils/halakatStorage.js'
import { loadExamMembersWithProfiles } from '../utils/examsStorage.js'
import { loadActivityMembersWithProfiles } from '../utils/activitiesStorage.js'
import { loadDawratMembersWithProfiles } from '../utils/dawratStorage.js'
import { loadRemoteTasmeeMembersWithProfiles } from '../utils/remoteTasmeeStorage.js'
import { computePlanProgress } from '../utils/planProgress.js'
import { REPORT_SCOPE_ALL } from '../config/reportKinds.js'

function asMs(value) {
  if (!value) return 0
  if (typeof value?.toMillis === 'function') return value.toMillis()
  const n = Date.parse(String(value))
  return Number.isFinite(n) ? n : 0
}

function inRange(value, fromMs, toMs) {
  const ms = asMs(value)
  if (!ms) return false
  if (fromMs && ms < fromMs) return false
  if (toMs && ms > toMs) return false
  return true
}

function toRangeMs(range = {}) {
  const fromMs = asMs(range.from)
  const toMs = asMs(range.to)
  return { fromMs, toMs }
}

function maybeFilterByRange(rows, datePicker, range) {
  const { fromMs, toMs } = toRangeMs(range)
  if (!fromMs && !toMs) return rows
  return rows.filter((row) => inRange(datePicker(row), fromMs, toMs))
}

function sortByRecent(rows, datePicker) {
  return [...(rows || [])].sort((a, b) => asMs(datePicker(b)) - asMs(datePicker(a)))
}

function pickFirstDate(...values) {
  for (const v of values) {
    if (asMs(v)) return v
  }
  return ''
}

function normalizeEntityRows(docs, titleField = 'name') {
  return docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .map((row) => ({
      id: row.id,
      name: String(row[titleField] || row.title || row.subject || row.meetingCode || row.id || '').trim() || row.id,
      raw: row,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
}

function canonicalRefByKind(kind, id) {
  if (kind === 'halaka') return firestoreApi.getHalakaCanonicalDoc(id)
  if (kind === 'plan') return firestoreApi.getPlanCanonicalDoc(id)
  if (kind === 'exam') return firestoreApi.getExamCanonicalDoc(id)
  if (kind === 'activity') return firestoreApi.getActivityCanonicalDoc(id)
  if (kind === 'dawra') return firestoreApi.getDawraCanonicalDoc(id)
  if (kind === 'remote_tasmee') return firestoreApi.getRemoteTasmeeCanonicalDoc(id)
  return null
}

function membersLoaderByKind(kind) {
  if (kind === 'halaka') return loadHalakatMembersWithProfiles
  if (kind === 'plan') return loadPlanMembersWithProfiles
  if (kind === 'exam') return loadExamMembersWithProfiles
  if (kind === 'activity') return loadActivityMembersWithProfiles
  if (kind === 'dawra') return loadDawratMembersWithProfiles
  if (kind === 'remote_tasmee') return loadRemoteTasmeeMembersWithProfiles
  return null
}

function buildSimpleMemberDetails(kind, members) {
  const list = members || []
  if (kind === 'activity' || kind === 'dawra') {
    return list
      .map((m) => {
        const contribution = String(m.memberContributionText || '').trim()
        return {
          userId: String(m.userId || '').trim(),
          displayName: m.displayName || m.userId,
          email: m.email || '',
          role: m.role || '',
          hasContribution: Boolean(contribution),
          contribution: contribution || '—',
          contributionUpdatedAt: m.memberContributionUpdatedAt || '',
        }
      })
      .sort((a, b) => Number(b.hasContribution) - Number(a.hasContribution))
  }
  if (kind === 'exam') {
    return list
      .map((m) => ({
        userId: String(m.userId || '').trim(),
        displayName: m.displayName || m.userId,
        email: m.email || '',
        role: m.role || '',
        examSelfReportStatus: String(m.examSelfReportStatus || '').trim(),
        examSelfReportNotes: String(m.examSelfReportNotes || '').trim(),
        examSelfReportUpdatedAt: m.examSelfReportUpdatedAt || '',
        isComplete: String(m.examSelfReportStatus || '').trim() === 'completed',
      }))
      .sort((a, b) => Number(b.isComplete) - Number(a.isComplete))
  }
  if (kind === 'remote_tasmee') {
    return list
      .map((m) => ({
        userId: String(m.userId || '').trim(),
        displayName: m.displayName || m.userId,
        email: m.email || '',
        role: m.role || '',
        joinedAt: pickFirstDate(m.joinedAt, m.createdAt, m.updatedAt),
      }))
      .sort((a, b) => asMs(b.joinedAt) - asMs(a.joinedAt))
  }
  return []
}

function buildGroupSummary(kind, members, memberDetails) {
  const count = (members || []).length
  if (kind === 'activity' || kind === 'dawra') {
    const withContribution = (memberDetails || []).filter((r) => r.hasContribution).length
    return {
      members: count,
      withContribution,
      withoutContribution: Math.max(0, count - withContribution),
    }
  }
  if (kind === 'exam') {
    const examsCompleted = (memberDetails || []).filter((r) => r.isComplete).length
    return {
      members: count,
      examsCompleted,
      examsPending: Math.max(0, count - examsCompleted),
    }
  }
  return { members: count }
}

export async function listEntitiesByKind(kind) {
  let docs = []
  if (kind === 'halaka') docs = await firestoreApi.getDocuments(firestoreApi.getHalakatCollection())
  if (kind === 'plan') docs = await firestoreApi.getDocuments(firestoreApi.getPlansCollection())
  if (kind === 'exam') docs = await firestoreApi.getDocuments(firestoreApi.getExamsCollection())
  if (kind === 'activity') docs = await firestoreApi.getDocuments(firestoreApi.getActivitiesCollection())
  if (kind === 'dawra') docs = await firestoreApi.getDocuments(firestoreApi.getDawratCollection())
  if (kind === 'remote_tasmee') docs = await firestoreApi.getDocuments(firestoreApi.getRemoteTasmeeCollection())
  return normalizeEntityRows(docs)
}

function mapStudentCandidate(row) {
  const uid = String(row?.uid || row?.id || '').trim()
  if (!uid) return null
  const role = normalizeRole(row?.role)
  if (role !== 'student') return null
  return {
    uid,
    id: uid,
    role,
    displayName: String(row?.displayName || row?.createdByName || uid).trim() || uid,
    email: String(row?.email || '').trim(),
    photoURL: String(row?.photoURL || row?.createdByImageUrl || '').trim(),
  }
}

function mapTeacherCandidate(row) {
  const uid = String(row?.uid || row?.id || '').trim()
  if (!uid) return null
  const role = normalizeRole(row?.role)
  if (role !== 'teacher') return null
  return {
    uid,
    id: uid,
    role,
    displayName: String(row?.displayName || row?.createdByName || uid).trim() || uid,
    email: String(row?.email || '').trim(),
    photoURL: String(row?.photoURL || row?.createdByImageUrl || '').trim(),
  }
}

async function loadStudentsFromUsersCollection() {
  const docs = await firestoreApi.getDocuments(firestoreApi.getUsersCollection())
  return docs
    .map((d) => mapStudentCandidate({ uid: d.id, ...d.data() }))
    .filter(Boolean)
}

async function loadTeachersFromUsersCollection() {
  const docs = await firestoreApi.getDocuments(firestoreApi.getUsersCollection())
  return docs
    .map((d) => mapTeacherCandidate({ uid: d.id, ...d.data() }))
    .filter(Boolean)
}

async function loadStudentsFromMembershipsFallback() {
  const docs = await firestoreApi.getCollectionGroupDocuments('members')
  const map = new Map()
  for (const d of docs) {
    const row = mapStudentCandidate({ uid: d.id, ...d.data() })
    if (!row) continue
    if (!map.has(row.uid)) map.set(row.uid, row)
  }
  return [...map.values()]
}

async function loadTeachersFromMembershipsFallback() {
  const docs = await firestoreApi.getCollectionGroupDocuments('members')
  const map = new Map()
  for (const d of docs) {
    const row = mapTeacherCandidate({ uid: d.id, ...d.data() })
    if (!row) continue
    if (!map.has(row.uid)) map.set(row.uid, row)
  }
  return [...map.values()]
}

function mergeUniqueStudents(...lists) {
  const map = new Map()
  for (const list of lists) {
    for (const row of list || []) {
      const uid = String(row?.uid || row?.id || '').trim()
      if (!uid) continue
      if (!map.has(uid)) {
        map.set(uid, row)
        continue
      }
      const prev = map.get(uid)
      map.set(uid, {
        ...prev,
        ...row,
        displayName: row.displayName || prev.displayName || uid,
        email: row.email || prev.email || '',
      })
    }
  }
  return [...map.values()].sort((a, b) =>
    String(a.displayName || a.uid || '').localeCompare(String(b.displayName || b.uid || ''), 'ar'),
  )
}

function mergeUniquePeople(...lists) {
  return mergeUniqueStudents(...lists)
}

export async function loadUsersDirectory(currentUser = null) {
  let fromUsers = []
  let fromMembers = []
  try {
    fromUsers = await loadStudentsFromUsersCollection()
  } catch {
    fromUsers = []
  }
  if (fromUsers.length <= 1) {
    try {
      fromMembers = await loadStudentsFromMembershipsFallback()
    } catch {
      fromMembers = []
    }
  }
  const selfStudent = mapStudentCandidate(currentUser || {})
  return mergeUniqueStudents(fromUsers, fromMembers, selfStudent ? [selfStudent] : [])
}

export async function loadTeachersDirectory(currentUser = null) {
  let fromUsers = []
  let fromMembers = []
  try {
    fromUsers = await loadTeachersFromUsersCollection()
  } catch {
    fromUsers = []
  }
  if (fromUsers.length <= 1) {
    try {
      fromMembers = await loadTeachersFromMembershipsFallback()
    } catch {
      fromMembers = []
    }
  }
  const selfTeacher = mapTeacherCandidate(currentUser || {})
  return mergeUniquePeople(fromUsers, fromMembers, selfTeacher ? [selfTeacher] : [])
}

/** حقول مستند العضو في مجموعات النشاط / الاختبار / الدورة */
async function mergeMemberDocExtras(kind, groupId, memberUid) {
  if (!groupId || !memberUid) return {}
  if (kind !== 'activity' && kind !== 'exam' && kind !== 'dawra') return {}
  try {
    const mem = await firestoreApi.getData(firestoreApi.getPlanMemberDoc(groupId, memberUid))
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

async function loadUserMembershipRows(userId, kind) {
  const mirrorCollection =
    kind === 'halaka'
      ? firestoreApi.getUserHalakatCollection(userId)
      : kind === 'plan'
        ? firestoreApi.getUserPlansCollection(userId)
        : kind === 'exam'
          ? firestoreApi.getUserExamsCollection(userId)
          : kind === 'activity'
            ? firestoreApi.getUserActivitiesCollection(userId)
            : kind === 'dawra'
              ? firestoreApi.getUserDawratCollection(userId)
              : firestoreApi.getUserRemoteTasmeeCollection(userId)

  const roleField =
    kind === 'halaka'
      ? 'halakaRole'
      : kind === 'plan'
        ? 'planRole'
        : kind === 'exam'
          ? 'examRole'
          : kind === 'activity'
            ? 'activityRole'
            : kind === 'dawra'
              ? 'dawraRole'
              : 'broadcastRole'

  const mirrorDocs = await firestoreApi.getDocuments(mirrorCollection)
  const rows = await Promise.all(
    mirrorDocs.map(async (docSnap) => {
      const mirror = docSnap.data() || {}
      const canonical = await firestoreApi.getData(canonicalRefByKind(kind, docSnap.id))
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

function halakaIdFromDocPath(docSnap) {
  const path = String(docSnap?.ref?.path || '')
  const parts = path.split('/')
  const idx = parts.indexOf('halakat')
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]
  return ''
}

function normalizeScopeId(value) {
  const id = String(value || '').trim()
  if (!id || id === REPORT_SCOPE_ALL) return ''
  return id
}

function applyScopeFilter(rows, scopeId) {
  const id = normalizeScopeId(scopeId)
  if (!id) return rows || []
  return (rows || []).filter((row) => String(row.id || '') === id)
}

function rowTouchesRange(row, range) {
  const { fromMs, toMs } = toRangeMs(range)
  if (!fromMs && !toMs) return true
  const dateFields = [
    'startAt',
    'endAt',
    'courseStart',
    'courseEnd',
    'joinedAt',
    'memberContributionUpdatedAt',
    'examSelfReportUpdatedAt',
    'updatedAt',
    'createdAt',
  ]
  for (const field of dateFields) {
    if (inRange(row[field], fromMs, toMs)) return true
  }
  const start = asMs(row.startAt || row.courseStart)
  const end = asMs(row.endAt || row.courseEnd || row.startAt || row.courseStart)
  if (start && fromMs && toMs && start <= toMs && (end || start) >= fromMs) return true
  return false
}

function maybeFilterMembershipRowsByRange(rows, range) {
  const { fromMs, toMs } = toRangeMs(range)
  if (!fromMs && !toMs) return rows || []
  return (rows || []).filter((row) => rowTouchesRange(row, range))
}

function buildStudentPlanProgress(plans, awradAll, awradInPeriod) {
  return (plans || []).map((plan) => {
    const progress = computePlanProgress(plan, awradAll) || {
      achievedPages: 0,
      remainingPages: Number(plan.totalTargetPages) || 0,
      progressPercent: 0,
      targetPages: Number(plan.totalTargetPages) || 0,
    }
    const allForPlan = (awradAll || []).filter((w) => w.planId === plan.id)
    const inPeriodForPlan = (awradInPeriod || []).filter((w) => w.planId === plan.id)
    const latestAll = sortByRecent(allForPlan, (r) => pickFirstDate(r.recordedAt, r.updatedAt, r.createdAt))[0]
    const latestInPeriod = sortByRecent(inPeriodForPlan, (r) =>
      pickFirstDate(r.recordedAt, r.updatedAt, r.createdAt),
    )[0]
    return {
      planId: plan.id,
      name: plan.name || '',
      role: plan.planRole || '',
      visibility: plan.planVisibility || '',
      dailyPages: plan.dailyPages ?? '—',
      totalTargetPages: plan.totalTargetPages ?? '—',
      achievedPages: progress.achievedPages ?? 0,
      remainingPages: progress.remainingPages ?? 0,
      targetPages: progress.targetPages ?? 0,
      progressPercent: Math.round(progress.progressPercent ?? 0),
      awradTotalCount: allForPlan.length,
      awradInPeriodCount: inPeriodForPlan.length,
      pagesTotal: allForPlan.reduce((sum, r) => sum + Math.max(0, Number(r.pagesCount) || 0), 0),
      pagesInPeriod: inPeriodForPlan.reduce((sum, r) => sum + Math.max(0, Number(r.pagesCount) || 0), 0),
      latestAwradAt: pickFirstDate(latestInPeriod?.recordedAt, latestInPeriod?.updatedAt, latestAll?.recordedAt),
    }
  })
}

async function loadStudentHalakaAttendance(uid, halakatList, range) {
  const list = halakatList || []
  const nested = await Promise.all(
    list.map(async (h) => {
      const sessions = sortByRecent(
        maybeFilterByRange(
          await loadHalakaSessions(h.id),
          (s) => s.startedAt || s.createdAt || s.updatedAt,
          range,
        ),
        (s) => pickFirstDate(s.startedAt, s.updatedAt, s.createdAt),
      )
      const sessionRows = await Promise.all(
        sessions.map(async (session) => {
          const rows = await loadSessionAttendance(h.id, session.id)
          const mine = rows.find((r) => String(r.userId || '') === uid)
          if (!mine) return null
          return {
            halakaId: h.id,
            halakaName: h.name || '',
            sessionId: session.id,
            sessionTitle: session.title || 'جلسة',
            sessionStartedAt: session.startedAt || '',
            sessionEndedAt: session.endedAt || '',
            sessionStatus: session.status || '',
            attendanceStatus: mine.attendanceStatus || '',
            pagesCount: mine.pagesCount ?? 0,
            fromPage: mine.fromPage ?? '',
            toPage: mine.toPage ?? '',
            recordedAt: pickFirstDate(mine.updatedAt, mine.recordedAt),
            recordedBy: mine.recordedBy || '',
          }
        }),
      )
      return sessionRows.filter(Boolean)
    }),
  )
  const flat = nested.flat()
  const teacherMap = await loadUserNamesByIds(flat.map((r) => r.recordedBy))
  return sortByRecent(
    flat.map((r) => ({
      ...r,
      recordedByName: teacherMap.get(String(r.recordedBy || '').trim()) || '',
    })),
    (r) => pickFirstDate(r.recordedAt, r.sessionStartedAt),
  )
}

/** خيارات نطاق تقرير الطالب — خططه وحلقاته */
export async function loadStudentScopeOptions(uid) {
  const studentUid = String(uid || '').trim()
  if (!studentUid) return { plans: [], halakat: [] }
  const [plans, halakat] = await Promise.all([
    loadUserMembershipRows(studentUid, 'plan'),
    loadUserMembershipRows(studentUid, 'halaka'),
  ])
  return {
    plans: plans.map((p) => ({ id: p.id, name: String(p.name || '').trim() || p.id })),
    halakat: halakat.map((h) => ({ id: h.id, name: String(h.name || '').trim() || h.id })),
  }
}

async function loadUserNamesByIds(userIds = []) {
  const map = new Map()
  const unique = [...new Set((userIds || []).map((id) => String(id || '').trim()).filter(Boolean))]
  if (!unique.length) return map
  const profiles = await Promise.all(
    unique.map(async (uid) => {
      try {
        const doc = await firestoreApi.getData(firestoreApi.getUserDoc(uid))
        return { uid, doc }
      } catch {
        return { uid, doc: null }
      }
    }),
  )
  for (const entry of profiles) {
    const displayName = String(entry?.doc?.displayName || entry?.doc?.name || entry.uid).trim() || entry.uid
    map.set(entry.uid, displayName)
  }
  return map
}

export async function buildStudentReport(user, range = {}, scope = {}) {
  const uid = String(user?.uid || '').trim()
  if (!uid) return null
  const scopePlanId = normalizeScopeId(scope.planId)
  const scopeHalakaId = normalizeScopeId(scope.halakaId)

  const [plansAll, halakatAll, examsAll, activitiesAll, dawratAll, remoteTasmeeAll, awradDocs, notificationsDocs] =
    await Promise.all([
      loadUserMembershipRows(uid, 'plan'),
      loadUserMembershipRows(uid, 'halaka'),
      loadUserMembershipRows(uid, 'exam'),
      loadUserMembershipRows(uid, 'activity'),
      loadUserMembershipRows(uid, 'dawra'),
      loadUserMembershipRows(uid, 'remote_tasmee'),
      loadAwrad(uid),
      firestoreApi.getDocuments(firestoreApi.getUserNotificationsCollection(uid)),
    ])

  const plans = applyScopeFilter(plansAll, scopePlanId)
  const halakat = applyScopeFilter(halakatAll, scopeHalakaId)
  const exams = maybeFilterMembershipRowsByRange(examsAll, range)
  const activities = maybeFilterMembershipRowsByRange(activitiesAll, range)
  const dawrat = maybeFilterMembershipRowsByRange(dawratAll, range)
  const remoteTasmee = maybeFilterMembershipRowsByRange(remoteTasmeeAll, range)

  let awradFiltered = maybeFilterByRange(awradDocs, (r) => r.recordedAt || r.updatedAt || r.createdAt, range)
  if (scopePlanId) {
    awradFiltered = awradFiltered.filter((r) => String(r.planId || '') === scopePlanId)
  }

  const planNameById = new Map(plansAll.map((p) => [String(p.id), String(p.name || '').trim() || 'خطة']))
  const halakaNameById = new Map(halakatAll.map((h) => [String(h.id), String(h.name || '').trim() || 'حلقة']))

  const [planProgress, halakaAttendance] = await Promise.all([
    Promise.resolve(buildStudentPlanProgress(plans, awradDocs, awradFiltered)),
    loadStudentHalakaAttendance(uid, halakat, range),
  ])

  const notifications = maybeFilterByRange(
    notificationsDocs.map((d) => ({ id: d.id, ...d.data() })),
    (r) => r.createdAt || r.updatedAt,
    range,
  )

  const studentRows = {
    plans: sortByRecent(plansAll, (r) => pickFirstDate(r.updatedAt, r.createdAt, r.joinedAt)).map((r) => ({
      id: r.id,
      name: r.name || '',
      role: r.planRole || '',
      visibility: r.planVisibility || '',
      dailyPages: r.dailyPages ?? '—',
      totalTargetPages: r.totalTargetPages ?? '—',
      createdAt: pickFirstDate(r.createdAt, r.createTimes),
      updatedAt: pickFirstDate(r.updatedAt, r.updatedTimes),
      joinedAt: r.joinedAt || '',
    })),
    halakat: sortByRecent(halakatAll, (r) => pickFirstDate(r.updatedAt, r.createdAt, r.joinedAt)).map((r) => ({
      id: r.id,
      name: r.name || '',
      role: r.halakaRole || '',
      visibility: r.halakaVisibility || '',
      location: r.location || '',
      createdAt: pickFirstDate(r.createdAt, r.createTimes),
      updatedAt: pickFirstDate(r.updatedAt, r.updatedTimes),
      joinedAt: r.joinedAt || '',
    })),
    exams: sortByRecent(exams, (r) => pickFirstDate(r.updatedAt, r.createdAt, r.joinedAt)).map((r) => ({
      id: r.id,
      name: r.name || '',
      role: r.examRole || '',
      visibility: r.examVisibility || '',
      createdAt: pickFirstDate(r.createdAt, r.createTimes),
      updatedAt: pickFirstDate(r.updatedAt, r.updatedTimes),
      joinedAt: r.joinedAt || '',
      examSelfReportStatus: r.examSelfReportStatus || '',
      examSelfReportNotes: r.examSelfReportNotes || '',
      examSelfReportUpdatedAt: r.examSelfReportUpdatedAt || '',
    })),
    activities: sortByRecent(activities, (r) => pickFirstDate(r.updatedAt, r.startAt, r.createdAt, r.joinedAt)).map(
      (r) => ({
        id: r.id,
        name: r.name || '',
        role: r.activityRole || '',
        visibility: r.activityVisibility || '',
        startAt: r.startAt || '',
        endAt: r.endAt || '',
        location: r.location || '',
        createdAt: pickFirstDate(r.createdAt, r.createTimes),
        updatedAt: pickFirstDate(r.updatedAt, r.updatedTimes),
        joinedAt: r.joinedAt || '',
        memberContributionText: r.memberContributionText || '',
        memberContributionUpdatedAt: r.memberContributionUpdatedAt || '',
      }),
    ),
    dawrat: sortByRecent(dawrat, (r) => pickFirstDate(r.updatedAt, r.courseStart, r.createdAt, r.joinedAt)).map(
      (r) => ({
        id: r.id,
        name: r.name || '',
        role: r.dawraRole || '',
        visibility: r.dawraVisibility || '',
        registrationStart: r.registrationStart || '',
        registrationEnd: r.registrationEnd || '',
        courseStart: r.courseStart || '',
        courseEnd: r.courseEnd || '',
        createdAt: pickFirstDate(r.createdAt, r.createTimes),
        updatedAt: pickFirstDate(r.updatedAt, r.updatedTimes),
        joinedAt: r.joinedAt || '',
        memberContributionText: r.memberContributionText || '',
        memberContributionUpdatedAt: r.memberContributionUpdatedAt || '',
      }),
    ),
    remoteTasmee: sortByRecent(remoteTasmee, (r) => pickFirstDate(r.updatedAt, r.createdAt, r.joinedAt)).map((r) => ({
      id: r.id,
      name: r.name || r.meetingCode || '',
      role: r.broadcastRole || '',
      visibility: r.remoteTasmeeVisibility || '',
      provider: r.provider || '',
      mediaType: r.mediaType || '',
      meetingUrl: r.meetingUrl || '',
      createdAt: pickFirstDate(r.createdAt, r.createTimes),
      updatedAt: pickFirstDate(r.updatedAt, r.updatedTimes),
      joinedAt: r.joinedAt || '',
    })),
  }

  const plansWithTarget = planProgress.filter((p) => (p.targetPages || 0) > 0)
  const avgPlanProgress =
    plansWithTarget.length > 0
      ? Math.round(plansWithTarget.reduce((sum, p) => sum + (p.progressPercent || 0), 0) / plansWithTarget.length)
      : 0

  const halakaPagesRecorded = halakaAttendance.reduce((sum, r) => sum + Math.max(0, Number(r.pagesCount) || 0), 0)

  return {
    kind: 'student',
    entity: user,
    scope: {
      planId: scopePlanId || REPORT_SCOPE_ALL,
      halakaId: scopeHalakaId || REPORT_SCOPE_ALL,
      planLabel: scopePlanId ? planNameById.get(scopePlanId) || scopePlanId : 'كل الخطط',
      halakaLabel: scopeHalakaId ? halakaNameById.get(scopeHalakaId) || scopeHalakaId : 'كل الحلقات',
    },
    modules: { plans: plansAll, halakat: halakatAll, exams: examsAll, activities: activitiesAll, dawrat: dawratAll, remoteTasmee: remoteTasmeeAll },
    studentRows,
    planProgress: [...planProgress].sort(
      (a, b) => (b.progressPercent - a.progressPercent) || (b.pagesInPeriod - a.pagesInPeriod),
    ),
    halakaAttendance,
    awrad: sortByRecent(awradFiltered, (r) => pickFirstDate(r.recordedAt, r.updatedAt, r.createdAt)).map((r) => ({
      ...r,
      planName: planNameById.get(String(r.planId || '')) || '—',
    })),
    notifications: sortByRecent(notifications, (r) => pickFirstDate(r.createdAt, r.updatedAt)),
    summary: {
      plans: plansAll.length,
      halakat: halakatAll.length,
      exams: exams.length,
      activities: activities.length,
      dawrat: dawrat.length,
      remoteTasmee: remoteTasmee.length,
      awrad: awradFiltered.length,
      notifications: notifications.length,
      totalPages: awradFiltered.reduce((sum, r) => sum + Math.max(0, Number(r.pagesCount) || 0), 0),
      avgPlanProgress,
      plansInScope: plans.length,
      halakaAttendanceRecords: halakaAttendance.length,
      halakaPagesRecorded,
      pagesInScopePlans: planProgress.reduce((sum, p) => sum + (p.pagesInPeriod || 0), 0),
    },
  }
}

export async function buildTeacherReport(user, range = {}, scope = {}) {
  const uid = String(user?.uid || '').trim()
  if (!uid) return null
  const scopeHalakaId = normalizeScopeId(scope.halakaId)

  const [plans, halakat, exams, activities, dawrat, remoteTasmee] = await Promise.all([
    loadUserMembershipRows(uid, 'plan'),
    loadUserMembershipRows(uid, 'halaka'),
    loadUserMembershipRows(uid, 'exam'),
    loadUserMembershipRows(uid, 'activity'),
    loadUserMembershipRows(uid, 'dawra'),
    loadUserMembershipRows(uid, 'remote_tasmee'),
  ])

  const halakaNameById = new Map(halakat.map((h) => [String(h.id), String(h.name || '').trim() || 'حلقة']))

  const sessionsRaw = await firestoreApi.getCollectionGroupDocuments('sessions')
  let teacherSessions = sessionsRaw
    .map((d) => ({
      id: d.id,
      halakaId: halakaIdFromDocPath(d),
      ...d.data(),
    }))
    .filter((s) => String(s.teacherUid || '') === uid)

  if (scopeHalakaId) {
    teacherSessions = teacherSessions.filter((s) => String(s.halakaId || '') === scopeHalakaId)
  }

  const sessions = sortByRecent(
    maybeFilterByRange(teacherSessions, (s) => s.startedAt || s.createdAt || s.updatedAt, range),
    (s) => pickFirstDate(s.startedAt, s.updatedAt, s.createdAt),
  ).map((s) => ({
    ...s,
    halakaName: halakaNameById.get(String(s.halakaId || '')) || '—',
  }))

  const attendanceRaw = await firestoreApi.getCollectionGroupDocuments('attendance')
  const attendanceRecordedRaw = maybeFilterByRange(
    attendanceRaw
      .map((d) => ({
        id: d.id,
        halakaId: halakaIdFromDocPath(d),
        sessionId: String(d.ref?.parent?.id || ''),
        ...d.data(),
      }))
      .filter((a) => String(a.recordedBy || '') === uid)
      .filter((a) => !scopeHalakaId || String(a.halakaId || '') === scopeHalakaId),
    (a) => a.updatedAt || a.recordedAt,
    range,
  )
  const userNameMap = await loadUserNamesByIds(attendanceRecordedRaw.map((a) => a.userId))
  const attendanceRecorded = sortByRecent(
    attendanceRecordedRaw.map((a) => ({
      ...a,
      userName: userNameMap.get(String(a.userId || '').trim()) || String(a.userId || '').trim(),
      halakaName: halakaNameById.get(String(a.halakaId || '')) || '—',
    })),
    (a) => pickFirstDate(a.updatedAt, a.recordedAt),
  )
  const attendanceByStudentMap = new Map()
  for (const row of attendanceRecorded) {
    const studentUid = String(row.userId || '').trim()
    if (!studentUid) continue
    const prev = attendanceByStudentMap.get(studentUid) || {
      userId: studentUid,
      recordsCount: 0,
      pagesTotal: 0,
      latestUpdatedAt: '',
    }
    const next = {
      ...prev,
      userName: row.userName || prev.userName || studentUid,
      recordsCount: prev.recordsCount + 1,
      pagesTotal: prev.pagesTotal + Math.max(0, Number(row.pagesCount) || 0),
      latestUpdatedAt:
        asMs(row.updatedAt) > asMs(prev.latestUpdatedAt) ? String(row.updatedAt || '') : prev.latestUpdatedAt,
    }
    attendanceByStudentMap.set(studentUid, next)
  }
  const attendanceByStudent = [...attendanceByStudentMap.values()].sort((a, b) =>
    (b.recordsCount - a.recordsCount) || (b.pagesTotal - a.pagesTotal) || (asMs(b.latestUpdatedAt) - asMs(a.latestUpdatedAt)))

  const teacherRows = {
    plans: sortByRecent(plans, (r) => pickFirstDate(r.updatedAt, r.createdAt, r.joinedAt)).map((r) => ({ id: r.id, name: r.name || '', role: r.planRole || '', visibility: r.planVisibility || '' })),
    halakat: sortByRecent(halakat, (r) => pickFirstDate(r.updatedAt, r.createdAt, r.joinedAt)).map((r) => ({ id: r.id, name: r.name || '', role: r.halakaRole || '', visibility: r.halakaVisibility || '' })),
    exams: sortByRecent(exams, (r) => pickFirstDate(r.updatedAt, r.createdAt, r.joinedAt)).map((r) => ({
      id: r.id,
      name: r.name || '',
      role: r.examRole || '',
      visibility: r.examVisibility || '',
      examSelfReportStatus: r.examSelfReportStatus || '',
      examSelfReportNotes: r.examSelfReportNotes || '',
      examSelfReportUpdatedAt: r.examSelfReportUpdatedAt || '',
    })),
    activities: sortByRecent(activities, (r) => pickFirstDate(r.updatedAt, r.startAt, r.createdAt, r.joinedAt)).map((r) => ({
      id: r.id,
      name: r.name || '',
      role: r.activityRole || '',
      visibility: r.activityVisibility || '',
      memberContributionText: r.memberContributionText || '',
      memberContributionUpdatedAt: r.memberContributionUpdatedAt || '',
    })),
    dawrat: sortByRecent(dawrat, (r) => pickFirstDate(r.updatedAt, r.courseStart, r.createdAt, r.joinedAt)).map((r) => ({
      id: r.id,
      name: r.name || '',
      role: r.dawraRole || '',
      visibility: r.dawraVisibility || '',
      memberContributionText: r.memberContributionText || '',
      memberContributionUpdatedAt: r.memberContributionUpdatedAt || '',
    })),
    remoteTasmee: sortByRecent(remoteTasmee, (r) => pickFirstDate(r.updatedAt, r.createdAt, r.joinedAt)).map((r) => ({ id: r.id, name: r.name || r.meetingCode || '', role: r.broadcastRole || '' })),
  }

  return {
    kind: 'teacher',
    entity: user,
    scope: {
      halakaId: scopeHalakaId || REPORT_SCOPE_ALL,
      halakaLabel: scopeHalakaId ? halakaNameById.get(scopeHalakaId) || scopeHalakaId : 'كل الحلقات',
    },
    teacherRows,
    sessions,
    attendanceRecorded,
    attendanceByStudent,
    summary: {
      plans: plans.length,
      halakat: halakat.length,
      exams: exams.length,
      activities: activities.length,
      dawrat: dawrat.length,
      remoteTasmee: remoteTasmee.length,
      sessions: sessions.length,
      attendanceRecorded: attendanceRecorded.length,
      pagesRecorded: attendanceRecorded.reduce((sum, a) => sum + Math.max(0, Number(a.pagesCount) || 0), 0),
      studentsRecorded: attendanceByStudent.length,
    },
  }
}

export async function buildGroupReport(kind, entityId, range = {}) {
  const id = String(entityId || '').trim()
  if (!id) return null
  const [entity, members] = await Promise.all([
    firestoreApi.getData(canonicalRefByKind(kind, id)),
    membersLoaderByKind(kind)?.(id),
  ])
  if (!entity) return null
  const ownerUid = String(entity.ownerUid || '').trim()
  const ownerNameMap = ownerUid ? await loadUserNamesByIds([ownerUid]) : new Map()
  const ownerName = ownerNameMap.get(ownerUid) || ''
  const baseDetails = {
    id,
    name: entity.name || entity.title || entity.subject || entity.meetingCode || '',
    visibility:
      entity.halakaVisibility ||
      entity.planVisibility ||
      entity.activityVisibility ||
      entity.examVisibility ||
      entity.dawraVisibility ||
      entity.remoteTasmeeVisibility ||
      '',
    ownerName,
    createdAt: pickFirstDate(entity.createdAt, entity.createTimes),
    updatedAt: pickFirstDate(entity.updatedAt, entity.updatedTimes),
  }

  if (kind === 'halaka') {
    const sessionsRaw = await loadHalakaSessions(id)
    const sessions = sortByRecent(
      maybeFilterByRange(sessionsRaw, (s) => s.startedAt || s.createdAt || s.updatedAt, range),
      (s) => pickFirstDate(s.startedAt, s.updatedAt, s.createdAt),
    )
    const attendanceBySession = await Promise.all(
      sessions.map(async (s) => ({
        sessionId: s.id,
        rows: await loadSessionAttendance(id, s.id),
      })),
    )
    const attendanceRows = sortByRecent(
      attendanceBySession.flatMap((entry) =>
        (entry.rows || []).map((row) => ({ sessionId: entry.sessionId, ...row })),
      ),
      (a) => pickFirstDate(a.updatedAt, a.recordedAt, a.createdAt),
    )
    const pagesTotal = attendanceRows.reduce((sum, r) => sum + Math.max(0, Number(r.pagesCount) || 0), 0)
    const sessionTitleMap = new Map(
      sessions.map((s) => [String(s.id), String(s.title || '').trim() || 'جلسة']),
    )
    const memberNameMap = new Map(
      (members || []).map((m) => [String(m.userId || '').trim(), String(m.displayName || '').trim()]),
    )
    const extraUserIds = attendanceRows
      .map((a) => String(a.userId || '').trim())
      .filter((uid) => uid && !memberNameMap.has(uid))
    const userNameMap = await loadUserNamesByIds([...memberNameMap.keys(), ...extraUserIds])
    const enrichedAttendanceRows = attendanceRows.map((a) => {
      const uid = String(a.userId || '').trim()
      return {
        ...a,
        userName: memberNameMap.get(uid) || userNameMap.get(uid) || 'عضو',
        sessionTitle: sessionTitleMap.get(String(a.sessionId || '')) || 'جلسة',
      }
    })
    const memberDetails = await Promise.all(
      (members || []).map(async (m) => {
        const memberUid = String(m.userId || '').trim()
        const [mPlans, mHalakat, mExams, mActivities, mDawrat, mRemoteTasmee, mAwrad] = await Promise.all([
          loadUserMembershipRows(memberUid, 'plan'),
          loadUserMembershipRows(memberUid, 'halaka'),
          loadUserMembershipRows(memberUid, 'exam'),
          loadUserMembershipRows(memberUid, 'activity'),
          loadUserMembershipRows(memberUid, 'dawra'),
          loadUserMembershipRows(memberUid, 'remote_tasmee'),
          loadAwrad(memberUid),
        ])
        const memberAttendanceInHalaka = enrichedAttendanceRows.filter((a) => String(a.userId || '') === memberUid)
        const awradInRange = maybeFilterByRange(mAwrad, (r) => r.recordedAt || r.updatedAt || r.createdAt, range)
        return {
          userId: memberUid,
          displayName: m.displayName || memberUid,
          email: m.email || '',
          role: m.role || '',
          plansCount: mPlans.length,
          halakatCount: mHalakat.length,
          examsCount: mExams.length,
          activitiesCount: mActivities.length,
          dawratCount: mDawrat.length,
          remoteTasmeeCount: mRemoteTasmee.length,
          awradCount: awradInRange.length,
          pagesInAwrad: awradInRange.reduce((sum, r) => sum + Math.max(0, Number(r.pagesCount) || 0), 0),
          latestAwradAt: awradInRange
            .map((r) => pickFirstDate(r.recordedAt, r.updatedAt, r.createdAt))
            .sort((a, b) => asMs(b) - asMs(a))[0] || '',
          attendanceRecordsInHalaka: memberAttendanceInHalaka.length,
          pagesInHalakaSessions: memberAttendanceInHalaka.reduce((sum, a) => sum + Math.max(0, Number(a.pagesCount) || 0), 0),
          latestAttendanceAt: memberAttendanceInHalaka
            .map((a) => pickFirstDate(a.updatedAt, a.recordedAt))
            .sort((a, b) => asMs(b) - asMs(a))[0] || '',
        }
      }),
    )

    return {
      kind,
      entity: { id, ...entity },
      entityDetails: {
        ...baseDetails,
        location: entity.location || '',
      },
      members: members || [],
      memberDetails: [...memberDetails].sort(
        (a, b) =>
          (b.attendanceRecordsInHalaka - a.attendanceRecordsInHalaka) ||
          (b.pagesInHalakaSessions - a.pagesInHalakaSessions) ||
          (asMs(b.latestAttendanceAt) - asMs(a.latestAttendanceAt)),
      ),
      sessions,
      attendanceRows: enrichedAttendanceRows,
      summary: {
        members: (members || []).length,
        sessions: sessions.length,
        attendance: enrichedAttendanceRows.length,
        pagesTotal,
      },
    }
  }

  if (kind === 'plan') {
    const planRow = { id, ...entity }
    const memberDetails = await Promise.all(
      (members || []).map(async (m) => {
        const memberUid = String(m.userId || '').trim()
        const mAwrad = await loadAwrad(memberUid)
        const planAwrad = maybeFilterByRange(
          mAwrad.filter((w) => w.planId === id),
          (r) => r.recordedAt || r.updatedAt || r.createdAt,
          range,
        )
        const progress = computePlanProgress(planRow, mAwrad) || {
          achievedPages: 0,
          remainingPages: Number(planRow.totalTargetPages) || 0,
          progressPercent: 0,
          targetPages: Number(planRow.totalTargetPages) || 0,
        }
        return {
          userId: memberUid,
          displayName: m.displayName || memberUid,
          email: m.email || '',
          role: m.role || '',
          awradCount: planAwrad.length,
          pagesInAwrad: planAwrad.reduce((sum, r) => sum + Math.max(0, Number(r.pagesCount) || 0), 0),
          achievedPages: progress.achievedPages || 0,
          remainingPages: progress.remainingPages || 0,
          progressPercent: Math.round(progress.progressPercent || 0),
          targetPages: progress.targetPages || 0,
          latestAwradAt:
            planAwrad
              .map((r) => pickFirstDate(r.recordedAt, r.updatedAt, r.createdAt))
              .sort((a, b) => asMs(b) - asMs(a))[0] || '',
        }
      }),
    )
    const pagesTotal = memberDetails.reduce((sum, r) => sum + (r.pagesInAwrad || 0), 0)
    return {
      kind,
      entity: planRow,
      entityDetails: {
        ...baseDetails,
        dailyPages: entity.dailyPages || '',
        totalTargetPages: entity.totalTargetPages || '',
      },
      members: members || [],
      memberDetails: [...memberDetails].sort(
        (a, b) => (b.progressPercent - a.progressPercent) || (b.pagesInAwrad - a.pagesInAwrad),
      ),
      summary: {
        members: (members || []).length,
        awradRecords: memberDetails.reduce((sum, r) => sum + (r.awradCount || 0), 0),
        pagesTotal,
        avgProgress:
          memberDetails.length > 0
            ? Math.round(memberDetails.reduce((sum, r) => sum + (r.progressPercent || 0), 0) / memberDetails.length)
            : 0,
      },
    }
  }

  const memberDetails = buildSimpleMemberDetails(kind, members || [])
  return {
    kind,
    entity: { id, ...entity },
    entityDetails: {
      ...baseDetails,
      startAt: entity.startAt || entity.courseStart || entity.registrationStart || '',
      endAt: entity.endAt || entity.courseEnd || entity.registrationEnd || '',
      location: entity.location || entity.meetingUrl || '',
      provider: entity.provider || '',
      mediaType: entity.mediaType || '',
    },
    members: members || [],
    memberDetails,
    summary: buildGroupSummary(kind, members || [], memberDetails),
  }
}
