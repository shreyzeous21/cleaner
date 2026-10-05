import { useEffect, useState } from "react";
import { PackageOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { api, type AppInfo, type Leftover } from "@/lib/api";
import { formatBytes } from "@/lib/format";

export function AppsView() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<AppInfo | null>(null);
  const [leftovers, setLeftovers] = useState<Leftover[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loadingLeftovers, setLoadingLeftovers] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      setApps(await api.listApps());
    } finally {
      setLoading(false);
    }
  }

  async function selectApp(app: AppInfo) {
    setSelected(app);
    setChecked(new Set());
    setLoadingLeftovers(true);
    try {
      const found = await api.appLeftovers(app.name);
      setLeftovers(found);
      setChecked(new Set(found.map((l) => l.path)));
    } finally {
      setLoadingLeftovers(false);
    }
  }

  function toggle(path: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  async function uninstall() {
    if (!selected) return;
    setRemoving(true);
    try {
      const report = await api.uninstallApp(selected.path, [...checked]);
      toast.success(
        `Uninstalled ${selected.name} — ${formatBytes(report.cleaned_bytes)} freed`,
      );
      setSelected(null);
      setLeftovers([]);
      refresh();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Installed apps</CardTitle>
            <CardDescription>{apps.length} apps found</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-y-auto max-h-[28rem]">
            <div className="flex flex-col divide-y">
              {apps.map((app) => (
                <button
                  key={app.path}
                  onClick={() => selectApp(app)}
                  className={`flex items-center gap-3 py-2.5 text-left first:pt-0 last:pb-0 hover:bg-muted/50 rounded-md px-2 ${
                    selected?.path === app.path ? "bg-muted" : ""
                  }`}
                >
                  <div className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                    <PackageOpen className="size-4" />
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {app.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatBytes(app.size_bytes)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selected ? `Uninstall ${selected.name}` : "Select an app"}
          </CardTitle>
          <CardDescription>
            {selected
              ? "Related leftover data is selected by default — uncheck what you want to keep."
              : "Pick an app on the left to see its data and uninstall it."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {selected && (
            <>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="truncate text-sm font-medium">{selected.path}</span>
                <Badge variant="secondary">{formatBytes(selected.size_bytes)}</Badge>
              </div>

              {loadingLeftovers ? (
                <p className="text-sm text-muted-foreground">Looking for leftovers…</p>
              ) : leftovers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No leftover data found.</p>
              ) : (
                <div className="overflow-y-auto max-h-56">
                  <div className="flex flex-col divide-y">
                    {leftovers.map((l) => (
                      <label
                        key={l.path}
                        className="flex cursor-pointer items-center gap-3 py-2 first:pt-0 last:pb-0"
                      >
                        <Checkbox
                          checked={checked.has(l.path)}
                          onCheckedChange={() => toggle(l.path)}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm" title={l.path}>
                          {l.path.split("/").slice(-2).join("/")}
                        </span>
                        <Badge variant="secondary">{formatBytes(l.size_bytes)}</Badge>
                      </label>
                    ))}
                  </div>
                </div>
              )}

            </>
          )}
        </CardContent>
      </Card>

      {selected && (
        <div className="sticky bottom-0 flex items-center gap-3 border-t bg-background/95 py-3 backdrop-blur lg:col-span-2">
          <Button variant="destructive" className="w-full" onClick={uninstall} disabled={removing}>
            <Trash2 className="size-4" />
            {removing ? "Uninstalling…" : `Uninstall ${selected.name} to Trash`}
          </Button>
        </div>
      )}
    </div>
  );
}
