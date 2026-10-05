import { useEffect, useState } from "react";
import { Power, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, type StartupItem } from "@/lib/api";

export function StartupView() {
  const [items, setItems] = useState<StartupItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      setItems(await api.startupItems());
    } finally {
      setLoading(false);
    }
  }

  async function disable(item: StartupItem) {
    try {
      await api.disableStartupItem(item.path);
      toast.success(`Disabled "${item.name}" (plist moved to Trash)`);
      setItems((prev) => prev.filter((i) => i.path !== item.path));
    } catch (e) {
      toast.error(`Could not disable: ${e}`);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="size-4" /> Startup apps
          </CardTitle>
          <CardDescription>
            Login items and launch agents. Disabling moves the plist to Trash.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 && !loading && (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No startup items found.
          </p>
        )}
        <div className="overflow-y-auto max-h-[26rem]">
          <div className="flex flex-col divide-y">
            {items.map((item) => (
              <div key={item.path} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.path}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => disable(item)}>
                  <Power className="size-3.5" /> Disable
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
