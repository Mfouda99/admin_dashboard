import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState, useCallback } from "react";
import TopHeader from "../header/TopHeader";
import StatsOverview from "./StatsOverview";
import CoachesOverview from "../coaches/CoachesOverview";
import MonthlySessionsChart from "./MonthlySessionsChart";
import TrackEvidencesChart from "./TrackEvidencesChart";
import UpcomingMeetingCard from "./UpcomingMeetingCard";
import { normalizeCompletedSessions, filterCompletedSessionsByRange } from "../../helpers/meetings";
import CoachesList from "../coaches/CoachesList";
import Calendar from "./Calendar";
import TodoList from "./TodoList";
import EvidenceBarChart from "./EvidenceBarChart";
import { useReport } from "../../context/ReportContext";
import { fetchAllCoachesAnalytics } from "../../api";
/* ================= helpers ================= */
const countCancelledSessions = (cancelledSessions) => {
    const sessions = cancelledSessions?.sessions;
    if (!Array.isArray(sessions))
        return 0;
    return sessions.filter((s) => !!s?.cancelledAt).length;
};
const countUpcomingSessions = (upcommingSessions) => {
    return upcommingSessions?.meetings?.length ?? 0;
};
const countUpcomingMeetings = (meetings) => {
    if (!Array.isArray(meetings))
        return 0;
    return meetings.length;
};
const getNextMeeting = (upcommingSessions) => {
    const meetings = upcommingSessions?.meetings ?? [];
    if (meetings.length === 0)
        return null;
    return [...meetings].sort((a, b) => {
        const aDate = new Date(`${a.date}T${a.timeFrom}`).getTime();
        const bDate = new Date(`${b.date}T${b.timeFrom}`).getTime();
        return aDate - bDate;
    })[0];
};
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, days) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
const getRange = (period) => {
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
const inRange = (dateStr, start, end) => {
    if (!dateStr)
        return false;
    // YYYY-MM-DD or ISO
    const d = dateStr.length === 10 ? new Date(dateStr + "T00:00:00") : new Date(dateStr);
    if (Number.isNaN(d.getTime()))
        return false;
    const dd = startOfDay(d).getTime();
    return dd >= start.getTime() && dd <= end.getTime();
};
// meetings: {date:"YYYY-MM-DD", ...}
const filterMeetingsByRange = (meetings, start, end) => {
    if (!Array.isArray(meetings))
        return [];
    return meetings.filter((m) => inRange(m?.date, start, end));
};
// sessions:(date/completedAt/cancelledAt/createdAt)
const extractSessionDate = (s) => {
    return (s?.date ||
        s?.session_date ||
        s?.created_at ||
        s?.createdAt ||
        s?.completed_at ||
        s?.completedAt ||
        s?.cancelled_at ||
        s?.cancelledAt ||
        null);
};
const filterSessionsShapeByRange = (obj, start, end) => {
    // if shape: { sessions: [] }
    if (obj && typeof obj === "object" && Array.isArray(obj.sessions)) {
        return {
            ...obj,
            sessions: obj.sessions.filter((s) => inRange(extractSessionDate(s), start, end)),
        };
    }
    // if shape: [] directly
    if (Array.isArray(obj)) {
        return obj.filter((s) => inRange(extractSessionDate(s), start, end));
    }
    return obj;
};
/* ================= component ================= */
export default function AnalyticsMeetings({ onOpenSidebar }) {
    /* ---- state ---- */
    const [coaches, setCoaches] = useState([]);
    const [selectedCoachId, setSelectedCoachId] = useState(null);
    const role = localStorage.getItem("role") || "coach";
    const selfCoachId = Number(localStorage.getItem("coach_id") || "");
    const userName = localStorage.getItem("username") || "User";
    const todoCoachId = role === "coach" ? (Number.isFinite(selfCoachId) ? selfCoachId : null) : selectedCoachId;
    // ---- filters state ----
    const [periodFilter, setPeriodFilter] = useState("7");
    const [timePeriod, setTimePeriod] = useState("7d");
    const [coachFilterId, setCoachFilterId] = useState("all");
    const selectedCoachSafe = useMemo(() => {
        if (!coaches.length)
            return null;
        return coaches.find((c) => c.id === selectedCoachId) ?? coaches[0];
    }, [coaches, selectedCoachId]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { setRows } = useReport();
    /* ---- effects ---- */
    useEffect(() => {
        const loadAnalytics = async () => {
            try {
                const data = await fetchAllCoachesAnalytics();
                const arr = Array.isArray(data) ? data : [];
                const normalized = arr
                    .map((c) => {
                    const rawId = c.id ??
                        c.case_owner_id ??
                        c.caseOwnerId ??
                        c.coach_id ??
                        c.coachId;
                    const id = Number(rawId);
                    return { ...c, id };
                })
                    .filter((c) => Number.isFinite(c.id));
                // Filter coaches based on role and username
                const role = localStorage.getItem("role");
                const username = localStorage.getItem("username");
                let filteredCoaches = normalized;
                // If user is a coach, only show their own data
                if (role === "coach" && username) {
                    filteredCoaches = normalized.filter((c) => c.case_owner === username || c.caseOwner === username);
                }
                // If role is "qa", show all coaches (no filtering)
                setCoaches(filteredCoaches);
                const firstId = filteredCoaches[0]?.id ?? null;
                setSelectedCoachId(firstId);
                setCoachFilterId("all");
            }
            catch (err) {
                console.error(err);
                setError("Failed to load analytics");
            }
            finally {
                setLoading(false);
            }
        };
        loadAnalytics();
    }, []);
    // ---- Selected Coach ----
    const selectCoach = useCallback((coach) => {
        const id = Number(coach.id ?? coach.case_owner_id);
        if (!Number.isFinite(id))
            return;
        setSelectedCoachId(id);
        // setCoachFilterId(id);
    }, []);
    const activeCoachIdForList = useMemo(() => selectedCoachId ?? coaches[0]?.id ?? null, [selectedCoachId, coaches]);
    // time period mapping
    const periodToTimePeriod = (p) => {
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
    const handleApplyFilters = useCallback((filters) => {
        setPeriodFilter(filters.period);
        setTimePeriod(periodToTimePeriod(filters.period));
        if (filters.coach === "all") {
            setCoachFilterId("all");
            return;
        }
        const id = Number(filters.coach);
        setCoachFilterId(id);
        setSelectedCoachId(id);
    }, [coaches]);
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
    const normalizeMeeting = useCallback((m) => {
        if (!m || typeof m !== "object")
            return null;
        const meeting = m;
        return {
            date: typeof meeting.date === "string" ? meeting.date : "",
            timeFrom: typeof meeting.timeFrom === "string" ? meeting.timeFrom : "",
            timeTo: typeof meeting.timeTo === "string" ? meeting.timeTo : "",
            serviceName: typeof meeting.serviceName === "string"
                ? meeting.serviceName
                : "Session",
            customerName: typeof meeting.customerName === "string"
                ? meeting.customerName
                : typeof meeting.customerName?.name === "string"
                    ? meeting.customerName.name
                    : "Unknown student",
            joinWebUrl: typeof meeting.joinWebUrl === "string" ? meeting.joinWebUrl : null,
        };
    }, []);
    const todayMeetings = useMemo(() => {
        return (selectedCoachSafe?.upcomming_sessions?.meetings
            ?.map(normalizeMeeting)
            .filter((m) => !!m && m.date === today) ?? []);
    }, [selectedCoachSafe, today, normalizeMeeting]);
    const nextMeeting = useMemo(() => {
        return getNextMeeting(selectedCoachSafe?.upcomming_sessions
            ? {
                meetings: selectedCoachSafe.upcomming_sessions.meetings
                    ?.map(normalizeMeeting)
                    .filter((m) => !!m),
            }
            : undefined);
    }, [selectedCoachSafe, normalizeMeeting]);
    const completedStats = useMemo(() => {
        const filteredCompleted = filterCompletedSessionsByRange(selectedCoachSafe?.completed_sessions, range.start, range.end);
        return normalizeCompletedSessions(filteredCompleted);
    }, [selectedCoachSafe, range.start, range.end]);
    const cancelledCountSelected = useMemo(() => {
        const filteredCancelled = filterSessionsShapeByRange(selectedCoachSafe?.cancelled_sessions, range.start, range.end);
        return countCancelledSessions(filteredCancelled);
    }, [selectedCoachSafe, range.start, range.end]);
    const monthlyData = useMemo(() => {
        return visibleCoaches.map((coach) => {
            const filteredCompleted = filterCompletedSessionsByRange(coach.completed_sessions, range.start, range.end);
            const completed = normalizeCompletedSessions(filteredCompleted);
            const filteredCancelled = filterSessionsShapeByRange(coach.cancelled_sessions, range.start, range.end);
            const cancelledCount = countCancelledSessions(filteredCancelled);
            const normalizedMeetings = coach.upcomming_sessions?.meetings
                ?.map(normalizeMeeting)
                .filter((m) => !!m) ?? [];
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
    const calendarDates = useMemo(() => {
        const meetings = selectedCoachSafe?.upcomming_sessions?.meetings ?? [];
        return Array.from(new Set(meetings
            .map(m => m?.date)
            .filter((d) => typeof d === "string")));
    }, [selectedCoachSafe]);
    const meetingsByDate = useMemo(() => {
        const meetings = selectedCoachSafe?.upcomming_sessions?.meetings
            ?.map(normalizeMeeting)
            .filter((m) => !!m) ?? [];
        return meetings.reduce((acc, meeting) => {
            const date = meeting.date; // the key of the meeting
            if (!date)
                return acc;
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(meeting);
            return acc;
        }, {});
    }, [selectedCoachSafe, normalizeMeeting]);
    const [studentsModal, setStudentsModal] = useState({ open: false });
    const [studentSearch, setStudentSearch] = useState("");
    // Evidence modal state
    const [evidenceModal, setEvidenceModal] = useState({
        open: false,
        loading: false,
        error: null,
        data: null,
        markingInProgress: null,
        markingResult: null,
    });
    // Result modal state
    const [resultModal, setResultModal] = useState({
        open: false,
        data: null,
    });
    function normalizeStudent(s) {
        if (!s || typeof s !== "object")
            return null;
        const x = s;
        const id = String(x.ID ?? x.id ?? "");
        const fullName = String(x.FullName ?? x.fullName ?? "Unknown");
        const email = String(x.Email ?? x.email ?? "");
        const overall = Number(x.Overall ?? x.overall ?? 0);
        const lms = Number(x.LMSProgress ?? x.lmsProgress ?? 0);
        const aptem = Number(x.AptemProgress ?? x.aptemProgress ?? 0);
        const clamp01 = (n) => Math.max(0, Math.min(100, n));
        return {
            id,
            fullName,
            email,
            overall: Number.isFinite(overall) ? clamp01(overall) : 0,
            lmsProgress: Number.isFinite(lms) ? clamp01(lms) : 0,
            aptemProgress: Number.isFinite(aptem) ? clamp01(aptem) : 0,
        };
    }
    const handleViewStudents = (coach) => {
        selectCoach(coach);
        const raw = coach.students ?? [];
        const normalized = Array.isArray(raw)
            ? raw.map(normalizeStudent).filter((x) => !!x)
            : [];
        setStudentsModal({
            open: true,
            coachName: coach.case_owner,
            students: normalized,
        });
        setStudentSearch("");
    };
    // Handle load evidence for a student
    const handleLoadEvidence = async (student) => {
        setEvidenceModal({
            open: true,
            loading: true,
            error: null,
            data: null,
            studentEmail: student.email,
            studentId: student.id,
            studentName: student.fullName,
        });
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                throw new Error("Authentication token not found");
            }
            const params = new URLSearchParams();
            if (student.email) {
                params.append("student_email", student.email);
            }
            else if (student.id) {
                params.append("student_id", student.id);
            }
            else {
                throw new Error("Student email or ID is required");
            }
            const response = await fetch(`/api/accounts/student-components/?${params}`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            const result = await response.json();
            setEvidenceModal((prev) => ({
                ...prev,
                loading: false,
                data: result.data,
            }));
        }
        catch (err) {
            setEvidenceModal((prev) => ({
                ...prev,
                loading: false,
                error: err.message || "Failed to load evidence",
            }));
        }
    };
    // Parse evidence data from JSON string
    const parseEvidenceData = (evidenceString) => {
        if (!evidenceString || typeof evidenceString !== 'string')
            return [];
        try {
            // Evidence data is a JSON array string
            const parsed = JSON.parse(evidenceString);
            if (Array.isArray(parsed)) {
                return parsed.map((item) => ({
                    id: item.Id || item.id || '',
                    componentId: item.ComponentId || item.componentId || '',
                    name: item.Name || item.name || 'Unnamed Evidence',
                    url: item.Url || item.url || '',
                    status: item.Status || item.status || 'Unknown',
                    createdDate: item.CreatedDate || item.createdDate || '',
                }));
            }
        }
        catch (e) {
            console.error('Failed to parse evidence data:', e);
        }
        return [];
    };
    // Handle marking evidence
    const handleMarkEvidence = async (evidenceItem) => {
        if (!evidenceModal.data)
            return;
        setEvidenceModal((prev) => ({
            ...prev,
            markingInProgress: evidenceItem.id,
            markingResult: null,
        }));
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                throw new Error("Authentication token not found");
            }
            const response = await fetch(`/api/accounts/mark-evidence/`, {
                method: 'POST',
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    student_id: evidenceModal.data.student_id,
                    student_email: evidenceModal.data.student_email,
                    student_name: evidenceModal.studentName || evidenceModal.data.student_email,
                    group: evidenceModal.data.group,
                    evidence_id: evidenceItem.id,
                    evidence_name: evidenceItem.name,
                    evidence_url: evidenceItem.url,
                    evidence_status: evidenceItem.status,
                    evidence_created_date: evidenceItem.createdDate,
                    component_id: evidenceItem.componentId,
                    components: evidenceModal.data.components,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            const result = await response.json();
            setEvidenceModal((prev) => ({
                ...prev,
                markingInProgress: null,
            }));
            // Open result modal with the marking data
            setResultModal({
                open: true,
                data: result.data,
            });
        }
        catch (err) {
            setEvidenceModal((prev) => ({
                ...prev,
                markingInProgress: null,
                error: err.message || "Failed to mark evidence",
            }));
        }
    };
    // Global students names list (from coaches[].students JSONB)
    const students = useMemo(() => {
        const names = [];
        for (const coach of coaches) {
            const raw = coach.students;
            if (!Array.isArray(raw))
                continue;
            for (const s of raw) {
                const st = normalizeStudent(s);
                if (st?.fullName?.trim())
                    names.push(st.fullName.trim());
            }
        }
        return Array.from(new Set(names));
    }, [coaches]);
    const handleSelectStudent = useCallback((name) => {
        for (const coach of coaches) {
            const raw = coach.students;
            if (!Array.isArray(raw))
                continue;
            const normalized = raw
                .map(normalizeStudent)
                .filter((x) => !!x);
            const found = normalized.find((s) => s.fullName.toLowerCase() === name.toLowerCase());
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
    }, [coaches]);
    const filteredStudents = (studentsModal.students ?? []).filter((s) => {
        const q = studentSearch.trim().toLowerCase();
        if (!q)
            return true;
        return (s.fullName.toLowerCase().includes(q) ||
            s.email.toLowerCase().includes(q) ||
            s.id.toLowerCase().includes(q));
    });
    const clamp01 = (n) => Math.max(0, Math.min(100, n));
    /* ================= Students Radar ================= */
    const clamp = (n, min = 0, max = 100) => Math.min(max, Math.max(min, n));
    const toNum100 = (v) => {
        const n = typeof v === "number" ? v : Number(v);
        return Number.isFinite(n) ? clamp(n, 0, 100) : 0;
    };
    const ratingToScore = (r) => {
        const s = String(r ?? "").trim().toLowerCase();
        if (!s)
            return 0;
        // handle different casing/spaces
        if (s.includes("excellent"))
            return 95;
        if (s === "good" || s.includes("good"))
            return 80;
        if (s.includes("needs attention"))
            return 55;
        // fallback
        return 60;
    };
    const upcomingCountByCoach = useMemo(() => {
        return coaches.map((coach) => countUpcomingSessions({
            meetings: coach.upcomming_sessions?.meetings
                ?.map(normalizeMeeting)
                .filter((m) => !!m),
        }));
    }, [coaches, normalizeMeeting]);
    const maxUpcoming = useMemo(() => {
        const m = Math.max(...upcomingCountByCoach, 0);
        return m <= 0 ? 1 : m; // avoid divide by zero
    }, [upcomingCountByCoach]);
    const selectedUpcomingCount = useMemo(() => {
        return countUpcomingSessions({
            meetings: selectedCoachSafe?.upcomming_sessions?.meetings
                ?.map(normalizeMeeting)
                .filter((m) => !!m),
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
    return (_jsxs("div", { id: "report-area", className: "space-y-6", children: [loading && _jsx("div", { children: "Loading analytics..." }), error && _jsx("div", { className: "text-red-500", children: error }), !loading && !error && coaches.length === 0 && (_jsx("div", { children: "No analytics data available" })), !loading && !error && coaches.length > 0 && selectedCoachSafe && (_jsxs(_Fragment, { children: [_jsx(TopHeader, { coaches: coaches, onApplyFilters: handleApplyFilters, onOpenSidebar: onOpenSidebar, students: students, onSelectStudent: handleSelectStudent, activeCoachId: coachFilterId, activePeriod: periodFilter, userName: userName, canSwitchCoach: role === "qa" }), _jsxs("section", { className: "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start", children: [_jsx("div", { className: "lg:col-span-3", children: _jsxs("div", { className: "bg-white rounded-2xl p-4 shadow-sm h-[595px] overflow-y-auto custom-scroll", children: [_jsx("h3", { className: "text-lg font-bold text-[#442F73] mb-3", children: "Coaches" }), _jsx(CoachesList, { coaches: coaches, activeCoachId: activeCoachIdForList, onSelect: selectCoach, onViewStudents: handleViewStudents })] }) }), _jsxs("div", { className: "lg:col-span-9 flex flex-col gap-6", children: [_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch", children: [_jsx("div", { className: "lg:col-span-8", children: _jsx(StatsOverview, { stats: {
                                                        completed: completedStats.totalSessions,
                                                        hours: Math.round(completedStats.totalMinutes / 60),
                                                        reviews: selectedCoachSafe.evidence_accepted ?? 0,
                                                        cancelled: cancelledCountSelected,
                                                        overdue: selectedCoachSafe.evidence_submitted ?? 0,
                                                    } }) }), _jsx("div", { className: "lg:col-span-4", children: _jsx(UpcomingMeetingCard, { meeting: nextMeeting, meetings: todayMeetings }) })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch", children: [_jsxs("div", { className: "bg-white rounded-xl p-4 flex flex-col", children: [_jsx("h3", { className: "text-lg font-bold text-[#442F73] mb-3", children: "Coach Overview" }), _jsx(CoachesOverview, { metrics: {
                                                            sessions: completedStats.totalSessions,
                                                            students: selectedCoachSafe.with_student?.length ?? 0,
                                                            rating: 4.7,
                                                            elapsedDays: selectedCoachSafe.elapsed_days ?? 0,
                                                            status: (selectedCoachSafe.elapsed_days ?? 0) <= 5
                                                                ? { label: "Safe", color: "bg-green-100 text-green-700" }
                                                                : (selectedCoachSafe.elapsed_days ?? 0) <= 10
                                                                    ? { label: "Need Attention", color: "bg-yellow-100 text-yellow-700" }
                                                                    : { label: "Delayed", color: "bg-red-100 text-red-700" },
                                                        } })] }), _jsxs("div", { className: "bg-white rounded-xl p-4 flex flex-col", children: [_jsx("h3", { className: "text-lg font-bold text-[#442F73] mb-3", children: "Coach Calendar" }), _jsx(Calendar, { meetingsByDate: meetingsByDate })] })] })] })] }), _jsxs("section", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch", children: [_jsxs("div", { className: "bg-white rounded-xl p-4", children: [_jsxs("h3", { className: "text-lg font-bold text-[#442F73] mb-2", children: ["Evidence Overview ", _jsx("span", { className: "text-sm font-medium text-[#B27715] mb-2", children: "(releated to coach)" })] }), _jsx(EvidenceBarChart, { data: {
                                            submitted: selectedCoachSafe.evidence_submitted ?? 0,
                                            accepted: selectedCoachSafe.evidence_accepted ?? 0,
                                            referred: selectedCoachSafe.evidence_referred ?? 0,
                                            total: selectedCoachSafe.total_evidence ?? 0,
                                        } })] }), _jsxs("div", { className: "bg-white rounded-xl p-4", children: [_jsxs("h3", { className: "text-lg font-bold text-[#442F73] ", children: ["Track Students ", _jsx("span", { className: "text-sm font-medium text-[#B27715] mb-2", children: "(with coach)" })] }), _jsx("div", { children: _jsx("h5", { className: "text-sm font-normal text-[#442F73] ", children: "All the numbers refers to %" }) }), _jsx(TrackEvidencesChart, { data: coachRadarData, ratingLabel: ratingLabel })] }), _jsx("div", { className: "bg-white rounded-xl p-4 flex flex-col", children: Number.isFinite(todoCoachId) ? (_jsx(TodoList, { coachId: todoCoachId, viewerRole: role })) : (_jsx("div", { className: "text-sm text-gray-400", children: "Select a coach to view tasks." })) })] }), _jsxs("section", { className: "bg-white rounded-xl p-4", children: [_jsxs("h3", { className: "text-lg font-bold text-[#442F73] mb-2", children: ["Track Sessions ", _jsx("span", { className: "text-sm font-medium text-[#B27715] mb-2", children: "(Changes according to the filter)" })] }), _jsx(MonthlySessionsChart, { data: monthlyData })] })] })), studentsModal.open && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm", children: _jsxs("div", { className: "bg-[#F9F5FF]/50 w-full max-w-5xl h-[80vh] rounded-2xl shadow-xl flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between px-5 py-4 border-b", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-[#442F73]", children: "Students" }), _jsx("p", { className: "text-xs text-gray-500", children: studentsModal.coachName })] }), _jsx("button", { onClick: () => {
                                        setStudentsModal({ open: false });
                                        setStudentSearch("");
                                    }, className: "w-8 h-8 rounded-full flex items-center justify-center bg-[#E9D9BD] hover:bg-[#B27715] text-[#241453] hover:text-white transition", children: "\u2715" })] }), _jsxs("div", { className: "px-5 pt-4", children: [_jsx("input", { type: "text", placeholder: "Search student...", value: studentSearch, onChange: (e) => setStudentSearch(e.target.value), className: "\r\n            w-full h-9 px-3 rounded-lg\r\n            border border-gray-200\r\n            text-sm\r\n            focus:outline-none focus:ring-2 focus:ring-[#E9D9BD] focus:border-transparent\r\n          " }), _jsxs("div", { className: "text-sm text-[#442F73] mt-1 font-medium", children: [filteredStudents.length, " students"] })] }), _jsx("div", { className: "flex-1 overflow-y-auto px-5 py-4 space-y-2 custom-scroll custom-scroll--soft", children: filteredStudents.length > 0 ? (filteredStudents.map((s) => {
                                const status = s.overall >= 70
                                    ? { label: "Good", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" }
                                    : s.overall >= 40
                                        ? { label: "Need Attention", cls: "bg-amber-50 text-amber-700 border-amber-200" }
                                        : { label: "Critical", cls: "bg-rose-50 text-rose-700 border-rose-200" };
                                const Progress = ({ value }) => (_jsx("div", { className: "h-2 w-full rounded-full bg-gray-100 overflow-hidden", children: _jsx("div", { className: "h-full rounded-full bg-[#A880F7]", style: { width: `${clamp01(value)}%` } }) }));
                                // helper: view dashboard
                                const studentDashboardUrl = (email) => {
                                    const base = "https://www.kentbusinesscollege.net/student_corner/";
                                    if (!email)
                                        return base;
                                    return `${base}?email=${encodeURIComponent(email)}`;
                                };
                                return (_jsx("div", { className: "rounded-2xl border border-violet-100 bg-violet-50/60 hover:bg-violet-50 transition px-4 py-3", children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h4", { className: "text-sm font-semibold text-violet-950 truncate", children: s.fullName }), _jsx("span", { className: `text-[11px] px-2 py-0.5 rounded-full border ${status.cls}`, children: status.label })] }), _jsxs("div", { className: "mt-0.5 text-xs text-gray-600", children: [_jsx("span", { className: "font-medium", children: "ID:" }), " ", s.id || "—", _jsx("span", { className: "mx-2 text-gray-300", children: "\u2022" }), _jsx("span", { className: "truncate", children: s.email || "—" })] }), _jsxs("div", { className: "mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3", children: [_jsxs("div", { className: "bg-white/70 rounded-xl p-3 border border-gray-100", children: [_jsxs("div", { className: "flex justify-between text-xs text-gray-600 mb-1", children: [_jsx("span", { children: "Overall" }), _jsxs("span", { className: "font-semibold text-gray-800", children: [Math.round(s.overall), "%"] })] }), _jsx(Progress, { value: s.overall })] }), _jsxs("div", { className: "bg-white/70 rounded-xl p-3 border border-gray-100", children: [_jsxs("div", { className: "flex justify-between text-xs text-gray-600 mb-1", children: [_jsx("span", { children: "LMS" }), _jsxs("span", { className: "font-semibold text-gray-800", children: [Math.round(s.lmsProgress), "%"] })] }), _jsx(Progress, { value: s.lmsProgress })] }), _jsxs("div", { className: "bg-white/70 rounded-xl p-3 border border-gray-100", children: [_jsxs("div", { className: "flex justify-between text-xs text-gray-600 mb-1", children: [_jsx("span", { children: "APTEM" }), _jsxs("span", { className: "font-semibold text-gray-800", children: [Math.round(s.aptemProgress), "%"] })] }), _jsx(Progress, { value: s.aptemProgress })] })] })] }), _jsxs("div", { className: "flex shrink-0 items-center gap-2", children: [_jsx("button", { onClick: () => {
                                                            const url = studentDashboardUrl(s.email);
                                                            window.open(url, "_blank", "noopener,noreferrer");
                                                        }, className: "\r\n                          text-xs px-3 py-1.5 rounded-lg\r\n                          border border-violet-300\r\n                          text-violet-700\r\n                          bg-white/60\r\n                          hover:bg-violet-600 hover:text-white\r\n                          transition\r\n                          ", children: "View dashboard" }), _jsx("button", { onClick: () => handleLoadEvidence(s), className: "\r\n                  text-xs px-3 py-1.5 rounded-lg\r\n                  border border-blue-300\r\n                  text-blue-700\r\n                  bg-white/60\r\n                  hover:bg-blue-600 hover:text-white\r\n                  transition\r\n                ", children: "Load evidences" })] })] }) }, `${s.id}-${s.email}`));
                            })) : (_jsx("div", { className: "text-sm text-gray-500 text-center mt-10", children: "No students found" })) })] }) })), evidenceModal.open && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm", children: _jsxs("div", { className: "bg-white w-full max-w-3xl max-h-[80vh] rounded-2xl shadow-xl flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between px-5 py-4 border-b", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-[#442F73]", children: "Student Evidence" }), _jsxs("p", { className: "text-xs text-gray-500", children: [evidenceModal.studentName, " (", evidenceModal.studentEmail || evidenceModal.studentId, ")"] })] }), _jsx("button", { onClick: () => setEvidenceModal({ open: false, loading: false, error: null, data: null }), className: "w-8 h-8 rounded-full flex items-center justify-center bg-[#E9D9BD] hover:bg-[#B27715] text-[#241453] hover:text-white transition", children: "\u2715" })] }), _jsxs("div", { className: "flex-1 overflow-y-auto px-5 py-4 custom-scroll", children: [evidenceModal.loading && (_jsx("div", { className: "flex items-center justify-center py-12", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "inline-block w-8 h-8 border-4 border-[#A880F7] border-t-transparent rounded-full animate-spin mb-3" }), _jsx("p", { className: "text-sm text-gray-600", children: "Loading evidence..." })] }) })), evidenceModal.error && !evidenceModal.loading && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("i", { className: "fa-solid fa-exclamation-circle text-red-500 mt-0.5" }), _jsxs("div", { children: [_jsx("h4", { className: "text-sm font-semibold text-red-800 mb-1", children: "Error" }), _jsx("p", { className: "text-sm text-red-700", children: evidenceModal.error })] })] }) })), evidenceModal.data && !evidenceModal.loading && !evidenceModal.error && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "bg-violet-50 rounded-lg p-4 border border-violet-200", children: [_jsx("h4", { className: "text-sm font-semibold text-violet-900 mb-2", children: "Student Information" }), _jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "ID:" }), _jsx("span", { className: "ml-2 font-medium", children: evidenceModal.data.student_id || "—" })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Email:" }), _jsx("span", { className: "ml-2 font-medium", children: evidenceModal.data.student_email || "—" })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Group:" }), _jsx("span", { className: "ml-2 font-medium", children: evidenceModal.data.group || "—" })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Sheet:" }), _jsx("span", { className: "ml-2 font-medium", children: evidenceModal.data.target_sheet || "—" })] })] })] }), evidenceModal.data.evidence && (() => {
                                            const evidenceItems = parseEvidenceData(evidenceModal.data.evidence);
                                            return (_jsxs("div", { className: "bg-green-50 rounded-lg p-4 border border-green-200", children: [_jsxs("h4", { className: "text-sm font-semibold text-green-900 mb-3", children: ["Evidence (", evidenceItems.length, ")"] }), evidenceItems.length === 0 ? (_jsx("div", { className: "bg-white rounded p-3 text-sm text-gray-600", children: "No evidence items found" })) : (_jsx("div", { className: "bg-white rounded-lg overflow-hidden border border-gray-200", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gray-50 border-b border-gray-200", children: _jsxs("tr", { children: [_jsx("th", { className: "text-left px-4 py-2 font-semibold text-gray-700", children: "Evidence Name" }), _jsx("th", { className: "text-left px-4 py-2 font-semibold text-gray-700", children: "Status" }), _jsx("th", { className: "text-left px-4 py-2 font-semibold text-gray-700", children: "Created Date" }), _jsx("th", { className: "text-center px-4 py-2 font-semibold text-gray-700", children: "Action" })] }) }), _jsx("tbody", { children: evidenceItems.map((item) => (_jsxs("tr", { className: "border-b border-gray-100 hover:bg-gray-50", children: [_jsx("td", { className: "px-4 py-3 text-gray-800", children: item.name }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: `inline-block px-2 py-1 rounded text-xs font-medium ${item.status === 'PendingAssessment'
                                                                                        ? 'bg-yellow-100 text-yellow-800'
                                                                                        : item.status === 'Assessed'
                                                                                            ? 'bg-green-100 text-green-800'
                                                                                            : 'bg-gray-100 text-gray-800'}`, children: item.status }) }), _jsx("td", { className: "px-4 py-3 text-gray-600", children: item.createdDate ? new Date(item.createdDate).toLocaleDateString() : '—' }), _jsx("td", { className: "px-4 py-3 text-center", children: _jsx("button", { onClick: () => handleMarkEvidence(item), disabled: evidenceModal.markingInProgress === item.id, className: `px-3 py-1.5 rounded text-xs font-medium transition ${evidenceModal.markingInProgress === item.id
                                                                                        ? 'bg-gray-200 text-gray-500 cursor-wait'
                                                                                        : 'bg-[#442F73] text-white hover:bg-[#5a3f94]'}`, children: evidenceModal.markingInProgress === item.id ? (_jsxs(_Fragment, { children: [_jsx("i", { className: "fa-solid fa-spinner fa-spin mr-1" }), "Marking..."] })) : (_jsxs(_Fragment, { children: [_jsx("i", { className: "fa-solid fa-check-circle mr-1" }), "Mark"] })) }) })] }, item.id))) })] }) }))] }));
                                        })()] }))] })] }) })), resultModal.open && resultModal.data && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm", children: _jsxs("div", { className: "bg-white w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col m-4", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-5 border-b bg-gradient-to-r from-[#442F73] to-[#5a3f94]", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-12 h-12 rounded-full bg-white/20 flex items-center justify-center", children: _jsx("i", { className: "fa-solid fa-trophy text-2xl text-white" }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-xl font-bold text-white", children: "Assessment Result" }), _jsx("p", { className: "text-sm text-white/80", children: "AI-Powered Evidence Evaluation" })] })] }), _jsx("button", { onClick: () => setResultModal({ open: false, data: null }), className: "w-10 h-10 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 text-white transition", children: "\u2715" })] }), _jsx("div", { className: "flex-1 overflow-y-auto px-6 py-5 custom-scroll", children: _jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-5 border border-violet-200", children: _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-gray-600 block mb-1", children: "Student" }), _jsx("span", { className: "font-semibold text-gray-900", children: resultModal.data.UserName || '—' })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-600 block mb-1", children: "Component" }), _jsx("span", { className: "font-semibold text-gray-900", children: resultModal.data.ComponentName || '—' })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-600 block mb-1", children: "Evidence" }), _jsx("span", { className: "font-semibold text-gray-900 truncate block", title: resultModal.data.EvidenceName, children: resultModal.data.EvidenceName || '—' })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-600 block mb-1", children: "Status" }), _jsx("span", { className: "inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800", children: resultModal.data.EvidenceStatus || 'Assessed' })] })] }) }), resultModal.data.AI_Feedback && (_jsxs("div", { className: "bg-white rounded-xl border-2 border-blue-200 shadow-sm", children: [_jsx("div", { className: "bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3 rounded-t-xl", children: _jsxs("h4", { className: "font-bold text-white flex items-center gap-2", children: [_jsx("i", { className: "fa-solid fa-robot" }), "AI Assessment Feedback"] }) }), _jsx("div", { className: "p-5", children: _jsx("div", { className: "prose prose-sm max-w-none", children: _jsx("p", { className: "text-gray-800 leading-relaxed whitespace-pre-wrap", children: resultModal.data.AI_Feedback }) }) })] })), _jsxs("div", { className: "grid md:grid-cols-2 gap-4", children: [resultModal.data.EvidenceUrl && resultModal.data.EvidenceUrl !== 'Download failed' && (_jsxs("div", { className: "bg-gray-50 rounded-lg p-4 border border-gray-200", children: [_jsx("h5", { className: "text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide", children: "Evidence Link" }), _jsxs("a", { href: resultModal.data.EvidenceUrl, target: "_blank", rel: "noopener noreferrer", className: "text-blue-600 hover:text-blue-800 text-sm break-all flex items-start gap-2", children: [_jsx("i", { className: "fa-solid fa-external-link mt-0.5" }), _jsx("span", { className: "underline", children: "View Evidence" })] })] })), resultModal.data.EvidenceCreatedDate && (_jsxs("div", { className: "bg-gray-50 rounded-lg p-4 border border-gray-200", children: [_jsx("h5", { className: "text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide", children: "Created Date" }), _jsx("p", { className: "text-sm text-gray-800", children: new Date(resultModal.data.EvidenceCreatedDate).toLocaleString() })] }))] }), Object.keys(resultModal.data).filter(key => !['UserId', 'UserName', 'ComponentId', 'ComponentName', 'EvidenceId',
                                        'EvidenceName', 'EvidenceUrl', 'EvidenceStatus', 'EvidenceCreatedDate',
                                        'AI_Feedback'].includes(key)).length > 0 && (_jsxs("div", { className: "bg-gray-50 rounded-lg p-4 border border-gray-200", children: [_jsx("h5", { className: "text-sm font-semibold text-gray-700 mb-3", children: "Additional Information" }), _jsx("div", { className: "grid gap-2 text-sm", children: Object.entries(resultModal.data)
                                                    .filter(([key]) => !['UserId', 'UserName', 'ComponentId', 'ComponentName', 'EvidenceId',
                                                    'EvidenceName', 'EvidenceUrl', 'EvidenceStatus', 'EvidenceCreatedDate',
                                                    'AI_Feedback'].includes(key))
                                                    .map(([key, value]) => (_jsxs("div", { className: "flex gap-2", children: [_jsxs("span", { className: "font-medium text-gray-600 min-w-[120px]", children: [key, ":"] }), _jsx("span", { className: "text-gray-800", children: String(value) })] }, key))) })] }))] }) }), _jsx("div", { className: "px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-end", children: _jsx("button", { onClick: () => setResultModal({ open: false, data: null }), className: "px-6 py-2.5 bg-[#442F73] hover:bg-[#5a3f94] text-white rounded-lg font-medium transition shadow-sm", children: "Close" }) })] }) }))] }));
}
