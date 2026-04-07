import { Activity } from "lucide-react";

function StatBlock({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-border p-4">
      <span className="text-[9px] font-mono text-muted-foreground tracking-[0.2em] block mb-1">{label}</span>
      <span className="text-lg font-bold font-mono text-foreground">{value}</span>
      {sub && <span className="text-[10px] font-mono text-muted-foreground ml-1">{sub}</span>}
    </div>
  );
}

export default function AdminSistema() {
  return (
    <div className="p-5 space-y-4 max-w-5xl mx-auto animate-fade-in">
      <div className="pb-3 border-b border-border">
        <h1 className="text-lg font-bold text-foreground uppercase tracking-wide">Sistema</h1>
        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono tracking-wider">ESTADO DO SISTEMA E HEALTH CHECK</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBlock label="STATUS" value="ONLINE" />
        <StatBlock label="MODELO ATIVO" value="GPT-4o" />
        <StatBlock label="TOKENS / HOJE" value="12.4k" />
        <StatBlock label="CUSTO ESTIMADO" value="$0.18" sub="USD" />
      </div>

      <div className="border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-3.5 h-3.5 text-success" />
          <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">HEALTH CHECK</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { name: "API", status: "ok" },
            { name: "DATABASE", status: "ok" },
            { name: "AI ENGINE", status: "ok" },
          ].map((s) => (
            <div key={s.name} className="flex items-center gap-2 surface-1 border border-border px-3 py-2">
              <div className={`w-1.5 h-1.5 rounded-full ${s.status === "ok" ? "bg-success" : "bg-alert"}`} />
              <span className="text-[10px] font-mono text-muted-foreground">{s.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
