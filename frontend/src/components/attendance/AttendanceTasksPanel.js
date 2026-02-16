import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
function authHeaders(extra) {
    const token = localStorage.getItem("token");
    return {
        ...(extra ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}
async function fetchCoachTasks(coachId) {
    const res = await fetch(`/tasks-api/coaches/${coachId}/tasks`, {
        headers: authHeaders(),
    });
    if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Failed to load tasks (${res.status})`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
}
// PATCH reviewed flag 
async function patchTaskReviewed(coachId, taskId, reviewed) {
    const res = await fetch(`/tasks-api/coaches/${coachId}/tasks/${taskId}/`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
            evidence: { reviewed },
        }),
    });
    const text = await res.text().catch(() => "");
    if (!res.ok)
        throw new Error(text || `Update failed (${res.status})`);
    try {
        return text ? JSON.parse(text) : null;
    }
    catch {
        return text;
    }
}
//DELETE task 
async function deleteTask(coachId, taskId) {
    const res = await fetch(`/tasks-api/coaches/${coachId}/tasks/${taskId}/`, {
        method: "DELETE",
        headers: authHeaders(),
    });
    const text = await res.text().catch(() => "");
    if (!res.ok)
        throw new Error(text || `Delete failed (${res.status})`);
    return true;
}
function safeText(v) {
    return typeof v === "string" ? v : v == null ? "" : String(v);
}
export default function AttendanceTasksPanel({ coachId, viewerRole = "qa" }) {
    // QA-only
    if (viewerRole !== "qa")
        return null;
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const [q, setQ] = useState("");
    // per-item loading states
    const [busyId, setBusyId] = useState(null);
    useEffect(() => {
        if (!coachId || !Number.isFinite(coachId))
            return;
        let cancelled = false;
        const run = async () => {
            setLoading(true);
            setErr(null);
            try {
                const data = await fetchCoachTasks(coachId);
                if (!cancelled)
                    setTasks(data);
            }
            catch (e) {
                if (!cancelled)
                    setErr(e?.message || "Failed to load evidence");
            }
            finally {
                if (!cancelled)
                    setLoading(false);
            }
        };
        run();
        return () => {
            cancelled = true;
        };
    }, [coachId]);
    const API_ORIGIN = import.meta?.env?.VITE_API_ORIGIN || "http://127.0.0.1:8000";
    const toAbsoluteUrl = (u) => {
        if (!u)
            return "";
        if (u.startsWith("http://") || u.startsWith("https://"))
            return u;
        if (u.startsWith("/"))
            return `${API_ORIGIN}${u}`;
        return `${API_ORIGIN}/${u}`;
    };
    const evidenceItems = useMemo(() => {
        const only = tasks
            .filter((t) => t?.evidence && t.evidence?.type === "attendance_followup")
            .map((t) => {
            const ev = t.evidence ?? {};
            return {
                taskId: safeText(t.id),
                createdAt: safeText(ev.created_at || t.created_at),
                coachName: safeText(ev.coach_name),
                student: safeText(ev.student),
                date: safeText(ev.date),
                module: safeText(ev.module),
                method: safeText(ev.method),
                notes: safeText(ev.notes),
                proofUrl: safeText(ev.proof_url),
                reviewed: !!(ev.reviewed ?? ev.reviewed_by_qa ?? false),
            };
        })
            .filter((x) => !!x.taskId);
        const s = q.trim().toLowerCase();
        if (!s)
            return only;
        return only.filter((x) => {
            return (x.student.toLowerCase().includes(s) ||
                x.date.toLowerCase().includes(s) ||
                x.module.toLowerCase().includes(s) ||
                x.method.toLowerCase().includes(s) ||
                x.coachName.toLowerCase().includes(s));
        });
    }, [tasks, q]);
    async function toggleReviewed(taskId, next) {
        if (!taskId)
            return;
        setErr(null);
        // optimistic UI
        const prev = tasks;
        setTasks((old) => old.map((t) => {
            if (safeText(t.id) !== taskId)
                return t;
            const ev = { ...(t.evidence ?? {}), reviewed: next };
            return { ...t, evidence: ev };
        }));
        try {
            setBusyId(taskId);
            await patchTaskReviewed(coachId, taskId, next);
        }
        catch (e) {
            setTasks(prev); // rollback
            setErr(e?.message || "Failed to update");
        }
        finally {
            setBusyId(null);
        }
    }
    async function removeTask(taskId) {
        if (!taskId)
            return;
        // confirm 
        const ok = window.confirm("Delete this evidence item?");
        if (!ok)
            return;
        setErr(null);
        // optimistic remove
        const prev = tasks;
        setTasks((old) => old.filter((t) => safeText(t.id) !== taskId));
        try {
            setBusyId(taskId);
            await deleteTask(coachId, taskId);
        }
        catch (e) {
            setTasks(prev); // rollback
            setErr(e?.message || "Failed to delete");
        }
        finally {
            setBusyId(null);
        }
    }
    return (_jsxs("div", { className: "bg-white rounded-2xl shadow-sm p-4 h-full min-h-0 flex flex-col", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("h3", { className: "text-base font-semibold text-[#241453]", children: "Evidence (Attendance)" }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Showing attendance follow-up evidence saved into Tasks" })] }), _jsx("span", { className: "text-xs text-gray-500 shrink-0", children: evidenceItems.length })] }), _jsx("div", { className: "mt-3", children: _jsx("input", { value: q, onChange: (e) => setQ(e.target.value), placeholder: "Search evidence...", className: "w-full border rounded-lg px-3 py-2 text-sm" }) }), loading && _jsx("div", { className: "text-sm text-gray-500 mt-3", children: "Loading evidence..." }), !loading && err && (_jsx("div", { className: "mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2", children: err })), !loading && !err && evidenceItems.length === 0 && (_jsx("div", { className: "text-sm text-gray-400 mt-3", children: "No evidence found." })), !loading && evidenceItems.length > 0 && (_jsx("div", { className: "mt-3 space-y-2 flex-1 min-h-0 overflow-y-auto custom-scroll pr-1", children: evidenceItems.map((x) => {
                    const isBusy = busyId === x.taskId;
                    return (_jsxs("div", { className: "border rounded-xl p-3", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsx("div", { className: "min-w-0", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsxs("label", { className: "mt-0.5 flex items-center gap-2 text-xs text-gray-600 select-none", children: [_jsx("input", { type: "checkbox", checked: x.reviewed, disabled: isBusy, onChange: (e) => toggleReviewed(x.taskId, e.target.checked) }), "Reviewed"] }), _jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "text-sm font-medium text-gray-800 truncate", children: [x.student || "Unknown student", " ", _jsx("span", { className: "text-gray-400 font-normal", children: "\u2014" }), " ", _jsx("span", { className: "text-gray-700", children: x.date || "No date" })] }), _jsxs("div", { className: "text-xs text-gray-500 mt-1", children: [x.module ? `Module: ${x.module} • ` : "", x.method ? `Method: ${x.method}` : "Method: —"] }), !!x.coachName && (_jsxs("div", { className: "text-xs text-gray-500 mt-1", children: ["Coach: ", x.coachName] })), !!x.notes && (_jsxs("div", { className: "text-xs text-gray-600 mt-2 whitespace-pre-wrap", children: ["Notes: ", x.notes] })), !!x.createdAt && (_jsxs("div", { className: "text-[11px] text-gray-400 mt-2", children: ["Created: ", x.createdAt] }))] })] }) }), _jsxs("div", { className: "shrink-0 flex items-center gap-3", children: [x.proofUrl ? (_jsx("a", { href: toAbsoluteUrl(x.proofUrl), target: "_blank", rel: "noreferrer", className: "text-xs font-medium text-blue-600 hover:underline", children: "View proof" })) : (_jsx("span", { className: "text-xs text-gray-400", children: "No proof" })), _jsx("button", { type: "button", onClick: () => removeTask(x.taskId), disabled: isBusy, className: "w-8 h-8 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-red-600 transition disabled:opacity-60", title: "Delete", children: "\u2715" })] })] }), isBusy && _jsx("div", { className: "mt-2 text-[11px] text-gray-400", children: "Updating..." })] }, x.taskId));
                }) }))] }));
}
