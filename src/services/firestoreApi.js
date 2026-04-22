import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { app } from "../firebase.js";

const db = getFirestore(app);

/**
 * FirestoreApi - JavaScript Service
 * - جميع عمليات الكتابة تمر عبر setData/updateData حصراً.
 * - لا توجد try/catch داخل الدوال (الأخطاء تذهب للمستدعي).
 * - التعليقات باللغة العربية.
 *
 * مسارات العضوية الثنائية (مدرسة أو منطقة = groupId):
 *   members/{groupId}/members/{userId}  ↔  Mygroup/{userId}/Mygroup/{groupId}
 * استخدم getGroupMembersCollection / getGroupMemberDoc و getUserMembershipMirror* فقط.
 *
 * الخطط (planId = معرف المستند الرئيسي):
 *   plans/{planId} — بيانات الخطة
 *   members/{planId}/members/{userId} — دور العضو على الخطة (owner | admin | member)
 *   Myplans/{userId}/Myplans/{planId} — مرآة ظهور الخطة في قائمة المستخدم
 * لجدول أعضاء الخطة استخدم getPlanMembersCollection / getPlanMemberDoc (نفس مسار members).
 *
 * الحلقات (halakaId):
 *   halakat/{halakaId} — بيانات الحلقة
 *   members/{halakaId}/members/{userId} — الأعضاء (نفس هيكل members للخطط)
 *   Myhalakat/{userId}/Myhalakat/{halakaId} — مرآة قائمة المستخدم
 *
 * الدورات (dawraId):
 *   dawrat/{dawraId} — بيانات الدورة
 *   members/{dawraId}/members/{userId} — الأعضاء
 *   Mydawrat/{userId}/Mydawrat/{dawraId} — مرآة قائمة المستخدم
 *
 * طلبات الالتحاق (profile request):
 *   MyProfile/{userId}/MyProfile/{userId}
 */
class FirestoreApi {
  static get Api() {
    return new FirestoreApi();
  }

  // ==============================
  // دوال مرجعية بسيطة
  // ==============================

  /** الحصول على ID جديد */
  getNewId(collectionName) {
    return doc(collection(db, collectionName)).id;
  }

  /** إرجاع مرجع لمجموعة */
  getCollection(collectionName) {
    return collection(db, collectionName);
  }

  /** إرجاع مرجع لمستند */
  getDocument(collectionName, documentId) {
    return doc(db, collectionName, documentId);
  }

  /** إرجاع مرجع لمجموعة فرعية */
  getSubCollection(collectionName, documentId, subCollectionName) {
    return collection(db, collectionName, documentId, subCollectionName);
  }

  /** إرجاع مرجع لمستند داخل مجموعة فرعية */
  getSubDocument(collectionName, documentId, subCollectionName, subDocumentId) {
    return doc(
      db,
      collectionName,
      documentId,
      subCollectionName,
      subDocumentId,
    );
  }

  /**
   * نمط موحّد لجداول فرعية مرتبطة بالمستخدم:
   * rootCollection/{userId}/rootCollection
   */
  getUserScopedCollection(rootCollection, userId) {
    return this.getSubCollection(rootCollection, userId, rootCollection);
  }

  /**
   * مستند داخل جدول فرعي مرتبط بالمستخدم:
   * rootCollection/{userId}/rootCollection/{docId}
   */
  getUserScopedDoc(rootCollection, userId, docId) {
    return this.getSubDocument(rootCollection, userId, rootCollection, docId);
  }

  /**
   * ربط ثنائي العضوية (مدرسة أو منطقة = groupId):
   * - members/{groupId}/members/{userId}
   * - Mygroup/{userId}/Mygroup/{groupId}
   * حذف المستخدم من members يجب أن يرافقه حذف مرآة Mygroup (أو عبر clearUserMembershipMirrors).
   */
  static USER_MEMBERSHIP_MIRROR_COLL = "Mygroup";
  static USER_MEMBERSHIP_MIRROR_SUB = "Mygroup";

  /** Mygroup/{userId}/Mygroup — مجموعة مرايا عضوية المستخدم */
  getUserMembershipMirrorCollection(userId) {
    return this.getSubCollection(
      FirestoreApi.USER_MEMBERSHIP_MIRROR_COLL,
      userId,
      FirestoreApi.USER_MEMBERSHIP_MIRROR_SUB,
    );
  }

  /** مستند مرآة واحد: Mygroup/{userId}/Mygroup/{groupId} */
  getUserMembershipMirrorDoc(userId, groupId) {
    return this.getSubDocument(
      FirestoreApi.USER_MEMBERSHIP_MIRROR_COLL,
      userId,
      FirestoreApi.USER_MEMBERSHIP_MIRROR_SUB,
      groupId,
    );
  }

  /** members/{groupId}/members — أعضاء المجموعة (مدرسة أو منطقة) */
  getGroupMembersCollection(groupId) {
    return this.getSubCollection("members", groupId, "members");
  }

  /** members/{groupId}/members/{userId} */
  getGroupMemberDoc(groupId, userId) {
    return this.getSubDocument("members", groupId, "members", userId);
  }

  // ==============================
  // مسارات الإشعارات والمحادثات
  // ==============================

  /** notifications */
  getNotificationsCollection() {
    return this.getCollection("notifications");
  }

  /** notifications/{notificationId} */
  getNotificationDoc(notificationId) {
    return this.getDocument("notifications", notificationId);
  }

  static USER_NOTIFICATION_COLL = "notifications";
  static USER_NOTIFICATION_SUB = "notifications";

  /** notifications/{userId}/notifications */
  getUserNotificationsCollection(userId) {
    return this.getSubCollection(
      FirestoreApi.USER_NOTIFICATION_COLL,
      userId,
      FirestoreApi.USER_NOTIFICATION_SUB,
    );
  }

  /** notifications/{userId}/notifications/{notificationId} */
  getUserNotificationDoc(userId, notificationId) {
    return this.getSubDocument(
      FirestoreApi.USER_NOTIFICATION_COLL,
      userId,
      FirestoreApi.USER_NOTIFICATION_SUB,
      notificationId,
    );
  }

  /** conversations */
  getConversationsCollection() {
    return this.getCollection("conversations");
  }

  /** conversations/{conversationId} */
  getConversationDoc(conversationId) {
    return this.getDocument("conversations", conversationId);
  }

  /**
   * messages/{conversationId}/messages
   * المسار المعتمد للرسائل المرتبطة بمحادثة.
   */
  getConversationMessagesCollection(conversationId) {
    return this.getSubCollection("messages", conversationId, "messages");
  }

  /** messages/{conversationId}/messages/{messageId} */
  getConversationMessageDoc(conversationId, messageId) {
    return this.getSubDocument(
      "messages",
      conversationId,
      "messages",
      messageId,
    );
  }

  // ==============================
  // مستخدمون، محتوى، هيكل جغرافي، تقارير
  // ==============================

  /** users */
  getUsersCollection() {
    return this.getCollection("users");
  }

  /** users/{userId} */
  getUserDoc(userId) {
    return this.getDocument("users", userId);
  }

  /** permission_profiles — أنواع المستخدمين وصلاحيات الصفحات */
  getPermissionProfilesCollection() {
    return this.getCollection("permission_profiles");
  }

  /** permission_profiles/{profileId} */
  getPermissionProfileDoc(profileId) {
    return this.getDocument("permission_profiles", profileId);
  }

  /** plan_types — أنواع الخطط (إعدادات عامة للموقع) */
  getPlanTypesCollection() {
    return this.getCollection("plan_types");
  }

  /** plan_types/{id} */
  getPlanTypeDoc(planTypeId) {
    return this.getDocument("plan_types", planTypeId);
  }

  /** plans — مجموعة جذر الخطط */
  getPlansCollection() {
    return this.getCollection("plans");
  }

  /** plans/{planId} — المستند الرئيسي للخطة */
  getPlanCanonicalDoc(planId) {
    return this.getDocument("plans", planId);
  }

  /** members/{planId}/members — أعضاء خطة (نفس هيكل members للمجموعات) */
  getPlanMembersCollection(planId) {
    return this.getGroupMembersCollection(planId);
  }

  /** members/{planId}/members/{userId} */
  getPlanMemberDoc(planId, userId) {
    return this.getGroupMemberDoc(planId, userId);
  }

  static USER_PLAN_MIRROR_COLL = "Myplans";
  static USER_PLAN_MIRROR_SUB = "Myplans";

  /** site_config/main — هوية الموقع والنصوص الثابتة */
  getSiteConfigDoc() {
    return this.getDocument("site_config", "main");
  }

  /** Myplans/{userId}/Myplans — مرايا الخطط في قائمة المستخدم */
  getUserPlansCollection(userId) {
    return this.getSubCollection(
      FirestoreApi.USER_PLAN_MIRROR_COLL,
      userId,
      FirestoreApi.USER_PLAN_MIRROR_SUB,
    );
  }

  /** Myplans/{userId}/Myplans/{planId} */
  getUserPlanDoc(userId, planId) {
    return this.getSubDocument(
      FirestoreApi.USER_PLAN_MIRROR_COLL,
      userId,
      FirestoreApi.USER_PLAN_MIRROR_SUB,
      planId,
    );
  }

  /** halakat — جذر الحلقات */
  getHalakatCollection() {
    return this.getCollection("halakat");
  }

  /** halakat/{halakaId} */
  getHalakaCanonicalDoc(halakaId) {
    return this.getDocument("halakat", halakaId);
  }

  static USER_HALAKAT_MIRROR_COLL = "Myhalakat";
  static USER_HALAKAT_MIRROR_SUB = "Myhalakat";

  /** Myhalakat/{userId}/Myhalakat */
  getUserHalakatCollection(userId) {
    return this.getSubCollection(
      FirestoreApi.USER_HALAKAT_MIRROR_COLL,
      userId,
      FirestoreApi.USER_HALAKAT_MIRROR_SUB,
    );
  }

  /** Myhalakat/{userId}/Myhalakat/{halakaId} */
  getUserHalakatDoc(userId, halakaId) {
    return this.getSubDocument(
      FirestoreApi.USER_HALAKAT_MIRROR_COLL,
      userId,
      FirestoreApi.USER_HALAKAT_MIRROR_SUB,
      halakaId,
    );
  }

  /** dawrat — جذر الدورات */
  getDawratCollection() {
    return this.getCollection("dawrat");
  }

  /** dawrat/{dawraId} */
  getDawraCanonicalDoc(dawraId) {
    return this.getDocument("dawrat", dawraId);
  }

  static USER_DAWRA_MIRROR_COLL = "Mydawrat";
  static USER_DAWRA_MIRROR_SUB = "Mydawrat";

  static USER_PROFILE_REQUEST_COLL = "MyProfile";
  static USER_PROFILE_REQUEST_SUB = "MyProfile";

  /** Mydawrat/{userId}/Mydawrat */
  getUserDawratCollection(userId) {
    return this.getSubCollection(
      FirestoreApi.USER_DAWRA_MIRROR_COLL,
      userId,
      FirestoreApi.USER_DAWRA_MIRROR_SUB,
    );
  }

  /** Mydawrat/{userId}/Mydawrat/{dawraId} */
  getUserDawratDoc(userId, dawraId) {
    return this.getSubDocument(
      FirestoreApi.USER_DAWRA_MIRROR_COLL,
      userId,
      FirestoreApi.USER_DAWRA_MIRROR_SUB,
      dawraId,
    );
  }

  /** MyProfile/{userId}/MyProfile */
  getUserProfileRequestCollection(userId) {
    return this.getSubCollection(
      FirestoreApi.USER_PROFILE_REQUEST_COLL,
      userId,
      FirestoreApi.USER_PROFILE_REQUEST_SUB,
    );
  }

  /** MyProfile/{userId}/MyProfile/{userId} */
  getUserProfileRequestDoc(userId) {
    return this.getSubDocument(
      FirestoreApi.USER_PROFILE_REQUEST_COLL,
      userId,
      FirestoreApi.USER_PROFILE_REQUEST_SUB,
      userId,
    );
  }

  /** awrad/{userId}/awrad */
  getUserAwradCollection(userId) {
    return this.getUserScopedCollection("awrad", userId);
  }

  /** awrad/{userId}/awrad/{wirdId} */
  getUserWirdDoc(userId, wirdId) {
    return this.getUserScopedDoc("awrad", userId, wirdId);
  }

  /** supervisor_assignments/{userId} */
  getSupervisorAssignmentDoc(userId) {
    return this.getDocument("supervisor_assignments", userId);
  }

  /** governorates */
  getGovernoratesCollection() {
    return this.getCollection("governorates");
  }

  /** governorates/{governorateId} */
  getGovernorateDoc(governorateId) {
    return this.getDocument("governorates", governorateId);
  }

  /** regions/{governorateId}/regions */
  getRegionsSubcollection(governorateId) {
    return this.getSubCollection("regions", governorateId, "regions");
  }

  /** regions/{governorateId}/regions/{regionId} */
  getRegionDoc(governorateId, regionId) {
    return this.getSubDocument("regions", governorateId, "regions", regionId);
  }

  /** villages/{regionId}/villages */
  getVillagesSubcollection(regionId) {
    return this.getSubCollection("villages", regionId, "villages");
  }

  /** villages/{regionId}/villages/{villageId} */
  getVillageDoc(regionId, villageId) {
    return this.getSubDocument("villages", regionId, "villages", villageId);
  }

  /** schools/{villageId}/schools */
  getSchoolsSubcollection(villageId) {
    return this.getSubCollection("schools", villageId, "schools");
  }

  /** schools/{villageId}/schools/{schoolId} */
  getSchoolDoc(villageId, schoolId) {
    return this.getSubDocument("schools", villageId, "schools", schoolId);
  }

  /** students/{schoolId}/students */
  getSchoolStudentsCollection(schoolId) {
    return this.getSubCollection("students", schoolId, "students");
  }

  /** students/{schoolId}/students/{studentId} */
  getSchoolStudentDoc(schoolId, studentId) {
    return this.getSubDocument("students", schoolId, "students", studentId);
  }

  /** curriculum */
  getCurriculumCollection() {
    return this.getCollection("curriculum");
  }

  /** curriculum/{subjectId} */
  getCurriculumDoc(subjectId) {
    return this.getDocument("curriculum", subjectId);
  }

  /** new_muslims */
  getNewMuslimsCollection() {
    return this.getCollection("new_muslims");
  }

  /** new_muslims/{id} */
  getNewMuslimDoc(id) {
    return this.getDocument("new_muslims", id);
  }

  /** reports/{supervisorId}/reports — زيارات المشرف */
  getSupervisorReportsCollection(supervisorId) {
    return this.getSubCollection("reports", supervisorId, "reports");
  }

  /** reports/{supervisorId}/reports/{reportId} */
  getSupervisorReportDoc(supervisorId, reportId) {
    return this.getSubDocument("reports", supervisorId, "reports", reportId);
  }

  /** teacher_daily_logs/{teacherId}/teacher_daily_logs */
  getTeacherDailyLogsCollection(teacherId) {
    return this.getSubCollection(
      "teacher_daily_logs",
      teacherId,
      "teacher_daily_logs",
    );
  }

  /** teacher_daily_logs/{teacherId}/teacher_daily_logs/{logId} */
  getTeacherDailyLogDoc(teacherId, logId) {
    return this.getSubDocument(
      "teacher_daily_logs",
      teacherId,
      "teacher_daily_logs",
      logId,
    );
  }

  /** teacher_reports/{teacherId}/teacher_reports */
  getTeacherReportsCollection(teacherId) {
    return this.getSubCollection(
      "teacher_reports",
      teacherId,
      "teacher_reports",
    );
  }

  /** teacher_reports/{teacherId}/teacher_reports/{reportId} */
  getTeacherReportDoc(teacherId, reportId) {
    return this.getSubDocument(
      "teacher_reports",
      teacherId,
      "teacher_reports",
      reportId,
    );
  }

  /** daily-logs/{userId}/logs — مسار قديم لسجلات المستخدم */
  getUserDailyLogsCollection(userId) {
    return this.getSubCollection("daily-logs", userId, "logs");
  }

  /**
   * صندوق إشعارات المستخدم (بدون orderBy لتفادي فهرس مركّب؛ رتّب في الواجهة).
   */
  getNotificationsInboxQuery(userId) {
    return query(
      this.getNotificationsCollection(),
      where("toUserId", "==", userId),
    );
  }

  /**
   * محادثات يظهر فيها المستخدم كمشارك (array-contains).
   */
  getConversationsInboxQuery(userId) {
    return query(
      this.getConversationsCollection(),
      where("participants", "array-contains", userId),
    );
  }

  /**
   * رسائل محادثة واحدة مرتبة حسب createdAt تصاعدياً.
   */
  getConversationMessagesQuery(conversationId) {
    return query(
      this.getConversationMessagesCollection(conversationId),
      orderBy("createdAt", "asc"),
    );
  }

  /**
   * اشتراك لحظي: يعيد دالة إلغاء الاشتراك.
   */
  subscribeSnapshot(refOrQuery, onNext, onError) {
    return onSnapshot(refOrQuery, onNext, onError);
  }

  /**
   * معرّف المدرسة النشطة: من users.schoolId أو أول schoolId في مرايا Mygroup.
   */
  async resolveUserSchoolId(user) {
    const uid = user?.uid ?? user?.id;
    if (!uid) return "";
    if (user?.schoolId) return user.schoolId;
    const docs = await this.getDocuments(
      this.getUserMembershipMirrorCollection(uid),
    );
    for (const d of docs) {
      const sid = d.data()?.schoolId;
      if (sid) return sid;
    }
    return "";
  }

  /**
   * يحذف مرايا Mygroup فقط، ومعها members/{groupId}/members/{userId}
   */
  async clearUserMembershipMirrors(userId) {
    const snapDocs = await this.getDocuments(
      this.getUserMembershipMirrorCollection(userId),
    );
    for (const docSnap of snapDocs) {
      const data = docSnap.data();
      const groupId = data.schoolId || data.regionId || docSnap.id;
      if (groupId) {
        await this.deleteData(this.getGroupMemberDoc(groupId, userId));
      }
      await this.deleteData(docSnap.ref);
    }
  }

  // ==============================
  // دوال CRUD الأساسية
  // ==============================

  /** إنشاء أو تعيين بيانات مستند - النقطة المركزية للكتابة */
  async setData({ docRef, data, merge = true, userData = {} }) {
    const newData = {
      ...data,
      createdByName: userData.displayName || "",
      createdByImageUrl: userData.photoURL || "",
      createdBy: userData.uid || "",
      createTimes: serverTimestamp(),
      updatedTimes: serverTimestamp(),
    };

    await setDoc(docRef, newData, { merge });
  }

  /** تحديث بيانات مستند - النقطة المركزية للتحديث */
  async updateData({ docRef, data, userData = {} }) {
    const updatedData = { ...data };

    // التحقق من الحقول الأساسية وإضافتها إذا كانت ناقصة
    if (!updatedData.updateByName) {
      updatedData.updateByName = userData.displayName || "";
    }
    if (!updatedData.updateByImageUrl) {
      updatedData.updateByImageUrl = userData.photoURL || "";
    }

    updatedData.updatedTimes = serverTimestamp();

    await updateDoc(docRef, updatedData);
  }

  /** جلب بيانات مستند */
  async getData(docRef) {
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
  }

  /** حذف مستند */
  async deleteData(docRef) {
    await deleteDoc(docRef);
  }

  // ==============================
  // دوال التعامل مع المجموعات (Queries)
  // ==============================

  /** جلب مستندات من مجموعة مع فلترة */
  async getDocuments(colRef, { whereField, isEqualTo, limitCount } = {}) {
    let q = colRef;
    if (whereField) {
      q = query(q, where(whereField, "==", isEqualTo));
    }
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs;
  }

  /** تدفق مباشر (Stream/Snapshots) للمجموعة */
  collectionStream(
    colRef,
    { whereField, isEqualTo, limitCount, orderField, descending = false } = {},
  ) {
    let q = colRef;
    if (whereField) {
      q = query(q, where(whereField, "==", isEqualTo));
    }
    if (orderField) {
      q = query(q, orderBy(orderField, descending ? "desc" : "asc"));
    }
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    return onSnapshot(q, (snapshot) => snapshot);
  }

  /** جلب جميع المستندات في مجموعة عبر جميع المسارات (Collection Group) */
  async getCollectionGroupDocuments(collectionName) {
    const q = query(collectionGroup(db, collectionName));
    const snapshot = await getDocs(q);
    return snapshot.docs;
  }

  // ==============================
  // دوال إحصائية (Count)
  // ==============================

  /** جلب عدد المستندات في مجموعة بشكل سريع */
  async getCollectionCount(collectionPath) {
    const colRef = collection(db, collectionPath);
    const snapshot = await getCountFromServer(colRef);
    return snapshot.data().count;
  }

  /** جلب عدد المستندات في مجموعة فرعية */
  async getSubCollectionCount(parentCol, parentId, subCol) {
    const colRef = collection(db, parentCol, parentId, subCol);
    const snapshot = await getCountFromServer(colRef);
    return snapshot.data().count;
  }

  /** جلب عدد جميع المستندات في Collection Group */
  async getAllCount(collectionName) {
    const q = query(collectionGroup(db, collectionName));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  }
}

export default FirestoreApi;
export const firestoreApi = FirestoreApi.Api;
