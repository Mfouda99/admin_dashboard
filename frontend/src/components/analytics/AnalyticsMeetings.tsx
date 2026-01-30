import { useEffect, useMemo, useState, useCallback } from "react";

import TopHeader from "../header/TopHeader";
import StatsOverview from "./StatsOverview";
import CoachesOverview from "../coaches/CoachesOverview";
import MonthlySessionsChart from "./MonthlySessionsChart";
import TrackEvidencesChart from "./TrackEvidencesChart";
import UpcomingMeetingCard from "./UpcomingMeetingCard";
import type { Meeting } from "../../types/meetings";
import { normalizeCompletedSessions, filterCompletedSessionsByRange } from "../../helpers/meetings";
import CoachesList from "../coaches/CoachesList";
import Calendar from "./Calendar";
import TodoList from "./TodoList";
import EvidenceBarChart from "./EvidenceBarChart";
import { useReport } from "../../context/ReportContext";

import { fetchAllCoachesAnalytics, CoachAnalytics } from "../../api";

/* ================= helpers ================= */

const countCancelledSessions = (cancelledSessions: any): number => {
  const sessions = cancelledSessions?.sessions;
  if (!Array.isArray(sessions)) return 0;
  return sessions.filter((s: any) => !!s?.cancelledAt).length;
};

const countUpcomingSessions = (
  upcommingSessions?: { meetings?: Meeting[] }
): number => {
  return upcommingSessions?.meetings?.length ?? 0;
};

const countUpcomingMeetings = (meetings: any[] | undefined | null): number => {
  if (!Array.isArray(meetings)) return 0;
  return meetings.length;
};


const getNextMeeting = (
  upcommingSessions?: { meetings?: Meeting[] }
): Meeting | null => {
  const meetings: Meeting[] = upcommingSessions?.meetings ?? [];

  if (meetings.length === 0) return null;

  return [...meetings].sort((a, b) => {
    const aDate = new Date(`${a.date}T${a.timeFrom}`).getTime();
    const bDate = new Date(`${b.date}T${b.timeFrom}`).getTime();
    return aDate - bDate;
  })[0]!;
};

// Filter by time
type TimePeriod = "7d" | "1m" | "3m" | "6m" | "1y";

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);

const getRange = (period: TimePeriod) => {
  const end = startOfDay(new Date()); // today
  let start = end;

  switch (period) {
    case "7d":
      start = addDays(end, -6); // include today => 7 days
      break;
    case "1m":
      start = new Date(end.getFullYear(), end.getMonth() - 1, end.getDate());
      break;
    case "3m":
      start = new Date(end.getFullYear(), end.getMonth() - 3, end.getDate());
      break;
    case "6m":
      start = new Date(end.getFullYear(), end.getMonth() - 6, end.getDate());
      break;
    case "1y":
      start = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate());
      break;
  }

  return { start, end };
};

const inRange = (dateStr: string | null | undefined, start: Date, end: Date) => {
  if (!dateStr) return false;

  // YYYY-MM-DD or ISO
  const d = dateStr.length === 10 ? new Date(dateStr + "T00:00:00") : new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;

  const dd = startOfDay(d).getTime();
  return dd >= start.getTime() && dd <= end.getTime();
};

// meetings: {date:"YYYY-MM-DD", ...}
const filterMeetingsByRange = (meetings: any[] | undefined, start: Date, end: Date) => {
  if (!Array.isArray(meetings)) return [];
  return meetings.filter((m) => inRange(m?.date, start, end));
};

// sessions:(date/completedAt/cancelledAt/createdAt)
const extractSessionDate = (s: any): string | null => {
  return (
    s?.date ||
    s?.session_date ||
    s?.created_at ||
    s?.createdAt ||
    s?.completed_at ||
    s?.completedAt ||
    s?.cancelled_at ||
    s?.cancelledAt ||
    null
  );
};

const filterSessionsShapeByRange = (obj: any, start: Date, end: Date) => {
  // if shape: { sessions: [] }
  if (obj && typeof obj === "object" && Array.isArray(obj.sessions)) {
    return {
      ...obj,
      sessions: obj.sessions.filter((s: any) => inRange(extractSessionDate(s), start, end)),
    };
  }

  // if shape: [] directly
  if (Array.isArray(obj)) {
    return obj.filter((s: any) => inRange(extractSessionDate(s), start, end));
  }

  return obj;
};

/* ================= component ================= */

export default function AnalyticsMeetings({ onOpenSidebar }: { onOpenSidebar?: () => void }) {
  /* ---- state ---- */
  const [coaches, setCoaches] = useState<CoachAnalytics[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState<number | null>(null);

  // ---- filters state ----
  const [periodFilter, setPeriodFilter] = useState("7");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("7d");
  const [coachFilterId, setCoachFilterId] = useState<number | "all">("all");

  const selectedCoachSafe = useMemo(() => {
    if (!coaches.length) return null;
    return coaches.find((c) => c.id === selectedCoachId) ?? coaches[0];
  }, [coaches, selectedCoachId]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { setRows } = useReport();

  /* ---- effects ---- */
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const data = await fetchAllCoachesAnalytics();
        const arr = Array.isArray(data) ? data : [];

        const normalized = arr
          .map((c: any) => {
            const rawId =
              c.id ??
              c.case_owner_id ??
              c.caseOwnerId ??
              c.coach_id ??
              c.coachId;

            const id = Number(rawId);

            return { ...c, id };
          })
          .filter((c: any) => Number.isFinite(c.id));

        setCoaches(normalized);

        const firstId = normalized[0]?.id ?? null;
        setSelectedCoachId(firstId);
        setCoachFilterId("all");
      } catch (err) {
        console.error(err);
        setError("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  // ---- Selected Coach ----
  const selectCoach = useCallback((coach: CoachAnalytics) => {
    const id = Number((coach as any).id ?? (coach as any).case_owner_id);
    if (!Number.isFinite(id)) return;

    setSelectedCoachId(id);
    // setCoachFilterId(id);
  }, []);

  const activeCoachIdForList = useMemo(
    () => selectedCoachId ?? coaches[0]?.id ?? null,
    [selectedCoachId, coaches]
  );
  // time period mapping
  const periodToTimePeriod = (p: string): TimePeriod => {
    switch (p) {
      case "7":
        return "7d";
      case "30":
        return "1m";
      case "90":
        return "3m";
      case "180":
        return "6m";
      case "365":
        return "1y";
      default:
        return "7d";
    }
  };

  const handleApplyFilters = useCallback(
    (filters: { coach: string; period: string }) => {
      setPeriodFilter(filters.period);
      setTimePeriod(periodToTimePeriod(filters.period));

      if (filters.coach === "all") {
        setCoachFilterId("all");
        return;
      }

      const id = Number(filters.coach);
      setCoachFilterId(id);
      setSelectedCoachId(id);
    },
    [coaches]
  );

  // ---- range (based on timePeriod) ----
  const range = useMemo(() => getRange(timePeriod), [timePeriod]);

  // ---- coaches after coach filter ----
  const visibleCoaches = useMemo(() => {
    return coachFilterId === "all"
      ? coaches
      : coaches.filter((c) => c.id === coachFilterId);
  }, [coaches, coachFilterId]);

  /* ---- derived data (NO early returns before hooks) ---- */
  const today = new Date().toISOString().slice(0, 10);

  const normalizeMeeting = useCallback((m: unknown): Meeting | null => {
    if (!m || typeof m !== "object") return null;

    const meeting = m as any;

    return {
      date: typeof meeting.date === "string" ? meeting.date : "",
      timeFrom: typeof meeting.timeFrom === "string" ? meeting.timeFrom : "",
      timeTo: typeof meeting.timeTo === "string" ? meeting.timeTo : "",
      serviceName:
        typeof meeting.serviceName === "string"
          ? meeting.serviceName
          : "Session",
      customerName:
        typeof meeting.customerName === "string"
          ? meeting.customerName
          : typeof meeting.customerName?.name === "string"
            ? meeting.customerName.name
            : "Unknown student",
      joinWebUrl:
        typeof meeting.joinWebUrl === "string" ? meeting.joinWebUrl : null,
    };
  }, []);

  const todayMeetings = useMemo<Meeting[]>(() => {
    return (
      selectedCoachSafe?.upcomming_sessions?.meetings
        ?.map(normalizeMeeting)
        .filter(
          (m): m is Meeting => !!m && m.date === today
        ) ?? []
    );
  }, [selectedCoachSafe, today, normalizeMeeting]);

  const nextMeeting = useMemo<Meeting | null>(() => {
    return getNextMeeting(
      selectedCoachSafe?.upcomming_sessions
        ? {
          meetings: selectedCoachSafe.upcomming_sessions.meetings
            ?.map(normalizeMeeting)
            .filter((m): m is Meeting => !!m),
        }
        : undefined
    );
  }, [selectedCoachSafe, normalizeMeeting]);

  const completedStats = useMemo(() => {
    const filteredCompleted = filterCompletedSessionsByRange(
      selectedCoachSafe?.completed_sessions,
      range.start,
      range.end
    );
    return normalizeCompletedSessions(filteredCompleted);
  }, [selectedCoachSafe, range.start, range.end]);

  const cancelledCountSelected = useMemo(() => {
    const filteredCancelled = filterSessionsShapeByRange(
      selectedCoachSafe?.cancelled_sessions,
      range.start,
      range.end
    );
    return countCancelledSessions(filteredCancelled);
  }, [selectedCoachSafe, range.start, range.end]);

  const monthlyData = useMemo(() => {
    return visibleCoaches.map((coach) => {
      const filteredCompleted = filterCompletedSessionsByRange(
        coach.completed_sessions,
        range.start,
        range.end
      );
      const completed = normalizeCompletedSessions(filteredCompleted);

      const filteredCancelled = filterSessionsShapeByRange(
        coach.cancelled_sessions,
        range.start,
        range.end
      );
      const cancelledCount = countCancelledSessions(filteredCancelled);

      const normalizedMeetings =
        coach.upcomming_sessions?.meetings
          ?.map(normalizeMeeting)
          .filter((m): m is Meeting => !!m) ?? [];

      return {
        name: coach.case_owner,
        completed: completed.totalSessions,
        cancelled: cancelledCount,
        upcomming: normalizedMeetings.length,
      };
    });
  }, [visibleCoaches, normalizeMeeting, range.start, range.end]);

  useEffect(() => {
    const rows = monthlyData.map((r) => ({
      Coach: r.name,
      Completed: Number(r.completed ?? 0),
      Cancelled: Number(r.cancelled ?? 0),
      Upcoming: Number(r.upcomming ?? 0),
    }));

    setRows(rows);
  }, [monthlyData, setRows]);

  /* ================= Calender ================= */
  const calendarDates = useMemo<string[]>(() => {
    const meetings = selectedCoachSafe?.upcomming_sessions?.meetings ?? [];

    return Array.from(
      new Set(
        meetings
          .map(m => m?.date)
          .filter((d): d is string => typeof d === "string")
      )
    );
  }, [selectedCoachSafe]);

  const meetingsByDate = useMemo<Record<string, Meeting[]>>(() => {
    const meetings =
      selectedCoachSafe?.upcomming_sessions?.meetings
        ?.map(normalizeMeeting)
        .filter((m): m is Meeting => !!m) ?? [];

    return meetings.reduce<Record<string, Meeting[]>>((acc, meeting) => {
      const date = meeting.date;   // the key of the meeting
      if (!date) return acc;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(meeting);
      return acc;
    }, {});
  }, [selectedCoachSafe, normalizeMeeting]);

  // ================= student iframe =================
  type StudentAnalytics = {
    id: string;
    fullName: string;
    email: string;
    overall: number;      // 0..100
    lmsProgress: number;  // 0..100
    aptemProgress: number;// 0..100
  };

  const [studentsModal, setStudentsModal] = useState<{
    open: boolean;
    coachName?: string;
    students?: StudentAnalytics[];
  }>({ open: false });


  const [studentSearch, setStudentSearch] = useState("");

  function normalizeStudent(s: unknown): StudentAnalytics | null {
    if (!s || typeof s !== "object") return null;
    const x = s as any;

    const id = String(x.ID ?? x.id ?? "");
    const fullName = String(x.FullName ?? x.fullName ?? "Unknown");
    const email = String(x.Email ?? x.email ?? "");

    const overall = Number(x.Overall ?? x.overall ?? 0);
    const lms = Number(x.LMSProgress ?? x.lmsProgress ?? 0);
    const aptem = Number(x.AptemProgress ?? x.aptemProgress ?? 0);

    const clamp01 = (n: number) => Math.max(0, Math.min(100, n));

    return {
      id,
      fullName,
      email,
      overall: Number.isFinite(overall) ? clamp01(overall) : 0,
      lmsProgress: Number.isFinite(lms) ? clamp01(lms) : 0,
      aptemProgress: Number.isFinite(aptem) ? clamp01(aptem) : 0,
    };
  }

  const handleViewStudents = (coach: CoachAnalytics) => {
    selectCoach(coach);

    const raw = (coach as any).students ?? [];
    const normalized = Array.isArray(raw)
      ? raw.map(normalizeStudent).filter((x): x is StudentAnalytics => !!x)
      : [];

    setStudentsModal({
      open: true,
      coachName: coach.case_owner,
      students: normalized,
    });

    setStudentSearch("");
  };


  // Global students names list (from coaches[].students JSONB)
  const students = useMemo<string[]>(() => {
    const names: string[] = [];

    for (const coach of coaches) {
      const raw = (coach as any).students;
      if (!Array.isArray(raw)) continue;

      for (const s of raw) {
        const st = normalizeStudent(s);
        if (st?.fullName?.trim()) names.push(st.fullName.trim());
      }
    }

    return Array.from(new Set(names));
  }, [coaches]);

  const handleSelectStudent = useCallback(
    (name: string) => {
      for (const coach of coaches) {
        const raw = (coach as any).students;
        if (!Array.isArray(raw)) continue;

        const normalized = raw
          .map(normalizeStudent)
          .filter((x): x is StudentAnalytics => !!x);

        const found = normalized.find(
          (s) => s.fullName.toLowerCase() === name.toLowerCase()
        );

        if (found) {
          //  Activate this coach
          setSelectedCoachId(coach.id);

          //  filter for coach
          setCoachFilterId(coach.id);

          // open modal with students of this coach
          setStudentsModal({
            open: true,
            coachName: coach.case_owner,
            students: normalized,
          });

          setStudentSearch(name);
          return;
        }
      }

      setStudentSearch(name);
    },
    [coaches]
  );

  const filteredStudents = (studentsModal.students ?? []).filter((s) => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q)
    );
  });

  const clamp01 = (n: number) => Math.max(0, Math.min(100, n));

  /* ================= Students Radar ================= */
  const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));

  const toNum100 = (v: unknown) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? clamp(n, 0, 100) : 0;
  };

  const ratingToScore = (r: unknown): number => {
    const s = String(r ?? "").trim().toLowerCase();
    if (!s) return 0;

    // handle different casing/spaces
    if (s.includes("excellent")) return 95;
    if (s === "good" || s.includes("good")) return 80;
    if (s.includes("needs attention")) return 55;

    // fallback
    return 60;
  };

  const upcomingCountByCoach = useMemo(() => {
    return coaches.map((coach) =>
      countUpcomingSessions({
        meetings: coach.upcomming_sessions?.meetings
          ?.map(normalizeMeeting)
          .filter((m): m is Meeting => !!m),
      })
    );
  }, [coaches, normalizeMeeting]);

  const maxUpcoming = useMemo(() => {
    const m = Math.max(...upcomingCountByCoach, 0);
    return m <= 0 ? 1 : m; // avoid divide by zero
  }, [upcomingCountByCoach]);

  const selectedUpcomingCount = useMemo(() => {
    return countUpcomingSessions({
      meetings: selectedCoachSafe?.upcomming_sessions?.meetings
        ?.map(normalizeMeeting)
        .filter((m): m is Meeting => !!m),
    });
  }, [selectedCoachSafe, normalizeMeeting]);

  const coachRadarData = useMemo(() => {
    const aptem = toNum100(selectedCoachSafe?.avg_aptem);
    const lms = toNum100(selectedCoachSafe?.avg_lms);
    const overall = toNum100(selectedCoachSafe?.avg_overall);

    const upcomingScore = clamp((selectedUpcomingCount / maxUpcoming) * 100, 0, 100);

    return [
      { metric: "APTEM", value: aptem },
      { metric: "LMS", value: lms },
      { metric: "Overall", value: overall },
      { metric: "Upcoming", value: upcomingScore, raw: selectedUpcomingCount },
    ];
  }, [selectedCoachSafe, selectedUpcomingCount, maxUpcoming]);

  // rating label in radar
  const ratingLabel = useMemo(() => {
    const r = String(selectedCoachSafe?.rating ?? "").trim();
    return r || "—";
  }, [selectedCoachSafe]);

  /* ================= render ================= */

  return (
    <div id="dashboard-root" className="space-y-6">
      {loading && <div>Loading analytics...</div>}

      {error && <div className="text-red-500">{error}</div>}

      {!loading && !error && coaches.length === 0 && (
        <div>No analytics data available</div>
      )}


      {!loading && !error && coaches.length > 0 && selectedCoachSafe && (
        <>
          <TopHeader
            coaches={coaches}
            onApplyFilters={handleApplyFilters}
            onOpenSidebar={onOpenSidebar}
            students={students}
            onSelectStudent={handleSelectStudent}
            activeCoachId={coachFilterId}
            activePeriod={periodFilter}
            onLogout={() => {
              localStorage.removeItem("token");
              window.location.href = "/login";
            }}
          />

          {/* Stats + Upcoming */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            <div className="lg:col-span-2 h-full">
              <StatsOverview
                stats={{
                  completed: completedStats.totalSessions,
                  hours: Math.round(completedStats.totalMinutes / 60),
                  reviews: selectedCoachSafe.evidence_accepted ?? 0,
                  cancelled: cancelledCountSelected,
                  overdue: selectedCoachSafe.evidence_submitted ?? 0,
                }}
              />

            </div>

            <div className="lg:col-span-1 h-full">
              <UpcomingMeetingCard
                meeting={nextMeeting}
                meetings={todayMeetings}
              />
            </div>
          </section>

          {/* Coaches + Overview + Calendar */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            <div className="bg-white rounded-2xl p-4 shadow-sm h-[360px] overflow-y-auto custom-scroll">
              <h3 className="text-lg font-bold text-[#442F73] mb-3">
                Coaches
              </h3>
              <CoachesList
                coaches={coaches}
                activeCoachId={activeCoachIdForList}
                onSelect={selectCoach}
                onViewStudents={handleViewStudents}
              />
            </div>

            <div className="bg-white rounded-xl p-4 flex flex-col">
              <h3 className="text-lg font-bold text-[#442F73] mb-3">
                Coach Overview
              </h3>
              <CoachesOverview
                metrics={{
                  sessions: completedStats.totalSessions,
                  students: selectedCoachSafe.with_student?.length ?? 0,
                  rating: 4.7,
                  elapsedDays: selectedCoachSafe.elapsed_days ?? 0,
                  status:
                    (selectedCoachSafe.elapsed_days ?? 0) <= 5
                      ? { label: "Safe", color: "bg-green-100 text-green-700" }
                      : (selectedCoachSafe.elapsed_days ?? 0) <= 10
                        ? {
                          label: "Need Attention",
                          color: "bg-yellow-100 text-yellow-700",
                        }
                        : {
                          label: "Delayed",
                          color: "bg-red-100 text-red-700",
                        },
                }}
              />
            </div>

            <div className="bg-white rounded-xl p-4 flex flex-col">
              <h3 className="text-lg font-bold text-[#442F73] mb-3">
                Coach Calendar
              </h3>
              <Calendar meetingsByDate={meetingsByDate} />
            </div>
          </section>

          {/* Charts */}
          {/* Track Evidences + Todo */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

            {/* Evidence Chart (NEW) */}
            <div className="bg-white rounded-xl p-4">
              <h3 className="text-lg font-bold text-[#442F73] mb-2">
                Evidence Overview <span className="text-sm font-medium text-[#B27715] mb-2">(releated to coach)</span>
              </h3>

              <EvidenceBarChart
                data={{
                  submitted: selectedCoachSafe.evidence_submitted ?? 0,
                  accepted: selectedCoachSafe.evidence_accepted ?? 0,
                  referred: selectedCoachSafe.evidence_referred ?? 0,
                  total: selectedCoachSafe.total_evidence ?? 0,
                }}
              />
            </div>

            {/* Radar (existing – data later) */}
            <div className="bg-white rounded-xl p-4">
              <h3 className="text-lg font-bold text-[#442F73] ">
                Track Students <span className="text-sm font-medium text-[#B27715] mb-2">(with coach)</span>
              </h3>
              <div>
                <h5 className="text-sm font-normal text-[#442F73] ">All the numbers refers to %</h5>
              </div>

              <TrackEvidencesChart data={coachRadarData} ratingLabel={ratingLabel} />

            </div>

            {/* Todo List (EMPTY – per coach) */}
            <div className="bg-white rounded-xl p-4 flex flex-col">
              <TodoList coachId={selectedCoachSafe.id} />
            </div>
          </section>

          {/* Monthly Sessions */}
          <section className="bg-white rounded-xl p-4">
            <h3 className="text-lg font-bold text-[#442F73] mb-2">
              Track Sessions <span className="text-sm font-medium text-[#B27715] mb-2">(Changes according to the filter)</span>
            </h3>
            <MonthlySessionsChart data={monthlyData} />
          </section>
        </>
      )}

      {/* Students Modal */}
      {studentsModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-[#F9F5FF]/50 w-full max-w-5xl h-[80vh] rounded-2xl shadow-xl flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-[#442F73]">
                  Students
                </h3>
                <p className="text-xs text-gray-500">
                  {studentsModal.coachName}
                </p>
              </div>

              <button
                onClick={() => {
                  setStudentsModal({ open: false });
                  setStudentSearch("");
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-[#E9D9BD] hover:bg-[#B27715] text-[#241453] hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Search */}
            <div className="px-5 pt-4">
              <input
                type="text"
                placeholder="Search student..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="
            w-full h-9 px-3 rounded-lg
            border border-gray-200
            text-sm
            focus:outline-none focus:ring-2 focus:ring-[#E9D9BD] focus:border-transparent
          "
              />
              <div className="text-sm text-[#442F73] mt-1 font-medium">
                {filteredStudents.length} students
              </div>

            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 custom-scroll custom-scroll--soft">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((s) => {
                  const status =
                    s.overall >= 70
                      ? { label: "Good", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" }
                      : s.overall >= 40
                        ? { label: "Need Attention", cls: "bg-amber-50 text-amber-700 border-amber-200" }
                        : { label: "Critical", cls: "bg-rose-50 text-rose-700 border-rose-200" };

                  const Progress = ({ value }: { value: number }) => (
                    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#A880F7]"
                        style={{ width: `${clamp01(value)}%` }}
                      />
                    </div>
                  );

                  // helper: view dashboard
                  const studentDashboardUrl = (email?: string) => {
                    const base = "https://www.kentbusinesscollege.net/student_corner/";
                    if (!email) return base;
                    return `${base}?email=${encodeURIComponent(email)}`;
                  };

                  return (
                    <div
                      key={`${s.id}-${s.email}`}
                      className="rounded-2xl border border-violet-100 bg-violet-50/60 hover:bg-violet-50 transition px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-violet-950 truncate">
                              {s.fullName}
                            </h4>

                            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${status.cls}`}>
                              {status.label}
                            </span>
                          </div>

                          <div className="mt-0.5 text-xs text-gray-600">
                            <span className="font-medium">ID:</span> {s.id || "—"}
                            <span className="mx-2 text-gray-300">•</span>
                            <span className="truncate">{s.email || "—"}</span>
                          </div>

                          {/* Metrics */}
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-white/70 rounded-xl p-3 border border-gray-100">
                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>Overall</span>
                                <span className="font-semibold text-gray-800">{Math.round(s.overall)}%</span>
                              </div>
                              <Progress value={s.overall} />
                            </div>

                            <div className="bg-white/70 rounded-xl p-3 border border-gray-100">
                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>LMS</span>
                                <span className="font-semibold text-gray-800">{Math.round(s.lmsProgress)}%</span>
                              </div>
                              <Progress value={s.lmsProgress} />
                            </div>

                            <div className="bg-white/70 rounded-xl p-3 border border-gray-100">
                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>APTEM</span>
                                <span className="font-semibold text-gray-800">{Math.round(s.aptemProgress)}%</span>
                              </div>
                              <Progress value={s.aptemProgress} />
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={() => {
                              const url = studentDashboardUrl(s.email);
                              window.open(url, "_blank", "noopener,noreferrer");
                            }}
                            className="
                          text-xs px-3 py-1.5 rounded-lg
                          border border-violet-300
                          text-violet-700
                          bg-white/60
                          hover:bg-violet-600 hover:text-white
                          transition
                          "
                          >
                            View dashboard
                          </button>

                          <button
                            disabled
                            className="
                  text-xs px-3 py-1.5 rounded-lg
                  border border-gray-300
                  text-gray-500
                  bg-white/60
                  cursor-not-allowed
                "
                          >
                            Load evidences
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-gray-500 text-center mt-10">
                  No students found
                </div>
              )}
            </div>


          </div>
        </div>
      )
      }

    </div >
  );
}
