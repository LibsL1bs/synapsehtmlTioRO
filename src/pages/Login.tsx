import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { NeuralMesh } from "@/components/landing/NeuralMesh";
import { Hexagon, ArrowRight } from "lucide-react";
import { loginUser, saveStoredUser } from "@/lib/apiClient";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [persist, setPersist] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const user = await loginUser(form.email, form.password);
      saveStoredUser(user, persist);
      navigate("/perfil");
    } catch (err: any) {
      setError(err.message || "Erro desconhecido");
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left — Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center border-r border-border overflow-hidden">
        <div className="absolute inset-0 opacity-70">
          <NeuralMesh variant="converge" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/60" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute right-0 translate-x-[25%] z-10 flex items-center justify-center h-full"
        >
          <div className="relative">
            <div className="absolute inset-0 blur-[80px] bg-alert/15 rounded-full scale-110" />
            <Hexagon className="text-alert/40 relative" style={{ width: '85vh', height: '85vh' }} strokeWidth={0.7} />
          </div>
        </motion.div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-sm"
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              <Hexagon className="w-4 h-4 text-alert lg:hidden" strokeWidth={1.5} />
              <span className="text-[10px] font-mono text-muted-foreground tracking-[0.25em] uppercase">SYNAPSE</span>
            </div>
            <h1 className="text-xl font-display font-bold tracking-tight mb-1">Iniciar Sessão</h1>
            <p className="text-xs text-muted-foreground font-mono tracking-wider">SYSTEM_ACCESS_REQUIRED</p>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 border border-border px-3 py-2 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] font-mono text-muted-foreground tracking-[0.15em]">SECURE_CONNECTION — READY</span>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
                        {error && (
                          <div className="text-xs text-red-500 font-mono mb-2">{error}</div>
                        )}
            {[
              { label: "IDENTIFICADOR", field: "email", type: "email", placeholder: "atleta@synapse.io" },
              { label: "SENHA", field: "password", type: "password", placeholder: "••••••••" },
            ].map((item) => (
              <div key={item.field}>
                <label className="block text-[10px] font-mono text-muted-foreground tracking-[0.2em] mb-1.5">
                  {item.label}
                </label>
                <input
                  type={item.type}
                  placeholder={item.placeholder}
                  value={form[item.field as keyof typeof form]}
                  onChange={handleChange(item.field)}
                  className="w-full h-10 border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-alert/50 transition-colors font-mono"
                  style={{ backgroundColor: "hsl(var(--surface-1))" }}
                />
              </div>
            ))}

            {/* Persist */}
            <label className="flex items-center gap-2 cursor-pointer group">
              <div
                onClick={() => setPersist(!persist)}
                className={`w-3.5 h-3.5 border flex items-center justify-center transition-colors ${
                  persist ? "border-alert bg-alert/10" : "border-border"
                }`}
              >
                {persist && <div className="w-1.5 h-1.5 bg-alert" />}
              </div>
              <span className="text-[10px] font-mono text-muted-foreground tracking-wider group-hover:text-foreground transition-colors">
                PERSISTIR SESSÃO
              </span>
            </label>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 h-10 bg-foreground text-background text-xs font-mono tracking-[0.2em] hover:bg-foreground/90 transition-colors mt-2"
            >
              INICIAR SESSÃO
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground font-mono text-center">
              Sem conta?{" "}
              <button onClick={() => navigate("/registro")} className="text-foreground hover:text-alert transition-colors">
                CRIAR CONTA
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
