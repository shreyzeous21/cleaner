import { useState } from "react";
import { ChevronDown, ChevronRight, FileArchive, FolderOpen, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { api, type CategoryScan, type DetailFile } from "@/lib/api";
import { formatBytes } from "@/lib/format";

const ICONS: Record<string, React.ReactNode> = {
  caches: <FileArchive className="size-4" />,
  logs: <FolderOpen className="size-4" />,
  trash: <Trash2 className="size-4" />,
  temp: <FileArchive className="size-4" />,
  npm: <FileArchive className="size-4" />,
};

export function CategoryList({
  categories,
  selected,
  onToggle,
}: {
  categories: CategoryScan[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, DetailFile[]>>({});

  async function toggleDetails(id: string, path: string) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!details[id]) {
      const files = await api.categoryDetails(path);
      setDetails((prev) => ({ ...prev, [id]: files }));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Junk found</CardTitle>
        <CardDescription>
          Choose what you want to move to Trash. Click the arrow to see the files.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-y-auto max-h-72">
          <div className="flex flex-col divide-y">
            {categories.map((c) => (
              <div key={c.id}>
                <div className="flex items-center gap-3 py-3 transition-colors first:pt-0 hover:bg-muted/40 rounded-md">
                  <button
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => toggleDetails(c.id, c.path)}
                    aria-label="Toggle details"
                  >
                    {expanded === c.id ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </button>
                  <Checkbox
                    checked={selected.has(c.id)}
                    onCheckedChange={() => onToggle(c.id)}
                  />
                  <div className="grid size-8 place-items-center rounded-md bg-muted text-muted-foreground">
                    {ICONS[c.id] ?? <FileArchive className="size-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.description}</p>
                  </div>
                  <Badge variant="secondary">{c.file_count.toLocaleString()} files</Badge>
                  <span className="w-20 text-right text-sm font-medium">
                    {formatBytes(c.size_bytes)}
                  </span>
                </div>

                {expanded === c.id && (
                  <div className="mb-3 ml-8 rounded-md border bg-muted/40 p-2">
                    {(details[c.id] ?? []).length === 0 ? (
                      <p className="px-2 py-1 text-xs text-muted-foreground">Loading files…</p>
                    ) : (
                      details[c.id].slice(0, 8).map((f) => (
                        <div key={f.path} className="flex items-center justify-between gap-3 px-2 py-1">
                          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={f.path}>
                            {f.path}
                          </span>
                          <span className="text-xs font-medium">{formatBytes(f.size_bytes)}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
