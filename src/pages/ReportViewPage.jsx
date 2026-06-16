import { CalendarDate } from "@internationalized/date";
import {
  ArrowLeft,
  Calendar,
  Download,
  Eye,
  FileText,
  FilterX,
  Link2,
  Printer,
  RefreshCw,
  Share2,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CrossNav } from "../components/CrossNav.jsx";
import { PrintDocumentChrome } from "../components/PrintDocumentChrome.jsx";
import { ReportExecutiveSummary } from "../components/ReportExecutiveSummary.jsx";
import { ReportQuickLink } from "../components/ReportQuickLink.jsx";
import { HapticLink } from "../ui/HapticLink.jsx";
import {
  REPORT_KIND_OPTIONS,
  REPORT_KIND_PERMISSION,
  REPORT_RANGE_PRESETS,
  REPORT_SCOPE_ALL,
  ADMIN_REPORT_KIND_ORDER,
  reportKindUsesDateFilter,
  reportKindIsPersonAutoReport,
  reportPersonSelectHintKey,
  reportPersonPeriodAutoKey,
  reportPersonEmptyKey,
} from "../config/reportKinds.js";
import { PERMISSION_PAGE_IDS } from "../config/permissionRegistry.js";
import { isAdmin } from "../config/roles.js";
import { useAuth } from "../context/useAuth.js";
import { usePermissions } from "../context/usePermissions.js";
import { useSiteContent } from "../context/useSiteContent.js";
import { useHidePlanNavigation } from "../hooks/useHidePlanNavigation.js";
import {
  buildGroupReport,
  buildMultiStudentReport,
  buildStudentReport,
  buildTeacherReport,
  isCentralReportsMode,
  listEntitiesByKind,
  loadTeachersDirectory,
  loadUsersDirectory,
} from "../services/reportsService.js";
import {
  getImpersonateUid,
  withImpersonationQuery,
} from "../utils/impersonation.js";
import { canViewCreator } from "../utils/viewCreatorPermission.js";
import {
  HIJRI,
  formatHijriYmd,
  gregorianYmdStringToHijriYmd,
  hijriYmdLocalDayEndIso,
  hijriYmdLocalDayStartIso,
  localHijriYmd,
  parseHijriYmdString,
} from "../utils/hijriDates.js";
import { elementToPdfBlob, shareOrDownloadPdf } from "../utils/reportPdf.js";
import {
  entityDetailsColumnsForKind,
  formatEntityDetailsForReport,
  formatPlanVolumesForReport,
  reportAttendanceStatusLabel,
  reportMediaTypeLabel,
  reportNotificationTypeLabel,
  reportPersonLabel,
  reportProviderLabel,
  reportSessionStatusLabel,
  reportVisibilityLabel,
} from "../utils/reportDisplayLabels.js";
import { buildReportExecutiveSummary } from "../utils/reportExecutiveSummary.js";
import {
  collectPrintKpisFromReport,
  collectPrintSectionsFromReport,
  filterPrintSectionsByTab,
} from "../utils/reportPrintSections.js";
import {
  printMultiSectionReport,
  printSingleTable as printSingleTableDoc,
} from "../utils/reportPrintUtils.js";
import { studentProgressLink } from "../utils/studentProgressLink.js";
import {
  Button,
  RhDatePickerField,
  SearchableMultiSelect,
  SearchableSelect,
  useToast,
} from "../ui/index.js";
import { RH_ICON_STROKE, RhIcon } from "../ui/RhIcon.jsx";

const PAGE_ID = PERMISSION_PAGE_IDS.reports;

const STUDENT_TABS = [
  { id: "all", label: "الكل" },
  { id: "tasks", label: "الواجبات" },
  { id: "planProgress", label: "إنجاز الخطط" },
  { id: "halakaRecords", label: "حضور الحلقات" },
  { id: "plans", label: "الخطط" },
  { id: "halakat", label: "الحلقات" },
  { id: "activities", label: "الأنشطة" },
  { id: "exams", label: "الاختبارات" },
  { id: "dawrat", label: "الدورات" },
  { id: "remote", label: "التسميع" },
  { id: "awrad", label: "الأوراد" },
  { id: "notifications", label: "الإشعارات" },
];

const TEACHER_TABS = [
  { id: "all", label: "الكل" },
  { id: "halakat", label: "الحلقات" },
  { id: "memberships", label: "الارتباطات" },
  { id: "sessions", label: "الجلسات" },
  { id: "attendance", label: "الحضور" },
];

const GROUP_TABS = [
  { id: "all", label: "الكل" },
  { id: "details", label: "التفاصيل" },
  { id: "members", label: "الأعضاء" },
  { id: "progress", label: "الإنجاز" },
  { id: "sessions", label: "الجلسات" },
  { id: "attendance", label: "الحضور" },
];

/** سياق للطباعة الموحّدة داخل أقسام التقرير */
const ReportPrintContext = createContext(null);
const ReportTabContext = createContext({ activeTab: "all" });

/** يتوافق مع حالات تسجيل الإنجاز في صفحة الاختبارات */
const EXAM_SELF_REPORT_LABELS_AR = {
  registered: "سجّل في المجموعة",
  preparing: "أجهّز للاختبار",
  completed: "أتمّ الاختبار",
};

function formatExamSelfReportSummary(r) {
  const st = String(r.examSelfReportStatus || "").trim();
  const line = EXAM_SELF_REPORT_LABELS_AR[st] || st || "";
  const notes = String(r.examSelfReportNotes || "").trim();
  if (!line && !notes) return "—";
  return [line, notes].filter(Boolean).join(" — ");
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (
    s.includes(";") ||
    s.includes('"') ||
    s.includes("\n") ||
    s.includes("\r")
  ) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCsvFile(rows, fileName) {
  if (!Array.isArray(rows) || rows.length === 0) return false;
  const headers = Object.keys(rows[0] || {});
  const lines = [headers.map(csvEscape).join(";")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(";"));
  }
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

function toEntityOptions(rows, kind) {
  return (rows || []).map((row) => {
    const base = row.name || row.displayName || row.email || row.uid || row.id;
    let label = base;
    if (kind === "plan") {
      const vols = formatPlanVolumesForReport(row.raw?.volumes);
      if (vols && vols !== "—") label = `${base} — ${vols}`;
    }
    return {
      value: row.id || row.uid,
      label,
    };
  });
}

function sortKindsForUser(kinds, user) {
  if (!isAdmin(user)) return kinds;
  return [...kinds].sort((a, b) => {
    const ia = ADMIN_REPORT_KIND_ORDER.indexOf(a.value);
    const ib = ADMIN_REPORT_KIND_ORDER.indexOf(b.value);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}

function formatArDateTime(v) {
  const d = new Date(String(v || ""));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" });
}

function roleLabelAr(role) {
  const r = String(role || "")
    .trim()
    .toLowerCase();
  if (r === "teacher") return "معلم";
  if (r === "student") return "طالب";
  if (r === "member") return "عضو";
  if (r === "owner") return "مالك";
  if (r === "supervisor") return "مشرف";
  if (r === "admin") return "أدمن";
  return role || "—";
}

function mapMembershipDisplayRow(r, { withJoined = false } = {}) {
  const row = {
    name: r.name || "—",
    role: roleLabelAr(r.role),
    visibilityLabel: reportVisibilityLabel(r.visibility),
  };
  if (withJoined) row.joinedAt = formatArDateTime(r.joinedAt);
  return row;
}

function printSingleTable(title, columns, rows, printContext) {
  printSingleTableDoc(
    { title, columns, rows, printContext },
    { autoPrint: false },
  );
}

function ReportPrintSectionsView({ reportData, printHelpers, activeTab }) {
  const sections = useMemo(() => {
    const all = collectPrintSectionsFromReport(reportData, printHelpers);
    return filterPrintSectionsByTab(all, activeTab);
  }, [reportData, printHelpers, activeTab]);

  if (!sections.length) {
    return <p className="rh-plans__empty">لا توجد بيانات في هذا القسم.</p>;
  }

  return sections.map((sec) => (
    <SectionTable
      key={`${sec.tabId || "sec"}-${sec.title}`}
      title={sec.title}
      tabId="all"
      ignoreTabFilter
      columns={sec.columns}
      rows={sec.rows}
    />
  ));
}

function StudentBatchKpiGrid({ summary, str }) {
  return (
    <ReportKpiGrid heading="ملخص الطلاب المختارين">
      <div className="card rh-reports__kpi">
        <strong>{summary.studentCount ?? 0}</strong>
        <span>عدد الطلاب</span>
      </div>
      <div className="card rh-reports__kpi">
        <strong>{summary.avgPlanProgress ?? 0}%</strong>
        <span>متوسط إنجاز الخطط</span>
      </div>
      <div className="card rh-reports__kpi">
        <strong>{summary.plans ?? 0}</strong>
        <span>{str("layout.nav_plans")}</span>
      </div>
      <div className="card rh-reports__kpi">
        <strong>{summary.halakat ?? 0}</strong>
        <span>{str("layout.nav_halakat")}</span>
      </div>
      <div className="card rh-reports__kpi">
        <strong>{summary.awrad ?? 0}</strong>
        <span>{str("layout.nav_awrad")}</span>
      </div>
      <div className="card rh-reports__kpi">
        <strong>{summary.totalPages ?? 0}</strong>
        <span>{str("reports.kpi_pages")}</span>
      </div>
    </ReportKpiGrid>
  );
}

function tabVisible(activeTab, tabId) {
  return activeTab === "all" || activeTab === tabId;
}

function downloadSingleTableCsv(title, columns, rows) {
  if (!Array.isArray(rows) || !rows.length) return;
  const headerColumns = (columns || []).filter((c) => c?.key);
  if (!headerColumns.length) return;
  const csvRows = rows.map((row) => {
    const out = {};
    for (const col of headerColumns)
      out[col.label || col.key] = row?.[col.key] ?? "";
    return out;
  });
  const stamp = new Date().toISOString().slice(0, 10);
  const safeTitle = String(title || "table")
    .replace(/[^\u0600-\u06FFa-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  downloadCsvFile(csvRows, `report-table-${safeTitle || "table"}-${stamp}.csv`);
}

function ReportKpiGrid({ children, heading = "المؤشرات الرئيسية" }) {
  const { activeTab } = useContext(ReportTabContext);
  if (!tabVisible(activeTab, "all")) return null;
  return (
    <div className="rh-reports__kpis-block">
      <h2 className="rh-reports__block-heading">{heading}</h2>
      <div className="rh-reports__kpis">{children}</div>
    </div>
  );
}

function SectionTable({
  title,
  columns,
  rows,
  actions,
  printContext: printContextProp,
  tabId = "all",
  ignoreTabFilter = false,
}) {
  const ctxPrint = useContext(ReportPrintContext);
  const printContext = printContextProp ?? ctxPrint;
  const { activeTab } = useContext(ReportTabContext);
  if (!rows?.length) return null;
  if (!ignoreTabFilter && !tabVisible(activeTab, tabId)) return null;
  return (
    <div className="rh-settings-card rh-reports__section">
      <div className="rh-settings-card__head">
        <h3 className="rh-settings-card__title">
          {title}
          <span className="rh-reports__section-count">{rows.length} سجل</span>
        </h3>
        <div className="no-print rh-reports__section-actions">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={Download}
            onClick={() => downloadSingleTableCsv(title, columns, rows)}
          >
            CSV الجدول
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={Printer}
            onClick={() => printSingleTable(title, columns, rows, printContext)}
          >
            طباعة الجدول
          </Button>
        </div>
      </div>
      <div className="rh-admin-plan-types__table-wrap">
        <table className="rh-admin-plan-types__table rh-reports__table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
              {actions && <th className="no-print">عرض</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${title}-${i}`}>
                {columns.map((c) => (
                  <td key={c.key}>{row[c.key] ?? "—"}</td>
                ))}
                {actions && <td className="no-print">{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ReportViewPage() {
  const { user } = useAuth();
  const { can, canAccessPage } = usePermissions();
  const { str, branding } = useSiteContent();
  const toast = useToast();
  const navigate = useNavigate();
  const { search } = useLocation();
  const hidePlanNavigation = useHidePlanNavigation();
  const didHydrateFromQueryRef = useRef(false);
  const prevKindRef = useRef(null);
  const adminDefaultKindSet = useRef(false);
  const autoBuiltFromQueryRef = useRef(false);

  const [kind, setKind] = useState("student");
  const [entityId, setEntityId] = useState("");
  const [entityIds, setEntityIds] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rangePreset, setRangePreset] = useState("all");
  const [scopePlan, setScopePlan] = useState(REPORT_SCOPE_ALL);
  const [scopeHalaka, setScopeHalaka] = useState(REPORT_SCOPE_ALL);
  const [entities, setEntities] = useState([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const reportCaptureRef = useRef(null);

  const canPrint = can(PAGE_ID, "reports_print");
  const canExportCsv = can(PAGE_ID, "reports_export_csv");
  const showEntityOwner = canViewCreator(can, PAGE_ID);
  const canRunForKind = useCallback(
    (k) => Boolean(can(PAGE_ID, REPORT_KIND_PERMISSION[k])),
    [can],
  );
  const allowedKinds = useMemo(
    () =>
      sortKindsForUser(
        REPORT_KIND_OPTIONS.filter((k) => canRunForKind(k.value)),
        user,
      ),
    [canRunForKind, user],
  );
  const centralReports = isCentralReportsMode(user);
  const showDateFilters = reportKindUsesDateFilter(kind);
  const personAutoReport = reportKindIsPersonAutoReport(kind);
  const personHintKey = reportPersonSelectHintKey(kind);
  const lastBuiltPersonKeyRef = useRef("");

  useEffect(() => {
    if (didHydrateFromQueryRef.current) return;
    const params = new URLSearchParams(search);
    const kindParam = String(params.get("reportKind") || "").trim();
    const entityParams = params
      .getAll("reportEntity")
      .map((id) => String(id || "").trim())
      .filter(Boolean);
    const entityParam = entityParams[0] || "";
    const fromParam = String(params.get("from") || "").trim();
    const toParam = String(params.get("to") || "").trim();
    const presetParam = String(params.get("rangePreset") || "").trim();
    if (kindParam && REPORT_KIND_OPTIONS.some((k) => k.value === kindParam))
      setKind(kindParam);
    if (entityParam) setEntityId(entityParam);
    if (entityParams.length > 1) setEntityIds(entityParams);
    else if (entityParam) setEntityIds([entityParam]);
    const isPersonAutoFromUrl = reportKindIsPersonAutoReport(kindParam);
    if (!isPersonAutoFromUrl) {
      if (fromParam) {
        const y = Number(fromParam.slice(0, 4));
        setFromDate(
          y >= 1900 && y <= 2199
            ? gregorianYmdStringToHijriYmd(fromParam)
            : fromParam,
        );
      }
      if (toParam) {
        const y = Number(toParam.slice(0, 4));
        setToDate(
          y >= 1900 && y <= 2199
            ? gregorianYmdStringToHijriYmd(toParam)
            : toParam,
        );
      }
      if (presetParam) setRangePreset(presetParam);
      const scopePlanParam = String(params.get("scopePlan") || "").trim();
      const scopeHalakaParam = String(params.get("scopeHalaka") || "").trim();
      if (scopePlanParam) setScopePlan(scopePlanParam);
      if (scopeHalakaParam) setScopeHalaka(scopeHalakaParam);
    }
    didHydrateFromQueryRef.current = true;
  }, [search]);

  useEffect(() => {
    if (!reportKindIsPersonAutoReport(kind)) return;
    setFromDate("");
    setToDate("");
    setRangePreset("all");
    setScopePlan(REPORT_SCOPE_ALL);
    setScopeHalaka(REPORT_SCOPE_ALL);
    lastBuiltPersonKeyRef.current = "";
  }, [kind]);

  useEffect(() => {
    if (!centralReports || adminDefaultKindSet.current) return;
    const params = new URLSearchParams(search);
    const kindParam = String(params.get("reportKind") || "").trim();
    if (kindParam) return;
    if (allowedKinds.some((k) => k.value === "plan")) {
      setKind("plan");
      adminDefaultKindSet.current = true;
    }
  }, [centralReports, allowedKinds, search]);

  useEffect(() => {
    document.title = str("reports.doc_title", {
      siteTitle: branding.siteTitle,
    });
  }, [str, branding.siteTitle]);

  useEffect(() => {
    if (!canAccessPage(PAGE_ID)) return;
    if (!canRunForKind(kind)) {
      const firstAllowed = REPORT_KIND_OPTIONS.find((k) =>
        canRunForKind(k.value),
      );
      if (firstAllowed) setKind(firstAllowed.value);
    }
  }, [kind, canRunForKind, canAccessPage]);

  useEffect(() => {
    if (!canAccessPage(PAGE_ID)) return;
    let cancelled = false;
    setLoadingEntities(true);
    setEntities([]);
    if (prevKindRef.current !== null && prevKindRef.current !== kind) {
      setEntityId("");
      setEntityIds([]);
      setScopePlan(REPORT_SCOPE_ALL);
      setScopeHalaka(REPORT_SCOPE_ALL);
    }
    prevKindRef.current = kind;
    const run = async () => {
      try {
        if (kind === "student") {
          const users = await loadUsersDirectory(user);
          if (!cancelled) setEntities(users);
          return;
        }
        if (kind === "teacher") {
          const teachers = await loadTeachersDirectory(user);
          if (!cancelled) setEntities(teachers);
          return;
        }
        const rows = await listEntitiesByKind(kind, { currentUser: user });
        if (!cancelled) setEntities(rows);
      } catch {
        if (!cancelled) setEntities([]);
      } finally {
        if (!cancelled) setLoadingEntities(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [kind, canAccessPage, user]);

  const entityOptions = useMemo(() => toEntityOptions(entities, kind), [entities, kind]);

  const selectedStudentIds = useMemo(() => {
    if (kind !== "student") return entityId ? [entityId] : [];
    if (entityIds.length) return entityIds;
    if (entityId) return [entityId];
    return [];
  }, [kind, entityIds, entityId]);

  const printHelpers = useMemo(
    () => ({
      formatArDateTime,
      roleLabelAr,
      formatExamSelfReportSummary,
      showEntityOwner,
    }),
    [showEntityOwner],
  );
  const entityMap = useMemo(
    () =>
      new Map(
        (entities || []).map((row) => [
          row.id || row.uid,
          row.name || row.displayName || row.email || row.uid || row.id,
        ]),
      ),
    [entities],
  );

  const range = useMemo(() => {
    if (reportKindIsPersonAutoReport(kind)) return { from: "", to: "" };
    return {
      from: fromDate ? hijriYmdLocalDayStartIso(fromDate) : "",
      to: toDate ? hijriYmdLocalDayEndIso(toDate) : "",
    };
  }, [kind, fromDate, toDate]);

  const reportScope = useMemo(() => {
    if (reportKindIsPersonAutoReport(kind)) {
      return { planId: REPORT_SCOPE_ALL, halakaId: REPORT_SCOPE_ALL };
    }
    return {
      planId: scopePlan,
      halakaId: scopeHalaka,
    };
  }, [kind, scopePlan, scopeHalaka]);
  const isRangeInvalid = useMemo(() => {
    if (!fromDate || !toDate) return false;
    const a = parseHijriYmdString(fromDate);
    const b = parseHijriYmdString(toDate);
    if (!a || !b) return false;
    return a.compare(b) > 0;
  }, [fromDate, toDate]);

  useEffect(() => {
    if (!didHydrateFromQueryRef.current) return;
    const params = new URLSearchParams(search);
    if (kind) params.set("reportKind", kind);
    else params.delete("reportKind");
    if (entityId) params.set("reportEntity", entityId);
    else params.delete("reportEntity");
    if (showDateFilters) {
      if (fromDate) params.set("from", fromDate);
      else params.delete("from");
      if (toDate) params.set("to", toDate);
      else params.delete("to");
      if (rangePreset && rangePreset !== "custom")
        params.set("rangePreset", rangePreset);
      else params.delete("rangePreset");
    } else {
      params.delete("from");
      params.delete("to");
      params.delete("rangePreset");
      params.delete("scopePlan");
      params.delete("scopeHalaka");
    }
    const nextSearch = params.toString();
    const currentSearch = String(search || "").replace(/^\?/, "");
    if (nextSearch === currentSearch) return;
    navigate(
      {
        pathname: "/app/reports/view",
        search: nextSearch ? `?${nextSearch}` : "",
      },
      { replace: true },
    );
  }, [
    kind,
    entityId,
    fromDate,
    toDate,
    rangePreset,
    showDateFilters,
    search,
    navigate,
  ]);

  const appLink = useCallback(
    (path) => withImpersonationQuery(path, getImpersonateUid(user, search)),
    [user, search],
  );
  const crossItems = useMemo(
    () => [
      { to: appLink("/app"), label: str("layout.nav_home") },
      { to: appLink("/app/halakat"), label: str("layout.nav_halakat") },
      ...(hidePlanNavigation
        ? []
        : [{ to: appLink("/app/plans"), label: str("layout.nav_plans") }]),
      { to: appLink("/app/activities"), label: str("layout.nav_activities") },
      { to: appLink("/app/exams"), label: str("layout.nav_exams") },
      { to: appLink("/app/reports"), label: str("layout.nav_reports") },
    ],
    [appLink, str, hidePlanNavigation],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const build = useCallback(async () => {
    const runIds =
      kind === "student" ? selectedStudentIds : entityId ? [entityId] : [];
    if (!runIds.length || !canRunForKind(kind)) return;
    if (showDateFilters && isRangeInvalid) {
      toast.warning(str("reports.toast_invalid_range"));
      return;
    }
    setLoadingReport(true);
    try {
      let result;
      if (kind === "student") {
        const users = runIds
          .map((id) => entities.find((u) => (u.uid || u.id) === id))
          .filter(Boolean);
        result =
          users.length > 1
            ? await buildMultiStudentReport(users, range, reportScope)
            : await buildStudentReport(users[0], range, reportScope);
      } else if (kind === "teacher") {
        result = await buildTeacherReport(
          entities.find((u) => (u.uid || u.id) === entityId),
          range,
          reportScope,
        );
      } else {
        result = await buildGroupReport(kind, entityId, range);
      }
      setReportData(result);
      setActiveTab("all");
    } catch {
      toast.warning(str("reports.toast_failed"));
    } finally {
      setLoadingReport(false);
    }
  });

  useEffect(() => {
    if (!didHydrateFromQueryRef.current) return;
    if (loadingEntities || loadingReport) return;
    if (!canRunForKind(kind)) return;
    if (showDateFilters && isRangeInvalid) return;

    const runIds =
      kind === "student" ? selectedStudentIds : entityId ? [entityId] : [];
    if (!runIds.length) return;
    if (!runIds.every((id) => entityOptions.some((o) => o.value === id)))
      return;

    if (reportKindIsPersonAutoReport(kind)) {
      const personKey = `${kind}:${[...runIds].sort().join(",")}`;
      if (lastBuiltPersonKeyRef.current === personKey) return;
      lastBuiltPersonKeyRef.current = personKey;
      build();
      return;
    }

    if (autoBuiltFromQueryRef.current) return;
    const params = new URLSearchParams(search);
    const kindParam = String(params.get("reportKind") || "").trim();
    const entityParam = String(params.get("reportEntity") || "").trim();
    if (!entityParam || kindParam !== kind) return;
    if (entityId !== entityParam) {
      setEntityId(entityParam);
      return;
    }
    autoBuiltFromQueryRef.current = true;
    build();
  }, [
    entityId,
    selectedStudentIds,
    kind,
    loadingEntities,
    loadingReport,
    entityOptions,
    search,
    canRunForKind,
    isRangeInvalid,
    showDateFilters,
    build,
  ]);

  const onExportCsv = () => {
    if (!canExportCsv || !reportData) return;
    if (reportData.kind === "student_batch") {
      const sections = collectPrintSectionsFromReport(reportData, printHelpers);
      const rows = [];
      for (const sec of sections) {
        for (const row of sec.rows || []) {
          rows.push({ القسم: sec.title, ...row });
        }
      }
      if (!rows.length) {
        toast.info(str("reports.toast_csv_empty"));
        return;
      }
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsvFile(rows, `report-students-batch-${stamp}.csv`);
      return;
    }
    const rows = [];
    if (reportData.kind === "student") {
      const addRows = (section, sectionRows) => {
        for (const row of sectionRows || [])
          rows.push({ القسم: section, ...row });
      };
      addRows(
        "إنجاز الخطط",
        (reportData.planProgress || []).map((r) => ({
          name: r.name || "",
          volumesSummary: r.volumesSummary || "—",
          role: roleLabelAr(r.role),
          progressPercent: r.progressPercent ?? "",
          achievedPages: r.achievedPages ?? "",
          remainingPages: r.remainingPages ?? "",
          targetPages: r.targetPages ?? "",
          awradInPeriodCount: r.awradInPeriodCount ?? "",
          pagesInPeriod: r.pagesInPeriod ?? "",
          latestAwradAt: formatArDateTime(r.latestAwradAt),
        })),
      );
      addRows(
        "الواجبات",
        (reportData.tasks || []).map((t) => ({
          واجب: t.title || "",
          القسم: t.category || "",
          الحالة: t.step === "done" ? "مكتمل" : t.step === "in_progress" ? "جاري التنفيذ" : t.step === "review" ? "مراجعة" : "قيد الانتظار",
          المطلوب: t.dueLabel || "",
          التفاصيل: String(t.description || ""),
        })),
      );
      addRows(
        "حضور الحلقات",
        (reportData.halakaAttendance || []).map((r) => ({
          halakaName: r.halakaName || "",
          sessionTitle: r.sessionTitle || "",
          sessionStartedAt: formatArDateTime(r.sessionStartedAt),
          attendanceStatusLabel: reportAttendanceStatusLabel(
            r.attendanceStatus,
          ),
          pagesCount: r.pagesCount ?? "",
          fromPage: r.fromPage ?? "",
          toPage: r.toPage ?? "",
          recordedAt: formatArDateTime(r.recordedAt),
          recordedByName: r.recordedByName || "",
        })),
      );
      addRows(
        "الخطط",
        (reportData.studentRows?.plans || []).map((r) => ({
          ...mapMembershipDisplayRow(r, { withJoined: true }),
          volumesSummary: r.volumesSummary || "—",
          dailyPages: r.dailyPages ?? "",
          totalTargetPages: r.totalTargetPages ?? "",
        })),
      );
      addRows(
        "الحلقات",
        (reportData.studentRows?.halakat || []).map((r) =>
          mapMembershipDisplayRow(r, { withJoined: true }),
        ),
      );
      addRows(
        "الأنشطة",
        (reportData.studentRows?.activities || []).map((r) => ({
          name: r.name || "",
          role: roleLabelAr(r.role),
          startAt: formatArDateTime(r.startAt),
          endAt: formatArDateTime(r.endAt),
          memberContributionText:
            (r.memberContributionText || "").trim() || "—",
        })),
      );
      addRows(
        "الاختبارات",
        (reportData.studentRows?.exams || []).map((r) => ({
          name: r.name || "",
          role: roleLabelAr(r.role),
          visibilityLabel: reportVisibilityLabel(r.visibility),
          examSelfReportSummary: formatExamSelfReportSummary(r),
        })),
      );
      addRows(
        "الدورات",
        (reportData.studentRows?.dawrat || []).map((r) => ({
          name: r.name || "",
          role: roleLabelAr(r.role),
          courseStart: formatArDateTime(r.courseStart),
          courseEnd: formatArDateTime(r.courseEnd),
          memberContributionText:
            (r.memberContributionText || "").trim() || "—",
        })),
      );
      addRows(
        "التسميع عن بعد",
        (reportData.studentRows?.remoteTasmee || []).map((r) => ({
          name: r.name || "",
          role: roleLabelAr(r.role),
          providerLabel: reportProviderLabel(r.provider),
          mediaTypeLabel: reportMediaTypeLabel(r.mediaType),
        })),
      );
      addRows(
        "الأوراد",
        (reportData.awrad || []).map((r) => ({
          planName: r.planName || "—",
          planVolumesSummary: r.planVolumesSummary || "—",
          recordedAt: formatArDateTime(r.recordedAt),
          pagesCount: r.pagesCount ?? "",
          fromPage: r.fromPage ?? "",
          toPage: r.toPage ?? "",
        })),
      );
      addRows(
        "الإشعارات",
        (reportData.notifications || []).map((r) => ({
          title: r.title || "",
          notificationTypeLabel: reportNotificationTypeLabel(
            r.notificationType,
          ),
          createdAt: formatArDateTime(r.createdAt),
          isRead: r.isRead ? "نعم" : "لا",
        })),
      );
    } else if (reportData.kind === "teacher") {
      const addRows = (section, sectionRows) => {
        for (const row of sectionRows || [])
          rows.push({ القسم: section, ...row });
      };
      addRows(
        "الخطط",
        (reportData.teacherRows?.plans || []).map((r) => ({
          ...mapMembershipDisplayRow(r),
          volumesSummary: r.volumesSummary || "—",
        })),
      );
      addRows(
        "الحلقات",
        (reportData.teacherRows?.halakat || []).map((r) =>
          mapMembershipDisplayRow(r),
        ),
      );
      addRows(
        "الأنشطة",
        (reportData.teacherRows?.activities || []).map((r) =>
          mapMembershipDisplayRow(r),
        ),
      );
      addRows(
        "الاختبارات",
        (reportData.teacherRows?.exams || []).map((r) =>
          mapMembershipDisplayRow(r),
        ),
      );
      addRows(
        "الدورات",
        (reportData.teacherRows?.dawrat || []).map((r) =>
          mapMembershipDisplayRow(r),
        ),
      );
      addRows(
        "التسميع عن بعد",
        (reportData.teacherRows?.remoteTasmee || []).map((r) =>
          mapMembershipDisplayRow(r),
        ),
      );
      addRows(
        "جلسات المعلم",
        (reportData.sessions || []).map((s) => ({
          title: s.title || "",
          startedAt: formatArDateTime(s.startedAt),
          endedAt: formatArDateTime(s.endedAt),
          status: reportSessionStatusLabel(s.status),
        })),
      );
      addRows(
        "تسجيلات الحضور",
        (reportData.attendanceRecorded || []).map((a) => ({
          userName: reportPersonLabel(a.userName, a.userId),
          attendanceStatusLabel: reportAttendanceStatusLabel(
            a.attendanceStatus,
          ),
          pagesCount: a.pagesCount ?? "",
          updatedAt: formatArDateTime(a.updatedAt),
        })),
      );
      addRows(
        "ملخص التسجيلات حسب الطالب",
        (reportData.attendanceByStudent || []).map((a) => ({
          userName: reportPersonLabel(a.userName, a.userId),
          recordsCount: a.recordsCount ?? "",
          pagesTotal: a.pagesTotal ?? "",
          latestUpdatedAt: formatArDateTime(a.latestUpdatedAt),
        })),
      );
    } else {
      if (reportData.entityDetails) {
        rows.push({
          القسم: "تفاصيل الكيان",
          ...formatEntityDetailsForReport(
            reportData.entityDetails,
            reportData.kind,
            {
              ownerName: showEntityOwner
                ? reportData.entityDetails?.ownerName || "—"
                : "",
              formatDate: formatArDateTime,
            },
          ),
        });
      }
      for (const m of reportData.members || []) {
        const baseMemberRow = {
          القسم: "الأعضاء",
          الاسم: reportPersonLabel(m.displayName, m.userId),
          البريد: m.email || "",
          الدور: roleLabelAr(m.role),
        };
        if (kind === "exam") {
          rows.push({
            ...baseMemberRow,
            الإنجاز_المُبلَغ: formatExamSelfReportSummary(m),
          });
        } else if (kind === "activity" || kind === "dawra") {
          rows.push({
            ...baseMemberRow,
            المساهمة: (m.memberContributionText || "").trim(),
          });
        } else {
          rows.push(baseMemberRow);
        }
      }
      if (reportData.kind === "plan") {
        for (const r of reportData.memberDetails || []) {
          rows.push({
            القسم: "إنجاز الأعضاء في الخطة",
            الاسم: reportPersonLabel(r.displayName, r.userId),
            الدور: roleLabelAr(r.role),
            نسبة_الإنجاز: r.progressPercent ?? "",
            أنجز: r.achievedPages ?? "",
            بقي: r.remainingPages ?? "",
            الهدف: r.targetPages ?? "",
            عدد_الأوراد: r.awradCount ?? "",
            صفحات_الأوراد: r.pagesInAwrad ?? "",
            آخر_ورد: formatArDateTime(r.latestAwradAt),
          });
        }
      }
      if (reportData.kind === "halaka") {
        for (const r of reportData.memberDetails || []) {
          rows.push({
            القسم: "تفاصيل أعضاء الحلقة",
            الاسم: reportPersonLabel(r.displayName, r.userId),
            الدور: roleLabelAr(r.role),
            مجلدات_خططه: r.plansVolumesSummary || "—",
            خططه: r.plansCount ?? "",
            أوراده: r.awradCount ?? "",
            صفحات_الأوراد: r.pagesInAwrad ?? "",
            حضور_الحلقة: r.attendanceRecordsInHalaka ?? "",
            صفحات_الحلقة: r.pagesInHalakaSessions ?? "",
            آخر_ورد: formatArDateTime(r.latestAwradAt),
            آخر_حضور: formatArDateTime(r.latestAttendanceAt),
          });
        }
        for (const s of reportData.sessions || []) {
          rows.push({
            القسم: "جلسات الحلقة",
            العنوان: s.title || "",
            startedAt: formatArDateTime(s.startedAt),
            endedAt: formatArDateTime(s.endedAt),
            status: reportSessionStatusLabel(s.status),
          });
        }
        for (const a of reportData.attendanceRows || []) {
          rows.push({
            القسم: "حضور الحلقة",
            الجلسة: a.sessionTitle || "جلسة",
            العضو: reportPersonLabel(
              a.userName ||
                halakaMemberNameMap.get(String(a.userId || "").trim()),
              a.userId,
            ),
            الحضور: reportAttendanceStatusLabel(a.attendanceStatus),
            pagesCount: a.pagesCount ?? "",
            fromPage: a.fromPage ?? "",
            toPage: a.toPage ?? "",
          });
        }
      }
    }
    if (!rows.length) {
      toast.info(str("reports.toast_csv_empty"));
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsvFile(rows, `report-${kind}-${entityId}-${stamp}.csv`);
  };

  const onCopyReportLink = async () => {
    if (typeof window === "undefined" || !window?.location?.href) return;
    const url = window.location.href;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const area = document.createElement("textarea");
        area.value = url;
        area.setAttribute("readonly", "true");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.focus();
        area.select();
        document.execCommand("copy");
        document.body.removeChild(area);
      }
      toast.success(str("reports.toast_link_copied"));
    } catch {
      toast.warning(str("reports.toast_link_copy_failed"));
    }
  };

  const canBuild = Boolean(
    (kind === "student" ? selectedStudentIds.length : entityId) &&
      canRunForKind(kind) &&
      (!showDateFilters || !isRangeInvalid),
  );
  const clearFilters = useCallback(() => {
    setFromDate("");
    setToDate("");
    setRangePreset("all");
    setScopePlan(REPORT_SCOPE_ALL);
    setScopeHalaka(REPORT_SCOPE_ALL);
  }, []);
  const rangePresetLabel = useCallback(
    (preset) => {
      if (preset === "today") return str("reports.range_today");
      if (preset === "week") return str("reports.range_week");
      if (preset === "month") return str("reports.range_month");
      return str("reports.range_all");
    },
    [str],
  );

  const applyRangePreset = useCallback((preset) => {
    if (preset === "all") {
      setFromDate("");
      setToDate("");
      setRangePreset("all");
      return;
    }
    const todayCd = parseHijriYmdString(localHijriYmd());
    if (!todayCd) return;
    if (preset === "today") {
      const t = formatHijriYmd(todayCd);
      setFromDate(t);
      setToDate(t);
      setRangePreset("today");
      return;
    }
    if (preset === "week") {
      const from = todayCd.subtract({ days: 6 });
      setFromDate(formatHijriYmd(from));
      setToDate(formatHijriYmd(todayCd));
      setRangePreset("week");
      return;
    }
    if (preset === "month") {
      const monthStart = new CalendarDate(
        HIJRI,
        todayCd.year,
        todayCd.month,
        1,
      );
      setFromDate(formatHijriYmd(monthStart));
      setToDate(formatHijriYmd(todayCd));
      setRangePreset("month");
    }
  }, []);

  const selectedEntityName = useMemo(() => {
    if (kind === "student" && selectedStudentIds.length > 1) {
      const names = selectedStudentIds
        .map((id) => entityMap.get(id))
        .filter(Boolean);
      if (!names.length) return `${selectedStudentIds.length} طلاب`;
      const preview = names.slice(0, 3).join("، ");
      return names.length > 3 ? `${names.length} طلاب: ${preview}…` : names.join("، ");
    }
    return entityMap.get(entityId) || "";
  }, [kind, selectedStudentIds, entityMap, entityId]);

  const sectionPrintContext = useMemo(
    () => ({
      siteTitle: branding.siteTitle,
      reportTypeLabel:
        REPORT_KIND_OPTIONS.find((k) => k.value === kind)?.label || "",
      entityName: selectedEntityName,
      fromYmd: fromDate,
      toYmd: toDate,
      issuedAt: new Date().toLocaleString("ar-SA", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    }),
    [branding.siteTitle, kind, selectedEntityName, fromDate, toDate],
  );

  const executiveSummary = useMemo(() => {
    if (!reportData) return null;
    return buildReportExecutiveSummary(reportData, {
      entityName: selectedEntityName,
      reportTypeLabel:
        REPORT_KIND_OPTIONS.find((k) => k.value === kind)?.label || "",
      fromYmd: fromDate,
      toYmd: toDate,
    });
  }, [reportData, selectedEntityName, kind, fromDate, toDate]);

  const reportMetaItems = useMemo(() => {
    const issuedAt = new Date().toLocaleString("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const items = [
      {
        label: "نوع التقرير",
        value: REPORT_KIND_OPTIONS.find((k) => k.value === kind)?.label || "—",
      },
      { label: "الكيان", value: selectedEntityName || "—" },
      {
        label: "الفترة (أم القرى)",
        value: reportKindIsPersonAutoReport(kind)
          ? str(reportPersonPeriodAutoKey(kind))
          : fromDate || toDate
            ? `${fromDate || "—"} ← ${toDate || "—"}`
            : "كامل الفترة",
      },
    ];
    items.push({ label: "تاريخ الإصدار", value: issuedAt });
    return items;
  }, [kind, selectedEntityName, fromDate, toDate, str]);

  const halakaMemberNameMap = useMemo(() => {
    const map = new Map();
    for (const m of reportData?.members || []) {
      const uid = String(m?.userId || "").trim();
      if (!uid) continue;
      map.set(uid, m.displayName || uid);
    }
    return map;
  }, [reportData?.members]);
  const viewLinkByKind = useCallback(
    (k, id) => {
      if (!id) return "";
      if (k === "plan") {
        if (hidePlanNavigation) return "";
        return appLink(`/app/plans?focus=${id}`);
      }
      if (k === "halaka") return appLink(`/app/halakat?focus=${id}`);
      if (k === "activity") return appLink(`/app/activities?focus=${id}`);
      if (k === "exam") return appLink(`/app/exams?focus=${id}`);
      if (k === "dawra") return appLink(`/app/dawrat?focus=${id}`);
      if (k === "remote_tasmee")
        return appLink(`/app/remote-tasmee?focus=${id}`);
      return "";
    },
    [appLink, hidePlanNavigation],
  );

  const reportTabs = useMemo(() => {
    if (!reportData) return [];
    if (reportData.kind === "student" || reportData.kind === "student_batch")
      return STUDENT_TABS;
    if (reportData.kind === "teacher") return TEACHER_TABS;
    return GROUP_TABS.filter((t) => {
      if (t.id === "sessions" || t.id === "attendance")
        return reportData.kind === "halaka";
      if (t.id === "progress") {
        return (
          reportData.kind === "plan" ||
          reportData.kind === "halaka" ||
          (["activity", "exam", "dawra", "remote_tasmee"].includes(
            reportData.kind,
          ) &&
            reportData.memberDetails?.length)
        );
      }
      return true;
    });
  }, [reportData]);

  const openPrintDocument = useCallback(
    (sections, { documentTitle, autoPrint = false } = {}) => {
      if (!canPrint || !reportData) return false;
      const kpis = collectPrintKpisFromReport(reportData, {
        plans: str("layout.nav_plans"),
        halakat: str("layout.nav_halakat"),
        activities: str("layout.nav_activities"),
        exams: str("layout.nav_exams"),
        awrad: str("layout.nav_awrad"),
        pages: str("reports.kpi_pages"),
        members: str("reports.kpi_members"),
        sessions: str("reports.kpi_sessions"),
        attendance: str("reports.kpi_attendance"),
        dawrat: str("layout.nav_dawrat"),
        remoteTasmee: str("layout.nav_remote_tasmee"),
        notifications: "الإشعارات",
      });
      return printMultiSectionReport(
        {
          documentTitle: documentTitle || str("reports.print_title"),
          sections,
          kpis,
          printContext: sectionPrintContext,
          executiveSummary,
        },
        { autoPrint },
      );
    },
    [canPrint, reportData, str, sectionPrintContext, executiveSummary],
  );

  const onPrintPreview = () => {
    if (!canPrint || !reportData) return;
    const sections = collectPrintSectionsFromReport(reportData, printHelpers);
    const ok = openPrintDocument(sections, {
      documentTitle: "تقرير شامل — معاينة",
      autoPrint: false,
    });
    if (!ok)
      toast.warning(
        "تعذّر فتح المعاينة. تحقّق من حظر النوافذ المنبثقة.",
        "",
      );
  };

  const onPrintSection = () => {
    if (!canPrint || !reportData) return;
    const allSections = collectPrintSectionsFromReport(reportData, printHelpers);
    const sections = filterPrintSectionsByTab(allSections, activeTab);
    if (!sections.length) {
      toast.info("لا توجد بيانات في التبويب الحالي للطباعة.");
      return;
    }
    const tabLabel =
      reportTabs.find((t) => t.id === activeTab)?.label || "القسم";
    const ok = openPrintDocument(sections, {
      documentTitle: `تقرير ${tabLabel} — معاينة`,
      autoPrint: false,
    });
    if (!ok)
      toast.warning(
        "تعذّر فتح المعاينة. تحقّق من حظر النوافذ المنبثقة.",
        "",
      );
  };

  const onExportCsvSection = () => {
    if (!canExportCsv || !reportData) return;
    const allSections = collectPrintSectionsFromReport(reportData, printHelpers);
    const sections = filterPrintSectionsByTab(allSections, activeTab);
    if (!sections.length) {
      toast.info("لا توجد بيانات في التبويب الحالي للتصدير.");
      return;
    }
    const rows = [];
    for (const sec of sections) {
      for (const row of sec.rows || []) {
        rows.push({ القسم: sec.title, ...row });
      }
    }
    const stamp = new Date().toISOString().slice(0, 10);
    const tabLabel =
      reportTabs.find((t) => t.id === activeTab)?.label || "section";
    downloadCsvFile(rows, `report-${kind}-${tabLabel}-${stamp}.csv`);
  };

  const onSharePdf = async () => {
    if (!canPrint || !reportData || !reportCaptureRef.current) return;
    try {
      toast.info(str("reports.toast_pdf_generating"));
      reportCaptureRef.current.classList.add("rh-print-capture--export");
      const blob = await elementToPdfBlob(reportCaptureRef.current);
      await shareOrDownloadPdf(blob, `report-${kind}-${entityId}.pdf`);
      toast.success(str("reports.toast_pdf_done"));
    } catch {
      toast.warning(str("reports.toast_pdf_failed"));
    } finally {
      reportCaptureRef.current?.classList.remove("rh-print-capture--export");
    }
  };

  if (!canAccessPage(PAGE_ID)) {
    return <p className="rh-plans__empty">{str("reports.no_access")}</p>;
  }

  return (
    <div className="rh-plans rh-reports">
      <header className="rh-plans__hero no-print">
        <HapticLink
          to={appLink("/app/reports")}
          className="rh-student-progress__back"
        >
          <RhIcon as={ArrowLeft} size={18} strokeWidth={RH_ICON_STROKE} /> مركز
          التقارير
        </HapticLink>
        <div className="rh-plans__hero-head">
          <div>
            <h1 className="rh-plans__title">
              {REPORT_KIND_OPTIONS.find((k) => k.value === kind)?.label ||
                str("reports.hero_title")}
              {selectedEntityName ? `: ${selectedEntityName}` : ""}
            </h1>
            <p className="rh-plans__desc">
              تقرير شامل بكل الأقسام — استخدم التبويبات للتصفية أو اطبع التقرير
              كاملاً.
            </p>
            <CrossNav items={crossItems} className="rh-plans__cross" />
          </div>
          <div className="rh-plans__hero-actions">
            <Button
              type="button"
              variant="secondary"
              icon={Link2}
              onClick={onCopyReportLink}
            >
              {str("reports.btn_copy_link")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon={Share2}
              onClick={onSharePdf}
              disabled={!canPrint || !reportData}
            >
              {str("reports.btn_share_pdf")}
            </Button>
            <Button
              type="button"
              variant="primary"
              icon={Eye}
              onClick={onPrintPreview}
              disabled={!canPrint || !reportData}
            >
              معاينة التقرير الشامل
            </Button>
            {activeTab !== "all" && reportData ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  icon={Printer}
                  onClick={onPrintSection}
                  disabled={!canPrint}
                >
                  معاينة القسم الحالي
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  icon={Download}
                  onClick={onExportCsvSection}
                  disabled={!canExportCsv}
                >
                  CSV القسم الحالي
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              icon={RefreshCw}
              onClick={build}
              disabled={!canBuild}
              loading={loadingReport}
            >
              تحديث
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon={Download}
              onClick={onExportCsv}
              disabled={!canExportCsv || !reportData}
            >
              CSV التقرير الشامل
            </Button>
          </div>
        </div>
      </header>

      {centralReports ? (
        <div className="rh-reports-hub__central card no-print" role="status">
          <strong>{str("reports.admin_central_title")}</strong>
          <p>{str("reports.admin_central_desc")}</p>
        </div>
      ) : null}

      <section className="rh-settings-card rh-reports__filters no-print">
        <div className="rh-settings-card__head">
          <h2 className="rh-settings-card__title">
            {str("reports.filters_title")}
          </h2>
        </div>
        <div className="rh-reports__filters-grid">
          <SearchableSelect
            label={str("reports.field_report_type")}
            options={allowedKinds}
            value={kind}
            onChange={setKind}
            placeholder={str("reports.field_report_type")}
            searchPlaceholder={str("reports.search_placeholder")}
            emptyText={str("reports.search_empty")}
          />
          {kind === "student" ? (
            <SearchableMultiSelect
              label="الطلاب (يمكن اختيار أكثر من طالب)"
              options={entityOptions}
              value={entityIds.length ? entityIds : entityId ? [entityId] : []}
              onChange={(ids) => {
                setEntityIds(ids);
                setEntityId(ids[0] || "");
                lastBuiltPersonKeyRef.current = "";
              }}
              placeholder={
                loadingEntities
                  ? str("reports.loading_entities")
                  : "اختر طالباً أو أكثر…"
              }
              searchPlaceholder={str("reports.search_placeholder")}
              emptyText={str("reports.search_empty")}
              summaryLabel={(count) => `${count} طالب مختار`}
            />
          ) : (
            <SearchableSelect
              label={str("reports.field_entity")}
              options={entityOptions}
              value={entityId}
              onChange={(id) => {
                setEntityId(id);
                if (reportKindIsPersonAutoReport(kind)) {
                  lastBuiltPersonKeyRef.current = "";
                }
              }}
              placeholder={
                loadingEntities
                  ? str("reports.loading_entities")
                  : str("reports.field_entity")
              }
              searchPlaceholder={str("reports.search_placeholder")}
              emptyText={str("reports.search_empty")}
            />
          )}
          {personHintKey ? (
            <p className="rh-reports-hub__student-hint">{str(personHintKey)}</p>
          ) : null}
          {centralReports && !loadingEntities && entities.length > 0 ? (
            <p className="rh-reports-hub__entity-count">
              {str("reports.admin_entity_count", { count: entities.length })}
            </p>
          ) : null}
          {showDateFilters ? (
            <>
              <RhDatePickerField
                label={str("reports.field_from")}
                value={fromDate}
                onChange={(v) => {
                  setFromDate(v);
                  setRangePreset("custom");
                }}
                placeholderText={str("reports.hijri_placeholder")}
              />
              <RhDatePickerField
                label={str("reports.field_to")}
                value={toDate}
                onChange={(v) => {
                  setToDate(v);
                  setRangePreset("custom");
                }}
                placeholderText={str("reports.hijri_placeholder")}
              />
            </>
          ) : null}
        </div>
        {showDateFilters ? (
          <div className="rh-reports__range-presets">
            {REPORT_RANGE_PRESETS.map((preset) => (
              <Button
                key={preset.value}
                type="button"
                variant={rangePreset === preset.value ? "primary" : "ghost"}
                size="sm"
                icon={Calendar}
                onClick={() => applyRangePreset(preset.value)}
              >
                {rangePresetLabel(preset.value)}
              </Button>
            ))}
          </div>
        ) : null}
        {showDateFilters && isRangeInvalid && (
          <p className="rh-reports__range-error">
            {str("reports.range_invalid_hint")}
          </p>
        )}
        <div className="rh-reports__filters-actions">
          {kind === "student" && entityId ? (
            <HapticLink
              to={appLink(studentProgressLink(entityId))}
              className="ui-btn ui-btn--secondary ui-btn--sm"
            >
              <RhIcon as={Eye} size={16} strokeWidth={RH_ICON_STROKE} />
              تقرير الإنجاز السريع
            </HapticLink>
          ) : null}
          {entityId ? (
            <ReportQuickLink
              kind={kind}
              entityId={entityId}
              label="فتح في مركز التقارير"
            />
          ) : null}
          <Button
            type="button"
            variant="ghost"
            icon={FilterX}
            onClick={clearFilters}
          >
            {str("reports.btn_clear_filters")}
          </Button>
          <Button
            type="button"
            variant="primary"
            icon={FileText}
            disabled={!canBuild}
            loading={loadingReport}
            onClick={build}
          >
            {str("reports.btn_build")}
          </Button>
        </div>
      </section>

      {!reportData ? (
        <p className="rh-plans__empty">
          {reportKindIsPersonAutoReport(kind)
            ? str(reportPersonEmptyKey(kind))
            : str("reports.empty")}
        </p>
      ) : (
        <ReportTabContext.Provider value={{ activeTab }}>
          {reportTabs.length > 1 ? (
            <nav
              className="rh-reports-view__tabs card no-print"
              aria-label="أقسام التقرير"
            >
              {reportTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={[
                    "rh-reports-view__tab",
                    activeTab === tab.id ? "rh-reports-view__tab--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          ) : null}
          <ReportPrintContext.Provider value={sectionPrintContext}>
            <div
              ref={reportCaptureRef}
              className="rh-print-capture rh-reports__print-capture"
            >
              <PrintDocumentChrome
                brandTitle={branding.siteTitle}
                logoSrc={branding.logoSrc}
                title={str("reports.print_title")}
                metaItems={reportMetaItems}
                footer={str("reports.print_footer", {
                  siteTitle: branding.siteTitle,
                  date: new Date().toLocaleString("ar-SA", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                })}
                headerClassName="rh-reports__capture-doc-head"
                footerClassName="rh-reports__capture-doc-foot"
              >
                {executiveSummary ? (
                  <ReportExecutiveSummary summary={executiveSummary} />
                ) : null}
                {reportData.kind === "student_batch" ? (
                  <section className="rh-reports__result">
                    <StudentBatchKpiGrid
                      summary={reportData.summary}
                      str={str}
                    />
                    {(reportData.students || []).map((studentData) => {
                      const studentUid =
                        studentData.entity?.uid ||
                        studentData.entity?.id ||
                        studentData.entity?.displayName;
                      const studentName =
                        studentData.entity?.displayName ||
                        studentData.entity?.name ||
                        studentData.entity?.email ||
                        "طالب";
                      return (
                        <div
                          key={String(studentUid)}
                          className="rh-reports__student-batch-block card"
                        >
                          <h2 className="rh-reports__batch-heading">
                            تقرير الطالب: {studentName}
                          </h2>
                          <ReportPrintSectionsView
                            reportData={studentData}
                            printHelpers={printHelpers}
                            activeTab={activeTab}
                          />
                        </div>
                      );
                    })}
                  </section>
                ) : reportData.kind === "student" ? (
                  <section className="rh-reports__result">
                    <ReportKpiGrid>
                      <div className="card rh-reports__kpi">
                        <strong>
                          {reportData.summary.avgPlanProgress ?? 0}%
                        </strong>
                        <span>متوسط إنجاز الخطط</span>
                      </div>
                      <div className="card rh-reports__kpi">
                        <strong>{reportData.summary.plans}</strong>
                        <span>{str("layout.nav_plans")}</span>
                      </div>
                      <div className="card rh-reports__kpi">
                        <strong>{reportData.summary.halakat}</strong>
                        <span>{str("layout.nav_halakat")}</span>
                      </div>
                      <div className="card rh-reports__kpi">
                        <strong>
                          {reportData.summary.halakaAttendanceRecords ?? 0}
                        </strong>
                        <span>حضور حلقات (فترة)</span>
                      </div>
                      <div className="card rh-reports__kpi">
                        <strong>
                          {reportData.summary.halakaPagesRecorded ?? 0}
                        </strong>
                        <span>صفحات في الحلقات</span>
                      </div>
                      <div className="card rh-reports__kpi">
                        <strong>{reportData.summary.awrad}</strong>
                        <span>{str("layout.nav_awrad")}</span>
                      </div>
                      <div className="card rh-reports__kpi">
                        <strong>{reportData.summary.totalPages}</strong>
                        <span>{str("reports.kpi_pages")}</span>
                      </div>
                      <div className="card rh-reports__kpi">
                        <strong>{reportData.summary.activities}</strong>
                        <span>{str("layout.nav_activities")}</span>
                      </div>
                      <div className="card rh-reports__kpi">
                        <strong>{reportData.summary.exams}</strong>
                        <span>{str("layout.nav_exams")}</span>
                      </div>
                      <div className="card rh-reports__kpi">
                        <strong>{reportData.summary.dawrat}</strong>
                        <span>{str("layout.nav_dawrat")}</span>
                      </div>
                      <div className="card rh-reports__kpi">
                        <strong>{reportData.summary.notifications}</strong>
                        <span>الإشعارات</span>
                      </div>
                    </ReportKpiGrid>
                    <SectionTable
                      title="الواجبات"
                      tabId="tasks"
                      columns={[
                        { key: "title", label: "الواجب" },
                        { key: "category", label: "القسم" },
                        { key: "stepLabel", label: "الحالة" },
                        { key: "dueLabel", label: "المطلوب" },
                        { key: "description", label: "التفاصيل" },
                      ]}
                      rows={(reportData.tasks || []).map((t) => ({
                        ...t,
                        stepLabel:
                          t.step === "done"
                            ? "مكتمل"
                            : t.step === "in_progress"
                              ? "جاري التنفيذ"
                              : t.step === "review"
                                ? "مراجعة"
                                : "قيد الانتظار",
                      }))}
                      actions={(row) =>
                        row.to ? (
                          <a href={row.to} className="ui-btn ui-btn--ghost ui-btn--sm">
                            <RhIcon as={Eye} size={14} strokeWidth={RH_ICON_STROKE} />
                          </a>
                        ) : null
                      }
                    />
                    <SectionTable
                      title="إنجاز الخطط (تفصيلي)"
                      tabId="planProgress"
                      columns={[
                        { key: "name", label: "الخطة" },
                        { key: "volumesSummary", label: "المجلدات" },
                        { key: "role", label: "الدور" },
                        { key: "progressPercent", label: "نسبة الإنجاز %" },
                        { key: "achievedPages", label: "أنجز (ص)" },
                        { key: "remainingPages", label: "بقي (ص)" },
                        { key: "targetPages", label: "الهدف (ص)" },
                        { key: "dailyPages", label: "ورد يومي" },
                        { key: "awradInPeriodCount", label: "أوراد الفترة" },
                        { key: "pagesInPeriod", label: "صفحات الفترة" },
                        { key: "latestAwradAt", label: "آخر ورد" },
                      ]}
                      rows={(reportData.planProgress || []).map((r) => ({
                        ...r,
                        role: roleLabelAr(r.role),
                        latestAwradAt: formatArDateTime(r.latestAwradAt),
                      }))}
                    />
                    <SectionTable
                      title="حضور وتسميع الحلقات"
                      tabId="halakaRecords"
                      columns={[
                        { key: "halakaName", label: "الحلقة" },
                        { key: "sessionTitle", label: "الجلسة" },
                        { key: "sessionStartedAt", label: "بداية الجلسة" },
                        { key: "attendanceStatusLabel", label: "الحضور" },
                        { key: "pagesCount", label: "الصفحات" },
                        { key: "fromPage", label: "من" },
                        { key: "toPage", label: "إلى" },
                        { key: "recordedAt", label: "تاريخ التسجيل" },
                        { key: "recordedByName", label: "سجّله" },
                      ]}
                      rows={(reportData.halakaAttendance || []).map((r) => ({
                        halakaName: r.halakaName || "—",
                        sessionTitle: r.sessionTitle || "—",
                        sessionStartedAt: formatArDateTime(r.sessionStartedAt),
                        attendanceStatusLabel: reportAttendanceStatusLabel(
                          r.attendanceStatus,
                        ),
                        pagesCount: r.pagesCount ?? 0,
                        fromPage: r.fromPage ?? "—",
                        toPage: r.toPage ?? "—",
                        recordedAt: formatArDateTime(r.recordedAt),
                        recordedByName: r.recordedByName || "—",
                      }))}
                    />
                    <SectionTable
                      title="الخطط"
                      tabId="plans"
                      columns={[
                        { key: "name", label: "الاسم" },
                        { key: "volumesSummary", label: "المجلدات" },
                        { key: "role", label: "الدور" },
                        { key: "visibilityLabel", label: "الظهور" },
                        { key: "dailyPages", label: "ورد يومي" },
                        { key: "totalTargetPages", label: "هدف (ص)" },
                        { key: "joinedAt", label: "تاريخ الانضمام" },
                      ]}
                      rows={(reportData.studentRows?.plans || []).map((r) => ({
                        ...mapMembershipDisplayRow(r, { withJoined: true }),
                        dailyPages: r.dailyPages ?? "—",
                        totalTargetPages: r.totalTargetPages ?? "—",
                      }))}
                      actions={(row) => {
                        const to = viewLinkByKind("plan", row.id);
                        if (!to) return null;
                        return (
                          <a
                            href={to}
                            className="ui-btn ui-btn--ghost ui-btn--sm"
                          >
                            <RhIcon
                              as={Eye}
                              size={14}
                              strokeWidth={RH_ICON_STROKE}
                            />
                          </a>
                        );
                      }}
                    />
                    <SectionTable
                      title="الحلقات"
                      tabId="halakat"
                      columns={[
                        { key: "name", label: "الاسم" },
                        { key: "role", label: "الدور" },
                        { key: "visibilityLabel", label: "الظهور" },
                        { key: "location", label: "الموقع" },
                        { key: "joinedAt", label: "تاريخ الانضمام" },
                      ]}
                      rows={(reportData.studentRows?.halakat || []).map(
                        (r) => ({
                          ...mapMembershipDisplayRow(r, { withJoined: true }),
                          location: r.location || "—",
                        }),
                      )}
                      actions={(row) => {
                        const to = viewLinkByKind("halaka", row.id);
                        if (!to) return null;
                        return (
                          <a
                            href={to}
                            className="ui-btn ui-btn--ghost ui-btn--sm"
                          >
                            <RhIcon
                              as={Eye}
                              size={14}
                              strokeWidth={RH_ICON_STROKE}
                            />
                          </a>
                        );
                      }}
                    />
                    <SectionTable
                      title="الأنشطة"
                      tabId="activities"
                      columns={[
                        { key: "name", label: "الاسم" },
                        { key: "role", label: "الدور" },
                        { key: "startAt", label: "البداية" },
                        { key: "endAt", label: "النهاية" },
                        {
                          key: "memberContributionText",
                          label: "مساهمة الطالب",
                        },
                      ]}
                      rows={(reportData.studentRows?.activities || []).map(
                        (r) => ({
                          ...r,
                          role: roleLabelAr(r.role),
                          startAt: formatArDateTime(r.startAt),
                          endAt: formatArDateTime(r.endAt),
                          memberContributionText:
                            (r.memberContributionText || "").trim() || "—",
                        }),
                      )}
                      actions={(row) => {
                        const to = viewLinkByKind("activity", row.id);
                        if (!to) return null;
                        return (
                          <a
                            href={to}
                            className="ui-btn ui-btn--ghost ui-btn--sm"
                          >
                            <RhIcon
                              as={Eye}
                              size={14}
                              strokeWidth={RH_ICON_STROKE}
                            />
                          </a>
                        );
                      }}
                    />
                    <SectionTable
                      title="الاختبارات"
                      tabId="exams"
                      columns={[
                        { key: "name", label: "الاسم" },
                        { key: "role", label: "الدور" },
                        { key: "visibilityLabel", label: "الظهور" },
                        {
                          key: "examSelfReportSummary",
                          label: "الإنجاز المُبلَغ",
                        },
                      ]}
                      rows={(reportData.studentRows?.exams || []).map((r) => ({
                        name: r.name || "—",
                        role: roleLabelAr(r.role),
                        visibilityLabel: reportVisibilityLabel(r.visibility),
                        examSelfReportSummary: formatExamSelfReportSummary(r),
                      }))}
                      actions={(row) => {
                        const to = viewLinkByKind("exam", row.id);
                        if (!to) return null;
                        return (
                          <a
                            href={to}
                            className="ui-btn ui-btn--ghost ui-btn--sm"
                          >
                            <RhIcon
                              as={Eye}
                              size={14}
                              strokeWidth={RH_ICON_STROKE}
                            />
                          </a>
                        );
                      }}
                    />
                    <SectionTable
                      title="الدورات"
                      tabId="dawrat"
                      columns={[
                        { key: "name", label: "الاسم" },
                        { key: "role", label: "الدور" },
                        { key: "courseStart", label: "بداية الدورة" },
                        { key: "courseEnd", label: "نهاية الدورة" },
                        {
                          key: "memberContributionText",
                          label: "مساهمة العضو",
                        },
                      ]}
                      rows={(reportData.studentRows?.dawrat || []).map((r) => ({
                        ...r,
                        role: roleLabelAr(r.role),
                        courseStart: formatArDateTime(r.courseStart),
                        courseEnd: formatArDateTime(r.courseEnd),
                        memberContributionText:
                          (r.memberContributionText || "").trim() || "—",
                      }))}
                      actions={(row) => {
                        const to = viewLinkByKind("dawra", row.id);
                        if (!to) return null;
                        return (
                          <a
                            href={to}
                            className="ui-btn ui-btn--ghost ui-btn--sm"
                          >
                            <RhIcon
                              as={Eye}
                              size={14}
                              strokeWidth={RH_ICON_STROKE}
                            />
                          </a>
                        );
                      }}
                    />
                    <SectionTable
                      title="التسميع عن بعد"
                      tabId="remote"
                      columns={[
                        { key: "name", label: "الاسم" },
                        { key: "role", label: "الدور" },
                        { key: "providerLabel", label: "المزوّد" },
                        { key: "mediaTypeLabel", label: "النوع" },
                      ]}
                      rows={(reportData.studentRows?.remoteTasmee || []).map(
                        (r) => ({
                          name: r.name || "—",
                          role: roleLabelAr(r.role),
                          providerLabel: reportProviderLabel(r.provider),
                          mediaTypeLabel: reportMediaTypeLabel(r.mediaType),
                        }),
                      )}
                      actions={(row) => {
                        const to = viewLinkByKind("remote_tasmee", row.id);
                        if (!to) return null;
                        return (
                          <a
                            href={to}
                            className="ui-btn ui-btn--ghost ui-btn--sm"
                          >
                            <RhIcon
                              as={Eye}
                              size={14}
                              strokeWidth={RH_ICON_STROKE}
                            />
                          </a>
                        );
                      }}
                    />
                    <SectionTable
                      title="الأوراد"
                      tabId="awrad"
                      columns={[
                        { key: "planName", label: "الخطة" },
                        { key: "planVolumesSummary", label: "المجلدات" },
                        { key: "recordedAt", label: "تاريخ الورد" },
                        { key: "pagesCount", label: "عدد الصفحات" },
                        { key: "fromPage", label: "من صفحة" },
                        { key: "toPage", label: "إلى صفحة" },
                      ]}
                      rows={(reportData.awrad || []).map((r) => ({
                        planName: r.planName || "—",
                        planVolumesSummary: r.planVolumesSummary || "—",
                        recordedAt: formatArDateTime(r.recordedAt),
                        pagesCount: r.pagesCount ?? 0,
                        fromPage: r.fromPage ?? "—",
                        toPage: r.toPage ?? "—",
                      }))}
                    />
                    <SectionTable
                      title="الإشعارات"
                      tabId="notifications"
                      columns={[
                        { key: "title", label: "العنوان" },
                        { key: "notificationTypeLabel", label: "النوع" },
                        { key: "createdAt", label: "التاريخ" },
                        { key: "isRead", label: "مقروء" },
                      ]}
                      rows={(reportData.notifications || []).map((r) => ({
                        title: r.title || "—",
                        notificationTypeLabel: reportNotificationTypeLabel(
                          r.notificationType,
                        ),
                        createdAt: formatArDateTime(r.createdAt),
                        isRead: r.isRead ? "نعم" : "لا",
                      }))}
                    />
                  </section>
                ) : reportData.kind === "teacher" ? (
                  <section className="rh-reports__result">
                    <ReportKpiGrid>
                      <div className="card rh-reports__kpi">
                        <strong>{reportData.summary.halakat}</strong>
                        <span>{str("layout.nav_halakat")}</span>
                      </div>
                      <div className="card rh-reports__kpi">
                        <strong>{reportData.summary.plans}</strong>
                        <span>{str("layout.nav_plans")}</span>
                      </div>
                      <div className="card rh-reports__kpi">
                        <strong>{reportData.summary.exams}</strong>
                        <span>{str("layout.nav_exams")}</span>
                      </div>
                      <div className="card rh-reports__kpi">
                        <strong>{reportData.summary.activities}</strong>
                        <span>{str("layout.nav_activities")}</span>
                      </div>
                      <div className="card rh-reports__kpi">
                        <strong>{reportData.summary.dawrat}</strong>
                        <span>{str("layout.nav_dawrat")}</span>
                      </div>
                      <div className="card rh-reports__kpi">
                        <strong>{reportData.summary.remoteTasmee}</strong>
                        <span>{str("layout.nav_remote_tasmee")}</span>
                      </div>
                      <div className="card rh-reports__kpi">
                        <strong>{reportData.summary.sessions}</strong>
                        <span>جلسات مسجلة</span>
                      </div>
                      <div className="card rh-reports__kpi">
                        <strong>{reportData.summary.attendanceRecorded}</strong>
                        <span>تسجيلات حضور</span>
                      </div>
                      <div className="card rh-reports__kpi">
                        <strong>{reportData.summary.studentsRecorded}</strong>
                        <span>طلاب تم تسجيلهم</span>
                      </div>
                      <div className="card rh-reports__kpi">
                        <strong>{reportData.summary.pagesRecorded}</strong>
                        <span>{str("reports.kpi_pages")}</span>
                      </div>
                    </ReportKpiGrid>
                    <SectionTable
                      title="حلقات المعلم"
                      tabId="halakat"
                      columns={[
                        { key: "name", label: "الاسم" },
                        { key: "role", label: "الدور" },
                        { key: "visibilityLabel", label: "الظهور" },
                      ]}
                      rows={(reportData.teacherRows?.halakat || []).map((r) =>
                        mapMembershipDisplayRow(r),
                      )}
                      actions={(row) => {
                        const to = viewLinkByKind("halaka", row.id);
                        if (!to) return null;
                        return (
                          <a
                            href={to}
                            className="ui-btn ui-btn--ghost ui-btn--sm"
                          >
                            <RhIcon
                              as={Eye}
                              size={14}
                              strokeWidth={RH_ICON_STROKE}
                            />
                          </a>
                        );
                      }}
                    />
                    <SectionTable
                      title="باقي ارتباطات المعلم"
                      tabId="memberships"
                      columns={[
                        { key: "section", label: "القسم" },
                        { key: "name", label: "الاسم" },
                        { key: "volumesSummary", label: "المجلدات" },
                        { key: "role", label: "الدور" },
                        { key: "visibilityLabel", label: "الظهور" },
                        {
                          key: "learnerContribution",
                          label: "مساهمة / إنجاز مُبلَغ",
                        },
                      ]}
                      rows={[
                        ...(reportData.teacherRows?.plans || []).map((r) => ({
                          section: "الخطط",
                          name: r.name || "—",
                          volumesSummary: r.volumesSummary || "—",
                          role: roleLabelAr(r.role),
                          visibilityLabel: reportVisibilityLabel(r.visibility),
                          learnerContribution: "—",
                        })),
                        ...(reportData.teacherRows?.activities || []).map(
                          (r) => ({
                            section: "الأنشطة",
                            name: r.name || "—",
                            volumesSummary: "—",
                            role: roleLabelAr(r.role),
                            visibilityLabel: reportVisibilityLabel(
                              r.visibility,
                            ),
                            learnerContribution:
                              (r.memberContributionText || "").trim() || "—",
                          }),
                        ),
                        ...(reportData.teacherRows?.exams || []).map((r) => ({
                          section: "الاختبارات",
                          name: r.name || "—",
                          volumesSummary: "—",
                          role: roleLabelAr(r.role),
                          visibilityLabel: reportVisibilityLabel(r.visibility),
                          learnerContribution: formatExamSelfReportSummary(r),
                        })),
                        ...(reportData.teacherRows?.dawrat || []).map((r) => ({
                          section: "الدورات",
                          name: r.name || "—",
                          volumesSummary: "—",
                          role: roleLabelAr(r.role),
                          visibilityLabel: reportVisibilityLabel(r.visibility),
                          learnerContribution:
                            (r.memberContributionText || "").trim() || "—",
                        })),
                        ...(reportData.teacherRows?.remoteTasmee || []).map(
                          (r) => ({
                            section: "التسميع عن بعد",
                            name: r.name || "—",
                            volumesSummary: "—",
                            role: roleLabelAr(r.role),
                            visibilityLabel: reportVisibilityLabel(
                              r.visibility,
                            ),
                            learnerContribution: "—",
                          }),
                        ),
                      ]}
                    />
                    <SectionTable
                      title="جلسات سجّلها المعلم"
                      tabId="sessions"
                      columns={[
                        { key: "halakaName", label: "الحلقة" },
                        { key: "title", label: "العنوان" },
                        { key: "startedAt", label: "البداية" },
                        { key: "endedAt", label: "النهاية" },
                        { key: "status", label: "الحالة" },
                      ]}
                      rows={(reportData.sessions || []).map((s) => ({
                        halakaName: s.halakaName || "—",
                        title: s.title || "",
                        startedAt: formatArDateTime(s.startedAt),
                        endedAt: formatArDateTime(s.endedAt),
                        status: reportSessionStatusLabel(s.status),
                      }))}
                    />
                    <SectionTable
                      title="سجلات الحضور التي أدخلها المعلم"
                      tabId="attendance"
                      columns={[
                        { key: "halakaName", label: "الحلقة" },
                        { key: "userName", label: "الطالب" },
                        { key: "attendanceStatusLabel", label: "الحضور" },
                        { key: "pagesCount", label: "الصفحات" },
                        { key: "updatedAt", label: "آخر تحديث" },
                      ]}
                      rows={(reportData.attendanceRecorded || []).map((a) => ({
                        halakaName: a.halakaName || "—",
                        userName: reportPersonLabel(a.userName, a.userId),
                        attendanceStatusLabel: reportAttendanceStatusLabel(
                          a.attendanceStatus,
                        ),
                        pagesCount: a.pagesCount ?? 0,
                        updatedAt: formatArDateTime(a.updatedAt),
                      }))}
                    />
                    <SectionTable
                      title="ملخص تسجيلات المعلم حسب كل طالب"
                      tabId="attendance"
                      columns={[
                        { key: "userName", label: "الطالب" },
                        { key: "recordsCount", label: "عدد التسجيلات" },
                        { key: "pagesTotal", label: "إجمالي الصفحات" },
                        { key: "latestUpdatedAt", label: "آخر تحديث" },
                      ]}
                      rows={(reportData.attendanceByStudent || []).map((r) => ({
                        userName: reportPersonLabel(r.userName, r.userId),
                        recordsCount: r.recordsCount ?? 0,
                        pagesTotal: r.pagesTotal ?? 0,
                        latestUpdatedAt: formatArDateTime(r.latestUpdatedAt),
                      }))}
                    />
                  </section>
                ) : (
                  <section className="rh-reports__result">
                    <ReportKpiGrid>
                      <div className="card rh-reports__kpi">
                        <strong>{reportData.summary.members}</strong>
                        <span>{str("reports.kpi_members")}</span>
                      </div>
                      {reportData.kind === "halaka" && (
                        <>
                          <div className="card rh-reports__kpi">
                            <strong>{reportData.summary.sessions}</strong>
                            <span>{str("reports.kpi_sessions")}</span>
                          </div>
                          <div className="card rh-reports__kpi">
                            <strong>{reportData.summary.attendance}</strong>
                            <span>{str("reports.kpi_attendance")}</span>
                          </div>
                          <div className="card rh-reports__kpi">
                            <strong>{reportData.summary.pagesTotal}</strong>
                            <span>{str("reports.kpi_pages")}</span>
                          </div>
                        </>
                      )}
                      {reportData.kind === "plan" && (
                        <>
                          <div className="card rh-reports__kpi">
                            <strong>
                              {reportData.summary.avgProgress ?? 0}%
                            </strong>
                            <span>متوسط إنجاز الأعضاء</span>
                          </div>
                          <div className="card rh-reports__kpi">
                            <strong>
                              {reportData.summary.pagesTotal ?? 0}
                            </strong>
                            <span>{str("reports.kpi_pages")}</span>
                          </div>
                          <div className="card rh-reports__kpi">
                            <strong>
                              {reportData.summary.awradRecords ?? 0}
                            </strong>
                            <span>سجلات الأوراد</span>
                          </div>
                        </>
                      )}
                      {(reportData.kind === "activity" ||
                        reportData.kind === "dawra") && (
                        <>
                          <div className="card rh-reports__kpi">
                            <strong>
                              {reportData.summary.withContribution ?? 0}
                            </strong>
                            <span>سجّلوا إنجازاً</span>
                          </div>
                          <div className="card rh-reports__kpi">
                            <strong>
                              {reportData.summary.withoutContribution ?? 0}
                            </strong>
                            <span>لم يسجّلوا بعد</span>
                          </div>
                        </>
                      )}
                      {reportData.kind === "exam" && (
                        <>
                          <div className="card rh-reports__kpi">
                            <strong>
                              {reportData.summary.examsCompleted ?? 0}
                            </strong>
                            <span>أتمّوا الاختبار</span>
                          </div>
                          <div className="card rh-reports__kpi">
                            <strong>
                              {reportData.summary.examsPending ?? 0}
                            </strong>
                            <span>لم يُتمّ بعد</span>
                          </div>
                        </>
                      )}
                    </ReportKpiGrid>
                    <SectionTable
                      title="تفاصيل الكيان"
                      tabId="details"
                      columns={entityDetailsColumnsForKind(
                        reportData.kind,
                        showEntityOwner,
                      )}
                      rows={[
                        formatEntityDetailsForReport(
                          reportData.entityDetails,
                          reportData.kind,
                          {
                            ownerName: showEntityOwner
                              ? reportData.entityDetails?.ownerName || "—"
                              : "",
                            formatDate: formatArDateTime,
                          },
                        ),
                      ]}
                      actions={() => {
                        const to = viewLinkByKind(
                          reportData.kind,
                          reportData.entityDetails?.id,
                        );
                        if (!to) return null;
                        return (
                          <a
                            href={to}
                            className="ui-btn ui-btn--ghost ui-btn--sm"
                          >
                            <RhIcon
                              as={Eye}
                              size={14}
                              strokeWidth={RH_ICON_STROKE}
                            />
                          </a>
                        );
                      }}
                    />
                    <SectionTable
                      title={str("reports.members_title")}
                      tabId="members"
                      columns={[
                        { key: "displayName", label: "الاسم" },
                        { key: "role", label: "الدور" },
                        { key: "email", label: "البريد" },
                        ...(reportData.kind === "activity" ||
                        reportData.kind === "exam" ||
                        reportData.kind === "dawra"
                          ? [
                              {
                                key: "learnerNote",
                                label:
                                  reportData.kind === "exam"
                                    ? "الإنجاز المُبلَغ"
                                    : reportData.kind === "activity"
                                      ? "مساهمة الطالب"
                                      : "مساهمة العضو",
                              },
                            ]
                          : []),
                      ]}
                      rows={(reportData.members || []).map((m) => ({
                        displayName: reportPersonLabel(m.displayName, m.userId),
                        role: roleLabelAr(m.role),
                        email: m.email || "",
                        learnerNote:
                          reportData.kind === "exam"
                            ? formatExamSelfReportSummary(m)
                            : (m.memberContributionText || "").trim() || "—",
                      }))}
                    />
                    {reportData.kind === "plan" && (
                      <SectionTable
                        title={
                          reportData.entityDetails?.volumesSummary &&
                          reportData.entityDetails.volumesSummary !== "—"
                            ? `إنجاز الأعضاء في الخطة — المجلدات: ${reportData.entityDetails.volumesSummary}`
                            : "إنجاز الأعضاء في الخطة"
                        }
                        tabId="progress"
                        columns={[
                          { key: "displayName", label: "الاسم" },
                          { key: "role", label: "الدور" },
                          { key: "progressPercent", label: "نسبة الإنجاز %" },
                          { key: "achievedPages", label: "أنجز (ص)" },
                          { key: "remainingPages", label: "بقي (ص)" },
                          { key: "targetPages", label: "الهدف (ص)" },
                          { key: "awradCount", label: "عدد الأوراد" },
                          { key: "pagesInAwrad", label: "صفحات الأوراد" },
                          { key: "latestAwradAt", label: "آخر ورد" },
                        ]}
                        rows={(reportData.memberDetails || []).map((r) => ({
                          ...r,
                          displayName: reportPersonLabel(
                            r.displayName,
                            r.userId,
                          ),
                          role: roleLabelAr(r.role),
                          latestAwradAt: formatArDateTime(r.latestAwradAt),
                        }))}
                      />
                    )}
                    {reportData.kind === "activity" && (
                      <SectionTable
                        title="إنجاز الأعضاء في النشاط"
                        tabId="progress"
                        columns={[
                          { key: "displayName", label: "الاسم" },
                          { key: "role", label: "الدور" },
                          {
                            key: "hasContributionLabel",
                            label: "سجّل إنجازاً؟",
                          },
                          { key: "contribution", label: "المساهمة" },
                          { key: "contributionUpdatedAt", label: "آخر تحديث" },
                        ]}
                        rows={(reportData.memberDetails || []).map((r) => ({
                          ...r,
                          displayName: reportPersonLabel(
                            r.displayName,
                            r.userId,
                          ),
                          role: roleLabelAr(r.role),
                          hasContributionLabel: r.hasContribution
                            ? "نعم"
                            : "لا",
                          contributionUpdatedAt: formatArDateTime(
                            r.contributionUpdatedAt,
                          ),
                        }))}
                      />
                    )}
                    {reportData.kind === "exam" && (
                      <SectionTable
                        title="إنجاز الأعضاء في الاختبار"
                        tabId="progress"
                        columns={[
                          { key: "displayName", label: "الاسم" },
                          { key: "role", label: "الدور" },
                          { key: "examStatusLabel", label: "الحالة" },
                          { key: "examNotes", label: "ملاحظات" },
                          { key: "examUpdatedAt", label: "آخر تحديث" },
                        ]}
                        rows={(reportData.memberDetails || []).map((r) => ({
                          ...r,
                          displayName: reportPersonLabel(
                            r.displayName,
                            r.userId,
                          ),
                          role: roleLabelAr(r.role),
                          examStatusLabel: formatExamSelfReportSummary(r),
                          examNotes:
                            (r.examSelfReportNotes || "").trim() || "—",
                          examUpdatedAt: formatArDateTime(
                            r.examSelfReportUpdatedAt,
                          ),
                        }))}
                      />
                    )}
                    {reportData.kind === "dawra" && (
                      <SectionTable
                        title="إنجاز الأعضاء في الدورة"
                        tabId="progress"
                        columns={[
                          { key: "displayName", label: "الاسم" },
                          { key: "role", label: "الدور" },
                          {
                            key: "hasContributionLabel",
                            label: "سجّل إنجازاً؟",
                          },
                          { key: "contribution", label: "المساهمة" },
                          { key: "contributionUpdatedAt", label: "آخر تحديث" },
                        ]}
                        rows={(reportData.memberDetails || []).map((r) => ({
                          ...r,
                          displayName: reportPersonLabel(
                            r.displayName,
                            r.userId,
                          ),
                          role: roleLabelAr(r.role),
                          hasContributionLabel: r.hasContribution
                            ? "نعم"
                            : "لا",
                          contributionUpdatedAt: formatArDateTime(
                            r.contributionUpdatedAt,
                          ),
                        }))}
                      />
                    )}
                    {reportData.kind === "remote_tasmee" && (
                      <SectionTable
                        title="تفاصيل أعضاء البث"
                        tabId="progress"
                        columns={[
                          { key: "displayName", label: "الاسم" },
                          { key: "role", label: "الدور" },
                          { key: "email", label: "البريد" },
                          { key: "joinedAt", label: "تاريخ الانضمام" },
                        ]}
                        rows={(reportData.memberDetails || []).map((r) => ({
                          ...r,
                          displayName: reportPersonLabel(
                            r.displayName,
                            r.userId,
                          ),
                          role: roleLabelAr(r.role),
                          joinedAt: formatArDateTime(r.joinedAt),
                        }))}
                      />
                    )}
                    {reportData.kind === "halaka" && (
                      <SectionTable
                        title="تفاصيل أعضاء الحلقة (شامل)"
                        tabId="progress"
                        columns={[
                          { key: "displayName", label: "الاسم" },
                          { key: "role", label: "دوره في الحلقة" },
                          { key: "plansVolumesSummary", label: "مجلدات خططه" },
                          { key: "plansCount", label: "خططه" },
                          { key: "halakatCount", label: "حلقاته" },
                          { key: "activitiesCount", label: "أنشطته" },
                          { key: "examsCount", label: "اختباراته" },
                          { key: "dawratCount", label: "دوراته" },
                          { key: "remoteTasmeeCount", label: "تسميعه عن بعد" },
                          { key: "awradCount", label: "عدد أوراده" },
                          { key: "pagesInAwrad", label: "صفحات الأوراد" },
                          { key: "latestAwradAt", label: "آخر ورد" },
                          {
                            key: "attendanceRecordsInHalaka",
                            label: "حضوره في هذه الحلقة",
                          },
                          {
                            key: "pagesInHalakaSessions",
                            label: "صفحاته في جلسات الحلقة",
                          },
                          { key: "latestAttendanceAt", label: "آخر حضور" },
                        ]}
                        rows={(reportData.memberDetails || []).map((r) => ({
                          ...r,
                          displayName: reportPersonLabel(
                            r.displayName,
                            r.userId,
                          ),
                          role: roleLabelAr(r.role),
                          latestAwradAt: formatArDateTime(r.latestAwradAt),
                          latestAttendanceAt: formatArDateTime(
                            r.latestAttendanceAt,
                          ),
                        }))}
                      />
                    )}
                    {reportData.kind === "halaka" && (
                      <>
                        <SectionTable
                          title="جلسات الحلقة"
                          tabId="sessions"
                          columns={[
                            { key: "title", label: "العنوان" },
                            { key: "startedAt", label: "البداية" },
                            { key: "endedAt", label: "النهاية" },
                            { key: "status", label: "الحالة" },
                          ]}
                          rows={(reportData.sessions || []).map((s) => ({
                            title: s.title || "—",
                            startedAt: formatArDateTime(s.startedAt),
                            endedAt: formatArDateTime(s.endedAt),
                            status: reportSessionStatusLabel(s.status),
                          }))}
                        />
                        <SectionTable
                          title="سجل الحضور والتسميع"
                          tabId="attendance"
                          columns={[
                            { key: "sessionTitle", label: "الجلسة" },
                            { key: "userName", label: "العضو" },
                            { key: "attendanceStatusLabel", label: "الحضور" },
                            { key: "pagesCount", label: "الصفحات" },
                            { key: "fromPage", label: "من" },
                            { key: "toPage", label: "إلى" },
                          ]}
                          rows={(reportData.attendanceRows || []).map((a) => ({
                            sessionTitle: a.sessionTitle || "جلسة",
                            userName: reportPersonLabel(
                              a.userName ||
                                halakaMemberNameMap.get(
                                  String(a.userId || "").trim(),
                                ),
                              a.userId,
                            ),
                            attendanceStatusLabel: reportAttendanceStatusLabel(
                              a.attendanceStatus,
                            ),
                            pagesCount: a.pagesCount ?? 0,
                            fromPage: a.fromPage ?? "—",
                            toPage: a.toPage ?? "—",
                          }))}
                        />
                      </>
                    )}
                  </section>
                )}
              </PrintDocumentChrome>
            </div>
          </ReportPrintContext.Provider>
        </ReportTabContext.Provider>
      )}
    </div>
  );
}
