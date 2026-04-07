import { ReadinessGauge } from "@/components/dashboard/ReadinessGauge";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { NextWorkout } from "@/components/dashboard/NextWorkout";
import { Activity } from "lucide-react";

export default function Dashboard() {
  const readinessValue: number | null = null;
  const metrics: Array<{ title: string; value: number | null; trend: "up" | "down" | "stable"; status: "good" | "warning" | "critical"; subtitle?: string }> = [
    { title: "Peitoral", value: null, trend: "stable", status: "good" },
    { title: "Quadríceps", value: null, trend: "stable", status: "good" },
    { title: "Posterior de Coxa", value: null, trend: "stable", status: "warning" },
    { title: "Sistema Nervoso Central", value: null, trend: "stable", status: "warning" },
  ];
  const nextWorkout = {
    title: "",
    statusLabel: "",
    target: "",
    duration: "",
    exercises: [],
  };

  return (
    <div className="p-5 space-y-4 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-wide uppercase">Estado Atual</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono tracking-wider">COCKPIT DE PERFORMANCE — aguardando dados</p>
        </div>
        <div className="flex items-center gap-2 surface-2 rounded-sm px-3 py-1.5 border border-border">
          <Activity className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] text-secondary-foreground font-mono tracking-wide">Semana — / Bloco —</span>
        </div>
      </div>

      {/* Readiness + Metrics Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Readiness */}
        <div className="col-span-4 surface-2 rounded-sm border border-border p-5 panel-shadow flex flex-col items-center justify-center">
          {readinessValue !== null ? (
            <ReadinessGauge value={readinessValue} />
          ) : (
            <ReadinessGauge value={null} />
          )}
        </div>

        {/* Metric Cards */}
        <div className="col-span-8 grid grid-cols-2 gap-3">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.title}
              title={metric.title}
              value={metric.value}
              trend={metric.trend}
              status={metric.status}
              subtitle={metric.subtitle}
            />
          ))}
        </div>
      </div>

      {/* Next Workout */}
      <NextWorkout workout={nextWorkout} />
    </div>
  );
}
