import { HardDrive } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DiskUsage } from "@/lib/api";
import { formatBytes } from "@/lib/format";

export function StorageOverview({ disk }: { disk: DiskUsage | null }) {
  const usedPct = disk ? Math.round((disk.used_bytes / disk.total_bytes) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="size-4" /> Storage
        </CardTitle>
        <CardDescription>Main volume usage</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <p className="text-3xl font-semibold">
            {disk ? formatBytes(disk.used_bytes) : "—"}
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              of {disk ? formatBytes(disk.total_bytes) : "—"} used
            </span>
          </p>
          <p className="text-sm text-muted-foreground">{usedPct}%</p>
        </div>
        <Progress value={usedPct} className="h-2.5" />
        <p className="text-xs text-muted-foreground">
          {disk ? `${formatBytes(disk.available_bytes)} available` : "Loading…"}
        </p>
      </CardContent>
    </Card>
  );
}
