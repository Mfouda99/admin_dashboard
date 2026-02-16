import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Props = {
  data: {
    submitted: number;
    accepted: number;
    referred: number;
    total: number;
  };
};

const COLOR_MAP: Record<string, string> = {
  Submitted: "#B27715",
  Accepted: "#aaaaaa",
  Referred: "#D6A5E6",
  Total: "#866CB6",
};

export default function EvidencePieChart({ data }: Props) {
  const chartData = [
    { key: "Submitted", value: data.submitted },
    { key: "Accepted", value: data.accepted },
    { key: "Referred", value: data.referred },
    { key: "Total", value: data.total },
  ];

  return (
    <div className="w-full">
      <div className="h-[240px]">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={chartData.filter(d => d.value > 0)}
              dataKey="value"
              nameKey="key"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
            >
              {chartData.map(
                (item) =>
                  item.value > 0 && (
                    <Cell
                      key={item.key}
                      fill={COLOR_MAP[item.key]}
                    />
                  )
              )}
            </Pie>

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0];
                return (
                  <div className="bg-[#241453] text-white text-xs px-3 py-2 rounded-lg shadow">
                    <div className="font-medium">{item.name}</div>
                    <div>{item.value} evidences</div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4">
        {chartData.map(item => (
          <div
            key={item.key}
            className="flex items-center gap-2 text-xs text-gray-600"
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLOR_MAP[item.key] }}
            />
            <span>{item.key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
