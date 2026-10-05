import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { AppSidebar, type NavId } from "@/components/app-sidebar";
import { AppsView } from "@/components/views/apps-view";
import { BrowsersView } from "@/components/views/browsers-view";
import { DashboardView } from "@/components/views/dashboard-view";
import { DuplicatesView } from "@/components/views/duplicates-view";
import { LargeFilesView } from "@/components/views/large-files-view";
import { OldFilesView } from "@/components/views/old-files-view";
import { SmartScanView } from "@/components/views/smart-scan-view";
import { StartupView } from "@/components/views/startup-view";
import { StorageView } from "@/components/views/storage-view";
import { ToolsView } from "@/components/views/tools-view";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { useAutoClean } from "@/hooks/useAutoClean";
import { useCleaner } from "@/hooks/useCleaner";
import { formatBytes } from "@/lib/format";

const TITLES: Record<NavId, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Scan your system for safe-to-remove junk files.",
  },
  storage: { title: "Storage", subtitle: "Disk usage at a glance." },
  large: { title: "Large Files", subtitle: "Find and remove space hogs." },
  duplicates: { title: "Duplicates", subtitle: "Identical files wasting space." },
  browsers: { title: "Browsers", subtitle: "Safari / Chrome / Firefox cache." },
  old: { title: "Old Files", subtitle: "Files you haven't touched in months." },
  startup: { title: "Startup Apps", subtitle: "Apps launching at login." },
  apps: { title: "Apps", subtitle: "Uninstall apps and clear their leftovers." },
  smart: { title: "Smart Scan", subtitle: "Everything, one button." },
  tools: { title: "Tools", subtitle: "Utilities and quick actions." },
};

function App() {
  const {
    categories,
    selected,
    disk,
    scanning,
    cleaning,
    hasScanned,
    reclaimable,
    scan,
    clean,
    toggle,
  } = useCleaner();
  const [dark, setDark] = useState(false);
  const [nav, setNav] = useState<NavId>("dashboard");
  const { intervalKey, setIntervalKey } = useAutoClean();

  function toggleTheme() {
    setDark((d) => {
      document.documentElement.classList.toggle("dark", !d);
      return !d;
    });
  }

  async function handleClean() {
    const report = await clean();
    if (report) {
      toast.success(
        `Cleaned ${formatBytes(report.cleaned_bytes)} from ${report.cleaned_items} item(s)`,
      );
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar active={nav} onNavigate={setNav} />
      <SidebarInset className="flex h-screen flex-col">
        {/* Fixed header */}
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-5" />
            <div>
              <h1 className="text-sm font-semibold leading-tight">{TITLES[nav].title}</h1>
              <p className="text-xs text-muted-foreground">{TITLES[nav].subtitle}</p>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto flex w-full flex-col gap-3">
            {nav === "dashboard" && (
              <DashboardView
                disk={disk}
                categories={categories}
                selected={selected}
                scanning={scanning}
                cleaning={cleaning}
                hasScanned={hasScanned}
                reclaimable={reclaimable}
                scan={scan}
                clean={handleClean}
                toggle={toggle}
              />
            )}
            {nav === "storage" && <StorageView disk={disk} />}
            {nav === "large" && <LargeFilesView />}
            {nav === "duplicates" && <DuplicatesView />}
            {nav === "browsers" && <BrowsersView />}
            {nav === "old" && <OldFilesView />}
            {nav === "startup" && <StartupView />}
            {nav === "apps" && <AppsView />}
            {nav === "smart" && <SmartScanView />}
            {nav === "tools" && (
              <ToolsView
                scan={scan}
                autoCleanInterval={intervalKey}
                onAutoCleanChange={setIntervalKey}
              />
            )}
          </div>
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}

export default App;
