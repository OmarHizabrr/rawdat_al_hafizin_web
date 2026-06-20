import {
  Bird,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import { HapticLink } from '../ui/HapticLink.jsx'
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from 'react-router-dom';
import { useSiteContent } from "../context/useSiteContent.js";
import { HomeTasksSummaryCard } from "../components/home/HomeTasksSummaryCard.jsx";
import { PERMISSION_PAGE_IDS } from "../config/permissionRegistry.js";
import { canViewCreator } from "../utils/viewCreatorPermission.js";
import { isAdmin, normalizeRole } from "../config/roles.js";
import { useAuth } from "../context/useAuth.js";
import { usePermissions } from "../context/usePermissions.js";
import { firestoreApi } from "../services/firestoreApi.js";
import { loadRecentStudentFeelings } from "../services/studentFeelingsService.js";
import {
  JOIN_GROUP_GENDER,
  JOIN_GROUP_PLATFORM,
  getUserJoinGroupState,
  joinGroup,
  subscribeJoinGroups,
} from "../services/joinGroupsService.js";
import {
  PROFILE_REQUEST_STATUS,
  loadMyProfileRequest,
} from "../services/profileRequestService.js";
import {
  getImpersonateUid,
  withImpersonationQuery,
} from "../utils/impersonation.js";
import { Button, useToast } from "../ui/index.js";
import {
  FEELINGS_FLIGHT_MODE,
  readFeelingsFlightMode,
} from "../utils/feelingsFlightPrefs.js";

const PH = PERMISSION_PAGE_IDS.home;

const DISMISSED_BIRDS_KEY = "rh.home.dismissedBirdKeys";

function readDismissedBirdKeys() {
  try {
    const raw = sessionStorage.getItem(DISMISSED_BIRDS_KEY);
    const arr = JSON.parse(raw);
    if (Array.isArray(arr))
      return new Set(arr.filter((x) => typeof x === "string"));
  } catch {
    /* ignore */
  }
  return new Set();
}

function persistDismissedBirdKeys(next) {
  try {
    sessionStorage.setItem(
      DISMISSED_BIRDS_KEY,
      JSON.stringify([...next].slice(0, 40)),
    );
  } catch {
    /* ignore */
  }
}

function birdKey(feeling) {
  return `${feeling?.ownerUid || "u"}:${feeling?.id || ""}`;
}

const BIRD_SWIPE_DISMISS_PX = 52;

function hashSeed(text) {
  let h = 0;
  const s = String(text || "");
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 33 + s.charCodeAt(i)) % 1000003;
  }
  return h;
}

function flightStyleFromFeeling(feeling, idx, mode) {
  const seed = hashSeed(
    `${feeling?.id || ""}:${feeling?.ownerUid || ""}:${idx}`,
  );
  const baseDuration = 16 + (seed % 11);
  const duration =
    mode === FEELINGS_FLIGHT_MODE.FAST
      ? Math.max(8, baseDuration * 0.68)
      : mode === FEELINGS_FLIGHT_MODE.CALM
        ? baseDuration * 1.45
        : baseDuration;
  const delay = -1 * (seed % 13);
  const y1 = -10 - (seed % 18);
  const y2 = 8 + ((seed >> 2) % 26);
  const y3 = -12 - ((seed >> 4) % 22);
  const scale = 0.92 + (seed % 16) / 100;
  const top = 8 + ((seed >> 1) % 78);
  const reverse = (seed >> 3) % 2 === 1;
  return {
    "--flight-duration": `${duration}s`,
    "--flight-delay": `${delay}s`,
    "--flight-y1": `${y1}px`,
    "--flight-y2": `${y2}px`,
    "--flight-y3": `${y3}px`,
    "--bird-scale": `${scale.toFixed(2)}`,
    "--flight-top": `${top}%`,
    "--flight-from": reverse ? "112vw" : "-22vw",
    "--flight-to": reverse ? "-30vw" : "122vw",
  };
}

function flightClassFromFeeling(feeling, idx) {
  const seed = hashSeed(
    `${feeling?.id || ""}:${feeling?.ownerUid || ""}:${idx}`,
  );
  return (seed >> 3) % 2 === 1
    ? "rh-home-feelings-birds__flight rh-home-feelings-birds__flight--reverse"
    : "rh-home-feelings-birds__flight";
}

function FlyingFeelingBird({
  feeling,
  idx,
  mode,
  paused,
  onSingleClick,
  onDismissSwipe,
  showAuthor = true,
}) {
  const [dragging, setDragging] = useState(false);
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const dragRef = useRef({ active: false, x: 0, y: 0, moved: false });
  const offsetRef = useRef({ dx: 0, dy: 0 });

  const onPointerDown = (e) => {
    dragRef.current = {
      active: true,
      x: e.clientX,
      y: e.clientY,
      moved: false,
    };
    offsetRef.current = { dx: 0, dy: 0 };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragRef.current.active) return;
    const nx = e.clientX - dragRef.current.x;
    const ny = e.clientY - dragRef.current.y;
    if (Math.abs(nx) > 3 || Math.abs(ny) > 3) dragRef.current.moved = true;
    offsetRef.current = { dx: nx, dy: ny };
    setDragging(true);
    setDx(nx);
    setDy(ny);
  };

  const finishPointer = () => {
    if (!dragRef.current.active) return;
    const moved = dragRef.current.moved;
    dragRef.current.active = false;
    const { dx: fx, dy: fy } = offsetRef.current;
    const dist = Math.hypot(fx, fy);
    setDragging(false);
    setDx(0);
    setDy(0);
    offsetRef.current = { dx: 0, dy: 0 };
    if (moved && dist >= BIRD_SWIPE_DISMISS_PX && onDismissSwipe) {
      onDismissSwipe(feeling);
      return;
    }
    if (!moved) onSingleClick?.(feeling);
  };

  return (
    <li
      className={[
        flightClassFromFeeling(feeling, idx),
        paused ? "rh-home-feelings-birds__flight--paused" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={flightStyleFromFeeling(feeling, idx, mode)}
    >
      <article
        className={[
          "rh-home-feelings-birds__bird-card",
          dragging ? "rh-home-feelings-birds__bird-card--dragging" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        title="اسحب بعيداً لإخفاء الطائر — اضغط دون سحب لعرض التفاصيل"
        style={{
          transform: `translate(${dx}px, ${dy}px) scale(var(--bird-scale, 1))`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
      >
        <span className="rh-home-feelings-birds__bird" aria-hidden>
          {feeling.bird || "🐦"}
        </span>
        {showAuthor ? (
          <header className="rh-home-feelings-birds__who">
            {feeling.photoURL ? (
              <img
                src={feeling.photoURL}
                alt=""
                width={28}
                height={28}
                className="rh-home-feelings-birds__avatar"
              />
            ) : (
              <span className="rh-home-feelings-birds__avatar rh-home-feelings-birds__avatar--fallback">
                {(feeling.displayName || "ط").charAt(0)}
              </span>
            )}
            <strong>{feeling.displayName || "طالب"}</strong>
          </header>
        ) : null}
        <p className="rh-home-feelings-birds__text">{feeling.text}</p>
        <span className="rh-home-feelings-birds__meta">
          {"★".repeat(Math.max(1, feeling.rating || 1))}
        </span>
      </article>
    </li>
  );
}

export default function AppHomePage() {
  const { user } = useAuth();
  const toast = useToast();
  const { can, canAccessPage } = usePermissions();
  const { branding, str } = useSiteContent();
  const { search } = useLocation();
  const [searchParams] = useSearchParams();
  const uidParam = searchParams.get("uid")?.trim() || "";

  const contextUserId = useMemo(() => {
    if (!user?.uid) return "";
    if (uidParam && isAdmin(user)) return uidParam;
    return user.uid;
  }, [user, uidParam]);

  const actingAsUser = Boolean(
    user?.uid && contextUserId && contextUserId !== user.uid,
  );
  const impersonateUid = getImpersonateUid(user, search);

  const appPath = useCallback(
    (path) => withImpersonationQuery(path, impersonateUid),
    [impersonateUid],
  );

  const [subjectProfile, setSubjectProfile] = useState(null);
  const [recentFeelings, setRecentFeelings] = useState([]);
  const [feelingsFlightMode, setFeelingsFlightMode] = useState(() =>
    readFeelingsFlightMode(),
  );
  const [pausedBirdIds, setPausedBirdIds] = useState({});
  const [activeFeelingDetail, setActiveFeelingDetail] = useState(null);
  const [dismissedBirdKeys, setDismissedBirdKeys] = useState(readDismissedBirdKeys);
  const [joinGroups, setJoinGroups] = useState([]);
  const [groupStateById, setGroupStateById] = useState({});
  const [joiningGroupId, setJoiningGroupId] = useState("");

  useEffect(() => {
    document.title = actingAsUser
      ? `الرئيسية (نيابة) — ${branding.siteTitle}`
      : `الرئيسية — ${branding.siteTitle}`;
  }, [actingAsUser, branding.siteTitle]);

  useEffect(() => {
    if (!actingAsUser || !contextUserId) return undefined;
    let cancelled = false;
    Promise.all([
      firestoreApi.getData(firestoreApi.getUserDoc(contextUserId)),
      loadMyProfileRequest(contextUserId),
    ]).then(([d, req]) => {
      if (cancelled) return;
      const base = d ? { ...d } : {};
      if (!String(base.gender || "").trim() && req?.gender) {
        base.gender = req.gender;
      }
      setSubjectProfile(base);
    });
    return () => {
      cancelled = true;
    };
  }, [actingAsUser, contextUserId]);

  useEffect(() => {
    let cancelled = false;
    loadRecentStudentFeelings(10)
      .then((rows) => {
        if (!cancelled) setRecentFeelings(rows);
      })
      .catch(() => {
        if (!cancelled) setRecentFeelings([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsub = subscribeJoinGroups(
      (rows) => setJoinGroups(Array.isArray(rows) ? rows : []),
      () => setJoinGroups([]),
    );
    return () => unsub();
  }, []);

  const impersonatedSubject =
    actingAsUser && contextUserId ? subjectProfile : null;
  const effectiveUserGender = actingAsUser
    ? String(impersonatedSubject?.gender || "").trim()
    : String(user?.gender || "").trim();
  const normalizedGender = useMemo(() => {
    const g = effectiveUserGender.toLowerCase();
    if (["male", "m", "man", "ذكر"].includes(g)) return "male";
    if (["female", "f", "woman", "أنثى", "انثى", "انثي"].includes(g)) return "female";
    return "";
  }, [effectiveUserGender]);
  const effectiveProfileStatus = actingAsUser
    ? String(
        impersonatedSubject?.profileRequestStatus ||
          impersonatedSubject?.status ||
          impersonatedSubject?.profileStatus ||
          "",
      ).trim()
    : String(
        user?.profileRequestStatus || user?.status || user?.profileStatus || "",
      ).trim();
  const shouldShowJoinGroups =
    normalizeRole(user?.role) === "student" &&
    effectiveProfileStatus === PROFILE_REQUEST_STATUS.APPROVED;

  useEffect(() => {
    if (!contextUserId || joinGroups.length === 0) {
      setGroupStateById({});
      return undefined;
    }
    let cancelled = false;
    Promise.all(
      joinGroups.map(async (g) => ({
        id: g.id,
        state: await getUserJoinGroupState(g.id, contextUserId),
      })),
    )
      .then((rows) => {
        if (cancelled) return;
        const map = {};
        for (const row of rows) map[row.id] = row.state;
        setGroupStateById(map);
      })
      .catch(() => {
        if (!cancelled) setGroupStateById({});
      });
    return () => {
      cancelled = true;
    };
  }, [joinGroups, contextUserId]);

  const name = actingAsUser
    ? impersonatedSubject?.displayName?.trim() ||
      str("app.home_greeting_user_fallback")
    : user?.displayName?.trim() || str("app.home_greeting_fallback");

  const canVisitFeelings = canAccessPage("feelings");
  const canVisitWorkspace = canAccessPage("home");
  const showFeelingAuthor = canViewCreator(can, PH);
  const canRenderFlights =
    canVisitFeelings &&
    recentFeelings.length > 0 &&
    feelingsFlightMode !== FEELINGS_FLIGHT_MODE.OFF;
  const flyingFeelings = useMemo(() => {
    const cap =
      feelingsFlightMode === FEELINGS_FLIGHT_MODE.CALM ? 5 : 8;
    return recentFeelings
      .slice(0, cap)
      .filter((f) => !dismissedBirdKeys.has(birdKey(f)));
  }, [recentFeelings, feelingsFlightMode, dismissedBirdKeys]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e?.key && e.key !== "rh.feelingsFlightMode") return;
      setFeelingsFlightMode(readFeelingsFlightMode());
    };
    const onCustom = (e) => {
      const next = e?.detail;
      if (next === "off" || next === "calm" || next === "fast")
        setFeelingsFlightMode(next);
      else setFeelingsFlightMode(readFeelingsFlightMode());
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("rh:feelings-flight-mode", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("rh:feelings-flight-mode", onCustom);
    };
  }, []);

  const onBirdSingleClick = useCallback((feeling) => {
    const key = `${feeling.ownerUid || "u"}:${feeling.id}`;
    setPausedBirdIds((prev) => ({ ...prev, [key]: true }));
    setActiveFeelingDetail(feeling);
    window.setTimeout(() => {
      setPausedBirdIds((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 3000);
  }, []);

  const onBirdDismissSwipe = useCallback((feeling) => {
    const key = birdKey(feeling);
    setDismissedBirdKeys((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      persistDismissedBirdKeys(next);
      return next;
    });
    setActiveFeelingDetail((cur) =>
      cur && birdKey(cur) === birdKey(feeling) ? null : cur,
    );
    setPausedBirdIds((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const homeJoinGroups = useMemo(() => {
    if (!shouldShowJoinGroups) return [];
    const genderAllowed = (group) => {
      if (group.genderType === JOIN_GROUP_GENDER.ALL) return true;
      if (group.genderType === JOIN_GROUP_GENDER.MEN)
        return normalizedGender === "male";
      if (group.genderType === JOIN_GROUP_GENDER.WOMEN)
        return normalizedGender === "female";
      return true;
    };
    return joinGroups.filter(
      (group) => {
        if (group.visibleOnHome === false) return false;
        if (!genderAllowed(group)) return false;
        const state = groupStateById[group.id] || { joinCount: 0 };
        const maxAppearances = Math.max(1, Number(group.maxAppearances || 1));
        return Number(state.joinCount || 0) < maxAppearances;
      },
    );
  }, [
    shouldShowJoinGroups,
    joinGroups,
    groupStateById,
    normalizedGender,
  ]);
  const groupPlatformLabel = useCallback((platform) => {
    if (platform === JOIN_GROUP_PLATFORM.WHATSAPP) return "واتساب";
    if (platform === JOIN_GROUP_PLATFORM.TELEGRAM) return "تليجرام";
    if (platform === JOIN_GROUP_PLATFORM.FACEBOOK) return "فيسبوك";
    if (platform === JOIN_GROUP_PLATFORM.DISCORD) return "ديسكورد";
    return "مجموعة";
  }, []);

  return (
    <div className="rh-app-home rh-app-home--dash">
      <header className="rh-home-dash__top rh-home-dash__top--app card">
        <div className="rh-home-dash__top-row">
          <div>
            <p className="rh-home-dash__hello">
              مرحباً، <strong>{name}</strong>
            </p>
            <p className="rh-home-dash__tagline">
              {actingAsUser
                ? str("app.home_lead_impersonate")
                : str("app.home_lead_normal")}
            </p>
          </div>
          <span className="rh-home-dash__sparkle" aria-hidden>
            <Sparkles size={24} strokeWidth={1.75} />
          </span>
        </div>
        {actingAsUser && (
          <p className="rh-plans__admin-banner rh-app-home__impersonation">
            <HapticLink to="/app/admin/users">
              {str("app.home_impersonation_users")}
            </HapticLink>
            {" · "}
            <HapticLink to={`/app/plans?uid=${encodeURIComponent(contextUserId)}`}>
              {str("app.home_impersonation_plans")}
            </HapticLink>
            {" · "}
            <HapticLink to={`/app/halakat?uid=${encodeURIComponent(contextUserId)}`}>
              {str("app.home_impersonation_halakat")}
            </HapticLink>
            {" · "}
            <HapticLink to={`/app/dawrat?uid=${encodeURIComponent(contextUserId)}`}>
              {str("app.home_impersonation_dawrat")}
            </HapticLink>
            {" · "}
            <HapticLink to={`/app/exams?uid=${encodeURIComponent(contextUserId)}`}>
              {str("app.home_impersonation_exams")}
            </HapticLink>
            {" · "}
            <HapticLink to={`/app/activities?uid=${encodeURIComponent(contextUserId)}`}>
              {str("app.home_impersonation_activities")}
            </HapticLink>
            {" · "}
            <HapticLink to={`/app/awrad?uid=${encodeURIComponent(contextUserId)}`}>
              {str("app.home_impersonation_awrad")}
            </HapticLink>
            {" · "}
            <HapticLink to="/app">{str("app.home_impersonation_my_account")}</HapticLink>
          </p>
        )}
      </header>

      {canRenderFlights ? (
        <ul
          className={[
            "rh-home-feelings-birds__overlay",
            `rh-home-feelings-birds__overlay--${feelingsFlightMode}`,
          ].join(" ")}
          aria-label="طيور المشاعر المتدفقة"
        >
          {flyingFeelings.map((f, i) => {
            const key = `${f.ownerUid || "u"}:${f.id}`;
            return (
              <FlyingFeelingBird
                key={key}
                feeling={f}
                idx={i}
                mode={feelingsFlightMode}
                paused={pausedBirdIds[key] === true}
                onSingleClick={onBirdSingleClick}
                onDismissSwipe={onBirdDismissSwipe}
                showAuthor={showFeelingAuthor}
              />
            );
          })}
        </ul>
      ) : null}
      {activeFeelingDetail ? (
        <div
          className="rh-home-feelings-birds__detail"
          role="dialog"
          aria-label="تفاصيل المشاعر"
        >
          <button
            type="button"
            className="rh-home-feelings-birds__detail-close"
            onClick={() => setActiveFeelingDetail(null)}
            aria-label="إغلاق التفاصيل"
          >
            ×
          </button>
          {showFeelingAuthor ? (
            <div className="rh-home-feelings-birds__detail-head">
              {activeFeelingDetail.photoURL ? (
                <img
                  src={activeFeelingDetail.photoURL}
                  alt=""
                  width={36}
                  height={36}
                  className="rh-home-feelings-birds__avatar"
                />
              ) : (
                <span className="rh-home-feelings-birds__avatar rh-home-feelings-birds__avatar--fallback">
                  {(activeFeelingDetail.displayName || "ط").charAt(0)}
                </span>
              )}
              <strong>{activeFeelingDetail.displayName || "طالب"}</strong>
            </div>
          ) : null}
          <p className="rh-home-feelings-birds__detail-text">
            {activeFeelingDetail.text}
          </p>
          <span className="rh-home-feelings-birds__meta">
            {"★".repeat(Math.max(1, activeFeelingDetail.rating || 1))}
          </span>
          <HapticLink
            className="rh-home-feelings-birds__detail-link"
            to={appPath("/app/feelings")}
          >
            فتح صفحة المشاعر
          </HapticLink>
        </div>
      ) : null}

      {canVisitWorkspace && contextUserId ? (
        <HomeTasksSummaryCard userId={contextUserId} impersonateUid={impersonateUid} />
      ) : null}

            {homeJoinGroups.length > 0 ? (
        <section className="card rh-home-join-groups">
          <div className="rh-settings-card__head">
            <h2 className="rh-settings-card__title">مجموعات الانضمام</h2>
            <p className="rh-settings-card__subtitle">
              اختر مجموعة مناسبة لك، وبعد الانضمام تختفي تلقائياً من الصفحة.
            </p>
          </div>
          <ul className="rh-home-join-groups__list">
            {homeJoinGroups.map((group) => (
              <li key={group.id} className="rh-home-join-groups__item">
                <div className="rh-home-join-groups__cover">
                  {group.imageUrl ? (
                    <img src={group.imageUrl} alt="" loading="lazy" />
                  ) : (
                    <span>{groupPlatformLabel(group.platform)}</span>
                  )}
                </div>
                <div className="rh-home-join-groups__body">
                  <strong>{group.name || "مجموعة"}</strong>
                  <span className="rh-plans__saved-badge">
                    {groupPlatformLabel(group.platform)} ·{" "}
                    {group.genderType === "women"
                      ? "إناث"
                      : group.genderType === "men"
                        ? "ذكور"
                        : "الكل"}
                  </span>
                  {group.description ? (
                    <p className="rh-plans__saved-meta">{group.description}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  icon={UserPlus}
                  loading={joiningGroupId === group.id}
                  disabled={
                    joiningGroupId !== "" && joiningGroupId !== group.id
                  }
                  onClick={async () => {
                    if (!user?.uid || !contextUserId) return;
                    setJoiningGroupId(group.id);
                    try {
                      const actor = actingAsUser
                        ? { ...user, uid: contextUserId }
                        : user;
                      const res = await joinGroup(actor, group.id);
                      setGroupStateById((prev) => {
                        const prevCount = Number(prev?.[group.id]?.joinCount || 0);
                        const nextCount = Number(res?.joinCount || prevCount + 1);
                        return {
                          ...prev,
                          [group.id]: {
                            joinCount: nextCount,
                            hasMembership: true,
                          },
                        };
                      });
                      toast.success(
                        res?.exhausted
                          ? "تم الانضمام. لن تظهر هذه المجموعة مرة أخرى."
                          : "تم الانضمام بنجاح.",
                        "تم",
                      );
                      if (group.joinUrl) {
                        window.open(
                          group.joinUrl,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }
                    } catch {
                      toast.warning("تعذّر الانضمام للمجموعة.", "تنبيه");
                    } finally {
                      setJoiningGroupId("");
                    }
                  }}
                >
                  انضمام
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
