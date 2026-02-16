import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
/* ================= COMPONENT ================= */
export default function FilterDropdown({ coaches, onApply, activeCoachId = "all", activePeriod = "7", disabled = false, // ✅ NEW
 }) {
    const [open, setOpen] = useState(false);
    const [filters, setFilters] = useState({
        coach: "all",
        period: "7",
    });
    // dropdowns state
    const [coachOpen, setCoachOpen] = useState(false);
    const [periodOpen, setPeriodOpen] = useState(false);
    const wrapRef = useRef(null);
    /* ================= sync from parent ================= */
    useEffect(() => {
        setFilters({
            coach: activeCoachId === "all" || activeCoachId == null
                ? "all"
                : String(activeCoachId),
            period: activePeriod || "7",
        });
    }, [activeCoachId, activePeriod]);
    /* ================= close handlers ================= */
    // close on outside click
    useEffect(() => {
        const onDown = (e) => {
            if (!wrapRef.current)
                return;
            const t = e.target;
            if (!wrapRef.current.contains(t)) {
                setOpen(false);
                setCoachOpen(false);
                setPeriodOpen(false);
            }
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, []);
    // ESC to close
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") {
                setOpen(false);
                setCoachOpen(false);
                setPeriodOpen(false);
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);
    // ✅ لو اتقفل (disabled) وإنتِ فاتحاه → اقفليه
    useEffect(() => {
        if (disabled) {
            setOpen(false);
            setCoachOpen(false);
            setPeriodOpen(false);
        }
    }, [disabled]);
    /* ================= options ================= */
    const coachOptions = useMemo(() => {
        return [
            { value: "all", label: "All Coaches" },
            ...coaches.map((c) => ({ value: String(c.id), label: c.case_owner })),
        ];
    }, [coaches]);
    const periodOptions = useMemo(() => [
        { value: "7", label: "Last 7 Days" },
        { value: "30", label: "Last Month" },
        { value: "90", label: "Last 3 Months" },
        { value: "180", label: "Last 6 Months" },
        { value: "365", label: "Last Year" },
    ], []);
    const coachLabel = coachOptions.find((o) => o.value === filters.coach)?.label ?? "All Coaches";
    const periodLabel = periodOptions.find((o) => o.value === filters.period)?.label ?? "Last 7 Days";
    /* ================= actions ================= */
    const closeAll = () => {
        setOpen(false);
        setCoachOpen(false);
        setPeriodOpen(false);
    };
    const handleClear = () => {
        if (disabled)
            return;
        const next = { coach: "all", period: "7" };
        setFilters(next);
        onApply?.(next); // ✅ يرجّع الداتا فورًا
        closeAll();
    };
    const handleApply = () => {
        if (disabled)
            return;
        onApply?.(filters);
        closeAll();
    };
    /* ================= render ================= */
    return (_jsxs("div", { className: "relative", ref: wrapRef, children: [_jsxs("button", { type: "button", disabled: disabled, onClick: () => {
                    if (disabled)
                        return;
                    setOpen((v) => !v);
                    setCoachOpen(false);
                    setPeriodOpen(false);
                }, className: [
                    `
          flex items-center gap-2
          px-3 h-9
          rounded-lg
          border border-[#644D93]
          text-[#644D93] text-sm font-medium
          transition
        `,
                    disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-[#A88CD9]/10",
                ].join(" "), title: disabled ? "Not allowed for this role" : "Filter", children: [_jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", strokeWidth: "2", viewBox: "0 0 24 24", children: _jsx("path", { d: "M3 4h18M6 10h12M10 16h4" }) }), "Filter"] }), open && !disabled && (_jsxs("div", { className: "\r\n            absolute right-0 mt-2 w-[320px]\r\n            bg-white rounded-xl shadow-lg\r\n            border border-gray-200\r\n            p-4 z-50\r\n          ", children: [_jsxs("div", { className: "mb-3 custom-scroll", children: [_jsx("label", { className: "text-xs text-[#644D93] mb-1 block", children: "Coach" }), _jsx(CustomSelect, { value: filters.coach, label: coachLabel, open: coachOpen, setOpen: (v) => {
                                    setCoachOpen(v);
                                    if (v)
                                        setPeriodOpen(false);
                                }, options: coachOptions, onChange: (val) => setFilters((p) => ({ ...p, coach: val })) })] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "text-xs text-[#644D93] mb-1 block", children: "Time Period" }), _jsx(CustomSelect, { value: filters.period, label: periodLabel, open: periodOpen, setOpen: (v) => {
                                    setPeriodOpen(v);
                                    if (v)
                                        setCoachOpen(false);
                                }, options: periodOptions, onChange: (val) => setFilters((p) => ({ ...p, period: val })) })] }), _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("button", { type: "button", onClick: handleClear, className: "text-sm text-[#644D93] hover:underline", children: "Clear" }), _jsx("button", { type: "button", onClick: handleApply, className: "\r\n                px-4 py-2\r\n                bg-[#644D93]\r\n                text-white text-sm\r\n                rounded-lg\r\n                hover:bg-[#442F73]\r\n                transition\r\n              ", children: "Apply" })] })] }))] }));
}
/* ================= Custom Select ================= */
function CustomSelect({ value, label, open, setOpen, options, onChange, }) {
    return (_jsxs("div", { className: "relative", children: [_jsxs("button", { type: "button", onClick: () => setOpen(!open), className: "\r\n          w-full h-9 px-3\r\n          border border-gray-200\r\n          rounded-lg\r\n          text-sm text-left\r\n          bg-white\r\n          focus:outline-none focus:ring-2 focus:ring-[#A88CD9]\r\n          flex items-center justify-between\r\n        ", children: [_jsx("span", { className: "truncate", children: label }), _jsx("svg", { className: `w-4 h-4 transition ${open ? "rotate-180" : ""}`, viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z", clipRule: "evenodd" }) })] }), open && (_jsx("div", { className: "\r\n            absolute z-50 mt-2 w-full\r\n            rounded-xl border border-gray-200\r\n            bg-white shadow-lg\r\n            overflow-hidden\r\n          ", children: _jsx("div", { className: "max-h-56 overflow-auto", children: options.map((opt) => {
                        const active = opt.value === value;
                        return (_jsxs("button", { type: "button", onClick: () => {
                                onChange(opt.value);
                                setOpen(false);
                            }, className: `
                    w-full px-3 py-2 text-sm text-left
                    flex items-center justify-between
                    transition
                    ${active
                                ? "bg-gray-100 text-gray-900"
                                : "text-gray-700 hover:bg-gray-100"}
                  `, children: [_jsx("span", { className: "truncate", children: opt.label }), active && _jsx("span", { className: "text-xs text-[#644D93]", children: "Selected" })] }, opt.value));
                    }) }) }))] }));
}
