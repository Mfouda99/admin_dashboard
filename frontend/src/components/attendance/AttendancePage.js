import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import TopHeader from "../header/TopHeader";
import CoachesList from "../coaches/CoachesList";
import AttendanceTasksPanel from "./AttendanceTasksPanel";
import MonthlySessionsWithLearners from "./MonthlySessionsWithLearners";
import { fetchAllCoachesAnalytics } from "../../api";
/* ================= HELPERS ================= */
const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const pickISODateKeys = (obj) => Object.keys(obj).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k));
function toAttendanceMap(raw) {
    if (!isObj(raw))
        return {};
    const out = {};
    for (const [studentName, dates] of Object.entries(raw)) {
        if (!isObj(dates))
            continue;
        const dateKeys = pickISODateKeys(dates);
        if (!dateKeys.length)
            continue;
        out[studentName] = {};
        for (const d of dateKeys) {
            const cell = dates[d];
            if (isObj(cell))
                out[studentName][d] = cell;
            else
                out[studentName][d] = { value: cell };
        }
    }
    return out;
}
function num01(v) {
    if (v === 0 || v === "0")
        return 0;
    if (v === 1 || v === "1")
        return 1;
    return null;
}
function authHeaders(extra) {
    const token = localStorage.getItem("token");
    return {
        ...(extra ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}
async function postTask(coachId, payload) {
    const res = await fetch(`/tasks-api/coaches/${coachId}/tasks/`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
    });
    const text = await res.text().catch(() => "");
    if (!res.ok)
        throw new Error(text || `Request failed (${res.status})`);
    try {
        return text ? JSON.parse(text) : null;
    }
    catch {
        return text;
    }
}
// Upload evidence image file and get back URL
async function uploadEvidenceImage(file) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/tasks-api/evidence/upload/", {
        method: "POST",
        headers: authHeaders(), // Bearer token only (no Content-Type)
        body: fd,
    });
    const text = await res.text().catch(() => "");
    if (!res.ok)
        throw new Error(text || `Upload failed (${res.status})`);
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    }
    catch {
        data = null;
    }
    const url = data?.url;
    if (!url || typeof url !== "string") {
        throw new Error("Upload succeeded but no url returned");
    }
    return url;
}
function CustomSelect(props) {
    const { value, label, open, setOpen, options, onChange, disabled } = props;
    return (_jsxs("div", { className: "relative", children: [_jsxs("button", { type: "button", disabled: disabled, onClick: () => setOpen(!open), className: "\r\n          w-full h-10 px-3\r\n          bg-white rounded-xl\r\n          border border-gray-200\r\n          flex items-center justify-between gap-2\r\n          text-sm text-[#241453]\r\n          hover:bg-[#F9F5FF]\r\n          transition\r\n          disabled:opacity-60 disabled:cursor-not-allowed\r\n        ", children: [_jsx("span", { className: "truncate", children: label }), _jsx("span", { className: "text-gray-400", children: "\u25BE" })] }), open && !disabled && (_jsx("div", { className: "\r\n      absolute left-0 right-0 mt-2\r\n      bg-white rounded-xl shadow-lg\r\n      border border-gray-200\r\n      overflow-hidden\r\n      z-50\r\n    ", children: _jsx("div", { className: "max-h-64 overflow-y-auto custom-scroll", children: options.map((opt) => {
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
/* ================= COMPONENT ================= */
export default function AttendancePage({ onOpenSidebar }) {
    const [coaches, setCoaches] = useState([]);
    const [selectedCoachId, setSelectedCoachId] = useState(null);
    const [selectedModule, setSelectedModule] = useState("all");
    const [date, setDate] = useState("");
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // evidence panel state
    const [evidenceTarget, setEvidenceTarget] = useState(null);
    const [method, setMethod] = useState("");
    const [notes, setNotes] = useState("");
    const [proofFile, setProofFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState(null);
    const canSaveEvidence = method !== "" && !!proofFile && !saving;
    const resetEvidenceForm = () => {
        setNotes("");
        setMethod("");
        setProofFile(null);
    };
    // Role
    const viewerRole = localStorage.getItem("role") || "coach";
    const isQA = viewerRole === "qa";
    const selfCoachId = Number(localStorage.getItem("coach_id") || "");
    const userName = localStorage.getItem("username") || "User";
    const canSwitchCoach = isQA;
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchAllCoachesAnalytics();
                const arr = Array.isArray(data) ? data : [];
                const normalized = arr
                    .map((c) => {
                    const rawId = c.id ?? c.case_owner_id ?? c.caseOwnerId ?? c.coach_id ?? c.coachId;
                    const id = Number(rawId);
                    return { ...c, id };
                })
                    .filter((c) => Number.isFinite(c.id));
                // Filter coaches based on role and username (same as dashboard)
                let filteredCoaches = normalized;
                // If user is a coach, only show their own data
                if (!isQA && userName) {
                    filteredCoaches = normalized.filter((c) => c.case_owner === userName || c.caseOwner === userName);
                }
                // If role is "qa", show all coaches (no filtering)
                setCoaches(filteredCoaches);
                if (isQA) {
                    setSelectedCoachId(filteredCoaches[0]?.id ?? null);
                }
                else {
                    const mine = filteredCoaches.find((c) => c.case_owner === userName || c.caseOwner === userName);
                    setSelectedCoachId(mine?.id ?? (filteredCoaches[0]?.id ?? null));
                }
            }
            catch (e) {
                console.error(e);
                setError(e?.message || "Failed to load coaches");
            }
            finally {
                setLoading(false);
            }
        };
        load();
    }, [isQA, userName]);
    const selectedCoach = useMemo(() => {
        if (!coaches.length)
            return null;
        return coaches.find((c) => c.id === selectedCoachId) ?? coaches[0];
    }, [coaches, selectedCoachId]);
    const coachName = useMemo(() => {
        return String(selectedCoach?.case_owner ?? (isQA ? "QA" : "Coach"));
    }, [selectedCoach, isQA]);
    const attendance = useMemo(() => {
        const raw = selectedCoach?.attendance;
        return toAttendanceMap(raw);
    }, [selectedCoach]);
    const modules = useMemo(() => {
        const set = new Set();
        for (const dates of Object.values(attendance)) {
            for (const d of Object.keys(dates)) {
                const m = dates?.[d]?.module;
                if (typeof m === "string" && m.trim())
                    set.add(m.trim());
            }
        }
        return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
    }, [attendance]);
    const availableDates = useMemo(() => {
        const all = new Set();
        for (const dates of Object.values(attendance)) {
            for (const [d, cell] of Object.entries(dates)) {
                const m = cell?.module;
                if (selectedModule === "all") {
                    all.add(d);
                }
                else if (typeof m === "string" && m.trim() === selectedModule) {
                    all.add(d);
                }
            }
        }
        return Array.from(all).sort();
    }, [attendance, selectedModule]);
    //dropdown open states
    const [moduleOpen, setModuleOpen] = useState(false);
    const [dateOpen, setDateOpen] = useState(false);
    //options
    const moduleOptions = useMemo(() => modules.map((m) => ({
        value: m,
        label: m === "all" ? "All modules" : m,
    })), [modules]);
    const moduleLabel = useMemo(() => {
        return moduleOptions.find((o) => o.value === selectedModule)?.label ?? "All modules";
    }, [moduleOptions, selectedModule]);
    const dateOptions = useMemo(() => (availableDates?.slice().reverse() ?? []).map((d) => ({
        value: d,
        label: d,
    })), [availableDates]);
    const dateLabel = useMemo(() => {
        return dateOptions.find((o) => o.value === date)?.label ?? (dateOptions[0]?.label ?? "No dates");
    }, [dateOptions, date]);
    const methodOptions = useMemo(() => [
        { value: "Call", label: "Call" },
        { value: "WhatsApp", label: "WhatsApp" },
        { value: "Email", label: "Email" },
        { value: "Other", label: "Other" },
    ], []);
    const methodLabel = method ? method : "Select method...";
    const [methodOpen, setMethodOpen] = useState(false);
    useEffect(() => {
        setSelectedModule("all");
        setDate("");
        setQ("");
        setEvidenceTarget(null);
        setSavedMsg(null);
        resetEvidenceForm();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCoachId]);
    useEffect(() => {
        if (!availableDates.length) {
            setDate("");
            return;
        }
        const latest = availableDates[availableDates.length - 1];
        setDate((prev) => (prev && availableDates.includes(prev) ? prev : latest));
    }, [availableDates]);
    // Auto-dismiss saved message after a short time
    useEffect(() => {
        if (!savedMsg)
            return;
        const t = setTimeout(() => setSavedMsg(null), 3000);
        return () => clearTimeout(t);
    }, [savedMsg]);
    const moduleName = useMemo(() => {
        if (selectedModule !== "all")
            return selectedModule;
        if (!date)
            return "";
        for (const dates of Object.values(attendance)) {
            const m = dates?.[date]?.module;
            if (typeof m === "string" && m.trim())
                return m.trim();
        }
        return "";
    }, [attendance, date, selectedModule]);
    const summary = useMemo(() => {
        if (!date)
            return { present: 0, absent: 0, unknown: 0 };
        let present = 0;
        let absent = 0;
        let unknown = 0;
        for (const dates of Object.values(attendance)) {
            const belongs = selectedModule === "all"
                ? true
                : Object.values(dates).some((c) => String(c?.module || "").trim() === selectedModule);
            if (!belongs)
                continue;
            const cell = dates?.[date];
            if (cell && selectedModule !== "all" && String(cell?.module || "").trim() !== selectedModule) {
                continue;
            }
            const v = num01(cell?.value);
            if (v === 1)
                present++;
            else if (v === 0)
                absent++;
            else
                unknown++;
        }
        return { present, absent, unknown };
    }, [attendance, date, selectedModule]);
    const absentRows = useMemo(() => {
        if (!date)
            return [];
        const rows = [];
        for (const [student, dates] of Object.entries(attendance)) {
            const belongs = selectedModule === "all"
                ? true
                : Object.values(dates).some((c) => String(c?.module || "").trim() === selectedModule);
            if (!belongs)
                continue;
            const cell = dates?.[date];
            if (cell && selectedModule !== "all" && String(cell?.module || "").trim() !== selectedModule) {
                continue;
            }
            const v = num01(cell?.value);
            if (v === 0)
                rows.push({ student, module: cell?.module ?? null });
        }
        const s = q.trim().toLowerCase();
        return rows
            .filter((r) => (s ? r.student.toLowerCase().includes(s) : true))
            .sort((a, b) => a.student.localeCompare(b.student));
    }, [attendance, date, q, selectedModule]);
    const unknownRows = useMemo(() => {
        if (!date)
            return [];
        const rows = [];
        for (const [student, dates] of Object.entries(attendance)) {
            const belongs = selectedModule === "all"
                ? true
                : Object.values(dates).some((c) => String(c?.module || "").trim() === selectedModule);
            if (!belongs)
                continue;
            const cell = dates?.[date];
            if (cell && selectedModule !== "all" && String(cell?.module || "").trim() !== selectedModule) {
                continue;
            }
            const v = num01(cell?.value);
            if (v === null)
                rows.push({ student, module: cell?.module ?? null });
        }
        const s = q.trim().toLowerCase();
        return rows
            .filter((r) => (s ? r.student.toLowerCase().includes(s) : true))
            .sort((a, b) => a.student.localeCompare(b.student));
    }, [attendance, date, q, selectedModule]);
    const handleSaveEvidence = async (student, rowModule) => {
        if (!selectedCoach || !date)
            return;
        if (!method)
            return alert("Please select method");
        if (!proofFile)
            return alert("Please upload a proof image");
        setSaving(true);
        setSavedMsg(null);
        try {
            const proofUrl = await uploadEvidenceImage(proofFile);
            const coachNameForTask = selectedCoach.case_owner;
            const moduleForTask = String(rowModule ?? moduleName ?? "");
            const text = [
                "Attendance follow-up",
                `Coach: ${coachNameForTask}`,
                `Student: ${student}`,
                `Date: ${date}`,
                moduleForTask ? `Module: ${moduleForTask}` : null,
                `Action: ${method}`,
                notes.trim() ? `Notes: ${notes.trim()}` : null,
            ]
                .filter(Boolean)
                .join(" | ");
            const evidence = {
                type: "attendance_followup",
                coach_id: selectedCoach.id,
                coach_name: coachNameForTask,
                student,
                date,
                module: moduleForTask || null,
                method,
                notes: notes.trim() || null,
                proof_url: proofUrl,
                proof_meta: {
                    name: proofFile.name,
                    mime: proofFile.type,
                    size: proofFile.size,
                },
                created_at: new Date().toISOString(),
            };
            await postTask(selectedCoach.id, { text, evidence });
            setSavedMsg("Saved Successfully ✅");
            setEvidenceTarget(null);
            resetEvidenceForm();
        }
        catch (e) {
            alert(e?.message || "Failed to save evidence");
        }
        finally {
            setSaving(false);
        }
    };
    // Monthly sessions props
    const studentsList = useMemo(() => {
        const raw = selectedCoach?.students;
        return Array.isArray(raw)
            ? raw.map((s) => ({
                id: String(s.ID ?? s.id ?? ""),
                fullName: String(s.FullName ?? s.fullName ?? "Unknown"),
                email: String(s.Email ?? s.email ?? ""),
            }))
            : [];
    }, [selectedCoach]);
    const meetingSubject = useMemo(() => {
        return (selectedCoach?.meeting_subject ?? null);
    }, [selectedCoach]);
    if (loading)
        return _jsx("div", { className: "text-sm text-[#241453]", children: "Loading attendance..." });
    return (_jsxs("div", { id: "report-area", className: "min-h-[calc(100vh-110px)] flex flex-col gap-4", children: [_jsx(TopHeader, { coaches: coaches, activeCoachId: selectedCoachId ?? "all", canSwitchCoach: canSwitchCoach, activePeriod: "7", onApplyFilters: (f) => {
                    const id = f.coach === "all" ? null : Number(f.coach);
                    setSelectedCoachId(Number.isFinite(id) ? id : null);
                }, onOpenSidebar: onOpenSidebar, userName: userName }), savedMsg && (_jsx("div", { className: "fixed right-6 top-24 z-50", children: _jsxs("div", { className: "flex items-center gap-3 bg-green-50 border border-green-100 text-green-700 px-4 py-2 rounded-lg shadow", children: [_jsx("div", { className: "text-sm", children: savedMsg }), _jsx("button", { type: "button", onClick: () => setSavedMsg(null), className: "text-green-700 opacity-80 hover:opacity-100", "aria-label": "Dismiss", children: "\u2715" })] }) })), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-12 gap-4 items-stretch flex-1 min-h-0", children: [isQA && (_jsxs("div", { className: "lg:col-span-4 xl:col-span-3 order-1 bg-white rounded-2xl shadow-sm p-3 flex flex-col min-h-0 overflow-hidden lg:h-[620px]", children: [_jsxs("div", { className: "flex items-center justify-between mb-2 shrink-0", children: [_jsx("h3", { className: "text-base font-semibold text-[#241453]", children: "Coaches" }), _jsx("span", { className: "text-xs text-[#442F73]", children: coaches.length })] }), _jsx("div", { className: "flex-1 min-h-0 overflow-y-auto custom-scroll pr-1", children: _jsx("div", { className: "min-h-0", children: _jsx(CoachesList, { coaches: coaches, activeCoachId: selectedCoachId, onSelect: (c) => setSelectedCoachId(c.id) }) }) })] })), _jsxs("div", { className: [
                            isQA ? "lg:col-span-8 xl:col-span-6 order-2" : "lg:col-span-12 xl:col-span-12",
                            "flex flex-col min-h-0",
                        ].join(" "), children: [_jsxs("div", { className: "bg-white rounded-2xl shadow-sm p-4 shrink-0 relative", children: [_jsxs("div", { className: "flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row", children: [_jsx("div", { className: "min-w-0", children: _jsxs("h2", { className: "text-lg font-semibold text-[#241453] truncate whitespace-nowrap", children: ["Attendance", selectedCoach ? ` — ${selectedCoach.case_owner}` : ""] }) }), _jsxs("div", { className: "w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 min-w-0", children: [_jsx("div", { className: "lg:col-span-6 min-w-0", children: _jsx(CustomSelect, { value: selectedModule, label: moduleLabel, open: moduleOpen, setOpen: (v) => {
                                                                setModuleOpen(v);
                                                                if (v)
                                                                    setDateOpen(false);
                                                            }, options: moduleOptions, disabled: modules.length <= 1, onChange: (val) => {
                                                                setSelectedModule(val);
                                                                setSavedMsg(null);
                                                                setEvidenceTarget(null);
                                                                resetEvidenceForm();
                                                            } }) }), _jsx("div", { className: "lg:col-span-3 min-w-0", children: _jsx(CustomSelect, { value: date, label: dateLabel, open: dateOpen, setOpen: (v) => {
                                                                setDateOpen(v);
                                                                if (v)
                                                                    setModuleOpen(false);
                                                            }, options: dateOptions, disabled: !availableDates.length, onChange: (val) => {
                                                                setDate(val);
                                                                setSavedMsg(null);
                                                                setEvidenceTarget(null);
                                                                resetEvidenceForm();
                                                            } }) }), _jsx("input", { value: q, onChange: (e) => setQ(e.target.value), placeholder: "Search student...", className: "w-full lg:col-span-3 min-w-0 border rounded-lg px-3 py-2 text-sm" })] })] }), error && (_jsx("div", { className: "mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2", children: error })), !!moduleName && (_jsxs("div", { className: "mt-3 text-xs text-[#442F73] bg-[#F9F5FF] border border-[#E9E2F7] rounded-lg px-3 py-2", children: [_jsx("span", { className: "font-medium", children: "Module:" }), " ", moduleName] })), _jsxs("div", { className: "mt-3 grid grid-cols-3 gap-2", children: [_jsxs("div", { className: "rounded-xl bg-gray-50 border px-3 py-2", children: [_jsx("div", { className: "text-xs text-gray-500", children: "Present" }), _jsx("div", { className: "text-lg font-semibold text-gray-800", children: summary.present })] }), _jsxs("div", { className: "rounded-xl bg-red-50 border border-red-100 px-3 py-2", children: [_jsx("div", { className: "text-xs text-red-700", children: "Absent" }), _jsx("div", { className: "text-lg font-semibold text-red-700", children: summary.absent })] }), _jsxs("div", { className: "rounded-xl bg-amber-50 border border-amber-100 px-3 py-2", children: [_jsx("div", { className: "text-xs text-amber-700", children: "Unknown" }), _jsx("div", { className: "text-lg font-semibold text-amber-700", children: summary.unknown })] })] })] }), _jsxs("div", { className: [
                                    "mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch min-h-0",
                                    "lg:h-[410px]",
                                ].join(" "), children: [_jsxs("div", { className: "lg:col-span-4 bg-white rounded-2xl shadow-sm p-4 flex flex-col min-h-0 h-full", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 pb-3 border-b border-[#F1ECFF] shrink-0", children: [_jsx("h3", { className: "text-sm font-semibold text-[#241453]", children: "Absent students" }), _jsx("span", { className: "text-xs text-[#442F73] bg-[#F9F5FF] border border-[#E9E2F7] px-2 py-0.5 rounded-full", children: absentRows.length })] }), !date ? (_jsx("div", { className: "flex-1 min-h-0 flex items-center justify-center text-sm text-gray-400", children: "Pick a date." })) : absentRows.length === 0 ? (_jsx("div", { className: "flex-1 min-h-0 flex items-center justify-center text-sm text-gray-400", children: "No absences." })) : (_jsx("div", { className: "mt-3 space-y-2 flex-1 min-h-0 overflow-y-auto custom-scroll pr-1", children: absentRows.map((r) => {
                                                    const active = evidenceTarget?.student === r.student && evidenceTarget?.kind === "absent";
                                                    return (_jsxs("div", { className: [
                                                            "border rounded-xl px-3 py-2.5 transition",
                                                            "flex items-center justify-between gap-3",
                                                            active
                                                                ? "border-[#B27715] bg-[#fff9f0]"
                                                                : "border-gray-100 hover:border-[#E9E2F7]",
                                                        ].join(" "), children: [_jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-sm font-medium text-gray-800 truncate", children: r.student }), r.module && (_jsx("div", { className: "text-xs text-gray-500 mt-0.5 truncate", children: r.module }))] }), _jsx("button", { type: "button", onClick: () => {
                                                                    setSavedMsg(null);
                                                                    resetEvidenceForm();
                                                                    setEvidenceTarget({
                                                                        student: r.student,
                                                                        module: r.module ?? null,
                                                                        kind: "absent",
                                                                    });
                                                                }, className: [
                                                                    "shrink-0 h-9 px-3 rounded-lg text-xs font-medium transition border whitespace-nowrap",
                                                                    active
                                                                        ? "bg-gradient-to-r from-[#B27715] via-[#CEA869] to-[#E3C07F] text-white border-transparent"
                                                                        : "bg-white text-[#B27715] border-[#E9E2F7] hover:bg-[#F9F5FF]",
                                                                ].join(" "), children: "Add evidence" })] }, r.student));
                                                }) }))] }), _jsxs("div", { className: "lg:col-span-4 bg-white rounded-2xl shadow-sm p-4 flex flex-col min-h-0 h-full", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 pb-3 border-b border-[#F1ECFF] shrink-0", children: [_jsx("h3", { className: "text-sm font-semibold text-[#241453]", children: "Unknown students" }), _jsx("span", { className: "text-xs text-[#442F73] bg-[#F9F5FF] border border-[#E9E2F7] px-2 py-0.5 rounded-full", children: unknownRows.length })] }), !date ? (_jsx("div", { className: "flex-1 min-h-0 flex items-center justify-center text-sm text-gray-400", children: "Pick a date." })) : unknownRows.length === 0 ? (_jsx("div", { className: "flex-1 min-h-0 flex items-center justify-center text-sm text-gray-400", children: "No unknowns." })) : (_jsx("div", { className: "mt-3 space-y-2 flex-1 min-h-0 overflow-y-auto custom-scroll pr-1", children: unknownRows.map((r) => {
                                                    const active = evidenceTarget?.student === r.student && evidenceTarget?.kind === "unknown";
                                                    return (_jsxs("div", { className: [
                                                            "border rounded-xl px-3 py-2.5 transition",
                                                            "flex items-center justify-between gap-3",
                                                            active
                                                                ? "border-[#B27715] bg-[#fff9f0]"
                                                                : "border-gray-100 hover:border-[#E9E2F7]",
                                                        ].join(" "), children: [_jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-sm font-medium text-gray-800 truncate", children: r.student }), _jsx("div", { className: "text-xs text-amber-700 mt-0.5", children: "No attendance record for this date" }), r.module && (_jsx("div", { className: "text-xs text-gray-500 mt-0.5 truncate", children: r.module }))] }), _jsx("button", { type: "button", onClick: () => {
                                                                    setSavedMsg(null);
                                                                    resetEvidenceForm();
                                                                    setEvidenceTarget({
                                                                        student: r.student,
                                                                        module: r.module ?? null,
                                                                        kind: "unknown",
                                                                    });
                                                                }, className: [
                                                                    "shrink-0 h-9 px-3 rounded-lg text-xs font-medium transition border whitespace-nowrap",
                                                                    active
                                                                        ? "bg-gradient-to-r from-[#B27715] via-[#CEA869] to-[#E3C07F] text-white border-transparent"
                                                                        : "bg-white text-[#B27715] border-[#E9E2F7] hover:bg-[#F9F5FF]",
                                                                ].join(" "), children: "Add evidence" })] }, r.student));
                                                }) }))] }), _jsxs("div", { className: "lg:col-span-4 bg-white rounded-2xl shadow-sm p-4 flex flex-col min-h-0 h-full", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 pb-3 border-b border-[#F1ECFF] shrink-0", children: [_jsx("h3", { className: "text-sm font-semibold text-[#241453]", children: "Add evidence" }), evidenceTarget ? (_jsx("button", { type: "button", onClick: () => {
                                                            setEvidenceTarget(null);
                                                            resetEvidenceForm();
                                                        }, className: "text-xs px-3 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50", children: "Clear" })) : null] }), !evidenceTarget ? (_jsxs("div", { className: "flex-1 min-h-0 flex items-center justify-center text-sm text-gray-400 px-6 text-center", children: ["Select a student from ", _jsx("span", { className: "font-medium mx-1", children: "Absent" }), " or", _jsx("span", { className: "font-medium mx-1", children: "Unknown" }), " to add evidence."] })) : (_jsxs("div", { className: "mt-3 border rounded-xl p-3 flex-1 min-h-0 flex flex-col overflow-y-auto custom-scroll", children: [_jsxs("div", { className: "mb-3", children: [_jsx("div", { className: "text-sm font-semibold text-[#241453] truncate", children: evidenceTarget.student }), _jsxs("div", { className: "text-xs text-gray-500 mt-1", children: [_jsx("span", { className: "font-medium", children: "Date:" }), " ", date || "—", evidenceTarget.module || moduleName ? (_jsxs(_Fragment, { children: [" ", _jsx("span", { className: "text-gray-300", children: "\u2022" }), " ", _jsx("span", { className: "font-medium", children: "Module:" }), " ", String(evidenceTarget.module ?? moduleName)] })) : null, " ", _jsx("span", { className: "text-gray-300", children: "\u2022" }), " ", _jsx("span", { className: "font-medium", children: "Type:" }), " ", evidenceTarget.kind === "absent" ? "Absent" : "Unknown"] })] }), _jsx("label", { className: "text-xs font-medium text-gray-700", children: "Method" }), _jsx("label", { className: "text-xs text-[#644D93] mb-1 block", children: "Method" }), _jsx(CustomSelect, { value: method, label: methodLabel, open: methodOpen, setOpen: setMethodOpen, options: methodOptions, onChange: (val) => setMethod(val) }), _jsx("label", { className: "mt-3 text-xs font-medium text-gray-700", children: "Notes (optional)" }), _jsx("textarea", { value: notes, onChange: (e) => setNotes(e.target.value), rows: 4, placeholder: "Add any notes...", className: "mt-1 w-full border rounded-lg px-3 py-2 text-sm resize-none" }), _jsx("label", { className: "mt-3 text-xs font-medium text-gray-700", children: "Proof image" }), _jsxs("div", { className: "mt-1 flex items-center gap-2", children: [_jsxs("label", { className: "h-10 inline-flex items-center justify-center px-3 rounded-xl border border-[#E9E2F7]\r\n               bg-white text-sm text-[#241453] cursor-pointer hover:bg-[#F9F5FF] transition", children: ["Choose file", _jsx("input", { type: "file", accept: "image/*", onChange: (e) => setProofFile(e.target.files?.[0] ?? null), className: "hidden" })] }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "text-sm text-gray-700 truncate", children: proofFile ? proofFile.name : "No file chosen" }), proofFile ? (_jsxs("div", { className: "text-xs text-gray-400", children: [Math.round(proofFile.size / 1024), " KB"] })) : null] })] }), proofFile ? (_jsxs("div", { className: "mt-2 text-xs text-gray-600", children: ["Selected: ", _jsx("span", { className: "font-medium", children: proofFile.name }), " ", _jsxs("span", { className: "text-gray-400", children: ["(", Math.round(proofFile.size / 1024), " KB)"] })] })) : (_jsx("div", { className: "mt-2 text-xs text-gray-400", children: "No file selected." })), _jsxs("div", { className: "mt-4 flex gap-2", children: [_jsx("button", { type: "button", onClick: () => handleSaveEvidence(evidenceTarget.student, evidenceTarget.module ?? null), disabled: !canSaveEvidence || !date, className: [
                                                                    "h-10 px-4 rounded-lg text-sm font-medium transition w-full",
                                                                    !canSaveEvidence || !date
                                                                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                                        : "bg-gradient-to-r from-[#B27715] via-[#CEA869] to-[#E3C07F] text-white",
                                                                ].join(" "), children: saving ? "Saving..." : "Save evidence" }), _jsx("button", { type: "button", onClick: () => {
                                                                    resetEvidenceForm();
                                                                    setEvidenceTarget(null);
                                                                }, className: "h-10 px-4 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50", children: "Cancel" })] }), !date && (_jsx("div", { className: "mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2", children: "Please select a date first." })), !method && (_jsx("div", { className: "mt-2 text-xs text-gray-400", children: "Tip: pick a method to enable saving." }))] }))] })] })] }), isQA && selectedCoach && (_jsx("div", { className: "lg:col-span-12 xl:col-span-3 order-3 min-h-0 lg:h-[620px] overflow-hidden", children: _jsx("div", { className: "h-full min-h-0 overflow-y-auto custom-scroll", children: _jsx(AttendanceTasksPanel, { coachId: selectedCoach.id, viewerRole: "qa" }) }) }))] }), _jsx("div", { className: "mt-4", children: selectedCoach && (_jsx(MonthlySessionsWithLearners, { students: studentsList, meetingSubject: meetingSubject })) })] }));
}
