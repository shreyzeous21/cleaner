import { useEffect, useState } from "react";
import { FileIcon, FileSearch, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { api, type LargeFile } from "@/lib/api";
import { formatBytes } from "@/lib/format";

export function LargeFilesView() {
  const [files, setFiles] = useState<LargeFile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search() {
    setLoading(true);
    try {
      const result = await api.largeFiles(50);
      setFiles(result);
      setSelected(new Set());
      setHasSearched(true);
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
    const paths = files.filter((f) => selected.has(f.path)).map((f) => f.path);
    if (!paths.length) return;
    setCleaning(true);
    try {
      const report = await api.clean(paths);
      toast.success(
        `Moved ${report.cleaned_items} file(s) to Trash — ${formatBytes(report.cleaned_bytes)} freed`,
      );
      setFiles((prev) => prev.filter((f) => !selected.has(f.path)));
      setSelected(new Set());
    } finally {
      setCleaning(false);
    }
  }

  const selectedBytes = files
    .filter((f) => selected.has(f.path))
    .reduce((s, f) => s + f.size_bytes, 0);

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Large files</CardTitle>
          <CardDescription>
            Files over 50 MB in your home folder, biggest first.
          </CardDescription>
        </div>
        <Button onClick={search} disabled={loading}>
          <FileSearch className="size-4" />
          {loading ? "Searching…" : "Find large files"}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {hasSearched && files.length === 0 && (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No files over 50 MB found. 
          </p>
        )}

        {files.length > 0 && (
          <div className="flex flex-col divide-y">
            {files.map((f) => (
                <label
                  key={f.path}
                  className="flex cursor-pointer items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <Checkbox
                    checked={selected.has(f.path)}
                    onCheckedChange={() => toggle(f.path)}
                  />
                  <div className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                    <FileIcon className="size-4" />
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm" title={f.path}>
                    {f.path.replace(/^.*\//, "")}
                    <span className="block truncate text-xs text-muted-foreground">
                      {f.path}
                    </span>
                  </span>
                  <Badge variant="secondary">{formatBytes(f.size_bytes)}</Badge>
                </label>
              ))}
          </div>
        )}

      </CardContent>
    </Card>
      <div className="sticky bottom-0 flex items-center gap-3 border-t bg-background/95 py-3 backdrop-blur">
        <Button
          variant="destructive"
          className="w-full"
          onClick={removeSelected}
          disabled={selected.size === 0 || cleaning}
        >
          <Trash2 className="size-4" />
          Move {selected.size > 0 ? formatBytes(selectedBytes) : ""} to Trash
        </Button>
      </div>
    </>
  );
}
