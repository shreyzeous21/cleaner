import { invoke } from "@tauri-apps/api/core";

export interface CategoryScan {
  id: string;
  name: string;
  description: string;
  path: string;
  size_bytes: number;
  file_count: number;
}

export interface CleanReport {
  cleaned_bytes: number;
  cleaned_items: number;
  failed_items: number;
}

export interface DiskUsage {
  total_bytes: number;
  used_bytes: number;
  available_bytes: number;
}

export interface LargeFile {
  path: string;
  size_bytes: number;
}

export interface DuplicateGroup {
  size_bytes: number;
  files: string[];
}

export interface BrowserEntry {
  id: string;
  browser: string;
  kind: string;
  path: string;
  size_bytes: number;
}

export interface StartupItem {
  name: string;
  path: string;
}

export interface OldFile {
  path: string;
  size_bytes: number;
  days_old: number;
}

export interface DetailFile {
  path: string;
  size_bytes: number;
}

export interface HistoryEntry {
  timestamp: string;
  kind: string;
  cleaned_bytes: number;
  cleaned_items: number;
}

export interface AppInfo {
  name: string;
  path: string;
  size_bytes: number;
}

export interface Leftover {
  path: string;
  size_bytes: number;
}

export const api = {
  scan: () => invoke<CategoryScan[]>("scan"),
  clean: (paths: string[]) => invoke<CleanReport>("clean", { paths }),
  diskUsage: () => invoke<DiskUsage>("disk_usage"),
  largeFiles: (limit: number) => invoke<LargeFile[]>("large_files", { limit }),
  listApps: () => invoke<AppInfo[]>("list_apps"),
  appLeftovers: (appName: string) => invoke<Leftover[]>("app_leftovers", { appName }),
  uninstallApp: (appPath: string, leftoverPaths: string[]) =>
    invoke<CleanReport>("uninstall_app", { appPath, leftoverPaths }),
  cleanupHistory: () => invoke<HistoryEntry[]>("cleanup_history"),
  clearHistory: () => invoke<void>("clear_history"),
  duplicates: () => invoke<DuplicateGroup[]>("duplicates"),
  browserEntries: () => invoke<BrowserEntry[]>("browser_entries"),
  startupItems: () => invoke<StartupItem[]>("startup_items"),
  disableStartupItem: (path: string) => invoke<void>("disable_startup_item", { path }),
  oldFiles: (days: number) => invoke<OldFile[]>("old_files", { days }),
  categoryDetails: (path: string) => invoke<DetailFile[]>("category_details", { path }),
  emptyTrash: () => invoke<CleanReport>("empty_trash"),
};
