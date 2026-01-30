import useMediaQuery from "@/helpers/useMediaQuery";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

type MonthlySessionsChartProps = {
  data: {
    name: string;
    completed: number;
    cancelled: number;
    upcomming: number;
  }[];
};

const short = (s: string, n = 14) => (s.length > n ? `${s.slice(0, n)}…` : s);

export default function MonthlySessionsChart({ data }: MonthlySessionsChartProps) {
  const isMobile = useMediaQuery("(max-width: 640px)");

  // vertical chart
  const rowH = 34;
  const chartH = Math.max(260, data.length * rowH);
  const cardH = 360; // fixed height for card container in mobile

  return (
    <div className="w-full">
      {/* Mobile: كارد ثابت + scroll داخلي */}
      <div className={isMobile ? `h-[${cardH}px] overflow-hidden` : "h-[320px]"}>
        <div className={isMobile ? "h-full overflow-y-auto pr-2 custom-scroll" : "h-full"}>
          <ResponsiveContainer width="100%" height={isMobile ? chartH : "100%"}>
            <BarChart
              data={data}
              layout={isMobile ? "vertical" : "horizontal"}
              margin={
                isMobile
                  ? { top: 18, right: 12, left: 5, bottom: 5 } // top legend
                  : { top: 12, right: 20, left: 8, bottom: 60 }
              }
              barCategoryGap={isMobile ? 12 : 18}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />

              {isMobile ? (
                <>
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    width={92}
                    tick={{ fontSize: 11 }}
                    tickMargin={6}
                    tickFormatter={(v) => short(String(v), 16)}
                  />
                </>
              ) : (
                <>
                  {/* Desktop axes */}
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    height={60}
                    tick={({ x, y, payload }: any) => {
                      const label = String(payload?.value ?? "");
                      const s = short(label, 14);
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text
                            x={0}
                            y={10}
                            dy={16}
                            textAnchor="end"
                            className="fill-gray-600 text-[11px]"
                            transform="rotate(-35)"
                          >
                            {s}
                          </text>
                        </g>
                      );
                    }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                </>
              )}

              {/* Legend: height + top margin */}
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                height={isMobile ? 52 : 28}
                wrapperStyle={{
                  paddingBottom: isMobile ? 10 : 6,
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "flex-end",  
                  width: "100%",
                  gap: 12,
                  rowGap: 8,
                }}
                formatter={(value) => String(value)}
              />

              <Tooltip
                isAnimationActive={false}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;

                  return (
                    <div className="bg-[#241453] text-white text-xs rounded-md px-3 py-2 shadow-lg">
                      <div className="font-semibold mb-1">{String(label)}</div>
                      {payload.map((item, idx) => (
                        <div key={idx} className="flex justify-between gap-6">
                          <span>{String(item.name)}:</span>
                          <span className="font-semibold">{String(item.value ?? "")}</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />

              <Bar dataKey="completed" fill="#866CB6" radius={[6, 6, 6, 6]} barSize={10} isAnimationActive={false} />
              <Bar dataKey="cancelled" fill="#B27715" radius={[6, 6, 6, 6]} barSize={10} isAnimationActive={false} />
              <Bar dataKey="upcomming" fill="#AAAAAA" radius={[6, 6, 6, 6]} barSize={10} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
