import { useState } from "react";
import { Archive, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, type OldFile } from "@/lib/api";
import { formatBytes } from "@/lib/format";

export function OldFilesView() {
  const [files, setFiles] = useState<OldFile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [days, setDays] = useState("90");
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  async function search() {
    setLoading(true);
    try {
      setFiles(await api.oldFiles(Number(days)));
      setSelected(new Set());
      setHasRun(true);
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

  async function removeSelected() {
    const paths = [...selected];
    if (!paths.length) return;
    setCleaning(true);
    try {
      const report = await api.clean(paths);
      toast.success(`Moved ${report.cleaned_items} file(s) to Trash — ${formatBytes(report.cleaned_bytes)} freed`);
      setFiles((prev) => prev.filter((f) => !selected.has(f.path)));
      setSelected(new Set());
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
            <Archive className="size-4" /> Old & unused files
          </CardTitle>
          <CardDescription>Files in your home folder not modified recently.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={(v) => setDays(v ?? "90")}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30+ days old</SelectItem>
              <SelectItem value="90">90+ days old</SelectItem>
              <SelectItem value="180">180+ days old</SelectItem>
              <SelectItem value="365">1+ year old</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={search} disabled={loading}>
            {loading ? "Scanning…" : "Find old files"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {hasRun && files.length === 0 && (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No old files found.
          </p>
        )}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col divide-y">
            {files.map((f) => (
              <label
                key={f.path}
                className="flex cursor-pointer items-center gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <Checkbox checked={selected.has(f.path)} onCheckedChange={() => toggle(f.path)} />
                <span className="min-w-0 flex-1 truncate text-sm" title={f.path}>
                  {f.path}
                </span>
                <Badge variant="outline">{f.days_old}d old</Badge>
                <Badge variant="secondary">{formatBytes(f.size_bytes)}</Badge>
              </label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
      <div className="sticky bottom-0 flex items-center gap-3 border-t bg-background/95 py-3 backdrop-blur">
        <Button variant="destructive" className="w-full" onClick={removeSelected} disabled={selected.size === 0 || cleaning}>
          <Trash2 className="size-4" />
          {cleaning ? "Cleaning…" : `Move ${selected.size} selected to Trash`}
        </Button>
      </div>
    </>
  );
}
