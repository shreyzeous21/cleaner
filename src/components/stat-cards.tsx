import { FileStack, FolderTree, HardDriveDownload, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatBytes } from "@/lib/format";

export function StatCards({
  totalJunk,
  totalFiles,
  reclaimable,
  categoryCount,
}: {
  totalJunk: number;
  totalFiles: number;
  reclaimable: number;
  categoryCount: number;
}) {
  const stats = [
    {
      icon: <HardDriveDownload className="size-4" />,
      label: "Total junk",
      value: formatBytes(totalJunk),
    },
    {
      icon: <FileStack className="size-4" />,
      label: "Files found",
      value: totalFiles.toLocaleString(),
    },
    {
      icon: <Layers className="size-4" />,
      label: "Selected to clean",
      value: formatBytes(reclaimable),
    },
    {
      icon: <FolderTree className="size-4" />,
      label: "Categories",
      value: String(categoryCount),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} size="sm">
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              {s.icon}
              <span className="text-xs">{s.label}</span>
            </div>
            <p className="text-xl font-semibold">{s.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
