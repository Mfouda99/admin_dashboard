import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, } from "recharts";
const ratingPillClass = (rating) => {
    const s = String(rating ?? "").toLowerCase();
    if (s.includes("excellent"))
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s.includes("good"))
        return "bg-violet-50 text-violet-700 border-violet-200";
    if (s.includes("needs attention"))
        return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-gray-50 text-gray-700 border-gray-200";
};
export default function TrackEvidencesChart({ data, ratingLabel }) {
    return (_jsxs("div", { className: "relative h-[220px]", children: [_jsx("div", { className: "absolute right-2 z-10", children: _jsx("span", { className: [
                        "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border",
                        ratingPillClass(ratingLabel),
                    ].join(" "), children: ratingLabel && ratingLabel !== "—" ? ratingLabel : "No rating" }) }), _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(RadarChart, { data: data, children: [_jsx(PolarGrid, {}), _jsx(PolarAngleAxis, { dataKey: "metric", tick: { fontSize: 12 } }), _jsx(PolarRadiusAxis, { domain: [0, 100], tick: { fontSize: 10 } }), _jsx(Tooltip, { content: ({ active, payload }) => {
                                if (!active || !payload?.length)
                                    return null;
                                const p = payload[0]?.payload;
                                return (_jsxs("div", { className: "bg-[#241453] text-white text-xs rounded-md px-3 py-2 shadow-lg", children: [_jsxs("div", { className: "flex justify-between gap-3", children: [_jsx("span", { children: p.metric }), _jsx("span", { className: "font-semibold", children: Math.round(p.value) })] }), typeof p.raw === "number" && p.metric === "Upcoming" && (_jsxs("div", { className: "text-gray-200 mt-1", children: ["No. of meetings: ", _jsx("span", { className: "font-semibold", children: p.raw })] }))] }));
                            } }), _jsx(Radar, { dataKey: "value", stroke: "#866CB6", fill: "#A88CD9", fillOpacity: 0.35, isAnimationActive: false })] }) })] }));
}
