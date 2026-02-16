import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { fetchAllCoachesAnalytics } from "../../api";
import WeekTimeGrid from "./WeekTimeGrid";
import MonthGrid from "./MonthGrid";
const s = (v) => (v == null ? "" : String(v));
const pad2 = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const addDays = (d, days) => {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
};
const startOfWeekMonday = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0 Sun .. 6 Sat
    const diff = (day + 6) % 7; // Mon=0
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
};
const toDateKey = (v) => {
    const m = String(v ?? "").match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : "";
};
const toHHMM = (v) => {
    const m = String(v ?? "").match(/(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : "";
};
export default function BookingsCalendarPage() {
    const [calOpen, setCalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [coaches, setCoaches] = useState([]);
    const [allMeetings, setAllMeetings] = useState([]);
    // search coach name
    const [coachQuery, setCoachQuery] = useState("");
    // selected coaches
    const [selectedCoachIds, setSelectedCoachIds] = useState(new Set());
    // week navigation
    const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
    const [view, setView] = useState("workweek");
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchAllCoachesAnalytics();
                const rows = Array.isArray(data) ? data : data?.rows ?? [];
                const hasCalendarEvents = rows.some((r) => {
                    const ce = r?.calendar_events;
                    return ce && typeof ce === "object" && Object.keys(ce).length > 0;
                });
                // coaches list
                const list = rows
                    .map((r, idx) => {
                    const rawId = Number(r?.case_owner_id ?? r?.id);
                    const id = Number.isFinite(rawId) && rawId > 0 ? rawId : idx + 1;
                    const name = s(r?.case_owner).trim() || `Coach ${id}`;
                    return { id, case_owner: name };
                })
                    .filter((c) => Boolean(c.case_owner))
                    .sort((a, b) => a.case_owner.localeCompare(b.case_owner, "en", { sensitivity: "base" }));
                // Filter coaches based on role and username
                const role = localStorage.getItem("role");
                const username = localStorage.getItem("username");
                let filteredList = list;
                // If user is a coach, only show their own data
                if (role === "coach" && username) {
                    filteredList = list.filter((c) => c.case_owner === username);
                }
                // If role is "qa", show all coaches (no filtering)
                // meetings
                const meetings = [];
                if (hasCalendarEvents) {
                    for (const r of rows) {
                        const coachIdRaw = Number(r?.case_owner_id ?? r?.id);
                        const coachId = Number.isFinite(coachIdRaw) ? coachIdRaw : undefined;
                        const coachName = s(r?.case_owner).trim() || (coachId ? `Coach ${coachId}` : "Coach");
                        const ce = (r?.calendar_events ?? {});
                        for (const [dayKey, events] of Object.entries(ce)) {
                            if (!Array.isArray(events))
                                continue;
                            for (const ev of events) {
                                const date = toDateKey(ev?.date ?? dayKey);
                                if (!date)
                                    continue;
                                meetings.push({
                                    date,
                                    timeFrom: toHHMM(ev?.start),
                                    timeTo: toHHMM(ev?.end),
                                    serviceName: s(ev?.subject),
                                    customerName: "",
                                    meetingId: s(ev?.id),
                                    joinWebUrl: (ev?.joinWebUrl ?? null),
                                    coachId,
                                    coachName,
                                });
                            }
                        }
                    }
                }
                else {
                    const isAnalytics = rows.some((x) => Array.isArray(x?.upcomming_sessions?.meetings));
                    if (isAnalytics) {
                        for (const r of rows) {
                            const coachIdRaw = Number(r?.id);
                            const coachId = Number.isFinite(coachIdRaw) ? coachIdRaw : undefined;
                            const coachName = s(r?.case_owner).trim() || (coachId ? `Coach ${coachId}` : "Coach");
                            const arr = r?.upcomming_sessions?.meetings;
                            if (!Array.isArray(arr))
                                continue;
                            for (const m of arr) {
                                const date = toDateKey(m?.date);
                                if (!date)
                                    continue;
                                meetings.push({
                                    date,
                                    timeFrom: s(m?.timeFrom),
                                    timeTo: s(m?.timeTo),
                                    serviceName: s(m?.serviceName),
                                    customerName: s(m?.customerName),
                                    meetingId: s(m?.meetingId),
                                    joinWebUrl: (m?.joinWebUrl ?? null),
                                    coachId,
                                    coachName,
                                });
                            }
                        }
                    }
                }
                if (!mounted)
                    return;
                setCoaches(filteredList);
                setAllMeetings(meetings);
                setSelectedCoachIds(new Set(filteredList.length ? [filteredList[0].id] : []));
            }
            catch (e) {
                console.error(e);
                if (!mounted)
                    return;
                setError("Failed to load calendar data");
            }
            finally {
                if (!mounted)
                    return;
                setLoading(false);
            }
        };
        load();
        return () => {
            mounted = false;
        };
    }, []);
    const filteredCoaches = useMemo(() => {
        const q = coachQuery.trim().toLowerCase();
        if (!q)
            return coaches;
        return coaches.filter((c) => c.case_owner.toLowerCase().includes(q));
    }, [coaches, coachQuery]);
    const filteredMeetings = useMemo(() => {
        if (!selectedCoachIds.size)
            return [];
        return allMeetings.filter((m) => m.coachId && selectedCoachIds.has(m.coachId));
    }, [allMeetings, selectedCoachIds]);
    const weekMeetings = useMemo(() => {
        const start = toISO(weekStart);
        const days = view === "week" ? 7 : 5;
        const end = toISO(addDays(weekStart, days));
        return filteredMeetings.filter((m) => m.date >= start && m.date < end);
    }, [filteredMeetings, weekStart, view]);
    const titleRange = useMemo(() => {
        const end = addDays(weekStart, view === "week" ? 6 : 4);
        const monthName = weekStart.toLocaleDateString("en-GB", { month: "long" });
        return `${monthName} ${weekStart.getDate()}–${end.getDate()}, ${weekStart.getFullYear()}`;
    }, [weekStart, view]);
    const toggleCoach = (id) => {
        setSelectedCoachIds((prev) => {
            const n = new Set(prev);
            if (n.has(id))
                n.delete(id);
            else
                n.add(id);
            return n;
        });
        // close calendar on mobile after selecting a coach
        setCalOpen(false);
    };
    const selectAll = () => setSelectedCoachIds(new Set(coaches.map((c) => c.id)));
    const clearAll = () => setSelectedCoachIds(new Set());
    return (_jsxs("div", { className: "bg-white rounded-2xl shadow-sm overflow-hidden", children: [_jsxs("div", { className: "px-4 py-3 border-b flex items-center gap-3", children: [_jsx("button", { type: "button", onClick: () => setCalOpen(true), className: "lg:hidden w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 transition flex items-center justify-center text-[#442F73] bg-[#E4E4E4]", "aria-label": "Open calendars", title: "Open calendars", children: "\u2630" }), _jsx("div", { className: "font-semibold text-[#241453]", children: "calendar" }), _jsx("div", { className: "flex-1", children: _jsx("input", { value: coachQuery, onChange: (e) => setCoachQuery(e.target.value), placeholder: "Search coach name...", className: "w-full bg-[#F7F8FB] border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-[#644D93]/30", type: "text" }) }), _jsx("div", { className: "text-xs text-gray-500", children: loading ? "Loading…" : error ? _jsx("span", { className: "text-rose-600", children: error }) : "Ready" })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-[290px_1fr] min-h-[680px]", children: [calOpen && (_jsx("button", { type: "button", onClick: () => setCalOpen(false), className: "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden", "aria-label": "Close calendars" })), _jsxs("aside", { className: [
                            "border-r bg-white p-3 flex flex-col gap-3 h-full",
                            "lg:static lg:translate-x-0 lg:w-auto", // desktop normal
                            "fixed left-0 top-0 z-50 h-screen w-72 max-w-[85vw]", // drawer on mobile/tablet
                            "transition-transform duration-300",
                            calOpen ? "translate-x-0" : "-translate-x-full",
                            "lg:transform-none lg:transition-none", // cancel drawer behavior on desktop
                            "lg:block", // show on desktop
                        ].join(" "), children: [_jsxs("div", { className: "flex items-center justify-between lg:hidden", children: [_jsx("div", { className: "text-sm font-semibold text-[#241453]", children: "Calendars" }), _jsx("button", { type: "button", onClick: () => setCalOpen(false), className: "w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center", "aria-label": "Close", children: "\u2715" })] }), _jsxs("div", { className: "rounded-xl border bg-[#F9F5FF]/30 p-3", children: [_jsx("div", { className: "text-sm font-semibold text-[#241453]", children: "My calendars" }), _jsx("div", { className: "text-xs text-gray-500 mt-1", children: "Select coaches to show their meetings" })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "text-sm font-semibold text-[#241453]", children: "Calendars" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", onClick: selectAll, className: "text-xs text-[#644D93] hover:underline", children: "Select all" }), _jsx("button", { type: "button", onClick: clearAll, className: "text-xs text-[#644D93] hover:underline", children: "Clear" })] })] }), _jsxs("div", { className: "space-y-1 flex-1 overflow-y-auto pr-1 custom-scroll", children: [filteredCoaches.map((c) => {
                                        const checked = selectedCoachIds.has(c.id);
                                        return (_jsxs("label", { className: "flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer select-none", children: [_jsx("input", { type: "checkbox", checked: checked, onChange: () => toggleCoach(c.id), className: "sr-only" }), _jsx("span", { className: [
                                                        "w-3 h-3 rounded-full border flex items-center justify-center shrink-0",
                                                        checked ? "border-[#644D93] bg-[#F9F5FF]" : "border-gray-300 bg-white",
                                                    ].join(" "), children: checked ? _jsx("span", { className: "w-3 h-3 rounded-full bg-[#644D93]" }) : null }), _jsx("span", { className: "text-sm text-gray-800", children: c.case_owner })] }, c.id));
                                    }), !filteredCoaches.length && (_jsxs("div", { className: "text-xs text-gray-500 px-2 py-3", children: ["No coaches match \u201C", coachQuery, "\u201D."] }))] })] }), _jsxs("main", { className: "p-3 bg-[#F7F8FB]", children: [_jsxs("div", { className: "bg-white rounded-2xl border shadow-sm px-3 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx("button", { type: "button", onClick: () => setWeekStart(startOfWeekMonday(new Date())), className: "px-3 py-2 rounded-lg border hover:bg-[#F9F5FF] text-sm", children: "Today" }), _jsx("button", { type: "button", onClick: () => setWeekStart(addDays(weekStart, -7)), className: "w-9 h-9 rounded-lg border hover:bg-[#F9F5FF]", "aria-label": "Prev", children: "\u2039" }), _jsx("button", { type: "button", onClick: () => setWeekStart(addDays(weekStart, 7)), className: "w-9 h-9 rounded-lg border hover:bg-[#F9F5FF]", "aria-label": "Next", children: "\u203A" }), _jsx("div", { className: "ml-2 font-semibold text-[#241453]", children: titleRange })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { type: "button", onClick: () => setView("workweek"), className: [
                                                    "px-3 py-2 rounded-lg border text-sm",
                                                    view === "workweek" ? "bg-[#F9F5FF] text-[#241453]" : "hover:bg-gray-200",
                                                ].join(" "), children: "Work week" }), _jsx("button", { type: "button", onClick: () => setView("week"), className: [
                                                    "px-3 py-2 rounded-lg border text-sm",
                                                    view === "week" ? "bg-[#F9F5FF] text-[#241453]" : "hover:bg-gray-200",
                                                ].join(" "), children: "Week" }), _jsx("button", { type: "button", onClick: () => setView("month"), className: [
                                                    "px-3 py-2 rounded-lg border text-sm",
                                                    view === "month" ? "bg-[#F9F5FF] text-[#241453]" : "hover:bg-gray-200",
                                                ].join(" "), children: "Month" })] })] }), view === "month" ? (_jsx(MonthGrid, { monthDate: weekStart, meetings: filteredMeetings, onPickDate: (iso) => {
                                    const picked = new Date(`${iso}T00:00:00`);
                                    setWeekStart(startOfWeekMonday(picked));
                                    setView("workweek");
                                } })) : (_jsx(WeekTimeGrid, { weekStart: weekStart, meetings: weekMeetings, daysToShow: view === "week" ? 7 : 5 }))] })] })] }));
}
