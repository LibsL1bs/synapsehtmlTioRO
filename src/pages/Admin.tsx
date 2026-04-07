import { useState } from "react";
import { motion } from "framer-motion";
import {
  Hexagon,
  Server,
  Database,
  Users,
  ScrollText,
  Terminal,
  Activity,
  Cpu,
  Zap,
  Search,
  ChevronRight,
} from "lucide-react";

const tabs = [
  { id: "system", label: "SISTEMA", icon: Server },
  { id: "cockpit", label: "COCKPIT", icon: Database },
  { id: "users", label: "USUÁRIOS", icon: Users },
  { id: "logs", label: "LOGS IA", icon: ScrollText },
  { id: "prompt", label: "TESTES", icon: Terminal },
] as const;

type TabId = (typeof tabs)[number]["id"];

function StatBlock({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-border p-4">
      <span className="text-[9px] font-mono text-muted-foreground tracking-[0.2em] block mb-1">{label}</span>
      <span className="text-lg font-bold font-mono text-foreground">{value}</span>
      {sub && <span className="text-[10px] font-mono text-muted-foreground ml-1">{sub}</span>}
    </div>
  );
}

function SystemTab() {
  return (
    <div className="space-y-4">
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

function CockpitTab() {
  const fields = [
    { label: "READINESS", value: "72", editable: true },
    { label: "FADIGA NEURAL", value: "Moderada", editable: true },
    { label: "CAPACIDADE RECUPERAÇÃO", value: "Alta", editable: true },
    { label: "SEMANA", value: "4", editable: true },
    { label: "BLOCO", value: "Acumulação", editable: true },
    { label: "SESSÕES / SEMANA", value: "5", editable: true },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">COCKPIT DATA — EDIÇÃO DIRETA</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {fields.map((f) => (
          <div key={f.label} className="border border-border p-3">
            <span className="text-[9px] font-mono text-muted-foreground tracking-[0.2em] block mb-1">{f.label}</span>
            <input
              defaultValue={f.value}
              className="w-full bg-transparent text-sm font-mono text-foreground border-b border-border/50 focus:border-alert/50 focus:outline-none pb-0.5 transition-colors"
            />
          </div>
        ))}
      </div>
      <button className="text-[10px] font-mono tracking-[0.2em] bg-alert text-alert-foreground px-4 py-2 hover:bg-alert/90 transition-colors">
        SALVAR ALTERAÇÕES
      </button>
    </div>
  );
}

function UsersTab() {
  const users = [
    { id: 1, name: "Atleta Demo", email: "demo@synapse.io", role: "user", status: "active" },
    { id: 2, name: "Admin", email: "admin@synapse.io", role: "admin", status: "active" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            placeholder="Buscar usuários..."
            className="w-full h-9 pl-9 pr-3 border border-border text-xs font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-alert/50 transition-colors"
            style={{ backgroundColor: "hsl(var(--surface-1))" }}
          />
        </div>
        <button className="text-[10px] font-mono tracking-[0.2em] border border-border px-3 py-2 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
          + ADICIONAR
        </button>
      </div>

      <div className="border border-border divide-y divide-border">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2 surface-1">
          <span className="col-span-3 text-[9px] font-mono text-muted-foreground tracking-[0.2em]">NOME</span>
          <span className="col-span-4 text-[9px] font-mono text-muted-foreground tracking-[0.2em]">EMAIL</span>
          <span className="col-span-2 text-[9px] font-mono text-muted-foreground tracking-[0.2em]">ROLE</span>
          <span className="col-span-2 text-[9px] font-mono text-muted-foreground tracking-[0.2em]">STATUS</span>
          <span className="col-span-1" />
        </div>
        {users.map((u) => (
          <div key={u.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:surface-1 transition-colors group">
            <span className="col-span-3 text-xs font-mono text-foreground">{u.name}</span>
            <span className="col-span-4 text-xs font-mono text-muted-foreground">{u.email}</span>
            <span className="col-span-2">
              <span className={`text-[9px] font-mono tracking-[0.15em] px-2 py-0.5 border ${u.role === "admin" ? "border-alert/40 text-alert" : "border-border text-muted-foreground"}`}>
                {u.role.toUpperCase()}
              </span>
            </span>
            <span className="col-span-2 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-success" />
              <span className="text-[10px] font-mono text-muted-foreground">{u.status}</span>
            </span>
            <span className="col-span-1 flex justify-end">
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-foreground transition-colors" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LogsTab() {
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
    <div className="space-y-4">
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

function PromptTab() {
  const [model, setModel] = useState("gpt-4o");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">PROMPT TESTING INTERFACE</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[9px] font-mono text-muted-foreground tracking-[0.2em]">MODELO</span>
        <div className="flex gap-2">
          {["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"].map((m) => (
            <button
              key={m}
              onClick={() => setModel(m)}
              className={`text-[9px] font-mono tracking-[0.1em] px-2.5 py-1 border transition-colors ${
                model === m ? "border-alert/50 text-alert" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[9px] font-mono text-muted-foreground tracking-[0.2em] block mb-1.5">PROMPT</label>
        <textarea
          rows={5}
          placeholder="Digite o prompt para teste..."
          className="w-full border border-border p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-alert/50 transition-colors resize-none"
          style={{ backgroundColor: "hsl(var(--surface-1))" }}
        />
      </div>

      <button className="text-[10px] font-mono tracking-[0.2em] bg-foreground text-background px-4 py-2 hover:bg-foreground/90 transition-colors">
        EXECUTAR PROMPT
      </button>

      <div className="border border-border p-4 min-h-[120px]">
        <span className="text-[9px] font-mono text-muted-foreground tracking-[0.2em] block mb-2">RESPOSTA</span>
        <p className="text-xs font-mono text-muted-foreground/50 italic">Aguardando execução...</p>
      </div>
    </div>
  );
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState<TabId>("system");

  const tabContent: Record<TabId, React.ReactNode> = {
    system: <SystemTab />,
    cockpit: <CockpitTab />,
    users: <UsersTab />,
    logs: <LogsTab />,
    prompt: <PromptTab />,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hexagon className="w-4 h-4 text-alert" strokeWidth={1.5} />
            <span className="text-[10px] font-mono text-muted-foreground tracking-[0.25em] uppercase">SYNAPSE</span>
            <span className="text-[9px] font-mono text-alert/60 tracking-[0.15em] ml-2 border border-alert/30 px-2 py-0.5">ADMIN</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] font-mono text-muted-foreground tracking-wider">DEV_MODE</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-border mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-[10px] font-mono tracking-[0.15em] transition-colors ${
                activeTab === tab.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="admin-tab"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-alert"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {tabContent[activeTab]}
        </motion.div>
      </div>
    </div>
  );
}
