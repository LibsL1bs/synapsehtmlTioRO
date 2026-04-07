import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { NeuralMesh } from "@/components/landing/NeuralMesh";
import {
  Hexagon,
  ArrowRight,
  Brain,
  Activity,
  Target,
  BarChart3,
  Zap,
  Shield,
  Eye,
  TrendingUp,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* NAV */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-12 px-6">
          <div className="flex items-center gap-2">
            <Hexagon className="w-4 h-4 text-alert" strokeWidth={1.5} />
            <span className="text-xs font-bold tracking-[0.25em] uppercase font-mono text-foreground">SYNAPSE</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/login")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono tracking-wider"
            >
              INICIAR SESSÃO
            </button>
            <button
              onClick={() => navigate("/registro")}
              className="text-xs bg-alert text-alert-foreground px-4 py-1.5 font-mono tracking-wider hover:bg-alert/90 transition-colors"
            >
              CRIAR CONTA
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center pt-12">
        <div className="absolute inset-0 opacity-50">
          <NeuralMesh variant="expand" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

        <div className="relative z-10 max-w-3xl mx-auto text-center px-6">
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
            <div className="inline-flex items-center gap-2 border border-border px-3 py-1 mb-8">
              <div className="w-1.5 h-1.5 bg-alert rounded-full animate-pulse" />
              <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] uppercase">
                SISTEMA DE CONTROLE ATIVO
              </span>
            </div>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-4xl md:text-6xl font-display font-bold tracking-tight leading-[1.1] mb-6"
          >
            Controle total da sua{" "}
            <span className="text-alert">performance.</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Synapse é o cockpit analítico para atletas de força. Monitore variáveis, identifique padrões e tome decisões com precisão — não com intuição.
          </motion.p>

          <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible" className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-2 bg-foreground text-background px-6 py-2.5 text-xs font-mono tracking-wider hover:bg-foreground/90 transition-colors"
            >
              INICIAR SESSÃO
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate("/registro")}
              className="flex items-center gap-2 border border-border px-6 py-2.5 text-xs font-mono tracking-wider text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              CRIAR CONTA
            </button>
          </motion.div>
        </div>

        {/* Bottom grid line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>

      {/* PROBLEM */}
      <section className="py-24 px-6 border-t border-border/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-[10px] font-mono text-alert tracking-[0.3em] uppercase mb-4 block">O PROBLEMA</span>
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-12 max-w-lg">
              Treinar sem dados é treinar no escuro.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Eye, title: "Sem visão estrutural", desc: "Você não enxerga o impacto real de cada sessão no seu progresso longitudinal." },
              { icon: Brain, title: "Decisões por sensação", desc: "Volume, intensidade e frequência definidos por feeling — não por análise." },
              { icon: Target, title: "Sem controle de variáveis", desc: "Fadiga, readiness e recuperação são ignorados até que o corpo sinalize com lesão." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="surface-1 border border-border p-6 group hover:border-alert/30 transition-colors"
              >
                <item.icon className="w-5 h-5 text-alert/70 mb-4" strokeWidth={1.5} />
                <h3 className="text-sm font-bold mb-2 font-mono tracking-wide">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section className="py-24 px-6 border-t border-border/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-[10px] font-mono text-success tracking-[0.3em] uppercase mb-4 block">A SOLUÇÃO</span>
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-12 max-w-lg">
              Um sistema operacional para sua performance.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: Activity, title: "Cockpit de Performance", desc: "Dashboard em tempo real com estado do atleta, readiness e métricas musculares." },
              { icon: Brain, title: "IA Analítica", desc: "Assistente técnico que interpreta seus dados e gera insights acionáveis." },
              { icon: TrendingUp, title: "Monitoramento Longitudinal", desc: "Acompanhe progressão, tendências e padrões ao longo de semanas e meses." },
              { icon: Shield, title: "Controle de Variáveis", desc: "Fadiga neural, capacidade de recuperação e readiness sob constante análise." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="surface-1 border border-border p-6 flex gap-4 items-start hover:border-success/30 transition-colors"
              >
                <div className="w-8 h-8 flex items-center justify-center border border-border shrink-0 mt-0.5">
                  <item.icon className="w-4 h-4 text-success/70" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-sm font-bold mb-1 font-mono tracking-wide">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-6 border-t border-border/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-[10px] font-mono text-muted-foreground tracking-[0.3em] uppercase mb-4 block">COMO FUNCIONA</span>
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-16 max-w-lg">
              Três camadas de controle.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-border">
            {[
              { step: "01", title: "Monitoramento", desc: "O sistema captura e organiza seus dados fisiológicos, anatômicos e psicológicos.", icon: BarChart3 },
              { step: "02", title: "Análise", desc: "IA processa padrões, identifica riscos e gera recomendações baseadas em evidência.", icon: Zap },
              { step: "03", title: "Decisão", desc: "Você recebe insights claros para ajustar treino, volume e recuperação com precisão.", icon: Target },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className={`p-8 ${i < 2 ? "md:border-r border-b md:border-b-0 border-border" : ""}`}
              >
                <span className="text-[10px] font-mono text-alert/60 tracking-[0.3em] mb-4 block">{item.step}</span>
                <item.icon className="w-5 h-5 text-foreground/60 mb-4" strokeWidth={1.5} />
                <h3 className="text-sm font-bold mb-2 font-mono tracking-wide">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hexagon className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] uppercase">SYNAPSE v0.1</span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground/50 tracking-wider">
            SISTEMA DE CONTROLE DE PERFORMANCE
          </span>
        </div>
      </footer>
    </div>
  );
}
