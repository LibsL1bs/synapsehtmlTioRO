import { useEffect, useMemo, useState } from "react";
import { Activity } from "lucide-react";
import { ReadinessGauge } from "@/components/dashboard/ReadinessGauge";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { NextWorkout } from "@/components/dashboard/NextWorkout";
import { apiRequest } from "@/lib/apiClient";

type MetricTrend = "up" | "down" | "stable";
type MetricStatus = "good" | "warning" | "critical";
type AlertLevel = "high" | "medium" | "low";

type MetricIndicator = {
  label: string;
  value: string;
  trend?: MetricTrend;
  tone?: "default" | "darker";
};

type DashboardMetric = {
  title: string;
  value: number | null;
  trend: MetricTrend;
  status: MetricStatus;
  alertLevel?: AlertLevel;
  subtitle?: string;
  unit?: string;
  hideMainUnit?: boolean;
  placeholder?: string;
  indicators?: MetricIndicator[];
};

type DashboardStateResponse = {
  updated_at: string;
  readiness: number | null;
  semana: string | number;
  bloco: string | number;
  metrics: {
    alimentacao: {
      value: number | null;
      unit?: string;
      alertLevel?: AlertLevel;
      indicators?: MetricIndicator[];
    };
    sono: {
      value: number | null;
      unit?: string;
      alertLevel?: AlertLevel;
      indicators?: MetricIndicator[];
    };
    fadiga: {
      value: number | null;
      trend?: MetricTrend;
      status?: MetricStatus;
      alertLevel?: AlertLevel;
      subtitle?: string;
    };
    tendencia: {
      indicators?: MetricIndicator[];
      alertLevel?: AlertLevel;
    };
  };
  nextWorkout?: {
    title?: string;
    statusLabel?: string;
    target?: string;
    duration?: string;
    exercises?: Array<{ label: string }>;
  };
};

export default function Dashboard() {
  const [dashboardState, setDashboardState] = useState<DashboardStateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const loadDashboard = async () => {
      try {
        setIsLoading(true);

        const payload = await apiRequest<DashboardStateResponse>(
          "/dashboard/state",
          {
            signal: controller.signal,
            cache: "no-store",
          },
          {
            requireAuth: true,
          },
        );

        setDashboardState(payload);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setDashboardState(null);
      } finally {
        setIsLoading(false);
      }
    };

    void loadDashboard();
    return () => controller.abort();
  }, []);

  const metrics = useMemo<DashboardMetric[]>(() => {
    const alimentacao = dashboardState?.metrics?.alimentacao;
    const sono = dashboardState?.metrics?.sono;
    const fadiga = dashboardState?.metrics?.fadiga;
    const tendencia = dashboardState?.metrics?.tendencia;

    return [
      {
        title: "Alimentação",
        value: alimentacao?.value ?? null,
        unit: alimentacao?.unit || "kcal",
        trend: "stable",
        status: "good",
        alertLevel: alimentacao?.alertLevel || "high",
        indicators: alimentacao?.indicators || [],
      },
      {
        title: "Sono",
        value: sono?.value ?? null,
        unit: sono?.unit || "horas",
        trend: "stable",
        status: "good",
        alertLevel: sono?.alertLevel || "high",
        indicators: sono?.indicators || [],
      },
      {
        title: "Fadiga Neural Aproximada",
        value: fadiga?.value ?? null,
        trend: fadiga?.trend || "stable",
        status: fadiga?.status || "warning",
        alertLevel: fadiga?.alertLevel || "high",
        unit: "%",
        subtitle: fadiga?.subtitle,
      },
      {
        title: "Tendência de Progresso",
        value: null,
        trend: "stable",
        status: "warning",
        alertLevel: tendencia?.alertLevel || "medium",
        placeholder: "1RM",
        hideMainUnit: true,
        indicators: tendencia?.indicators || [],
      },
    ];
  }, [dashboardState]);

  const metricsByTitle = useMemo(() => new Map(metrics.map((metric) => [metric.title, metric])), [metrics]);

  const leftColumnMetrics = useMemo(
    () => [metricsByTitle.get("Sono"), metricsByTitle.get("Alimentação")].filter((metric): metric is DashboardMetric => Boolean(metric)),
    [metricsByTitle],
  );

  const rightColumnMetrics = useMemo(
    () => [metricsByTitle.get("Fadiga Neural Aproximada"), metricsByTitle.get("Tendência de Progresso")].filter((metric): metric is DashboardMetric => Boolean(metric)),
    [metricsByTitle],
  );

  const nextWorkout = {
    title: dashboardState?.nextWorkout?.title || "",
    statusLabel: dashboardState?.nextWorkout?.statusLabel || "",
    target: dashboardState?.nextWorkout?.target || "",
    duration: dashboardState?.nextWorkout?.duration || "",
    exercises: dashboardState?.nextWorkout?.exercises || [],
  };

  const weekText = String(dashboardState?.semana ?? "—");
  const blockText = String(dashboardState?.bloco ?? "—");

  const subtitleText = isLoading
    ? "COCKPIT DE PERFORMANCE — carregando dados"
    : dashboardState?.updated_at
      ? `COCKPIT DE PERFORMANCE — atualizado em ${new Date(dashboardState.updated_at).toLocaleString("pt-BR")}`
      : "COCKPIT DE PERFORMANCE — aguardando dados";

  return (
    <div className="p-5 space-y-4 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <h1 className="text-lg font-bold text-alert tracking-wide uppercase">Estado Atual</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono tracking-wider">{subtitleText}</p>
        </div>
        <div className="flex items-center gap-2 surface-2 rounded-sm px-3 py-1.5 border border-border">
          <Activity className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] text-secondary-foreground font-mono tracking-wide">Semana {weekText} / Bloco {blockText}</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-4 surface-2 rounded-sm border border-border p-5 panel-shadow flex flex-col items-center justify-center">
          <ReadinessGauge value={dashboardState?.readiness ?? null} />
        </div>

        <div className="col-span-8 flex items-start gap-3">
          <div className="w-1/2 space-y-3">
            {rightColumnMetrics.map((metric) => (
              <MetricCard
                key={metric.title}
                title={metric.title}
                value={metric.value}
                unit={metric.unit}
                trend={metric.trend}
                status={metric.status}
                alertLevel={metric.alertLevel}
                subtitle={metric.subtitle}
                hideMainUnit={metric.hideMainUnit}
                placeholder={metric.placeholder}
                indicators={metric.indicators}
              />
            ))}
          </div>
          <div className="w-1/2 space-y-3">
            {leftColumnMetrics.map((metric) => (
              <MetricCard
                key={metric.title}
                title={metric.title}
                value={metric.value}
                unit={metric.unit}
                trend={metric.trend}
                status={metric.status}
                alertLevel={metric.alertLevel}
                subtitle={metric.subtitle}
                hideMainUnit={metric.hideMainUnit}
                placeholder={metric.placeholder}
                indicators={metric.indicators}
              />
            ))}
          </div>
        </div>
      </div>

      <NextWorkout workout={nextWorkout} />
    </div>
  );
}
