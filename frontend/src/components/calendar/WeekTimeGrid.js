import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from "react";
/* ================= HELPERS ================= */
const pad2 = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fmtTime = (min) => `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;
const addDays = (d, days) => {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const parseTimeToMinutes = (t) => {
    if (!t)
        return null;
    const m = String(t).match(/^(\d{1,2}):(\d{2})/);
    if (!m)
        return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm))
        return null;
    return hh * 60 + mm;
};
const isCancelledMeeting = (m) => {
    const text = `${m.serviceName ?? ""} ${m.customerName ?? ""}`.toLowerCase();
    return text.includes("cancel") || text.includes("canceled") || text.includes("cancelled");
};
const overlaps = (aS, aE, bS, bE) => aS < bE && aE > bS;
function normalizeMeeting(m, dayStartMin, dayEndMin) {
    const s = parseTimeToMinutes(m.timeFrom) ?? dayStartMin;
    const eRaw = parseTimeToMinutes(m.timeTo) ?? Math.min(s + 30, dayEndMin);
    const e = Math.max(eRaw, s + 15);
    return {
        start: clamp(s, 0, 24 * 60),
        end: clamp(e, 0, 24 * 60),
    };
}
/* ================= OUTLOOK-LIKE OVERLAP LAYOUT (CAPPED) ================= */
function layoutDay(meetings, dayStartMin, dayEndMin) {
    const items = meetings
        .map((m, idx) => {
        const { start, end } = normalizeMeeting(m, dayStartMin, dayEndMin);
        return { m, start, end, idx };
    })
        .filter(Boolean);
    items.sort((a, b) => a.start - b.start || a.end - b.end || a.idx - b.idx);
    // Build overlap clusters
    const clusters = [];
    let cur = [];
    let curEnd = -1;
    for (const it of items) {
        if (!cur.length) {
            cur = [it];
            curEnd = it.end;
            continue;
        }
        if (it.start < curEnd) {
            cur.push(it);
            curEnd = Math.max(curEnd, it.end);
        }
        else {
            clusters.push(cur);
            cur = [it];
            curEnd = it.end;
        }
    }
    if (cur.length)
        clusters.push(cur);
    const positioned = [];
    const more = [];
    const MAX_COLS = 4;
    for (const cluster of clusters) {
        // assign stable slots (interval partitioning)
        const slotEnd = [];
        const slotOf = new Map();
        for (const it of cluster) {
            let slot = 0;
            for (; slot < slotEnd.length; slot++) {
                if ((slotEnd[slot] ?? Number.NEGATIVE_INFINITY) <= it.start)
                    break;
            }
            if (slot === slotEnd.length)
                slotEnd.push(it.end);
            else
                slotEnd[slot] = it.end;
            slotOf.set(it, slot);
        }
        const totalSlots = Math.max(1, slotEnd.length);
        const cols = Math.min(totalSlots, MAX_COLS);
        // build "more" slices where concurrency exceeds MAX_COLS
        const points = Array.from(new Set(cluster.flatMap((it) => [it.start, it.end]))).sort((a, b) => a - b);
        for (let i = 0; i + 1 < points.length; i++) {
            const a = points[i];
            const b = points[i + 1];
            if (a == null || b == null || b <= a)
                continue;
            const active = cluster.filter((it) => it.start < b && it.end > a);
            if (active.length <= MAX_COLS)
                continue;
            const hiddenCount = active.length - MAX_COLS;
            const last = more[more.length - 1];
            if (last && last.endMin === a) {
                last.endMin = b;
                last.count = Math.max(last.count, hiddenCount);
            }
            else {
                more.push({ startMin: a, endMin: b, count: hiddenCount });
            }
        }
        // place only first MAX_COLS
        for (const it of cluster) {
            const slot = slotOf.get(it) ?? 0;
            if (slot >= MAX_COLS)
                continue;
            const width = 1 / cols;
            const left = slot * width;
            positioned.push({
                ...it.m,
                _startMin: it.start,
                _endMin: it.end,
                _left: left,
                _width: width,
            });
        }
    }
    return { positioned, more };
}
/* ================= UI: Event Card (Light theme) ================= */
function EventCard({ m }) {
    const cancelled = isCancelledMeeting(m);
    const title = (m.serviceName || "Meeting").trim();
    const subtitle = (m.customerName || m.coachName || "").trim();
    const veryNarrow = m._width <= 0.22;
    const base = "h-full rounded-xl border shadow-sm overflow-hidden px-2 py-1.5 " +
        "hover:shadow-md hover:z-20 hover:scale-[1.01] transition";
    const normalCard = "bg-[#F9F5FF]/70 border-[#E6DDF7]";
    const cancelCard = "bg-rose-50 border-rose-200";
    const dot = cancelled ? "bg-rose-500" : "bg-[#644D93]";
    const badge = cancelled
        ? "bg-white/70 border-rose-200 text-rose-700"
        : "bg-white/70 border-[#E6DDF7] text-[#241453]";
    return (_jsx("div", { className: [base, cancelled ? cancelCard : normalCard].join(" "), children: _jsxs("div", { className: "flex items-start gap-2", children: [_jsx("div", { className: ["mt-0.5 w-2.5 h-2.5 rounded-full shrink-0", dot].join(" ") }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "text-[12px] font-semibold text-[#241453] line-clamp-1", children: title }), !veryNarrow && (_jsx("span", { className: ["ml-auto text-[10px] px-2 py-0.5 rounded-full border shrink-0", badge].join(" "), children: cancelled ? "Cancelled" : "Scheduled" }))] }), !veryNarrow && (_jsx("div", { className: "mt-0.5 text-[11px] text-[#241453]/70 line-clamp-1", children: subtitle || "—" })), _jsx("div", { className: "mt-0.5 text-[11px] text-[#241453]/80", children: _jsxs("span", { className: "opacity-90", children: [m.timeFrom || "", " ", m.timeTo ? `- ${m.timeTo}` : ""] }) }), !veryNarrow && m.joinWebUrl ? (_jsx("a", { href: m.joinWebUrl, target: "_blank", rel: "noreferrer", className: "mt-1 inline-block text-[11px] text-[#241453] underline underline-offset-2", children: "Join" })) : null] })] }) }));
}
function MoreModal({ state, onClose, }) {
    if (!state.open)
        return null;
    return (_jsxs("div", { className: "fixed inset-0 z-[60]", children: [_jsx("button", { type: "button", className: "absolute inset-0 bg-black/35", onClick: onClose, "aria-label": "Close" }), _jsx("div", { className: "absolute left-1/2 top-1/2 w-[min(720px,92vw)] -translate-x-1/2 -translate-y-1/2", children: _jsxs("div", { className: "rounded-2xl border bg-white shadow-xl overflow-hidden", children: [_jsxs("div", { className: "px-4 py-3 border-b bg-[#F9F5FF]/60 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-semibold text-[#241453]", children: state.dayLabel }), _jsx("div", { className: "text-xs text-[#241453]/70", children: state.rangeLabel })] }), _jsx("button", { type: "button", onClick: onClose, className: "px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 text-sm", children: "Close" })] }), _jsxs("div", { className: "p-3 bg-[#F9F5FF]/35", children: [_jsx("div", { className: "rounded-xl border bg-white overflow-hidden", children: _jsx("div", { className: "max-h-[60vh] overflow-auto", children: state.items.length ? (_jsx("div", { className: "divide-y", children: state.items.map((m, idx) => {
                                                const cancelled = isCancelledMeeting(m);
                                                const title = (m.serviceName || "Meeting").trim();
                                                const sub = (m.customerName || m.coachName || "").trim();
                                                return (_jsxs("div", { className: "p-3 flex items-start gap-3", children: [_jsx("span", { className: [
                                                                "mt-1 w-2.5 h-2.5 rounded-full shrink-0",
                                                                cancelled ? "bg-rose-500" : "bg-[#644D93]",
                                                            ].join(" ") }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "font-semibold text-sm text-[#241453] truncate", children: title }), _jsx("span", { className: [
                                                                                "ml-auto text-[11px] px-2 py-0.5 rounded-full border shrink-0",
                                                                                cancelled
                                                                                    ? "bg-rose-50 border-rose-200 text-rose-700"
                                                                                    : "bg-[#F9F5FF] border-[#E6DDF7] text-[#241453]",
                                                                            ].join(" "), children: cancelled ? "Cancelled" : "Scheduled" })] }), _jsx("div", { className: "mt-0.5 text-xs text-[#241453]/70 truncate", children: sub || "—" }), _jsxs("div", { className: "mt-1 text-xs text-[#241453]/80", children: [m.timeFrom || "", " ", m.timeTo ? `- ${m.timeTo}` : "", m.joinWebUrl ? (_jsx("a", { href: m.joinWebUrl, target: "_blank", rel: "noreferrer", className: "ml-3 underline underline-offset-2", children: "Join" })) : null] })] })] }, `${m.meetingId ?? idx}`));
                                            }) })) : (_jsx("div", { className: "p-6 text-sm text-[#241453]/70", children: "No meetings found." })) }) }), _jsx("div", { className: "mt-2 text-xs text-[#241453]/60", children: "Showing meetings that overlap the selected \u201Cmore\u201D time slice." })] })] }) })] }));
}
/* ================= MAIN GRID ================= */
export default function WeekTimeGrid({ weekStart, meetings, startHour = 8, endHour = 20, daysToShow = 5, }) {
    const nDays = daysToShow ?? 5;
    const days = useMemo(() => Array.from({ length: nDays }, (_, i) => addDays(weekStart, i)), [weekStart, nDays]);
    const hourSlots = Math.max(1, endHour - startHour);
    const hours = useMemo(() => Array.from({ length: hourSlots }, (_, i) => startHour + i), [startHour, endHour]);
    const ROW_H = 72;
    const DAY_TOP_PAD = 44;
    const hoursHeight = ROW_H * hourSlots;
    const startMin = startHour * 60;
    const endMin = endHour * 60;
    const totalMin = endMin - startMin;
    const EVENT_GAP_X = 6;
    const EVENT_GAP_Y = 2;
    const MIN_EVENT_PX = 18;
    const meetingsByDay = useMemo(() => {
        var _a;
        const map = {};
        for (const m of meetings) {
            if (!m?.date)
                continue;
            (map[_a = m.date] ?? (map[_a] = [])).push(m);
        }
        return map;
    }, [meetings]);
    const dayColsStyle = useMemo(() => ({ gridTemplateColumns: `repeat(${nDays}, minmax(0, 1fr))` }), [nDays]);
    // More modal state
    const [moreState, setMoreState] = useState({
        open: false,
        dayKey: "",
        dayLabel: "",
        rangeLabel: "",
        items: [],
    });
    const openMore = (dayKey, dayDate, sliceStart, sliceEnd, dayMeetings) => {
        const items = dayMeetings
            .map((m) => {
            const { start, end } = normalizeMeeting(m, startMin, endMin);
            return { m, start, end };
        })
            .filter((x) => overlaps(x.start, x.end, sliceStart, sliceEnd))
            .sort((a, b) => a.start - b.start || a.end - b.end)
            .map((x) => x.m);
        const dayLabel = dayDate.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
        });
        const rangeLabel = `${fmtTime(sliceStart)} – ${fmtTime(sliceEnd)} (overlaps)`;
        setMoreState({
            open: true,
            dayKey,
            dayLabel,
            rangeLabel,
            items,
        });
    };
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "border rounded-2xl overflow-hidden bg-white", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("div", { style: { minWidth: 80 + nDays * 180 }, children: [_jsxs("div", { className: "grid grid-cols-[80px_1fr] border-b bg-[#241453]/60 sticky top-0 z-30", children: [_jsx("div", { className: "p-3 text-xs text-[#241453]/60" }), _jsx("div", { className: "grid", style: dayColsStyle, children: days.map((d) => {
                                            const key = toISO(d);
                                            const label = d.toLocaleDateString("en-GB", { weekday: "short" });
                                            const num = d.getDate();
                                            return (_jsxs("div", { className: "px-3 py-2 border-l border-[#E6DDF7]", children: [_jsx("div", { className: "text-xs text-[#FEF9FF]", children: label }), _jsx("div", { className: "text-sm font-semibold text-[#FEF9FF]/80", children: num })] }, key));
                                        }) })] }), _jsx("div", { className: "max-h-[1024px] overflow-y-auto overflow-x-hidden", children: _jsxs("div", { className: "grid grid-cols-[80px_1fr]", children: [_jsxs("div", { className: "border-r border-[#E6DDF7] sticky left-0 z-20 bg-white", children: [_jsx("div", { className: "border-b border-[#E6DDF7]", style: { height: DAY_TOP_PAD } }), hours.map((h) => (_jsx("div", { className: "px-3 flex items-start pt-2 text-xs text-[#241453]/60 border-b border-[#E6DDF7]", style: { height: ROW_H }, children: h <= 11 ? `${h} AM` : h === 12 ? `12 PM` : `${h - 12} PM` }, h)))] }), _jsx("div", { className: "grid", style: dayColsStyle, children: days.map((d) => {
                                                const dayKey = toISO(d);
                                                const dayMeetings = meetingsByDay[dayKey] ?? [];
                                                const { positioned, more } = layoutDay(dayMeetings, startMin, endMin);
                                                const visibleEvents = positioned.filter((m) => m._endMin > startMin && m._startMin < endMin);
                                                const visibleMore = more.filter((x) => x.endMin > startMin && x.startMin < endMin && x.count > 0);
                                                const dayHeight = DAY_TOP_PAD + hoursHeight;
                                                return (_jsxs("div", { className: "relative border-l border-[#E6DDF7]", style: { height: dayHeight }, children: [_jsx("div", { className: "border-b border-[#E6DDF7]", style: { height: DAY_TOP_PAD } }), hours.map((h) => (_jsx("div", { className: "border-b border-[#E6DDF7]", style: { height: ROW_H } }, h))), _jsxs("div", { className: "absolute inset-0", children: [visibleEvents.map((m, i) => {
                                                                    const clampedS = clamp(m._startMin, startMin, endMin);
                                                                    const clampedE = clamp(m._endMin, startMin, endMin);
                                                                    const durMin = Math.max(1, clampedE - clampedS);
                                                                    const naturalH = (durMin / totalMin) * hoursHeight;
                                                                    const height = Math.max(MIN_EVENT_PX, naturalH) - EVENT_GAP_Y;
                                                                    const top = DAY_TOP_PAD + ((clampedS - startMin) / totalMin) * hoursHeight + EVENT_GAP_Y / 2;
                                                                    const leftPct = clamp(m._left ?? 0, 0, 1) * 100;
                                                                    const widthPct = clamp(m._width ?? 1, 0.02, 1) * 100;
                                                                    const style = {
                                                                        top,
                                                                        height: Math.max(8, height),
                                                                        left: `calc(${leftPct}% + ${EVENT_GAP_X / 2}px)`,
                                                                        width: `calc(${widthPct}% - ${EVENT_GAP_X}px)`,
                                                                        zIndex: 10,
                                                                    };
                                                                    return (_jsx("div", { className: "absolute", style: style, children: _jsx(EventCard, { m: m }) }, `${m.meetingId ?? m.customerName ?? "m"}-${m._startMin}-${i}`));
                                                                }), visibleMore.map((x, i) => {
                                                                    const clampedS = clamp(x.startMin, startMin, endMin);
                                                                    const clampedE = clamp(x.endMin, startMin, endMin);
                                                                    const top = DAY_TOP_PAD + ((clampedS - startMin) / totalMin) * hoursHeight + 2;
                                                                    const sliceMin = Math.max(1, clampedE - clampedS);
                                                                    const naturalH = (sliceMin / totalMin) * hoursHeight;
                                                                    return (_jsx("button", { type: "button", onClick: () => openMore(dayKey, d, clampedS, clampedE, dayMeetings), className: "absolute text-left", style: {
                                                                            top,
                                                                            left: "calc(0% + 6px)",
                                                                            width: "calc(25% - 10px)",
                                                                            height: Math.min(28, Math.max(18, naturalH)),
                                                                            zIndex: 15,
                                                                        }, children: _jsxs("div", { className: "h-full rounded-lg border border-[#E6DDF7] bg-[#F9F5FF]/90 shadow-sm px-2 flex items-center text-[11px] text-[#241453]", children: ["+", x.count, " more"] }) }, `more-${dayKey}-${i}`));
                                                                })] })] }, dayKey));
                                            }) })] }) })] }) }) }), _jsx(MoreModal, { state: moreState, onClose: () => setMoreState((p) => ({ ...p, open: false })) })] }));
}
