import { useState } from "react";
import { ScanLine, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatBytes } from "@/lib/format";

type Section = {
  key: string;
  label: string;
  count: number;
  sizeBytes: number;
  detail: string;
};

export function SmartScanView() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const [categories, large, dups, olds] = await Promise.all([
        api.scan(),
        api.largeFiles(10),
        api.duplicates(),
        api.oldFiles(90),
      ]);

      const junkBytes = categories.reduce((s, c) => s + c.size_bytes, 0);
      const largeBytes = large.reduce((s, f) => s + f.size_bytes, 0);
      const dupBytes = dups.reduce((s, g) => s + g.size_bytes * (g.files.length - 1), 0);
      const oldBytes = olds.reduce((s, f) => s + f.size_bytes, 0);

      setSections([
        {
          key: "junk",
          label: "Junk files",
          count: categories.reduce((s, c) => s + c.file_count, 0),
          sizeBytes: junkBytes,
          detail: categories.map((c) => c.name).join(", ") || "None",
        },
        {
          key: "large",
          label: "Large files",
          count: large.length,
          sizeBytes: largeBytes,
          detail: "Over 50 MB in your home folder",
        },
        {
          key: "duplicates",
          label: "Duplicates",
          count: dups.reduce((s, g) => s + g.files.length, 0),
          sizeBytes: dupBytes,
          detail: `${dups.length} groups of identical files`,
        },
        {
          key: "old",
          label: "Old files",
          count: olds.length,
          sizeBytes: oldBytes,
          detail: "Not modified in 90+ days",
        },
      ]);
      setHasRun(true);
    } finally {
      setLoading(false);
    }
  }

  const total = sections.reduce((s, x) => s + x.sizeBytes, 0);

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ScanLine className="size-4" /> Smart Scan
            </CardTitle>
            <CardDescription>
              One scan across junk, large files, duplicates, and old files.
            </CardDescription>
          </div>
          <Button onClick={run} disabled={loading} size="lg">
            <Sparkles className="size-4" />
            {loading ? "Scanning…" : "Start Smart Scan"}
          </Button>
        </CardHeader>
      </Card>

      {hasRun && (
        <>
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-4xl font-semibold">{formatBytes(total)}</p>
              <p className="text-sm text-muted-foreground">potentially reclaimable</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {sections.map((s) => (
              <Card key={s.key}>
                <CardHeader>
                  <CardTitle className="text-sm">{s.label}</CardTitle>
                  <CardDescription className="truncate" title={s.detail}>
                    {s.detail}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  <p className="text-xl font-semibold">{formatBytes(s.sizeBytes)}</p>
                  <Badge variant="secondary" className="w-fit">
                    {s.count.toLocaleString()} items
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
