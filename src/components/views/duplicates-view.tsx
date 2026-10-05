import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { api, type DuplicateGroup } from "@/lib/api";
import { formatBytes } from "@/lib/format";

export function DuplicatesView() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  async function search() {
    setLoading(true);
    try {
      setGroups(await api.duplicates());
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
      toast.success(
        `Moved ${report.cleaned_items} duplicate(s) to Trash — ${formatBytes(report.cleaned_bytes)} freed`,
      );
      setGroups((prev) =>
        prev
          .map((g) => ({ ...g, files: g.files.filter((f) => !selected.has(f)) }))
          .filter((g) => g.files.length >= 2),
      );
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
          <CardTitle>Duplicate files</CardTitle>
          <CardDescription>
            Files with identical size and content (home folder, over 1 MB).
          </CardDescription>
        </div>
        <Button onClick={search} disabled={loading}>
          {loading ? "Scanning…" : "Find duplicates"}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {hasRun && groups.length === 0 && (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No duplicates found.
          </p>
        )}

        <div className="flex flex-col gap-4">
          {groups.map((g, i) => (
            <div key={i} className="rounded-lg border p-3">
              <p className="mb-2 text-sm font-medium">
                {g.files.length} copies · {formatBytes(g.size_bytes)} each
              </p>
              {g.files.map((f) => (
                <label
                  key={f}
                  className="flex cursor-pointer items-center gap-3 py-1.5"
                >
                  <Checkbox
                    checked={selected.has(f)}
                    onCheckedChange={() => toggle(f)}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm" title={f}>
                    {f}
                  </span>
                </label>
              ))}
            </div>
          ))}
        </div>

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
          {cleaning ? "Cleaning…" : `Move ${selected.size} selected to Trash`}
        </Button>
      </div>
    </>
  );
}
