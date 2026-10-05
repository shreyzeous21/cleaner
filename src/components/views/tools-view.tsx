import { useEffect, useState } from "react";
import { CalendarClock, FolderSearch, History, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, type HistoryEntry } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AutoCleanInterval } from "@/hooks/useAutoClean";

export function ToolsView({
  scan,
  autoCleanInterval,
  onAutoCleanChange,
}: {
  scan: () => void;
  autoCleanInterval: AutoCleanInterval;
  onAutoCleanChange: (key: AutoCleanInterval) => void;
}) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  useEffect(() => {
    api.cleanupHistory().then(setHistory);
  }, []);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderSearch className="size-4" /> Quick rescan
          </CardTitle>
          <CardDescription>Refresh the junk scan results on the dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => {
              scan();
              toast.info("Scanning your system…");
            }}
          >
            Run scan
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="size-4" /> Auto-clean schedule
          </CardTitle>
          <CardDescription>
            Automatically move safe junk (caches, logs, npm cache) to the Trash on a schedule.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Select
            value={autoCleanInterval}
            onValueChange={(v) => onAutoCleanChange(v as AutoCleanInterval)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Choose…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="never">Never</SelectItem>
              <SelectItem value="hourly">Every hour</SelectItem>
              <SelectItem value="daily">Every day</SelectItem>
              <SelectItem value="weekly">Every week</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {autoCleanInterval === "never"
              ? "Auto-clean is off."
              : `Auto-clean runs ${autoCleanInterval} while the app is open.`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="size-4" /> Cleanup history
            </CardTitle>
            <CardDescription>Everything you've moved to Trash with Cleaner.</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await api.clearHistory();
              setHistory([]);
            }}
          >
            Clear
          </Button>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing cleaned yet.</p>
          ) : (
            <div className="overflow-y-auto max-h-56">
              <div className="flex flex-col divide-y">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium">{h.kind}</p>
                      <p className="text-xs text-muted-foreground">{h.timestamp}</p>
                    </div>
                    <p className="font-medium">{formatBytes(h.cleaned_bytes)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="size-4" /> Empty Trash
          </CardTitle>
          <CardDescription>
            Permanently delete everything currently in the Trash (Recycle Bin on Windows). This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              onClick={async () => {
                if (!confirmEmpty) {
                  setConfirmEmpty(true);
                  setTimeout(() => setConfirmEmpty(false), 4000);
                  return;
                }
                setConfirmEmpty(false);
                try {
                  const report = await api.emptyTrash();
                  toast.success(
                    report.cleaned_bytes > 0
                      ? `Trash emptied — ${formatBytes(report.cleaned_bytes)} freed`
                      : "Trash emptied successfully",
                  );
                } catch (e) {
                  toast.error(`Could not empty Trash: ${e}`);
                }
              }}
            >
              <Trash2 className="size-4" />
              {confirmEmpty ? "Click again to confirm" : "Empty Trash now"}
            </Button>
            {confirmEmpty && (
              <p className="text-xs text-destructive">
                This permanently deletes everything in the Trash.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="size-4" /> Safe by default
          </CardTitle>
          <CardDescription>Why this is safe to use.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Files cleaned by Cleaner are moved to the Trash, not erased. You can
          restore anything from the Trash before emptying it.
        </CardContent>
      </Card>
    </div>
  );
}
