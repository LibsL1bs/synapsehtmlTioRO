import { useState } from "react";

interface DashboardMetric {
  title: string;
  value: number | null;
  trend: "up" | "down" | "stable";
  status: "good" | "warning" | "critical";
  subtitle: string;
}

interface WorkoutExercise {
  name: string;
  sets: string;
  reps: string;
  rpe: string;
}

interface StatItem {
  label: string;
  value: string;
  unit: string;
  delta: string;
}

const trendOptions: Array<"up" | "down" | "stable"> = ["up", "down", "stable"];
const statusOptions: Array<"good" | "warning" | "critical"> = ["good", "warning", "critical"];

export default function AdminDados() {
  // --- Dashboard: Readiness ---
  const [readiness, setReadiness] = useState<string>("");

  // --- Dashboard: Metric Cards ---
  const [metrics, setMetrics] = useState<DashboardMetric[]>([
    { title: "Peitoral", value: null, trend: "stable", status: "good", subtitle: "" },
    { title: "Quadríceps", value: null, trend: "stable", status: "good", subtitle: "" },
    { title: "Posterior de Coxa", value: null, trend: "stable", status: "warning", subtitle: "" },
    { title: "Sistema Nervoso Central", value: null, trend: "stable", status: "warning", subtitle: "" },
  ]);

  // --- Dashboard: Next Workout ---
  const [workoutTitle, setWorkoutTitle] = useState("");
  const [workoutStatus, setWorkoutStatus] = useState("");
  const [workoutTarget, setWorkoutTarget] = useState("");
  const [workoutDuration, setWorkoutDuration] = useState("");
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);

  // --- Dashboard: Semana / Bloco ---
  const [semana, setSemana] = useState("");
  const [bloco, setBloco] = useState("");

  // --- Métricas: Stats ---
  const [stats, setStats] = useState<StatItem[]>([
    { label: "Squat PR", value: "", unit: "kg", delta: "" },
    { label: "Bench PR", value: "", unit: "kg", delta: "" },
    { label: "Deadlift PR", value: "", unit: "kg", delta: "" },
    { label: "Aderência", value: "", unit: "%", delta: "" },
  ]);

  const updateMetric = (index: number, field: keyof DashboardMetric, val: string) => {
    setMetrics((prev) => {
      const copy = [...prev];
      if (field === "value") {
        copy[index] = { ...copy[index], value: val === "" ? null : Number(val) };
      } else if (field === "trend") {
        copy[index] = { ...copy[index], trend: val as DashboardMetric["trend"] };
      } else if (field === "status") {
        copy[index] = { ...copy[index], status: val as DashboardMetric["status"] };
      } else {
        copy[index] = { ...copy[index], [field]: val };
      }
      return copy;
    });
  };

  const updateStat = (index: number, field: keyof StatItem, val: string) => {
    setStats((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const addExercise = () => {
    setWorkoutExercises((prev) => [...prev, { name: "", sets: "", reps: "", rpe: "" }]);
  };

  const updateExercise = (index: number, field: keyof WorkoutExercise, val: string) => {
    setWorkoutExercises((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const removeExercise = (index: number) => {
    setWorkoutExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const payload = {
      readiness: readiness === "" ? null : Number(readiness),
      semana,
      bloco,
      metrics,
      workout: {
        title: workoutTitle,
        statusLabel: workoutStatus,
        target: workoutTarget,
        duration: workoutDuration,
        exercises: workoutExercises,
      },
      stats,
    };
    console.log("AdminDados payload:", payload);
    // TODO: send to API
  };

  const inputClass =
    "w-full h-9 border border-border px-3 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-alert/50 transition-colors font-mono";
  const inputStyle = { backgroundColor: "hsl(var(--surface-1))" };
  const labelClass = "block text-[9px] font-mono text-muted-foreground tracking-[0.2em] mb-1";
  const sectionTitle = "text-[10px] font-mono text-muted-foreground tracking-[0.2em] uppercase";

  return (
    <div className="p-5 space-y-5 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="pb-3 border-b border-border">
        <h1 className="text-lg font-bold text-foreground uppercase tracking-wide">Dados do Sistema</h1>
        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono tracking-wider">
          GERENCIAMENTO DE DADOS — DASHBOARD E MÉTRICAS
        </p>
      </div>

      {/* ── DASHBOARD SECTION ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-alert" />
          <span className={sectionTitle}>Dashboard — Readiness &amp; Contexto</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>READINESS (0–100)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={readiness}
              onChange={(e) => setReadiness(e.target.value)}
              placeholder="--"
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div>
            <label className={labelClass}>SEMANA</label>
            <input
              value={semana}
              onChange={(e) => setSemana(e.target.value)}
              placeholder="ex: 3"
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div>
            <label className={labelClass}>BLOCO</label>
            <input
              value={bloco}
              onChange={(e) => setBloco(e.target.value)}
              placeholder="ex: Hipertrofia"
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* ── METRIC CARDS ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-warning" />
          <span className={sectionTitle}>Dashboard — Indicadores</span>
        </div>

        <div className="border border-border divide-y divide-border">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 surface-1">
            <span className="col-span-3 text-[9px] font-mono text-muted-foreground tracking-[0.2em]">INDICADOR</span>
            <span className="col-span-2 text-[9px] font-mono text-muted-foreground tracking-[0.2em]">VALOR (%)</span>
            <span className="col-span-2 text-[9px] font-mono text-muted-foreground tracking-[0.2em]">TENDÊNCIA</span>
            <span className="col-span-2 text-[9px] font-mono text-muted-foreground tracking-[0.2em]">STATUS</span>
            <span className="col-span-3 text-[9px] font-mono text-muted-foreground tracking-[0.2em]">SUBTÍTULO</span>
          </div>

          {metrics.map((m, i) => (
            <div key={m.title} className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center">
              <span className="col-span-3 text-xs font-mono text-foreground">{m.title}</span>
              <div className="col-span-2">
                <input
                  type="number"
                  value={m.value ?? ""}
                  onChange={(e) => updateMetric(i, "value", e.target.value)}
                  placeholder="--"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div className="col-span-2">
                <select
                  value={m.trend}
                  onChange={(e) => updateMetric(i, "trend", e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                >
                  {trendOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <select
                  value={m.status}
                  onChange={(e) => updateMetric(i, "status", e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <input
                  value={m.subtitle}
                  onChange={(e) => updateMetric(i, "subtitle", e.target.value)}
                  placeholder="Nota opcional"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PRÓXIMO TREINO ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-success" />
          <span className={sectionTitle}>Dashboard — Próximo Treino</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>TÍTULO</label>
            <input value={workoutTitle} onChange={(e) => setWorkoutTitle(e.target.value)} placeholder="Treino A — Upper" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass}>STATUS</label>
            <input value={workoutStatus} onChange={(e) => setWorkoutStatus(e.target.value)} placeholder="Programado" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass}>ALVO</label>
            <input value={workoutTarget} onChange={(e) => setWorkoutTarget(e.target.value)} placeholder="Peito, Ombro, Tríceps" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass}>DURAÇÃO</label>
            <input value={workoutDuration} onChange={(e) => setWorkoutDuration(e.target.value)} placeholder="~65 min" className={inputClass} style={inputStyle} />
          </div>
        </div>

        {/* Exercises */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={labelClass}>EXERCÍCIOS</label>
            <button
              type="button"
              onClick={addExercise}
              className="text-[9px] font-mono tracking-[0.2em] border border-border px-2 py-1 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              + ADICIONAR
            </button>
          </div>

          {workoutExercises.length === 0 && (
            <p className="text-[10px] text-muted-foreground/50 font-mono italic">Nenhum exercício adicionado.</p>
          )}

          {workoutExercises.map((ex, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4">
                <input value={ex.name} onChange={(e) => updateExercise(i, "name", e.target.value)} placeholder="Nome" className={inputClass} style={inputStyle} />
              </div>
              <div className="col-span-2">
                <input value={ex.sets} onChange={(e) => updateExercise(i, "sets", e.target.value)} placeholder="Sets" className={inputClass} style={inputStyle} />
              </div>
              <div className="col-span-2">
                <input value={ex.reps} onChange={(e) => updateExercise(i, "reps", e.target.value)} placeholder="Reps" className={inputClass} style={inputStyle} />
              </div>
              <div className="col-span-2">
                <input value={ex.rpe} onChange={(e) => updateExercise(i, "rpe", e.target.value)} placeholder="RPE" className={inputClass} style={inputStyle} />
              </div>
              <div className="col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeExercise(i)}
                  className="text-[9px] font-mono text-muted-foreground hover:text-alert transition-colors"
                >
                  REMOVER
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MÉTRICAS STATS ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-alert" />
          <span className={sectionTitle}>Métricas — Personal Records &amp; Aderência</span>
        </div>

        <div className="border border-border divide-y divide-border">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 surface-1">
            <span className="col-span-3 text-[9px] font-mono text-muted-foreground tracking-[0.2em]">MÉTRICA</span>
            <span className="col-span-3 text-[9px] font-mono text-muted-foreground tracking-[0.2em]">VALOR</span>
            <span className="col-span-2 text-[9px] font-mono text-muted-foreground tracking-[0.2em]">UNIDADE</span>
            <span className="col-span-4 text-[9px] font-mono text-muted-foreground tracking-[0.2em]">DELTA</span>
          </div>

          {stats.map((s, i) => (
            <div key={s.label} className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center">
              <span className="col-span-3 text-xs font-mono text-foreground">{s.label}</span>
              <div className="col-span-3">
                <input value={s.value} onChange={(e) => updateStat(i, "value", e.target.value)} placeholder="--" className={inputClass} style={inputStyle} />
              </div>
              <div className="col-span-2">
                <input value={s.unit} onChange={(e) => updateStat(i, "unit", e.target.value)} className={inputClass} style={inputStyle} />
              </div>
              <div className="col-span-4">
                <input value={s.delta} onChange={(e) => updateStat(i, "delta", e.target.value)} placeholder="+5kg vs bloco anterior" className={inputClass} style={inputStyle} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SAVE ── */}
      <div className="flex justify-end pt-2 border-t border-border">
        <button
          type="button"
          onClick={handleSave}
          className="text-[10px] font-mono tracking-[0.2em] bg-foreground text-background px-5 py-2.5 hover:bg-foreground/90 transition-colors"
        >
          SALVAR DADOS
        </button>
      </div>
    </div>
  );
}
