import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DiskUsage } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { StorageOverview } from "@/components/storage-overview";

export function StorageView({ disk }: { disk: DiskUsage | null }) {
  const usedPct = disk ? Math.round((disk.used_bytes / disk.total_bytes) * 100) : 0;

  return (
    <>
      <StorageOverview disk={disk} />
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Root volume statistics</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Row label="Total capacity" value={disk ? formatBytes(disk.total_bytes) : "—"} />
          <Row label="Used" value={disk ? formatBytes(disk.used_bytes) : "—"} />
          <Row label="Available" value={disk ? formatBytes(disk.available_bytes) : "—"} />
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fullness</span>
              <span className="font-medium">{usedPct}%</span>
            </div>
            <Progress value={usedPct} />
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
