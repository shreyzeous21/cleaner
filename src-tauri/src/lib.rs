mod scanner;

use scanner::{
    AppInfo, BrowserEntry, CategoryScan, CleanReport, DetailFile, DiskUsage, DuplicateGroup,
    HistoryEntry, LargeFile, Leftover, OldFile, StartupItem,
};

/// Scan all junk categories on the system.
#[tauri::command]
async fn scan() -> Result<Vec<CategoryScan>, String> {
    tauri::async_runtime::spawn_blocking(scanner::scan_all)
        .await
        .map_err(|e| e.to_string())
}

/// Move selected paths to the Trash.
#[tauri::command]
async fn clean(paths: Vec<String>) -> Result<CleanReport, String> {
    tauri::async_runtime::spawn_blocking(move || scanner::clean_paths(&paths))
        .await
        .map_err(|e| e.to_string())
}

/// Get root disk usage.
#[tauri::command]
fn disk_usage() -> Result<DiskUsage, String> {
    scanner::disk_usage()
}

/// Find the largest files in the home folder.
#[tauri::command]
async fn large_files(limit: usize) -> Result<Vec<LargeFile>, String> {
    tauri::async_runtime::spawn_blocking(move || scanner::large_files(limit))
        .await
        .map_err(|e| e.to_string())
}

/// List installed applications.
#[tauri::command]
async fn list_apps() -> Result<Vec<AppInfo>, String> {
    tauri::async_runtime::spawn_blocking(scanner::list_apps)
        .await
        .map_err(|e| e.to_string())
}

/// Find leftover data for an application.
#[tauri::command]
async fn app_leftovers(app_name: String) -> Result<Vec<Leftover>, String> {
    tauri::async_runtime::spawn_blocking(move || scanner::app_leftovers(&app_name))
        .await
        .map_err(|e| e.to_string())
}

/// Uninstall an application and selected leftovers.
#[tauri::command]
async fn uninstall_app(app_path: String, leftover_paths: Vec<String>) -> Result<CleanReport, String> {
    tauri::async_runtime::spawn_blocking(move || scanner::uninstall_app(&app_path, &leftover_paths))
        .await
        .map_err(|e| e.to_string())
}

/// Cleanup history entries.
#[tauri::command]
fn cleanup_history() -> Vec<HistoryEntry> {
    scanner::read_history()
}

/// Clear cleanup history.
#[tauri::command]
fn clear_history() {
    scanner::clear_history()
}

/// Find duplicate files.
#[tauri::command]
async fn duplicates() -> Result<Vec<DuplicateGroup>, String> {
    tauri::async_runtime::spawn_blocking(|| scanner::find_duplicates(50))
        .await
        .map_err(|e| e.to_string())
}

/// Browser cache entries.
#[tauri::command]
async fn browser_entries() -> Result<Vec<BrowserEntry>, String> {
    tauri::async_runtime::spawn_blocking(scanner::browser_entries)
        .await
        .map_err(|e| e.to_string())
}

/// Apps that launch at login.
#[tauri::command]
async fn startup_items() -> Result<Vec<StartupItem>, String> {
    tauri::async_runtime::spawn_blocking(scanner::startup_items)
        .await
        .map_err(|e| e.to_string())
}

/// Disable a startup item.
#[tauri::command]
async fn disable_startup_item(path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || scanner::disable_startup(&path))
        .await
        .map_err(|e| e.to_string())?
}

/// Files not modified in `days` days.
#[tauri::command]
async fn old_files(days: u64) -> Result<Vec<OldFile>, String> {
    tauri::async_runtime::spawn_blocking(move || scanner::old_files(days, 100))
        .await
        .map_err(|e| e.to_string())
}

/// Permanently empty the system Trash / Recycle Bin.
#[tauri::command]
async fn empty_trash() -> Result<CleanReport, String> {
    tauri::async_runtime::spawn_blocking(scanner::empty_trash)
        .await
        .map_err(|e| e.to_string())?
}

/// Top files inside a category path.
#[tauri::command]
async fn category_details(path: String) -> Result<Vec<DetailFile>, String> {
    tauri::async_runtime::spawn_blocking(move || scanner::category_details(&path, 50))
        .await
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            scan, clean, disk_usage, large_files, list_apps, app_leftovers, uninstall_app,
            cleanup_history, clear_history, duplicates, browser_entries, startup_items,
            disable_startup_item, old_files, category_details, empty_trash
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
