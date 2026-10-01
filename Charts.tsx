import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
  Cell,
} from "recharts";
import {
  type AppRecord,
  categoryStats,
  histogram,
  chartSample,
  format,
  compact,
} from "./analytics";

export function CategoryChart({
  apps,
  select,
}: {
  apps: AppRecord[];
  select: (category: string) => void;
}) {
  const categories = useMemo(() => categoryStats(apps).slice(0, 7), [apps]);
  return (
    <div className="category-chart">
      {categories.map((c, i) => (
        <button
          key={c.category}
          onClick={() => select(c.category)}
          aria-label={`Filter ${c.name}, ${format(c.count)} apps`}
        >
          <span className="rank">{String(i + 1).padStart(2, "0")}</span>
          <span className="category-bar">
            <span>
              {c.name}
              <b>{format(c.count)}</b>
            </span>
            <span className="bar-track">
              <span
                style={{ width: `${(c.count / categories[0].count) * 100}%` }}
              />
            </span>
          </span>
        </button>
      ))}
      {!categories.length && <EmptyChart />}
    </div>
  );
}
export function RatingChart({ apps }: { apps: AppRecord[] }) {
  const data = useMemo(() => histogram(apps), [apps]);
  if (!data.some((b) => b.count)) return <EmptyChart />;
  return (
    <div
      className="rating-chart"
      role="img"
      aria-label={`Rating distribution: ${data.map((b) => `${b.name}: ${b.count} apps`).join("; ")}`}
    >
      <ResponsiveContainer width="100%" height={245}>
        <BarChart
          data={data}
          margin={{ top: 12, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid vertical={false} stroke="#e3dccd" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#7a705e" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "#7a705e" }}
            tickFormatter={compact}
          />
          <Tooltip
            cursor={{ fill: "#efe8da" }}
            formatter={(v) => [format(Number(v)), "Apps"]}
            contentStyle={{ borderRadius: 10, border: "1px solid #d3c8b4" }}
          />
          <Bar
            dataKey="count"
            radius={[0, 0, 0, 0]}
            maxBarSize={52}
            isAnimationActive={false}
          >
            {data.map((b, i) => (
              <Cell key={b.name} fill={i === 3 ? "#c34323" : "#d5bea0"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function ReviewScatter({
  apps,
  inspect,
}: {
  apps: AppRecord[];
  inspect: (app: AppRecord) => void;
}) {
  const sample = useMemo(() => chartSample(apps), [apps]);
  return (
    <>
      <div
        className="scatter-chart"
        aria-label="Rating versus reviews. Records are also available in the Explorer table."
      >
        {!sample.total ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={275}>
            <ScatterChart
              margin={{ top: 15, right: 25, bottom: 20, left: -10 }}
            >
              <CartesianGrid stroke="#e3dccd" />
              <XAxis
                type="number"
                dataKey="logReviews"
                domain={[0, 8]}
                ticks={[0, 2, 4, 6, 8]}
                tickFormatter={(v) => compact(10 ** Number(v))}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "#7a705e" }}
                label={{
                  value: "Reviews · logarithmic scale",
                  position: "bottom",
                  offset: 0,
                  fontSize: 10,
                  fill: "#7a705e",
                }}
              />
              <YAxis
                type="number"
                dataKey="rating"
                domain={[1, 5]}
                ticks={[1, 2, 3, 4, 5]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "#7a705e" }}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  const a = payload?.[0]?.payload as AppRecord | undefined;
                  return active && a ? (
                    <div className="chart-tooltip">
                      <b>{a.name}</b>
                      <span>
                        {a.rating} / 5 · {format(a.reviews)} reviews
                      </span>
                      <small>Click to inspect</small>
                    </div>
                  ) : null;
                }}
              />
              <Scatter
                data={sample.points}
                isAnimationActive={false}
                onClick={(point) => {
                  const record = point.payload as AppRecord | undefined;
                  if (record && Number.isInteger(record.id)) inspect(record);
                }}
              >
                {sample.points.map((a) => (
                  <Cell
                    key={a.id}
                    fill={a.type === "Paid" ? "#536d91" : "#c34323"}
                    fillOpacity={0.55}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="chart-foot">
        <span>
          <i className="dot" /> Free <i className="dot paid" /> Paid
        </span>
        <span>
          {format(sample.points.length)} plotted / {format(sample.total)}{" "}
          eligible
        </span>
      </div>
      <p className="micro">
        Deterministic sample of up to 600 rated apps with positive reviews.
        Metrics use every filtered record.
      </p>
    </>
  );
}
function EmptyChart() {
  return <div className="empty-chart">No observations in this selection.</div>;
}
