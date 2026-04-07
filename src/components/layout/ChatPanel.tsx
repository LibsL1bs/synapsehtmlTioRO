import { useEffect, useRef, useState, FormEvent } from "react";
import { Send, Bot, ChevronRight } from "lucide-react";
import { apiRequest } from "@/lib/apiClient";

interface Message {
  id: number;
  role: "assistant" | "user";
  content: string;
}

interface ChatPanelProps {
  width?: number;
}

export function ChatPanel({ width = 300 }: ChatPanelProps) {
  const STORAGE_KEY = "chat-messages";
  const parsedTimeout = Number(import.meta.env.VITE_CHAT_TIMEOUT_MS);
  const REQUEST_TIMEOUT_MS = Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 120000;
  const [messages, setMessages] = useState<Message[]>(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored) as Message[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Falha ao carregar histórico do chat", error);
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const sendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    const userMessage: Message = { id: Date.now(), role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const data = await apiRequest<{ resposta: string }>(
        "/chat",
        {
          method: "POST",
          body: JSON.stringify({ pergunta: text }),
          signal: controller.signal,
        },
        {
          requireAuth: true,
        },
      );
      const replyText = (data?.resposta ?? "").toString().trim();

      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: replyText || "Não recebi resposta agora.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const aborted = (err as Error)?.name === "AbortError";
      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: aborted
          ? "Tempo limite ao contatar o servidor. Tente novamente."
          : "Não foi possível obter resposta. Verifique a conexão e tente novamente.",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      window.clearTimeout(timeoutId);
      setIsSending(false);
    }
  };

  if (collapsed) {
    return (
      <div className="h-screen flex flex-col items-center py-3 px-1 border-l border-border surface-1 w-9 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1 rounded-sm hover:surface-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5 rotate-180" />
        </button>
        <div className="mt-3 flex flex-col items-center">
          <Bot className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col border-l border-border shrink-0" style={{ background: "hsl(var(--chat-background))", width: `${width}px` }}>
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em] font-mono">Assistente</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded-sm hover:surface-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[90%] rounded-sm px-3 py-2 text-xs leading-relaxed border break-words whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-alert text-alert-foreground border-alert/80"
                  : "bg-transparent text-secondary-foreground border-transparent"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-sm px-3 py-2 text-xs leading-relaxed border bg-transparent text-secondary-foreground border-transparent flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDuration: "1s", animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDuration: "1s", animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDuration: "1s", animationDelay: "300ms" }} />
              <span className="text-[11px] text-muted-foreground font-mono">IA pensando...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2 border-t border-border">
        <form onSubmit={sendMessage} className="flex items-center gap-2 rounded-sm px-3 py-1.5 border border-border" style={{ background: "hsl(var(--chat-input))" }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte ao assistente..."
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none font-mono"
            disabled={isSending}
          />
          <button
            type="submit"
            className="p-1 rounded-sm hover:surface-3 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            disabled={isSending}
            aria-label="Enviar mensagem"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
