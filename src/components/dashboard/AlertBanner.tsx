import { AlertTriangle } from "lucide-react";

interface AlertBannerProps {
  message: string;
  type?: "warning" | "critical";
}

export function AlertBanner({ message, type = "warning" }: AlertBannerProps) {
  const isAlert = type === "critical";

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 rounded-sm border-l-2 ${
        isAlert
          ? "border-l-alert border-y border-r border-alert/20 bg-alert/5 glow-alert"
          : "border-l-warning border-y border-r border-warning/20 bg-warning/5"
      }`}
    >
      <AlertTriangle
        className={`w-3.5 h-3.5 shrink-0 ${isAlert ? "text-alert" : "text-warning"}`}
      />
      <span className={`text-xs font-mono ${isAlert ? "text-alert" : "text-warning"}`}>
        {message}
      </span>
    </div>
  );
}
