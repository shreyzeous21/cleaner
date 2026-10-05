import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatBytes } from "@/lib/format";

// Categories considered safe to auto-remove without asking.
const SAFE_CATEGORIES = ["caches", "logs", "npm"];

export type AutoCleanInterval = "never" | "hourly" | "daily" | "weekly";

const INTERVAL_MS: Record<Exclude<AutoCleanInterval, "never">, number> = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

export function useAutoClean() {
  const [intervalKey, setIntervalKeyState] = useState<AutoCleanInterval>(
    () => (localStorage.getItem("auto-clean-interval") as AutoCleanInterval) ?? "never",
  );

  const setIntervalKey = (key: AutoCleanInterval) => {
    localStorage.setItem("auto-clean-interval", key);
    setIntervalKeyState(key);
  };

  useEffect(() => {
    if (intervalKey === "never") return;
    const id = setInterval(async () => {
      try {
        const categories = await api.scan();
        const paths = categories
          .filter((c) => SAFE_CATEGORIES.includes(c.id))
          .map((c) => c.path);
        if (paths.length === 0) return;
        const report = await api.clean(paths);
        if (report.cleaned_bytes > 0) {
          toast.success(`Auto-clean freed ${formatBytes(report.cleaned_bytes)}`);
        }
        window.dispatchEvent(new Event("cleaner:auto-cleaned"));
      } catch (e) {
        console.error("auto-clean failed", e);
      }
    }, INTERVAL_MS[intervalKey]);
    return () => clearInterval(id);
  }, [intervalKey]);

  return { intervalKey, setIntervalKey };
}
