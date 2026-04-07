import { useState } from "react";
import { Terminal } from "lucide-react";

export default function AdminTestes() {
  const [model, setModel] = useState("gpt-4o");

  return (
    <div className="p-5 space-y-4 max-w-5xl mx-auto animate-fade-in">
      <div className="pb-3 border-b border-border">
        <h1 className="text-lg font-bold text-foreground uppercase tracking-wide">Testes</h1>
        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono tracking-wider">PROMPT TESTING INTERFACE</p>
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
