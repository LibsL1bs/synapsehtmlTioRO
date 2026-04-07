interface ReadinessGaugeProps {
  value: number | null; // 0-100, null when no data
  label?: string;
}

export function ReadinessGauge({ value, label = "Readiness" }: ReadinessGaugeProps) {
  const normalized = Math.max(0, Math.min(100, value ?? 0));
  const color = "var(--alert)";
  const readinessLevel = normalized < 60 ? "low" : normalized < 75 ? "medium" : "high";
  const readinessDotColor = readinessLevel === "low" ? "hsl(var(--alert))" : readinessLevel === "medium" ? "hsl(var(--warning))" : "hsl(var(--muted-foreground))";
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (normalized / 100) * circumference;

  // Generate tick marks
  const ticks = [];
  for (let i = 0; i <= 20; i++) {
    const angle = (i / 20) * 360 - 90;
    const rad = (angle * Math.PI) / 180;
    const isMajor = i % 5 === 0;
    const innerR = isMajor ? 44 : 46;
    const outerR = 49;
    ticks.push({
      x1: 60 + innerR * Math.cos(rad),
      y1: 60 + innerR * Math.sin(rad),
      x2: 60 + outerR * Math.cos(rad),
      y2: 60 + outerR * Math.sin(rad),
      isMajor,
      label: isMajor ? (i / 20) * 100 : null,
      labelX: 60 + 38 * Math.cos(rad),
      labelY: 60 + 38 * Math.sin(rad),
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-40 h-40">
        <svg className="w-full h-full" viewBox="0 0 120 120">
          {/* Track */}
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke="hsl(var(--gauge-track))"
            strokeWidth="6"
            className="-rotate-90 origin-center"
          />
          {/* Fill arc */}
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke={`hsl(${color})`}
            strokeWidth="6"
            strokeLinecap="butt"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="-rotate-90 origin-center transition-all duration-1000 ease-out"
          />
          {/* Tick marks */}
          {ticks.map((t, i) => (
            <g key={i}>
              <line
                x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                stroke={t.isMajor ? "hsl(var(--muted-foreground))" : "hsl(var(--border))"}
                strokeWidth={t.isMajor ? 1.2 : 0.6}
              />
              {t.label !== null && (
                <text
                  x={t.labelX} y={t.labelY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="hsl(var(--muted-foreground))"
                  fontSize="5.5"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {t.label}
                </text>
              )}
            </g>
          ))}
          {/* Outer ring */}
          <circle
            cx="60" cy="60" r="58"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="0.5"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {value !== null && (
            <>
              <span className="text-3xl font-bold text-foreground font-mono leading-none">{value}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">%</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: readinessDotColor }} />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest font-mono">{label}</span>
      </div>
    </div>
  );
}
