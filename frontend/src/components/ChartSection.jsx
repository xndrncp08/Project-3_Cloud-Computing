// src/components/ChartSection.jsx
import {
  BarChart, Bar, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, ResponsiveContainer, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend
} from "recharts";
import styles from "./ChartSection.module.css";

const PALETTE = [
  "#5b6ef5", "#3ecf8e", "#f5a623", "#f25f5c",
  "#a78bfa", "#34d399", "#fbbf24", "#fb7185",
  "#60a5fa", "#a3e635",
];

const TOOLTIP_STYLE = {
  backgroundColor: "#1a1d28",
  border: "1px solid #252836",
  borderRadius: "8px",
  color: "#e8eaf0",
  fontSize: "0.8rem",
  fontFamily: "'DM Sans', sans-serif",
};

const AXIS_STYLE = { fill: "#5a5f7a", fontSize: 11, fontFamily: "'DM Sans', sans-serif" };

export default function ChartSection({ chartData, loading }) {
  if (loading) {
    return (
      <div className={styles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.skeletonTitle} />
            </div>
            <div className={styles.skeletonChart} />
          </div>
        ))}
      </div>
    );
  }

  if (!chartData) return null;

  const { dietDistribution, avgCaloriesByDiet, avgMacros, topCuisines } = chartData;

  return (
    <div className={styles.grid}>

      {/* Chart 1: Diet Distribution — Pie */}
      <div className={`${styles.card} fade-up`} style={{ animationDelay: "0.05s" }}>
        <div className={styles.cardHeader}>
          <h3 className={styles.chartTitle}>Diet Distribution</h3>
          <span className={styles.chartSub}>Recipes per category</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={dietDistribution}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={3}
              stroke="none"
            >
              {dietDistribution.map((entry, i) => (
                <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(val, name) => [`${val} recipes`, name]}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span style={{ color: "#8b90a8", fontSize: "0.75rem" }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2: Avg Calories by Diet — Horizontal Bar */}
      <div className={`${styles.card} fade-up`} style={{ animationDelay: "0.1s" }}>
        <div className={styles.cardHeader}>
          <h3 className={styles.chartTitle}>Avg Calories by Diet</h3>
          <span className={styles.chartSub}>Mean caloric value per type</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={avgCaloriesByDiet.slice(0, 8)}
            layout="vertical"
            margin={{ left: 8, right: 20, top: 4, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#252836" horizontal={false} />
            <XAxis
              type="number"
              tick={AXIS_STYLE}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={AXIS_STYLE}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(val) => [`${val} kcal`, "Avg Calories"]}
            />
            <Bar dataKey="avgCalories" radius={[0, 4, 4, 0]}>
              {avgCaloriesByDiet.slice(0, 8).map((entry, i) => (
                <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 3: Avg Macros — Radar */}
      <div className={`${styles.card} fade-up`} style={{ animationDelay: "0.15s" }}>
        <div className={styles.cardHeader}>
          <h3 className={styles.chartTitle}>Average Macros</h3>
          <span className={styles.chartSub}>Protein / Carbs / Fat (g)</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart
            data={[
              { macro: "Protein", value: avgMacros.protein },
              { macro: "Carbs", value: avgMacros.carbs },
              { macro: "Fat", value: avgMacros.fat },
            ]}
          >
            <PolarGrid stroke="#252836" />
            <PolarAngleAxis dataKey="macro" tick={AXIS_STYLE} />
            <Radar
              dataKey="value"
              stroke="#5b6ef5"
              fill="#5b6ef5"
              fillOpacity={0.25}
              strokeWidth={2}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(val) => [`${val}g`, "Average"]}
            />
          </RadarChart>
        </ResponsiveContainer>

        {/* Macro breakdown pills */}
        <div className={styles.macroPills}>
          <div className={styles.macroPill} style={{ "--pill-color": "#5b6ef5" }}>
            <span className={styles.macroLabel}>Protein</span>
            <span className={styles.macroVal}>{avgMacros.protein}g</span>
          </div>
          <div className={styles.macroPill} style={{ "--pill-color": "#3ecf8e" }}>
            <span className={styles.macroLabel}>Carbs</span>
            <span className={styles.macroVal}>{avgMacros.carbs}g</span>
          </div>
          <div className={styles.macroPill} style={{ "--pill-color": "#f5a623" }}>
            <span className={styles.macroLabel}>Fat</span>
            <span className={styles.macroVal}>{avgMacros.fat}g</span>
          </div>
        </div>
      </div>

      {/* Chart 4: Top Cuisines — Vertical Bar */}
      <div className={`${styles.card} fade-up`} style={{ animationDelay: "0.2s" }}>
        <div className={styles.cardHeader}>
          <h3 className={styles.chartTitle}>Top Cuisines</h3>
          <span className={styles.chartSub}>Most represented cuisine types</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={topCuisines.slice(0, 8)}
            margin={{ left: 0, right: 8, top: 4, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#252836" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ ...AXIS_STYLE, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              angle={-30}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tick={AXIS_STYLE}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(val) => [`${val} recipes`, "Count"]}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {topCuisines.slice(0, 8).map((entry, i) => (
                <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
