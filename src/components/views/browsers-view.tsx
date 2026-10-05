import { useEffect, useState } from "react";
import { Globe, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { api, type BrowserEntry } from "@/lib/api";
import { formatBytes } from "@/lib/format";

export function BrowsersView() {
  const [entries, setEntries] = useState<BrowserEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      setEntries(await api.browserEntries());
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }

  function toggle(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  async function clean() {
    const paths = entries.filter((e) => selected.has(e.path)).map((e) => e.path);
    if (!paths.length) return;
    setCleaning(true);
    try {
      const report = await api.clean(paths);
      toast.success(`Emptied browser caches — ${formatBytes(report.cleaned_bytes)} freed`);
      refresh();
    } finally {
      setCleaning(false);
    }
  }

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-4" /> Browser cleaner
          </CardTitle>
          <CardDescription>Safari / Chrome / Firefox cache folders.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {entries.length === 0 && !loading && (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No browser caches found.
          </p>
        )}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col divide-y">
            {entries.map((e) => (
              <label
                key={e.id}
                className="flex cursor-pointer items-center gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <Checkbox
                  checked={selected.has(e.path)}
                  onCheckedChange={() => toggle(e.path)}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {e.browser} <span className="text-muted-foreground">· {e.kind}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{e.path}</p>
                </div>
                <Badge variant="secondary">{formatBytes(e.size_bytes)}</Badge>
              </label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
      <div className="sticky bottom-0 flex items-center gap-3 border-t bg-background/95 py-3 backdrop-blur">
        <Button variant="destructive" className="w-full" onClick={clean} disabled={selected.size === 0 || cleaning}>
          <Trash2 className="size-4" />
          {cleaning ? "Cleaning…" : "Empty selected caches"}
        </Button>
      </div>
    </>
  );
}
