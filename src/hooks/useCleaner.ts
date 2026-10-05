import { useCallback, useEffect, useState } from "react";
import { api, type CategoryScan, type DiskUsage } from "@/lib/api";

export function useCleaner() {
  const [categories, setCategories] = useState<CategoryScan[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [disk, setDisk] = useState<DiskUsage | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  const refreshDisk = useCallback(async () => {
    setDisk(await api.diskUsage());
  }, []);

  const scan = useCallback(async () => {
    setScanning(true);
    try {
      const result = await api.scan();
      setCategories(result);
      setSelected(new Set(result.map((c) => c.id)));
      setHasScanned(true);
    } finally {
      setScanning(false);
    }
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clean = useCallback(async () => {
    const paths = categories.filter((c) => selected.has(c.id)).map((c) => c.path);
    if (paths.length === 0) return null;
    setCleaning(true);
    try {
      const report = await api.clean(paths);
      await scan();
      await refreshDisk();
      return report;
    } finally {
      setCleaning(false);
    }
  }, [categories, selected, scan, refreshDisk]);

  useEffect(() => {
    refreshDisk();
    scan(); // auto-scan junk on startup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh the dashboard after a scheduled auto-clean runs.
  useEffect(() => {
    const handler = () => {
      scan();
      refreshDisk();
    };
    window.addEventListener("cleaner:auto-cleaned", handler);
    return () => window.removeEventListener("cleaner:auto-cleaned", handler);
  }, [scan, refreshDisk]);

  const reclaimable = categories
    .filter((c) => selected.has(c.id))
    .reduce((sum, c) => sum + c.size_bytes, 0);

  return {
    categories,
    selected,
    disk,
    scanning,
    cleaning,
    hasScanned,
    reclaimable,
    scan,
    clean,
    toggle,
  };
}
