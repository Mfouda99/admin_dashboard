import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useMemo, useState } from "react";
/* ================= HELPERS ================= */
const pad2 = (n) => String(n).padStart(2, "0");
const monthKeyFromDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
const safeArr = (v) => (Array.isArray(v) ? v : []);
const safeStr = (v) => (typeof v === "string" ? v : v == null ? "" : String(v));
function norm(s) {
    return String(s || "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}@.\s-]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function tokensFromText(s) {
    const t = norm(s);
    const raw = t.split(/[\s\-_.@]+/g).map((x) => x.trim());
    const stop = new Set(["div", "span", "html", "body"]);
    return raw.filter((x) => x.length >= 3 && !stop.has(x));
}
function emailLocalTokens(email) {
    const e = norm(email);
    const local = (e.split("@")[0] ?? "").trim();
    return tokensFromText(local);
}
/**
 * Extract learner candidate from subject.
 */
function extractLearnerFromSubject(subject) {
    const s = safeStr(subject);
    if (!s)
        return "";
    const low = s.toLowerCase();
    if (s.includes("<") || low.includes("div/div"))
        return "";
    const dashParts = s.split(" - ").map((x) => x.trim()).filter(Boolean);
    if (dashParts.length >= 2)
        return dashParts[dashParts.length - 1] ?? "";
    const parts2 = s.split("-").map((x) => x.trim()).filter(Boolean);
    if (parts2.length >= 2)
        return parts2[parts2.length - 1] ?? "";
    return s.trim();
}
function detectSessionType(subject) {
    const s = safeStr(subject).toLowerCase();
    // Progress Review
    if (s.includes("progress review"))
        return "progress";
    // Support Session
    if (s.includes("support session"))
        return "support";
    // Coaching Session 
    if (s.includes("coaching session") || s.includes("coaching"))
        return "coaching";
    return "all";
}
function sessionTypeLabel(t) {
    if (t === "support")
        return "Support sessions";
    if (t === "coaching")
        return "Coaching sessions";
    if (t === "progress")
        return "Progress reviews";
    return "All session types";
}
function CustomSelect(props) {
    const { value, label, open, setOpen, options, onChange, disabled } = props;
    const ref = React.useRef(null);
    // close on outside click
    React.useEffect(() => {
        if (!open)
            return;
        const onDown = (e) => {
            if (!ref.current)
                return;
            if (!ref.current.contains(e.target))
                setOpen(false);
        };
        window.addEventListener("mousedown", onDown);
        return () => window.removeEventListener("mousedown", onDown);
    }, [open, setOpen]);
    return (_jsxs("div", { ref: ref, className: "relative", children: [_jsxs("button", { type: "button", disabled: disabled, onClick: () => setOpen(!open), className: "\r\n          w-full h-10 px-3\r\n          bg-white rounded-xl\r\n          border border-[#E9E2F7]\r\n          flex items-center justify-between gap-2\r\n          text-sm text-[#241453]\r\n          hover:bg-[#F9F5FF]\r\n          transition\r\n          disabled:opacity-60 disabled:cursor-not-allowed\r\n        ", children: [_jsx("span", { className: "truncate", children: label }), _jsx("span", { className: "text-gray-400", children: "\u25BE" })] }), open && !disabled && (_jsx("div", { className: "\r\n            absolute left-0 right-0 mt-2\r\n            bg-white rounded-xl shadow-lg\r\n            border border-gray-200\r\n            overflow-hidden\r\n            z-50\r\n          ", children: _jsx("div", { className: "max-h-64 overflow-y-auto custom-scroll", children: options.map((opt) => {
                        const active = opt.value === value;
                        return (_jsx("button", { type: "button", onClick: () => {
                                onChange(opt.value);
                                setOpen(false);
                            }, className: [
                                "w-full text-left px-3 py-2 text-sm transition",
                                "hover:bg-[#F9F5FF]",
                                active ? "bg-[#fff9f0] text-[#B27715]" : "text-[#241453]",
                            ].join(" "), children: opt.label }, opt.value));
                    }) }) }))] }));
}
/* ================= MATCHING (Improved) ================= */
function addTokenWithPrefixes(set, tok) {
    const t = (tok ?? "").trim();
    if (!t)
        return;
    set.add(t);
    if (t.length >= 3)
        set.add(t.slice(0, 3));
    if (t.length >= 4)
        set.add(t.slice(0, 4));
}
function makeTokenSetFromText(s) {
    const out = new Set();
    for (const tok of tokensFromText(s)) {
        addTokenWithPrefixes(out, tok);
    }
    return out;
}
function buildStudentIndex(students) {
    const byEmail = new Map();
    const tokenPoolById = new Map();
    const fullNameNormById = new Map();
    const getId = (st) => String(st.id || st.email || st.fullName);
    for (const st of students) {
        const em = norm(st.email);
        if (em)
            byEmail.set(em, st);
        const id = getId(st);
        fullNameNormById.set(id, norm(st.fullName));
        const set = new Set();
        for (const t of tokensFromText(st.fullName))
            addTokenWithPrefixes(set, t);
        for (const t of emailLocalTokens(st.email))
            addTokenWithPrefixes(set, t);
        tokenPoolById.set(id, set);
    }
    return { byEmail, tokenPoolById, fullNameNormById };
}
function matchStudentSoft(subject, idx, students) {
    const subNorm = norm(subject);
    // (1) email inside subject
    for (const [emailKey, st] of idx.byEmail.entries()) {
        if (emailKey && subNorm.includes(emailKey))
            return st;
    }
    const candidateRaw = extractLearnerFromSubject(subject);
    if (!candidateRaw)
        return null;
    const candNorm = norm(candidateRaw);
    if (!candNorm)
        return null;
    // (2) exact full name match
    for (const st of students) {
        if (norm(st.fullName) === candNorm)
            return st;
    }
    // (3) contains match (helps with middle names / extra text)
    for (const st of students) {
        const fn = norm(st.fullName);
        if (fn && (fn.includes(candNorm) || candNorm.includes(fn)))
            return st;
    }
    // (4) token overlap
    const candSet = makeTokenSetFromText(candidateRaw);
    if (candSet.size === 0)
        return null;
    const candTokens = tokensFromText(candidateRaw);
    let best = null;
    const getId = (st) => String(st.id || st.email || st.fullName);
    for (const st of students) {
        const id = getId(st);
        const pool = idx.tokenPoolById.get(id);
        if (!pool || pool.size === 0)
            continue;
        let score = 0;
        for (const tok of candSet) {
            if (pool.has(tok))
                score++;
        }
        const ok = candTokens.length >= 2 ? score >= 2 : score >= 1 && (candTokens[0]?.length ?? 0) >= 4;
        if (!ok)
            continue;
        if (!best || score > best.score)
            best = { st, score };
    }
    return best?.st ?? null;
}
const dateKeyFromAny = (v) => {
    const s = typeof v === "string" ? v : v == null ? "" : String(v);
    const m = s.match(/(\d{4}-\d{2}-\d{2})/);
    return m?.[1] ?? null;
};
const subjectFromAny = (e) => {
    if (!e)
        return "";
    const candidates = [
        e.subject,
        e.meeting_subject,
        e.meetingSubject,
        e.meetingSubjectText,
        e.title,
        e.summary,
        e.topic,
        e.name,
    ];
    for (const c of candidates) {
        if (typeof c === "string" && c.trim())
            return c.trim();
    }
    const nested = e.data?.subject ?? e.payload?.subject ?? e.body?.subject ?? e?.resource?.subject;
    if (typeof nested === "string" && nested.trim())
        return nested.trim();
    return "";
};
const normalizeToSubjectsByDate = (input) => {
    const out = {};
    const push = (dateKey, subject) => {
        if (!dateKey)
            return;
        const s = (subject ?? "").trim();
        if (!s)
            return;
        (out[dateKey] ?? (out[dateKey] = [])).push(s);
    };
    // Case 1: map with date keys
    if (input && typeof input === "object" && !Array.isArray(input)) {
        const keys = Object.keys(input);
        const looksLikeDateMap = keys.some((k) => /^\d{4}-\d{2}-\d{2}$/.test(k));
        if (looksLikeDateMap) {
            for (const k of keys) {
                const v = input[k];
                // "YYYY-MM-DD": ["subj", ...]
                if (Array.isArray(v)) {
                    for (const raw of v)
                        push(k, typeof raw === "string" ? raw : String(raw ?? ""));
                    continue;
                }
                // "YYYY-MM-DD": "subj"
                if (typeof v === "string") {
                    push(k, v);
                    continue;
                }
                // "YYYY-MM-DD": [{...event...}, ...]
                if (v && typeof v === "object") {
                    // common wrappers
                    const arr = v.value ?? v.data?.value ?? v.body?.value ?? v.items ?? v.data ?? null;
                    if (Array.isArray(arr)) {
                        for (const ev of arr)
                            push(k, subjectFromAny(ev));
                        continue;
                    }
                    // direct object as event
                    push(k, subjectFromAny(v));
                }
            }
            return out;
        }
    }
    // Case 2: array of events
    if (Array.isArray(input)) {
        for (const ev of input) {
            const dk = dateKeyFromAny(ev?.dateKey) ??
                dateKeyFromAny(ev?.date) ??
                dateKeyFromAny(ev?.start) ??
                dateKeyFromAny(ev?.startDateTime) ??
                dateKeyFromAny(ev?.start?.dateTime) ??
                dateKeyFromAny(ev?.createdAt);
            push(dk, subjectFromAny(ev));
        }
        return out;
    }
    // Case 3: object wrapping array somewhere
    const arr = input?.value ?? input?.data?.value ?? input?.body?.value ?? input?.items ?? input?.data ?? null;
    if (Array.isArray(arr))
        return normalizeToSubjectsByDate(arr);
    return out;
};
/* ================= UI HELPERS (DESIGN ONLY) ================= */
function Chip({ children }) {
    return (_jsx("span", { className: "inline-flex items-center rounded-full border border-[#E9E2F7] bg-[#F9F5FF] px-2.5 py-1 text-xs font-medium text-[#241453]", children: children }));
}
function CountPill({ n, tone = "gold" }) {
    const cls = tone === "gold"
        ? "bg-[#FFF6E8] text-[#B27715] border-[#F3E3C8]"
        : tone === "purple"
            ? "bg-[#F9F5FF] text-[#241453] border-[#E9E2F7]"
            : "bg-gray-50 text-gray-700 border-gray-200";
    return (_jsx("span", { className: `inline-flex h-5 min-w-[28px] items-center justify-center rounded-full border px-2 text-[11px] font-semibold ${cls}`, children: n }));
}
function Panel({ title, count, children, heightClass = "h-[560px]", }) {
    return (_jsxs("div", { className: [
            "rounded-2xl border border-[#E9E2F7] bg-white shadow-sm flex flex-col",
            heightClass,
        ].join(" "), children: [_jsxs("div", { className: "px-4 py-3 border-b border-[#F1EAFB] bg-gradient-to-r from-[#F9F5FF] to-white rounded-t-2xl flex items-center justify-between", children: [_jsx("div", { className: "text-sm font-semibold text-[#241453]", children: title }), _jsx(CountPill, { n: count })] }), _jsx("div", { className: "p-3 flex-1 overflow-y-auto custom-scroll", children: children })] }));
}
/* ================= COMPONENT ================= */
export default function MonthlySessionsWithLearners({ students, meetingSubject, extraSource }) {
    const [month, setMonth] = useState(() => monthKeyFromDate(new Date()));
    const [sessionType, setSessionType] = useState("all");
    // dropdown open states
    const [monthOpen, setMonthOpen] = useState(false);
    const [typeOpen, setTypeOpen] = useState(false);
    const studentIndex = useMemo(() => buildStudentIndex(students), [students]);
    //unify sources into one byDate map
    const byDate = useMemo(() => {
        const a = normalizeToSubjectsByDate(meetingSubject);
        const b = normalizeToSubjectsByDate(extraSource);
        const merged = { ...a };
        for (const [k, list] of Object.entries(b)) {
            (merged[k] ?? (merged[k] = [])).push(...list);
        }
        return merged;
    }, [meetingSubject, extraSource]);
    const availableMonths = useMemo(() => {
        const months = new Set();
        for (const k of Object.keys(byDate)) {
            if (/^\d{4}-\d{2}-\d{2}$/.test(k))
                months.add(k.slice(0, 7));
        }
        const arr = Array.from(months);
        if (arr.length === 0)
            return [monthKeyFromDate(new Date())];
        return arr.sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
    }, [byDate]);
    const availableSessionTypes = useMemo(() => {
        const set = new Set();
        for (const [dateKey, list] of Object.entries(byDate)) {
            if (!dateKey.startsWith(month))
                continue;
            for (const raw of safeArr(list)) {
                const subject = safeStr(raw).trim();
                if (!subject)
                    continue;
                const t = detectSessionType(subject);
                if (t !== "all")
                    set.add(t);
            }
        }
        return ["all", ...Array.from(set)];
    }, [byDate, month]);
    const monthOptions = useMemo(() => availableMonths.map((m) => ({ value: m, label: m })), [availableMonths]);
    const monthLabel = useMemo(() => {
        return monthOptions.find((o) => o.value === month)?.label ?? (monthOptions[0]?.label ?? "—");
    }, [monthOptions, month]);
    const typeOptions = useMemo(() => availableSessionTypes.map((t) => ({ value: t, label: sessionTypeLabel(t) })), [availableSessionTypes]);
    const typeLabel = useMemo(() => {
        return typeOptions.find((o) => o.value === sessionType)?.label ?? "All session types";
    }, [typeOptions, sessionType]);
    useEffect(() => {
        if (sessionType !== "all" && !availableSessionTypes.includes(sessionType)) {
            setSessionType("all");
        }
    }, [availableSessionTypes, sessionType]);
    useEffect(() => {
        if (!availableMonths.includes(month)) {
            setMonth(availableMonths[0] ?? monthKeyFromDate(new Date()));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableMonths.join("|")]);
    const computed = useMemo(() => {
        const byId = new Map();
        const unmatched = new Map();
        const getId = (st) => String(st.id || st.email || st.fullName);
        const ensure = (st) => {
            const id = getId(st);
            let rec = byId.get(id);
            if (!rec) {
                rec = { student: st, count: 0, subjects: {}, lastDate: null }; // ✅
                byId.set(id, rec);
            }
            return rec;
        };
        const pushUnmatched = (subject) => {
            const extracted = extractLearnerFromSubject(subject);
            const k = extracted ? extracted : "Unknown / Junk";
            const cur = unmatched.get(k);
            if (cur) {
                cur.count += 1;
                if (cur.examples.length < 3 && !cur.examples.includes(subject))
                    cur.examples.push(subject);
            }
            else {
                unmatched.set(k, { key: k, count: 1, examples: [subject] });
            }
        };
        //use unified byDate
        for (const [dateKey, list] of Object.entries(byDate)) {
            if (!dateKey.startsWith(month))
                continue;
            const subjects = safeArr(list);
            for (const raw of subjects) {
                const subject = safeStr(raw).trim();
                if (!subject)
                    continue;
                // junk -> unmatched
                if (subject.toLowerCase().includes("div/div") || subject.includes("<")) {
                    pushUnmatched(subject);
                    continue;
                }
                // filter by session type
                if (sessionType !== "all") {
                    const t = detectSessionType(subject);
                    if (t !== sessionType)
                        continue;
                }
                const st = matchStudentSoft(subject, studentIndex, students);
                if (!st) {
                    pushUnmatched(subject);
                    continue;
                }
                const rec = ensure(st);
                rec.count += 1;
                // keep latest date
                if (!rec.lastDate || dateKey > rec.lastDate)
                    rec.lastDate = dateKey;
                const key = subject;
                if (!rec.subjects[key])
                    rec.subjects[key] = { count: 0 };
                rec.subjects[key].count += 1;
            }
        }
        const all = students.map((st) => {
            const rec = byId.get(getId(st));
            const total = rec?.count ?? 0;
            const subjectLines = Object.entries(rec?.subjects ?? {})
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 3)
                .map(([subject, meta]) => ({ subject, count: meta.count }));
            return { student: st, total, subjectLines, lastDate: rec?.lastDate ?? null };
        });
        const withSessions = all.filter((x) => x.total > 0).sort((a, b) => b.total - a.total);
        const withoutSessions = all.filter((x) => x.total === 0).sort((a, b) => a.student.fullName.localeCompare(b.student.fullName));
        const totalSessions = withSessions.reduce((sum, x) => sum + x.total, 0);
        const unmatchedList = Array.from(unmatched.values()).sort((a, b) => b.count - a.count);
        return { withSessions, withoutSessions, totalSessions, unmatchedList };
    }, [byDate, month, studentIndex, students, sessionType]);
    return (_jsxs("div", { id: "report-area", className: "bg-white rounded-2xl shadow-sm p-4 border border-[#F1EAFB]", children: [_jsxs("div", { className: "flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between", children: [_jsx("div", { className: "min-w-0", children: _jsx("div", { className: "flex items-center gap-2 flex-wrap", children: _jsxs("h3", { className: "text-base sm:text-lg font-semibold text-[#241453]", children: ["Monthly sessions review ", _jsx("span", { className: "font-medium text-[#B27715]", children: "\"MCR\"" }), _jsxs("span", { className: "ml-2 text-[#442F73]", children: ["(", month, ")"] })] }) }) }), _jsxs("div", { className: "w-full lg:w-auto flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-wrap lg:justify-end", children: [_jsxs("div", { className: "flex items-center gap-2 w-full sm:w-auto", children: [_jsx("span", { className: "text-xs text-[#442F73] shrink-0", children: "Month" }), _jsx("div", { className: "w-full sm:w-[160px]", children: _jsx(CustomSelect, { value: month, label: monthLabel, open: monthOpen, setOpen: (v) => {
                                                setMonthOpen(v);
                                                if (v)
                                                    setTypeOpen(false);
                                            }, options: monthOptions, onChange: (val) => setMonth(val) }) })] }), _jsxs("div", { className: "flex items-center gap-2 w-full sm:w-auto", children: [_jsx("span", { className: "text-xs text-[#442F73] shrink-0", children: "Session type" }), _jsx("div", { className: "w-full sm:w-[220px]", children: _jsx(CustomSelect, { value: sessionType, label: typeLabel, open: typeOpen, setOpen: (v) => {
                                                setTypeOpen(v);
                                                if (v)
                                                    setMonthOpen(false);
                                            }, options: typeOptions, onChange: (val) => setSessionType(val) }) })] }), _jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsxs(Chip, { children: ["Total sessions ", _jsx("span", { className: "ml-2 font-semibold text-[#B27715]", children: computed.totalSessions })] }), _jsxs(Chip, { children: ["Learners with sessions", " ", _jsx("span", { className: "ml-2 font-semibold text-[#B27715]", children: computed.withSessions.length })] })] })] })] }), _jsxs("div", { className: "mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch", children: [_jsx("div", { className: "lg:col-span-4", children: _jsx(Panel, { title: "With sessions (Students have sessions this month)", count: computed.withSessions.length, children: computed.withSessions.length === 0 ? (_jsx("div", { className: "text-sm text-gray-400", children: "No learners with sessions this month." })) : (_jsx("div", { className: "space-y-2", children: computed.withSessions.map((x) => {
                                    const st = x.student;
                                    return (_jsxs("div", { className: "border border-gray-100 rounded-xl p-3 hover:border-[#E9E2F7] hover:bg-[#FCFAFF] transition", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0 flex-wrap", children: [_jsx("div", { className: "text-sm font-semibold text-gray-800 truncate", children: st.fullName }), x.lastDate ? (_jsx("span", { className: "text-[11px] px-2 py-0.5 rounded-full border bg-[#F9F5FF] text-[#442F73] border-[#E9E2F7]", children: x.lastDate })) : null] }), _jsxs("span", { className: "shrink-0 text-[11px] px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200", children: ["x", x.total] })] }), _jsx("div", { className: "text-xs text-gray-500 mt-0.5 truncate", children: st.email || "—" }), x.subjectLines?.length ? (_jsx("div", { className: "mt-2 space-y-1", children: x.subjectLines.map((s, idx2) => (_jsxs("div", { className: "text-xs text-gray-600 truncate", children: [_jsxs("span", { className: "font-medium", children: ["x", s.count] }), _jsx("span", { className: "text-gray-400", children: " \u2022 " }), s.subject] }, idx2))) })) : null] }, st.id || st.email));
                                }) })) }) }), _jsx("div", { className: "lg:col-span-4", children: _jsx(Panel, { title: "No sessions (Students have no sessions this month)", count: computed.withoutSessions.length, children: computed.withoutSessions.length === 0 ? (_jsx("div", { className: "text-sm text-gray-400", children: "All learners have sessions this month \u2705" })) : (_jsx("div", { className: "space-y-2", children: computed.withoutSessions.map((x) => (_jsxs("div", { className: "border border-gray-100 rounded-xl p-3 hover:border-[#E9E2F7] hover:bg-[#FCFAFF] transition", children: [_jsx("div", { className: "text-sm font-semibold text-[#241453] truncate", children: x.student.fullName }), _jsx("div", { className: "text-xs text-gray-500 mt-0.5 truncate", children: x.student.email || "—" })] }, x.student.id || x.student.email))) })) }) }), _jsx("div", { className: "lg:col-span-4", children: _jsx(Panel, { title: "Unmatched students (Students may don't match students with coach)", count: computed.unmatchedList.length, children: computed.unmatchedList.length === 0 ? (_jsx("div", { className: "text-sm text-gray-400", children: "All students matched \u2705" })) : (_jsx("div", { className: "space-y-2", children: computed.unmatchedList.map((u) => (_jsxs("div", { className: "border border-gray-100 rounded-xl p-3 hover:border-[#E9E2F7] hover:bg-[#FCFAFF] transition", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsx("div", { className: "min-w-0", children: _jsx("div", { className: "text-sm font-semibold text-[#241453] truncate", children: u.key }) }), _jsx(CountPill, { n: u.count, tone: "gray" })] }), u.examples?.length ? (_jsx("div", { className: "mt-2 space-y-1", children: u.examples.map((ex, i) => (_jsx("div", { className: "text-xs text-gray-600 truncate", children: ex }, i))) })) : null] }, u.key))) })) }) })] })] }));
}
