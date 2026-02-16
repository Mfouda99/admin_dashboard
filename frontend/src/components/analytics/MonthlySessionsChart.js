import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import useMediaQuery from "@/helpers/useMediaQuery";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, } from "recharts";
const short = (s, n = 14) => (s.length > n ? `${s.slice(0, n)}…` : s);
export default function MonthlySessionsChart({ data }) {
    const isMobile = useMediaQuery("(max-width: 640px)");
    // vertical chart
    const rowH = 34;
    const chartH = Math.max(260, data.length * rowH);
    const cardH = 360; // fixed height for card container in mobile
    return (_jsx("div", { className: "w-full", children: _jsx("div", { className: isMobile ? `h-[${cardH}px] overflow-hidden` : "h-[320px]", children: _jsx("div", { className: isMobile ? "h-full overflow-y-auto pr-2 custom-scroll" : "h-full", children: _jsx(ResponsiveContainer, { width: "100%", height: isMobile ? chartH : "100%", children: _jsxs(BarChart, { data: data, layout: isMobile ? "vertical" : "horizontal", margin: isMobile
                            ? { top: 18, right: 12, left: 5, bottom: 5 } // top legend
                            : { top: 12, right: 20, left: 8, bottom: 60 }, barCategoryGap: isMobile ? 12 : 18, barGap: 4, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", vertical: false, stroke: "#e5e7eb" }), isMobile ? (_jsxs(_Fragment, { children: [_jsx(XAxis, { type: "number", axisLine: false, tickLine: false, tick: { fontSize: 11 } }), _jsx(YAxis, { type: "category", dataKey: "name", axisLine: false, tickLine: false, width: 92, tick: { fontSize: 11 }, tickMargin: 6, tickFormatter: (v) => short(String(v), 16) })] })) : (_jsxs(_Fragment, { children: [_jsx(XAxis, { dataKey: "name", axisLine: false, tickLine: false, interval: 0, height: 60, tick: ({ x, y, payload }) => {
                                            const label = String(payload?.value ?? "");
                                            const s = short(label, 14);
                                            return (_jsx("g", { transform: `translate(${x},${y})`, children: _jsx("text", { x: 0, y: 10, dy: 16, textAnchor: "end", className: "fill-gray-600 text-[11px]", transform: "rotate(-35)", children: s }) }));
                                        } }), _jsx(YAxis, { axisLine: false, tickLine: false, tick: { fontSize: 11 } })] })), _jsx(Legend, { verticalAlign: "top", align: "right", iconType: "circle", height: isMobile ? 52 : 28, wrapperStyle: {
                                    paddingBottom: isMobile ? 10 : 6,
                                    display: "flex",
                                    flexWrap: "wrap",
                                    justifyContent: "flex-end",
                                    width: "100%",
                                    gap: 12,
                                    rowGap: 8,
                                }, formatter: (value) => String(value) }), _jsx(Tooltip, { isAnimationActive: false, content: ({ active, payload, label }) => {
                                    if (!active || !payload?.length)
                                        return null;
                                    return (_jsxs("div", { className: "bg-[#241453] text-white text-xs rounded-md px-3 py-2 shadow-lg", children: [_jsx("div", { className: "font-semibold mb-1", children: String(label) }), payload.map((item, idx) => (_jsxs("div", { className: "flex justify-between gap-6", children: [_jsxs("span", { children: [String(item.name), ":"] }), _jsx("span", { className: "font-semibold", children: String(item.value ?? "") })] }, idx)))] }));
                                } }), _jsx(Bar, { dataKey: "completed", fill: "#866CB6", radius: [6, 6, 6, 6], barSize: 10, isAnimationActive: false }), _jsx(Bar, { dataKey: "cancelled", fill: "#B27715", radius: [6, 6, 6, 6], barSize: 10, isAnimationActive: false }), _jsx(Bar, { dataKey: "upcomming", fill: "#AAAAAA", radius: [6, 6, 6, 6], barSize: 10, isAnimationActive: false })] }) }) }) }) }));
}
