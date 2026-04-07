import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";

const progressionData: Array<{ semana: string; squat?: number; bench?: number; deadlift?: number }> = [];

const consistencyData: Array<{ semana: string; aderencia?: number }> = [];

const stats = [
  { label: "Squat PR", value: "--", unit: "kg", delta: "" },
  { label: "Bench PR", value: "--", unit: "kg", delta: "" },
  { label: "Deadlift PR", value: "--", unit: "kg", delta: "" },
  { label: "Aderência", value: "--", unit: "%", delta: "" },
];

const tooltipStyle = {
  contentStyle: {
    background: "hsl(240, 5%, 8%)",
    border: "1px solid hsl(240, 4%, 20%)",
    borderRadius: "2px",
    fontSize: "11px",
    fontFamily: "JetBrains Mono, monospace",
    color: "hsl(240, 5%, 90%)",
  },
};

export default function Metricas() {
  return (
    <div className="p-5 space-y-4 max-w-5xl mx-auto animate-fade-in">
      <div className="pb-3 border-b border-border">
        <h1 className="text-lg font-bold text-foreground uppercase tracking-wide">Métricas</h1>
        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono tracking-wider">PROGRESSÃO E HISTÓRICO DE PERFORMANCE</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="surface-2 rounded-sm border border-border p-3 panel-shadow">
            <span className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-mono">{s.label}</span>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-2xl font-bold text-foreground font-mono leading-none">{s.value}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{s.unit}</span>
            </div>
            <div className="tech-divider my-2" />
            <span className="text-[10px] text-muted-foreground font-mono">{s.delta}</span>
          </div>
        ))}
      </div>

      {/* Progression Chart */}
      <div className="surface-2 rounded-sm border border-border p-4 panel-shadow">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] font-mono">Progressão — Big 3</h3>
          <span className="text-[10px] text-muted-foreground font-mono">S1–S8</span>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={progressionData}>
            <CartesianGrid strokeDasharray="2 4" stroke="hsl(240, 4%, 14%)" />
            <XAxis dataKey="semana" tick={{ fill: "hsl(240, 4%, 48%)", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={{ stroke: "hsl(240, 4%, 20%)" }} tickLine={{ stroke: "hsl(240, 4%, 20%)" }} />
            <YAxis tick={{ fill: "hsl(240, 4%, 48%)", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={{ stroke: "hsl(240, 4%, 20%)" }} tickLine={{ stroke: "hsl(240, 4%, 20%)" }} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 10, fontFamily: "JetBrains Mono", color: "hsl(240, 4%, 48%)" }} />
            <ReferenceLine y={160} stroke="hsl(240, 4%, 20%)" strokeDasharray="4 4" label={{ value: "Target", fill: "hsl(240, 4%, 35%)", fontSize: 9, fontFamily: "JetBrains Mono" }} />
            <Line type="monotone" dataKey="squat" stroke="hsl(240, 5%, 90%)" strokeWidth={1.5} dot={{ r: 2, fill: "hsl(240, 5%, 90%)" }} name="Squat" />
            <Line type="monotone" dataKey="bench" stroke="hsl(240, 4%, 55%)" strokeWidth={1.5} dot={{ r: 2, fill: "hsl(240, 4%, 55%)" }} name="Bench" />
            <Line type="monotone" dataKey="deadlift" stroke="hsl(142, 71%, 45%)" strokeWidth={1.5} dot={{ r: 2, fill: "hsl(142, 71%, 45%)" }} name="Deadlift" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Consistency Chart */}
      <div className="surface-2 rounded-sm border border-border p-4 panel-shadow">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] font-mono">Aderência Semanal</h3>
          <span className="text-[10px] text-muted-foreground font-mono">Meta: 100%</span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={consistencyData}>
            <CartesianGrid strokeDasharray="2 4" stroke="hsl(240, 4%, 14%)" />
            <XAxis dataKey="semana" tick={{ fill: "hsl(240, 4%, 48%)", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={{ stroke: "hsl(240, 4%, 20%)" }} tickLine={{ stroke: "hsl(240, 4%, 20%)" }} />
            <YAxis tick={{ fill: "hsl(240, 4%, 48%)", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={{ stroke: "hsl(240, 4%, 20%)" }} tickLine={{ stroke: "hsl(240, 4%, 20%)" }} domain={[0, 100]} />
            <Tooltip {...tooltipStyle} />
            <ReferenceLine y={85} stroke="hsl(0, 72%, 51%)" strokeDasharray="4 4" strokeWidth={0.8} label={{ value: "Mín.", fill: "hsl(0, 72%, 51%)", fontSize: 9, fontFamily: "JetBrains Mono" }} />
            <Line type="monotone" dataKey="aderencia" stroke="hsl(38, 92%, 50%)" strokeWidth={1.5} dot={{ r: 2, fill: "hsl(38, 92%, 50%)" }} name="Aderência %" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
