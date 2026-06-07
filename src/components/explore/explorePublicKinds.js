import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry.js'
import {
  EXPLORE_SORT_OPTIONS,
  filterPublicPlansBySearch,
  sortPublicPlans,
  subscribePublicPlansForExplore,
} from '../../services/explorePlansService.js'
import {
  EXPLORE_SORT_OPTIONS as HALAKAT_SORT,
  filterPublicHalakatBySearch,
  sortPublicHalakat,
  subscribePublicHalakatForExplore,
} from '../../services/exploreHalakatService.js'
import {
  EXPLORE_SORT_OPTIONS as REMOTE_SORT,
  filterPublicRemoteTasmeeBySearch,
  sortPublicRemoteTasmee,
  subscribePublicRemoteTasmeeForExplore,
} from '../../services/exploreRemoteTasmeeService.js'
import {
  EXPLORE_SORT_OPTIONS as EXAMS_SORT,
  filterPublicExamsBySearch,
  sortPublicExams,
  subscribePublicExamsForExplore,
} from '../../services/exploreExamsService.js'
import {
  EXPLORE_SORT_OPTIONS as DAWRAT_SORT,
  filterPublicDawratBySearch,
  sortPublicDawrat,
  subscribePublicDawratForExplore,
} from '../../services/exploreDawratService.js'
import {
  EXPLORE_SORT_OPTIONS as ACTIVITIES_SORT,
  filterPublicActivitiesBySearch,
  sortPublicActivities,
  subscribePublicActivitiesForExplore,
} from '../../services/exploreActivitiesService.js'
import { joinPublicPlan, loadPlans } from '../../utils/plansStorage.js'
import { joinPublicHalaka, loadHalakat } from '../../utils/halakatStorage.js'
import { joinPublicRemoteTasmee, loadRemoteTasmeeBroadcasts } from '../../utils/remoteTasmeeStorage.js'
import { joinPublicExam, loadExams } from '../../utils/examsStorage.js'
import { joinPublicDawra, loadDawrat } from '../../utils/dawratStorage.js'
import { joinPublicActivity, loadActivities } from '../../utils/activitiesStorage.js'

/** @typedef {'plans'|'halakat'|'remote_tasmee'|'exams'|'dawrat'|'activities'} ExploreKind */

/** @type {ExploreKind[]} */
export const EXPLORE_KINDS = ['plans', 'halakat', 'remote_tasmee', 'exams', 'dawrat', 'activities']

/** @type {Record<ExploreKind, {
 *   permissionPageId: string,
 *   title: string,
 *   description: string,
 *   searchHint: string,
 *   joinByIdLabel: string,
 *   joinByIdPlaceholder: string,
 *   countLabel: (shown: number, total: number) => string,
 *   emptyNone: string,
 *   emptyFilter: string,
 *   sortOptions: { value: string, label: string }[],
 *   subscribe: (onNext: (rows: unknown[]) => void, onError?: (e: unknown) => void) => () => void,
 *   filter: (rows: unknown[], q: string) => unknown[],
 *   sort: (rows: unknown[], sortValue: string) => unknown[],
 *   loadMyIds: (viewUserId: string) => Promise<Set<string>>,
 *   join: (viewUserId: string, id: string, user: object) => Promise<void>,
 *   joinErrorToast: (message: string | undefined, toast: { success: Function, warning: Function, info: Function }, str?: (k: string) => string) => void,
 * }>} */
export const EXPLORE_KIND_CONFIG = {
  plans: {
    permissionPageId: PERMISSION_PAGE_IDS.plans_explore,
    title: 'استكشاف الخطط العامة',
    description: 'خطط معلنة للجميع. ابحث ثم انضم من البطاقة أو بإدخال رمز الخطة.',
    searchHint: 'الاسم، رمز الخطة، نوع الخطة، المجلدات، أو المنشئ',
    joinByIdLabel: 'الانضمام برمز الخطة',
    joinByIdPlaceholder: 'أدخل رمز الخطة هنا…',
    countLabel: (shown, total) =>
      shown === total ? `${total} خطة عامة` : `${shown} من ${total} خطة`,
    emptyNone: 'لا توجد خطط عامة بعد، أو لا تملك صلاحية قراءتها.',
    emptyFilter: 'جرّب تغيير عبارة البحث أو الترتيب.',
    sortOptions: EXPLORE_SORT_OPTIONS,
    subscribe: subscribePublicPlansForExplore,
    filter: filterPublicPlansBySearch,
    sort: sortPublicPlans,
    loadMyIds: async (uid) => {
      const rows = await loadPlans(uid)
      return new Set((rows || []).map((p) => p.id).filter(Boolean))
    },
    join: joinPublicPlan,
    joinErrorToast: (m, toast) => {
      if (m === 'PLAN_NOT_PUBLIC') toast.warning('هذه الخطة ليست عامة.', '')
      else if (m === 'ALREADY_MEMBER') toast.info('أنت مضاف مسبقاً.', '')
      else if (m === 'PLAN_NOT_FOUND') toast.warning('لم يُعثر على خطة بهذا الرمز.', '')
      else toast.warning('تعذر الانضمام.', '')
    },
  },
  halakat: {
    permissionPageId: PERMISSION_PAGE_IDS.halakat_explore,
    title: 'استكشاف الحلقات العامة',
    description: 'حلقات معلنة للجميع. ابحث ثم انضم من البطاقة أو بإدخال رمز الحلقة.',
    searchHint: 'الاسم، رمز الحلقة، المكان، أو المنشئ',
    joinByIdLabel: 'الانضمام برمز الحلقة',
    joinByIdPlaceholder: 'أدخل رمز الحلقة هنا…',
    countLabel: (shown, total) =>
      shown === total ? `${total} حلقة عامة` : `${shown} من ${total} حلقة`,
    emptyNone: 'لا توجد حلقات عامة بعد، أو لا تملك صلاحية قراءتها.',
    emptyFilter: 'جرّب تغيير عبارة البحث أو الترتيب.',
    sortOptions: HALAKAT_SORT,
    subscribe: subscribePublicHalakatForExplore,
    filter: filterPublicHalakatBySearch,
    sort: sortPublicHalakat,
    loadMyIds: async (uid) => {
      const rows = await loadHalakat(uid)
      return new Set((rows || []).map((p) => p.id).filter(Boolean))
    },
    join: joinPublicHalaka,
    joinErrorToast: (m, toast) => {
      if (m === 'HALAKA_NOT_PUBLIC') toast.warning('هذه الحلقة ليست عامة.', '')
      else if (m === 'ALREADY_MEMBER') toast.info('أنت مضاف مسبقاً.', '')
      else if (m === 'HALAKA_NOT_FOUND') toast.warning('لم يُعثر على حلقة بهذا الرمز.', '')
      else toast.warning('تعذر الانضمام.', '')
    },
  },
  remote_tasmee: {
    permissionPageId: PERMISSION_PAGE_IDS.remote_tasmee_explore,
    title: 'استكشاف التسميع عن بعد العام',
    description: 'بثوث معلنة للجميع. ابحث ثم انضم من البطاقة أو بإدخال رمز البث.',
    searchHint: 'العنوان، رمز البث، المنصة، أو المنشئ',
    joinByIdLabel: 'الانضمام برمز البث',
    joinByIdPlaceholder: 'أدخل رمز البث هنا…',
    countLabel: (shown, total) =>
      shown === total ? `${total} بث عام` : `${shown} من ${total} بث`,
    emptyNone: 'لا توجد بثوث عامة بعد، أو لا تملك صلاحية قراءتها.',
    emptyFilter: 'جرّب تغيير عبارة البحث أو الترتيب.',
    sortOptions: REMOTE_SORT,
    subscribe: subscribePublicRemoteTasmeeForExplore,
    filter: filterPublicRemoteTasmeeBySearch,
    sort: sortPublicRemoteTasmee,
    loadMyIds: async (uid) => {
      const rows = await loadRemoteTasmeeBroadcasts(uid)
      return new Set((rows || []).map((p) => p.id).filter(Boolean))
    },
    join: joinPublicRemoteTasmee,
    joinErrorToast: (m, toast) => {
      if (m === 'REMOTE_TASMEE_NOT_PUBLIC') toast.warning('هذا البث ليس عاماً.', '')
      else if (m === 'ALREADY_MEMBER') toast.info('أنت مضاف مسبقاً.', '')
      else if (m === 'REMOTE_TASMEE_NOT_FOUND') toast.warning('لم يُعثر على بث بهذا الرمز.', '')
      else toast.warning('تعذر الانضمام.', '')
    },
  },
  exams: {
    permissionPageId: PERMISSION_PAGE_IDS.exams_explore,
    title: 'استكشاف مجموعات الاختبار العامة',
    description: 'مجموعات اختبار معلنة للجميع. ابحث ثم انضم من البطاقة أو بإدخال رمز المجموعة.',
    searchHint: 'الاسم، رمز المجموعة، أو المنشئ',
    joinByIdLabel: 'الانضمام برمز المجموعة',
    joinByIdPlaceholder: 'أدخل رمز المجموعة هنا…',
    countLabel: (shown, total) =>
      shown === total ? `${total} مجموعة عامة` : `${shown} من ${total} مجموعة`,
    emptyNone: 'لا توجد مجموعات عامة بعد، أو لا تملك صلاحية قراءتها.',
    emptyFilter: 'جرّب تغيير عبارة البحث أو الترتيب.',
    sortOptions: EXAMS_SORT,
    subscribe: subscribePublicExamsForExplore,
    filter: filterPublicExamsBySearch,
    sort: sortPublicExams,
    loadMyIds: async (uid) => {
      const rows = await loadExams(uid)
      return new Set((rows || []).map((p) => p.id).filter(Boolean))
    },
    join: joinPublicExam,
    joinErrorToast: (m, toast) => {
      if (m === 'EXAM_NOT_PUBLIC') toast.warning('هذه المجموعة ليست عامة.', '')
      else if (m === 'ALREADY_MEMBER') toast.info('أنت مضاف مسبقاً.', '')
      else if (m === 'EXAM_NOT_FOUND') toast.warning('لم يُعثر على مجموعة بهذا الرمز.', '')
      else toast.warning('تعذر الانضمام.', '')
    },
  },
  dawrat: {
    permissionPageId: PERMISSION_PAGE_IDS.dawrat_explore,
    title: 'استكشاف الدورات العامة',
    description: 'دورات معلنة للجميع. ابحث ثم انضم من البطاقة أو بإدخال رمز الدورة.',
    searchHint: 'العنوان، الوصف، التكلفة، أو المنشئ',
    joinByIdLabel: 'الانضمام برمز الدورة',
    joinByIdPlaceholder: 'أدخل رمز الدورة هنا…',
    countLabel: (shown, total) =>
      shown === total ? `${total} دورة عامة` : `${shown} من ${total} دورة`,
    emptyNone: 'لا توجد دورات عامة بعد، أو لا تملك صلاحية قراءتها.',
    emptyFilter: 'جرّب تغيير عبارة البحث أو الترتيب.',
    sortOptions: DAWRAT_SORT,
    subscribe: subscribePublicDawratForExplore,
    filter: filterPublicDawratBySearch,
    sort: sortPublicDawrat,
    loadMyIds: async (uid) => {
      const rows = await loadDawrat(uid)
      return new Set((rows || []).map((p) => p.id).filter(Boolean))
    },
    join: joinPublicDawra,
    joinErrorToast: (m, toast) => {
      if (m === 'DAWRA_NOT_PUBLIC') toast.warning('هذه الدورة ليست عامة.', '')
      else if (m === 'ALREADY_MEMBER') toast.info('أنت مضاف مسبقاً.', '')
      else if (m === 'DAWRA_NOT_FOUND') toast.warning('لم يُعثر على دورة بهذا الرمز.', '')
      else toast.warning('تعذر الانضمام.', '')
    },
  },
  activities: {
    permissionPageId: PERMISSION_PAGE_IDS.activities_explore,
    title: 'استكشاف الأنشطة العامة',
    description: 'أنشطة معلنة للجميع. ابحث ثم انضم من البطاقة أو بإدخال رمز النشاط.',
    searchHint: 'الاسم، المكان، الموعد، أو المنشئ',
    joinByIdLabel: 'الانضمام برمز النشاط',
    joinByIdPlaceholder: 'أدخل رمز النشاط هنا…',
    countLabel: (shown, total) =>
      shown === total ? `${total} نشاط عام` : `${shown} من ${total} نشاط`,
    emptyNone: 'لا توجد أنشطة عامة بعد، أو لا تملك صلاحية قراءتها.',
    emptyFilter: 'جرّب تغيير عبارة البحث أو الترتيب.',
    sortOptions: ACTIVITIES_SORT,
    subscribe: subscribePublicActivitiesForExplore,
    filter: filterPublicActivitiesBySearch,
    sort: sortPublicActivities,
    loadMyIds: async (uid) => {
      const rows = await loadActivities(uid)
      return new Set((rows || []).map((p) => p.id).filter(Boolean))
    },
    join: joinPublicActivity,
    joinErrorToast: (m, toast, str) => {
      if (m === 'ACTIVITY_NOT_PUBLIC') {
        toast.warning(str?.('activities.explore.toast_join_not_public_by_id') || 'ليست عامة.', '')
      } else if (m === 'ALREADY_MEMBER') {
        toast.info(str?.('activities.toast_join_already') || 'أنت مضاف مسبقاً.', '')
      } else if (m === 'ACTIVITY_NOT_FOUND') {
        toast.warning(str?.('activities.toast_join_not_found') || 'لم يُعثر على نشاط.', '')
      } else toast.warning(str?.('activities.toast_join_fail') || 'تعذر الانضمام.', '')
    },
  },
}
