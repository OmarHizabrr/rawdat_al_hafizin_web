import { subscribeAllUsers } from './adminUsersService.js'
import { firestoreApi } from './firestoreApi.js'
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

export function loadUsersDirectory() {
  return new Promise((resolve) => {
    const unsub = subscribeAllUsers(
      (rows) => {
        resolve(rows || [])
        unsub()
      },
      () => {
        resolve([])
        unsub()
      },
    )
  })
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
      return {
        id: docSnap.id,
        ...canonical,
        [roleField]: mirror.role || '',
        joinedAt: mirror.joinedAt || '',
      }
    }),
  )
  return rows.filter(Boolean)
}

export async function buildStudentReport(user, range = {}) {
  const uid = String(user?.uid || '').trim()
  if (!uid) return null
  const [plans, halakat, exams, activities, dawrat, remoteTasmee, awradDocs, notificationsDocs] = await Promise.all([
    loadUserMembershipRows(uid, 'plan'),
    loadUserMembershipRows(uid, 'halaka'),
    loadUserMembershipRows(uid, 'exam'),
    loadUserMembershipRows(uid, 'activity'),
    loadUserMembershipRows(uid, 'dawra'),
    loadUserMembershipRows(uid, 'remote_tasmee'),
    loadAwrad(uid),
    firestoreApi.getDocuments(firestoreApi.getUserNotificationsCollection(uid)),
  ])

  const awrad = maybeFilterByRange(awradDocs, (r) => r.recordedAt || r.updatedAt || r.createdAt, range)
  const notifications = maybeFilterByRange(
    notificationsDocs.map((d) => ({ id: d.id, ...d.data() })),
    (r) => r.createdAt || r.updatedAt,
    range,
  )

  return {
    kind: 'student',
    entity: user,
    modules: { plans, halakat, exams, activities, dawrat, remoteTasmee },
    awrad,
    notifications,
    summary: {
      plans: plans.length,
      halakat: halakat.length,
      exams: exams.length,
      activities: activities.length,
      dawrat: dawrat.length,
      remoteTasmee: remoteTasmee.length,
      awrad: awrad.length,
      notifications: notifications.length,
      totalPages: awrad.reduce((sum, r) => sum + Math.max(0, Number(r.pagesCount) || 0), 0),
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

  if (kind === 'halaka') {
    const sessionsRaw = await loadHalakaSessions(id)
    const sessions = maybeFilterByRange(sessionsRaw, (s) => s.startedAt || s.createdAt || s.updatedAt, range)
    const attendanceBySession = await Promise.all(
      sessions.map(async (s) => ({
        sessionId: s.id,
        rows: await loadSessionAttendance(id, s.id),
      })),
    )
    const attendanceRows = attendanceBySession.flatMap((entry) =>
      (entry.rows || []).map((row) => ({ sessionId: entry.sessionId, ...row })),
    )
    const pagesTotal = attendanceRows.reduce((sum, r) => sum + Math.max(0, Number(r.pagesCount) || 0), 0)
    return {
      kind,
      entity: { id, ...entity },
      members: members || [],
      sessions,
      attendanceRows,
      summary: {
        members: (members || []).length,
        sessions: sessions.length,
        attendance: attendanceRows.length,
        pagesTotal,
      },
    }
  }

  return {
    kind,
    entity: { id, ...entity },
    members: members || [],
    summary: {
      members: (members || []).length,
    },
  }
}
