import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
export default function CoachesList({ coaches, activeCoachId, onSelect, onViewStudents, }) {
    // ✅ 1) ref للـ li اللي active
    const activeRef = useRef(null);
    // ✅ 2) أول ما الـ activeCoachId يتغير، اسحب عليه
    useEffect(() => {
        activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, [activeCoachId]);
    return (_jsx("div", { children: _jsx("ul", { className: "space-y-1", children: coaches.map((coach) => {
                const isActive = activeCoachId != null && String(activeCoachId) === String(coach.id);
                return (_jsxs("li", { ref: isActive ? activeRef : null, className: [
                        "group flex items-center justify-between gap-3",
                        "px-3 py-2 rounded-xl border",
                        "transition",
                        isActive
                            ? "bg-violet-50 border-violet-50"
                            : "bg-white border-transparent hover:border-[#F1F1F1] hover:bg-[#F1F1F1]",
                    ].join(" "), children: [_jsx("button", { type: "button", onClick: () => onSelect(coach), className: [
                                "min-w-0 flex-1 text-left",
                                "text-sm truncate",
                                isActive ? "text-[#442F73] font-semibold" : "text-gray-700",
                            ].join(" "), title: coach.case_owner, children: coach.case_owner }), onViewStudents && (_jsx("button", { type: "button", onClick: (e) => {
                                e.stopPropagation();
                                onViewStudents(coach);
                            }, className: [
                                "shrink-0 inline-flex items-center gap-2",
                                "h-8 px-3 rounded-lg",
                                "text-xs font-medium ",
                                "bg-[#A88CD9]",
                                "border-[#A88CD9]",
                                isActive
                                    ? "bg-gradient-to-r from-[#b27615c5] via-[#CEA869] to-[#E3C07F] text-white border-[#CEA869] hover:from-[#9D6912] hover:via-[#B27715] hover:to-[#CEA869]"
                                    : "bg-[#ececec] text-[#B27715] border-[#F3E9DA] hover:bg-gradient-to-r hover:from-[#B27715] hover:via-[#CEA869] hover:to-[#E3C07F] hover:text-white",
                                "transition active:scale-[0.98]",
                                "focus:outline-none focus:ring-2 focus:ring-[#B27715]/50 rounded-lg",
                                // show on hover only
                                isActive
                                    ? "opacity-100 pointer-events-auto"
                                    : "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity",
                            ].join(" "), children: _jsx("span", { children: "Students" }) }))] }, coach.id));
            }) }) }));
}
