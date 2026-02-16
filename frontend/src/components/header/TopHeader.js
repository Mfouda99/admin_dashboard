import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import FilterDropdown from "./FilterDropdown";
export default function TopHeader({ coaches, onApplyFilters, activeCoachId, activePeriod, onOpenSidebar, students = [], onSelectStudent, userName = "User", onLogout, canSwitchCoach = true, }) {
    const [q, setQ] = useState("");
    const [listOpen, setListOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const searchWrapRef = useRef(null);
    const listRef = useRef(null);
    /* ================= Outside click closes search ================= */
    useEffect(() => {
        const onDown = (e) => {
            const el = searchWrapRef.current;
            if (!el)
                return;
            if (!el.contains(e.target)) {
                setListOpen(false);
                setActiveIndex(-1);
            }
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, []);
    /* ================= Filtered suggestions ================= */
    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s)
            return students.slice(0, 10);
        return students.filter((n) => n.toLowerCase().includes(s)).slice(0, 10);
    }, [q, students]);
    /* ================= Pick a student ================= */
    const pickStudent = useCallback((name) => {
        setQ(name);
        setListOpen(false);
        setActiveIndex(-1);
        onSelectStudent?.(name);
    }, [onSelectStudent]);
    /* ================= Keep activeIndex valid ================= */
    useEffect(() => {
        if (!listOpen) {
            setActiveIndex(-1);
            return;
        }
        if (filtered.length === 0) {
            setActiveIndex(-1);
            return;
        }
        setActiveIndex((i) => {
            if (i < 0)
                return -1;
            if (i >= filtered.length)
                return filtered.length - 1;
            return i;
        });
    }, [listOpen, filtered.length]);
    /* ================= Scroll active option into view ================= */
    useEffect(() => {
        if (!listOpen)
            return;
        if (activeIndex < 0)
            return;
        const container = listRef.current;
        if (!container)
            return;
        const el = container.querySelector(`[data-idx="${activeIndex}"]`);
        el?.scrollIntoView({ block: "nearest" });
    }, [activeIndex, listOpen]);
    /* ================= Keyboard navigation ================= */
    const onSearchKeyDown = (e) => {
        if (e.key === "Escape") {
            setListOpen(false);
            setActiveIndex(-1);
            return;
        }
        // Open list if closed and user navigates
        if (!listOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            setListOpen(true);
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!filtered.length)
                return;
            setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
            return;
        }
        if (e.key === "ArrowUp") {
            e.preventDefault();
            if (!filtered.length)
                return;
            setActiveIndex((i) => Math.max(i - 1, 0));
            return;
        }
        if (e.key === "Enter") {
            if (!listOpen)
                return;
            const name = filtered[activeIndex];
            if (typeof name === "string") {
                e.preventDefault();
                pickStudent(name);
            }
        }
    };
    /* ================= Avatar initials ================= */
    const initials = useMemo(() => {
        const parts = String(userName || "U")
            .trim()
            .split(/\s+/)
            .filter(Boolean);
        const first = parts[0]?.[0] ?? "U";
        const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
        return (first + last).toUpperCase();
    }, [userName]);
    /* ================= render ================= */
    return (_jsxs("header", { className: "\r\n        bg-white rounded-2xl shadow-sm\r\n        px-4 py-3\r\n        flex flex-col gap-3\r\n        sm:flex-row sm:items-center sm:justify-between\r\n      ", children: [_jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [onOpenSidebar && (_jsx("button", { type: "button", onClick: onOpenSidebar, className: "\r\n              xl:hidden\r\n              w-10 h-10 rounded-xl\r\n              border border-gray-200\r\n              hover:bg-gray-50 transition\r\n              flex items-center justify-center\r\n              text-[#442F73] bg-[#E4E4E4]\r\n            ", "aria-label": "Open sidebar", title: "Open sidebar", children: "\u2630" })), _jsx("div", { className: "\r\n            w-10 h-10 rounded-full\r\n            bg-[#A88CD9] text-white\r\n            flex items-center justify-center\r\n            font-semibold text-sm\r\n            shrink-0\r\n          ", title: userName, children: initials || "U" }), _jsxs("div", { className: "min-w-0", children: [_jsxs("h2", { className: "text-base sm:text-lg font-semibold text-[#241453] truncate", children: ["Welcome ", userName, "!"] }), !canSwitchCoach && (_jsx("div", { className: "text-[11px] text-gray-500 mt-0.5", children: "You can view only your own coach account" }))] })] }), _jsxs("div", { className: "flex items-center gap-2 md:gap-3 justify-between md:justify-end", children: [_jsxs("div", { ref: searchWrapRef, className: "relative w-full sm:w-[260px]", children: [_jsx("input", { value: q, onChange: (e) => {
                                    setQ(e.target.value);
                                    setListOpen(true);
                                    setActiveIndex(-1);
                                }, onFocus: () => setListOpen(true), onKeyDown: onSearchKeyDown, placeholder: "Search student...", className: "\r\n              w-full h-9 px-3\r\n              rounded-lg\r\n              border border-gray-200\r\n              text-sm\r\n              focus:outline-none focus:ring-2 focus:ring-[#A88CD9]\r\n            ", role: "combobox", "aria-expanded": listOpen, "aria-controls": "students-listbox", "aria-autocomplete": "list" }), listOpen && filtered.length > 0 && (_jsxs("div", { className: "\r\n                absolute z-50 mt-2 w-full\r\n                rounded-xl border border-gray-200\r\n                bg-white shadow-lg overflow-hidden custom-scroll\r\n              ", role: "listbox", id: "students-listbox", children: [_jsx("div", { ref: listRef, className: "max-h-56 overflow-auto", children: filtered.map((name, idx) => {
                                            const active = idx === activeIndex;
                                            return (_jsx("button", { type: "button", "data-idx": idx, onClick: () => pickStudent(name), onMouseEnter: () => setActiveIndex(idx), className: [
                                                    "w-full px-3 py-2 text-sm text-left transition text-gray-700",
                                                    active ? "bg-gray-100" : "hover:bg-gray-100",
                                                ].join(" "), role: "option", "aria-selected": active, children: _jsx("span", { className: "truncate block", children: name }) }, name));
                                        }) }), _jsxs("div", { className: "px-3 py-2 border-t text-[11px] text-gray-500 flex justify-between", children: [_jsxs("span", { children: [filtered.length, " results"] }), _jsx("button", { type: "button", onClick: () => {
                                                    setListOpen(false);
                                                    setActiveIndex(-1);
                                                }, className: "text-[#644D93] hover:underline", children: "Close" })] })] }))] }), _jsx(FilterDropdown, { coaches: coaches, disabled: !canSwitchCoach, onApply: (f) => {
                            setListOpen(false);
                            setActiveIndex(-1);
                            if (!canSwitchCoach)
                                return; //  safety
                            onApplyFilters(f);
                        }, activeCoachId: activeCoachId, activePeriod: activePeriod })] })] }));
}
