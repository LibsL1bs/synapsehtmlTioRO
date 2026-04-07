import { Zap } from "lucide-react";

export default function AdminLogs() {
  const logs = [
    { time: "14:32:01", type: "INFO", model: "gpt-4o", action: "analyze_readiness", tokens: 842, preview: "Readiness calculado: 72. Fatores: fadiga neural moderada..." },
    { time: "14:28:15", type: "ACTION", model: "gpt-4o", action: "generate_workout", tokens: 1204, preview: "Treino gerado para segunda-feira. Volume reduzido 15%..." },
    { time: "14:20:44", type: "ERROR", model: "gpt-4o", action: "parse_input", tokens: 0, preview: "Falha ao parsear entrada do usuário. Input vazio." },
  ];

  const typeColors: Record<string, string> = {
    INFO: "text-muted-foreground border-border",
    ACTION: "text-success border-success/40",
    ERROR: "text-alert border-alert/40",
  };

  return (
    <div className="p-5 space-y-4 max-w-5xl mx-auto animate-fade-in">
      <div className="pb-3 border-b border-border">
        <h1 className="text-lg font-bold text-foreground uppercase tracking-wide">Logs IA</h1>
        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono tracking-wider">HISTÓRICO DE INTERAÇÕES COM A IA</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {["TODOS", "INFO", "ACTION", "ERROR", "MODEL_USED"].map((f) => (
          <button
            key={f}
            className={`text-[9px] font-mono tracking-[0.15em] px-2.5 py-1 border transition-colors ${
              f === "TODOS" ? "border-foreground/30 text-foreground" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {logs.map((log, i) => (
          <div key={i} className="border border-border p-3 hover:surface-1 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-mono text-muted-foreground/60">{log.time}</span>
              <span className={`text-[9px] font-mono tracking-[0.15em] px-2 py-0.5 border ${typeColors[log.type]}`}>
                {log.type}
              </span>
              <span className="text-[9px] font-mono text-muted-foreground">{log.model}</span>
              <span className="text-[9px] font-mono text-muted-foreground/50 ml-auto">{log.tokens} tokens</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-3 h-3 text-muted-foreground/40" />
              <span className="text-[10px] font-mono text-foreground/80">{log.action}</span>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground leading-relaxed pl-5">{log.preview}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
