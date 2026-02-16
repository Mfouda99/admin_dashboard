import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
const dateKeyToday = () => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`; // YYYY-MM-DD
};
export default function Calendar({ meetingsByDate = {} }) {
    const today = new Date();
    const todayKey = useMemo(() => dateKeyToday(), []);
    const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const meetingsByDateFuture = useMemo(() => {
        const out = {};
        for (const [k, v] of Object.entries(meetingsByDate || {})) {
            if (k >= todayKey)
                out[k] = Array.isArray(v) ? v : [];
        }
        return out;
    }, [meetingsByDate, todayKey]);
    const highlightedDays = useMemo(() => {
        return new Set(Object.keys(meetingsByDateFuture)
            .map((d) => new Date(`${d}T00:00:00`))
            .filter((d) => d.getMonth() === month && d.getFullYear() === year)
            .map((d) => d.getDate()));
    }, [meetingsByDateFuture, month, year]);
    const formatDateKey = (year, month, day) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    return (_jsxs("div", { className: "w-full ", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("button", { onClick: prevMonth, className: "w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition", children: "\u2039" }), _jsxs("p", { className: "text-sm font-semibold text-gray-800", children: [currentDate.toLocaleString("default", { month: "long" }), " ", year] }), _jsx("button", { onClick: nextMonth, className: "w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition", children: "\u203A" })] }), _jsx("div", { className: "grid grid-cols-7 gap-2 text-center text-xs text-gray-400 mb-3", children: ["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (_jsx("span", { children: day }, `${day}-${index}`))) }), _jsxs("div", { className: "grid grid-cols-7 gap-2 text-sm", children: [Array.from({ length: firstDayIndex }).map((_, i) => (_jsx("div", { className: "h-9" }, `empty-${i}`))), Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateKey = formatDateKey(year, month, day);
                        const meetingsForDay = Array.isArray(meetingsByDateFuture[dateKey])
                            ? meetingsByDateFuture[dateKey]
                            : [];
                        const isHighlighted = meetingsForDay.length > 0;
                        const isToday = day === today.getDate() &&
                            month === today.getMonth() &&
                            year === today.getFullYear();
                        return (_jsxs("div", { className: "relative group h-9 flex items-center justify-center", children: [_jsx("div", { className: `
                  w-9 h-9 flex items-center justify-center rounded-full cursor-pointer
                  transition
                  ${isHighlighted
                                        ? "bg-gradient-to-r from-[#b27715] to-[#cea769] text-white font-semibold shadow-sm"
                                        : isToday
                                            ? "border border-[#B27715] text-[#241453] font-medium"
                                            : "text-[#241453] hover:bg-gray-100"}
                `, children: day }), meetingsForDay.length > 0 && (_jsx("div", { className: "\r\n                    absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2\r\n                    hidden group-hover:block\r\n                    bg-[#241453] text-white text-xs rounded-md px-3 py-2\r\n                    shadow-lg whitespace-nowrap\r\n                  ", children: meetingsForDay.map((m, idx) => (_jsxs("div", { className: "mb-1 last:mb-0", children: [_jsx("span", { className: "font-medium", children: typeof m.customerName === "string" ? m.customerName : "Unknown student" }), _jsxs("span", { className: "text-gray-300", children: [" ", "(", String(m.timeFrom ?? "--"), "\u2013", String(m.timeTo ?? "--"), ")"] })] }, idx))) }))] }, day));
                    })] })] }));
}
