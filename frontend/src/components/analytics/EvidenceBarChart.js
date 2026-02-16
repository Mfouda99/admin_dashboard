import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, } from "recharts";
const COLOR_MAP = {
    Submitted: "#B27715",
    Accepted: "#aaaaaa",
    Referred: "#D6A5E6",
    Total: "#866CB6",
};
export default function EvidencePieChart({ data }) {
    const chartData = [
        { key: "Submitted", value: data.submitted },
        { key: "Accepted", value: data.accepted },
        { key: "Referred", value: data.referred },
        { key: "Total", value: data.total },
    ];
    return (_jsxs("div", { className: "w-full", children: [_jsx("div", { className: "h-[240px]", children: _jsx(ResponsiveContainer, { children: _jsxs(PieChart, { children: [_jsx(Pie, { data: chartData.filter(d => d.value > 0), dataKey: "value", nameKey: "key", innerRadius: 60, outerRadius: 90, paddingAngle: 4, children: chartData.map((item) => item.value > 0 && (_jsx(Cell, { fill: COLOR_MAP[item.key] }, item.key))) }), _jsx(Tooltip, { content: ({ active, payload }) => {
                                    if (!active || !payload?.length)
                                        return null;
                                    const item = payload[0];
                                    return (_jsxs("div", { className: "bg-[#241453] text-white text-xs px-3 py-2 rounded-lg shadow", children: [_jsx("div", { className: "font-medium", children: item.name }), _jsxs("div", { children: [item.value, " evidences"] })] }));
                                } })] }) }) }), _jsx("div", { className: "flex justify-center gap-6 mt-4", children: chartData.map(item => (_jsxs("div", { className: "flex items-center gap-2 text-xs text-gray-600", children: [_jsx("span", { className: "w-3 h-3 rounded-full", style: { backgroundColor: COLOR_MAP[item.key] } }), _jsx("span", { children: item.key })] }, item.key))) })] }));
}
