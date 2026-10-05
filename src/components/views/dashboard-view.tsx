import { Sparkles } from "lucide-react";
import { CategoryList } from "@/components/category-list";
import { JunkChart } from "@/components/junk-chart";
import { JunkPieChart } from "@/components/junk-pie-chart";
import { StatCards } from "@/components/stat-cards";
import { StorageOverview } from "@/components/storage-overview";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CategoryScan, DiskUsage } from "@/lib/api";
import { formatBytes } from "@/lib/format";

export function DashboardView({
  disk,
  categories,
  selected,
  scanning,
  cleaning,
  hasScanned,
  reclaimable,
  scan,
  clean,
  toggle,
}: {
  disk: DiskUsage | null;
  categories: CategoryScan[];
  selected: Set<string>;
  scanning: boolean;
  cleaning: boolean;
  hasScanned: boolean;
  reclaimable: number;
  scan: () => void;
  clean: () => void;
  toggle: (id: string) => void;
}) {
  const totalJunk = categories.reduce((s, c) => s + c.size_bytes, 0);
  const totalFiles = categories.reduce((s, c) => s + c.file_count, 0);

  return (
    <>
      {/* Reclaimable space hero */}
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-1 py-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Junk found
          </p>
          <p className="text-4xl font-semibold tracking-tight">
            {hasScanned ? formatBytes(totalJunk) : scanning ? "Scanning…" : "—"}
          </p>
          <p className="text-sm text-muted-foreground">
            {hasScanned
              ? `${categories.length} categories · ${totalFiles.toLocaleString()} files`
              : scanning
                ? "Looking through your system…"
                : "Run a scan to find cleanable files."}
          </p>
        </CardContent>
      </Card>

      {hasScanned && categories.length > 0 && (
        <StatCards
          totalJunk={totalJunk}
          totalFiles={totalFiles}
          reclaimable={reclaimable}
          categoryCount={categories.length}
        />
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <StorageOverview disk={disk} />
        {hasScanned && categories.length > 0 ? (
          <>
            <JunkChart categories={categories} />
            <JunkPieChart categories={categories} />
          </>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-dashed p-4 text-sm text-muted-foreground lg:col-span-2">
            Run a scan to see the junk breakdown charts.
          </div>
        )}
      </div>

      {hasScanned && categories.length > 0 && (
        <CategoryList categories={categories} selected={selected} onToggle={toggle} />
      )}

      {hasScanned && categories.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          Your system is clean — no junk categories found.
        </p>
      )}

      <div className="sticky bottom-0 flex items-center gap-3 border-t bg-background/95 py-3 backdrop-blur">
        <Button onClick={scan} disabled={scanning || cleaning} size="lg">
          <Sparkles className="size-4" />
          {scanning ? "Scanning…" : "Scan for junk"}
        </Button>
        <Button variant="destructive" size="lg" onClick={clean} disabled={!hasScanned || reclaimable === 0 || cleaning || scanning}>
          Clean {formatBytes(reclaimable)}
        </Button>
      </div>
    </>
  );
}
