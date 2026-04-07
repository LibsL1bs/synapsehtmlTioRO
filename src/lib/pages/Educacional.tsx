import { BookOpen, ChevronRight } from "lucide-react";

const topics = [
  {
    category: "Fundamentos",
    items: [
      { title: "Periodização Linear vs Ondulada", desc: "Entenda as diferenças entre modelos de progressão e quando aplicar cada um." },
      { title: "RPE e RIR: Guia Prático", desc: "Como usar escalas de esforço para autoregular seu treino de forma eficiente." },
      { title: "Princípios de Sobrecarga Progressiva", desc: "A base de todo programa de força: como aplicar com inteligência." },
    ],
  },
  {
    category: "Técnica",
    items: [
      { title: "Squat: Mecânica e Variações", desc: "Análise biomecânica do agachamento e variações para diferentes anatomias." },
      { title: "Bench Press: Setup e Execução", desc: "Posicionamento, arco, leg drive e técnica competitiva." },
      { title: "Deadlift: Convencional vs Sumo", desc: "Escolhendo o estilo ideal com base em proporções e pontos fortes." },
    ],
  },
  {
    category: "Recuperação",
    items: [
      { title: "Sono e Performance", desc: "Impacto do sono na síntese proteica, recuperação neural e performance." },
      { title: "Gerenciamento de Fadiga", desc: "Identificando sinais de fadiga acumulada e estratégias de deload." },
    ],
  },
];

export default function Educacional() {
  return (
    <div className="p-5 space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div className="pb-3 border-b border-border">
        <h1 className="text-lg font-bold text-foreground uppercase tracking-wide">Educacional</h1>
        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono tracking-wider">FUNDAMENTOS E CONCEITOS DE POWERLIFTING</p>
      </div>

      {topics.map((section) => (
        <div key={section.category}>
          <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-2 flex items-center gap-2 font-mono">
            <BookOpen className="w-3 h-3" />
            {section.category}
          </h2>
          <div className="space-y-1.5">
            {section.items.map((item) => (
              <button
                key={item.title}
                className="w-full text-left surface-2 rounded-sm border border-border p-3 panel-shadow hover:border-alert/30 transition-all duration-150 group"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-foreground font-mono">{item.title}</h3>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-alert transition-colors" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
