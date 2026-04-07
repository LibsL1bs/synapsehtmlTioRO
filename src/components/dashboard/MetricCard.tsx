import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";

type MetricTrend = "up" | "down" | "stable";
type IndicatorTone = "default" | "darker";
type AlertLevel = "high" | "medium" | "low";

interface MetricIndicator {
  label: string;
  value: string;
  trend?: MetricTrend;
  tone?: IndicatorTone;
}

interface MetricCardProps {
  title: string;
  value?: number | null;
  unit?: string;
  trend: MetricTrend;
  status: "good" | "warning" | "critical";
  alertLevel?: AlertLevel;
  subtitle?: string;
  placeholder?: string;
  hideMainUnit?: boolean;
  indicators?: MetricIndicator[];
}

const indicatorTrendColor = (_trend?: MetricTrend): string => "text-alert";

const IndicatorTrendIcon = ({ trend }: { trend?: MetricTrend }) => {
  if (!trend) return null;

  const Icon = trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : ArrowRight;
  return <Icon className={`w-3 h-3 ${indicatorTrendColor(trend)}`} />;
};

export function MetricCard({
  title,
  value = null,
  unit = "%",
  trend,
  status,
  alertLevel = "high",
  subtitle,
  placeholder = "--",
  hideMainUnit = false,
  indicators = [],
}: MetricCardProps) {
  const statusColors = {
    good: "border-l-alert",
    warning: "border-l-alert",
    critical: "border-l-alert",
  };

  const alertDotColor = alertLevel === "low" ? "bg-alert" : alertLevel === "medium" ? "bg-warning" : "bg-muted-foreground";
  const alertLineColor = alertLevel === "low" ? "bg-alert/80" : alertLevel === "medium" ? "bg-warning/80" : "bg-muted-foreground/80";

  void trend;

  return (
    <div className={`surface-2 rounded-sm border border-border border-l-2 ${statusColors[status]} p-4 panel-shadow transition-all duration-150 hover:border-l-alert/60`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${alertDotColor}`} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em] font-mono">{title}</span>
        </div>
        <div className={`ml-2 h-px flex-1 ${alertLineColor}`} />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-foreground font-mono leading-none">{value ?? placeholder}</span>
        {!hideMainUnit && <span className="text-xs text-muted-foreground font-mono">{unit}</span>}
      </div>
      {indicators.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {indicators.map((indicator) => (
            <div key={`${indicator.label}-${indicator.value}`} className="flex items-center justify-between text-[11px] font-mono">
              <span className={indicator.tone === "darker" ? "text-secondary-foreground" : "text-muted-foreground"}>{indicator.label}</span>
              <div className="flex items-center gap-1.5">
                <span className={indicator.tone === "darker" ? "text-secondary-foreground" : "text-foreground"}>{indicator.value}</span>
                <IndicatorTrendIcon trend={indicator.trend} />
              </div>
            </div>
          ))}
        </div>
      )}
      {subtitle && (
        <>
          <div className="tech-divider my-2" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">{subtitle}</p>
        </>
      )}
    </div>
  );
}
