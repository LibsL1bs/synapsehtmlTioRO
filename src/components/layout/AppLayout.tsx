import { useEffect, useRef, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { ChatPanel } from "./ChatPanel";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const BASE_CHAT_WIDTH = 300;
  const MIN_CHAT_WIDTH = BASE_CHAT_WIDTH * 0.7;
  const MAX_CHAT_WIDTH = BASE_CHAT_WIDTH * 3;

  const [chatWidth, setChatWidth] = useState(BASE_CHAT_WIDTH);
  const isResizingRef = useRef(false);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!isResizingRef.current) return;
      const nextWidth = window.innerWidth - event.clientX;
      const clampedWidth = Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, nextWidth));
      setChatWidth(clampedWidth);
    };

    const handlePointerUp = () => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [MAX_CHAT_WIDTH, MIN_CHAT_WIDTH]);

  const startResize = () => {
    isResizingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div className="flex h-screen w-full overflow-hidden surface-0">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <div
        className="w-1 shrink-0 cursor-col-resize bg-border/50 hover:bg-alert/80 transition-colors"
        onPointerDown={startResize}
        role="separator"
        aria-orientation="vertical"
        aria-label="Redimensionar chat"
      />
      <ChatPanel width={chatWidth} />
    </div>
  );
}
