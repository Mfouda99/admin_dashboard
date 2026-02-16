import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
/** ✅ Auth header helper (JWT) */
function authHeaders(extra) {
    const token = localStorage.getItem("token");
    return {
        ...(extra ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}
/** ✅ JSON fetch wrapper with auth + safe body parsing */
async function http(url, opts) {
    const res = await fetch(url, {
        ...opts,
        headers: authHeaders({
            "Content-Type": "application/json",
            ...opts?.headers,
        }),
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
        throw new Error(text || `Request failed (${res.status})`);
    }
    if (res.status === 204)
        return undefined;
    try {
        return (text ? JSON.parse(text) : undefined);
    }
    catch {
        return text;
    }
}
/** ✅ Attendance task even if no proof */
function isAttendanceTask(t) {
    const ev = t?.evidence;
    const isAttendanceType = String(ev?.type || "") === "attendance_followup";
    const textLooksAttendance = String(t?.text || "")
        .toLowerCase()
        .includes("attendance follow-up");
    return isAttendanceType || textLooksAttendance;
}
/** ✅ Django origin (local) or production origin */
const API_ORIGIN = import.meta.env?.VITE_API_ORIGIN?.toString().trim() ||
    "http://127.0.0.1:5055";
function toAbsoluteUrlMaybe(url) {
    if (!url)
        return "";
    if (/^https?:\/\//i.test(url))
        return url; // already absolute
    const path = url.startsWith("/") ? url : `/${url}`;
    return `${API_ORIGIN}${path}`;
}
export default function TodoList({ coachId, viewerRole = "coach" }) {
    const [todos, setTodos] = useState([]);
    const [title, setTitle] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState(null);
    // ✅ if not QA/Admin hide Attendance tasks
    const shouldHideAttendance = viewerRole !== "qa" && viewerRole !== "admin";
    // ✅ Add trailing slashes (important for Django/DRF)
    const LIST_URL = `/tasks-api/coaches/${coachId}/tasks/`;
    const DETAIL_URL = (taskId) => `/tasks-api/coaches/${coachId}/tasks/${taskId}/`;
    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setErr(null);
            try {
                const data = await http(LIST_URL);
                const arr = Array.isArray(data) ? data : [];
                const filtered = shouldHideAttendance
                    ? arr.filter((t) => !isAttendanceTask(t))
                    : arr;
                if (!cancelled)
                    setTodos(filtered);
            }
            catch (e) {
                if (!cancelled)
                    setErr(e?.message || "Failed to load tasks");
            }
            finally {
                if (!cancelled)
                    setLoading(false);
            }
        }
        if (coachId)
            load();
        return () => {
            cancelled = true;
        };
    }, [coachId, shouldHideAttendance, LIST_URL]);
    // ✅ pendingCount for visible tasks only (after filtering)
    const pendingCount = useMemo(() => todos.filter((t) => !t.done).length, [todos]);
    const addTask = async () => {
        const text = title.trim();
        if (!text)
            return;
        setSaving(true);
        setErr(null);
        try {
            const created = await http(LIST_URL, {
                method: "POST",
                body: JSON.stringify({ text }),
            });
            // ✅ if role coach and created task looks attendance for any reason → hide it
            if (!shouldHideAttendance || !isAttendanceTask(created)) {
                setTodos((prev) => [created, ...prev]);
            }
            setTitle("");
        }
        catch (e) {
            setErr(e?.message || "Failed to add task");
        }
        finally {
            setSaving(false);
        }
    };
    const toggleTask = async (task) => {
        const nextDone = !task.done;
        // optimistic
        setTodos((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: nextDone } : t)));
        try {
            await http(DETAIL_URL(task.id), {
                method: "PATCH",
                body: JSON.stringify({ done: nextDone }),
            });
        }
        catch (e) {
            // rollback
            setTodos((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: task.done } : t)));
            setErr(e?.message || "Failed to update task");
        }
    };
    const deleteTask = async (taskId) => {
        const snapshot = todos;
        setTodos((prev) => prev.filter((t) => t.id !== taskId));
        try {
            await http(DETAIL_URL(taskId), { method: "DELETE" });
        }
        catch (e) {
            setTodos(snapshot);
            setErr(e?.message || "Failed to delete task");
        }
    };
    const onEnter = (e) => {
        if (e.key === "Enter")
            addTask();
    };
    return (_jsxs("div", { className: "flex flex-col h-full", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h3", { className: "text-lg font-bold text-[#442F73]", children: "Today's Tasks" }), _jsxs("span", { className: "text-xs bg-gray-100 px-2 py-1 rounded-full", children: ["Pending ", pendingCount] })] }), err && (_jsx("div", { className: "mb-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2", children: err })), _jsx("div", { className: "flex-1 min-h-0 max-h-[200px] overflow-y-auto custom-scroll", children: loading ? (_jsx("div", { className: "text-sm text-gray-500", children: "Loading tasks..." })) : todos.length === 0 ? (_jsx("div", { className: "h-full flex items-center justify-center", children: _jsx("div", { className: "text-sm text-gray-400", children: "No tasks yet." }) })) : (_jsx("div", { className: "space-y-2", children: todos.map((todo) => {
                        const proofRaw = todo.evidence?.proof_url || "";
                        const proofUrl = proofRaw ? toAbsoluteUrlMaybe(proofRaw) : "";
                        const canViewProof = !!proofUrl;
                        return (_jsxs("div", { className: `p-3 rounded-lg flex items-center justify-between gap-3 ${todo.done ? "bg-gray-100" : "bg-[#F9F5FF]"}`, children: [_jsxs("div", { className: "min-w-0 flex items-center gap-3", children: [_jsx("input", { type: "checkbox", checked: todo.done, onChange: () => toggleTask(todo) }), _jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: `text-sm truncate ${todo.done ? "line-through text-gray-500" : "text-gray-800"}`, title: todo.text, children: todo.text }), canViewProof && (_jsxs("a", { href: proofUrl, target: "_blank", rel: "noreferrer", className: "inline-flex mt-1 text-xs text-[#B27715] hover:underline", title: "Open proof image", onClick: (e) => {
                                                        if (!proofUrl) {
                                                            e.preventDefault();
                                                            setErr("Proof URL is missing / invalid");
                                                        }
                                                    }, children: ["View proof", todo.evidence?.proof_meta?.name
                                                            ? ` — ${todo.evidence.proof_meta.name}`
                                                            : ""] }))] })] }), _jsx("button", { onClick: () => deleteTask(todo.id), className: "text-xs text-gray-500 hover:text-red-600 transition shrink-0", title: "Delete", children: "\u2715" })] }, todo.id));
                    }) })) }), _jsxs("div", { className: "mt-3 flex gap-2", children: [_jsx("input", { value: title, onChange: (e) => setTitle(e.target.value), onKeyDown: onEnter, placeholder: "New task...", className: "flex-1 border rounded-lg px-3 py-2 text-sm", disabled: saving }), _jsx("button", { onClick: addTask, disabled: saving, className: "px-4 rounded-lg bg-gradient-to-r from-[#cea769] to-[#b27715] text-white text-sm disabled:opacity-60", children: saving ? "Saving..." : "Add" })] })] }));
}
