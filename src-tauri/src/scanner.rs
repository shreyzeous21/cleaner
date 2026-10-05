use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// One junk category discovered on disk.
#[derive(Serialize, Clone, Debug)]
pub struct CategoryScan {
    pub id: String,
    pub name: String,
    pub description: String,
    pub path: String,
    pub size_bytes: u64,
    pub file_count: u64,
}

/// Result of a clean run.
#[derive(Serialize, Clone, Debug)]
pub struct CleanReport {
    pub cleaned_bytes: u64,
    pub cleaned_items: u64,
    pub failed_items: u64,
}

/// Root-level disk usage for the main volume.
#[derive(Serialize, Clone, Debug)]
pub struct DiskUsage {
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub available_bytes: u64,
}

/// A large file found during a scan.
#[derive(Serialize, Clone, Debug)]
pub struct LargeFile {
    pub path: String,
    pub size_bytes: u64,
}

/// Static definition of a junk category: (id, name, description, absolute path).
fn category_defs() -> Vec<(String, String, String, PathBuf)> {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/"));
    vec![
        (
            "caches".into(),
            "System Caches".into(),
            "App caches that can usually be rebuilt safely.".into(),
            home.join("Library/Caches"),
        ),
        (
            "logs".into(),
            "Log Files".into(),
            "Old diagnostic and app logs.".into(),
            home.join("Library/Logs"),
        ),
        (
            "trash".into(),
            "Trash".into(),
            "Files already sitting in the Trash.".into(),
            home.join(".Trash"),
        ),
        (
            "npm".into(),
            "NPM Cache".into(),
            "Cached npm packages; safe to redownload later.".into(),
            home.join(".npm"),
        ),
    ]
}

/// Recursively compute (total bytes, file count) under `path`.
fn dir_stats(path: &Path) -> (u64, u64) {
    let mut size = 0u64;
    let mut count = 0u64;
    if path.is_file() {
        if let Ok(meta) = path.metadata() {
            return (meta.len(), 1);
        }
        return (0, 0);
    }
    for entry in WalkDir::new(path)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            if let Ok(meta) = entry.metadata() {
                size = size.saturating_add(meta.len());
                count += 1;
            }
        }
    }
    (size, count)
}

/// Scan every category and return those that exist on disk.
pub fn scan_all() -> Vec<CategoryScan> {
    category_defs()
        .into_iter()
        .filter_map(|(id, name, description, path)| {
            if !path.exists() {
                return None;
            }
            let (size_bytes, file_count) = dir_stats(&path);
            Some(CategoryScan {
                id,
                name,
                description,
                path: path.to_string_lossy().to_string(),
                size_bytes,
                file_count,
            })
        })
        .collect()
}

/// Move each path to the Trash and report how much was freed.
///
/// Directories are emptied (their children are trashed) instead of removing the
/// directory itself, since macOS protects some of them (e.g. `/tmp`,
/// `~/Library/Caches`). Paths outside the user's home are rejected as a
/// safety measure.
pub fn clean_paths(paths: &[String]) -> CleanReport {
    let mut report = CleanReport {
        cleaned_bytes: 0,
        cleaned_items: 0,
        failed_items: 0,
    };
    let home = dirs::home_dir().unwrap_or_default();

    for p in paths {
        let path = Path::new(p);
        if !path.starts_with(&home) {
            eprintln!("skipping {}: outside home directory", path.display());
            continue;
        }

        let targets: Vec<PathBuf> = if path.is_dir() {
            match fs::read_dir(path) {
                Ok(entries) => entries.filter_map(|e| e.ok().map(|e| e.path())).collect(),
                Err(e) => {
                    eprintln!("skipping {}: {}", path.display(), e);
                    continue;
                }
            }
        } else {
            vec![path.to_path_buf()]
        };

        for target in targets {
            let (size, _) = dir_stats(&target);
            match trash::delete(&target) {
                Ok(_) => {
                    report.cleaned_bytes = report.cleaned_bytes.saturating_add(size);
                    report.cleaned_items += 1;
                }
                Err(e) => {
                    // Skip permission-protected items silently instead of
                    // surfacing an error — macOS blocks some of these by design.
                    eprintln!("skipping {}: {}", target.display(), e);
                }
            }
        }
    }
    record_history("Junk cleanup", &report);
    report
}

/// An installed application.
#[derive(Serialize, Clone, Debug)]
pub struct AppInfo {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
}

/// Leftover data tied to an application.
#[derive(Serialize, Clone, Debug)]
pub struct Leftover {
    pub path: String,
    pub size_bytes: u64,
}

fn app_scan_dirs() -> Vec<PathBuf> {
    let mut dirs_out = vec![PathBuf::from("/Applications")];
    if let Some(home) = dirs::home_dir() {
        dirs_out.push(home.join("Applications"));
    }
    dirs_out
}

/// List installed .app bundles with their sizes, sorted by name.
pub fn list_apps() -> Vec<AppInfo> {
    let mut apps = Vec::new();
    for dir in app_scan_dirs() {
        let Ok(entries) = fs::read_dir(&dir) else {
            continue;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map(|e| e == "app").unwrap_or(false) {
                let name = path
                    .file_stem()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                let (size, _) = dir_stats(&path);
                apps.push(AppInfo {
                    name,
                    path: path.to_string_lossy().to_string(),
                    size_bytes: size,
                });
            }
        }
    }
    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps
}

/// Find leftover support/cache/preference files related to `app_name`.
pub fn app_leftovers(app_name: &str) -> Vec<Leftover> {
    let Some(home) = dirs::home_dir() else {
        return vec![];
    };
    let needle: String = app_name
        .to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric())
        .collect();
    if needle.len() < 3 {
        return vec![];
    }

    let search_roots = [
        "Library/Application Support",
        "Library/Caches",
        "Library/Preferences",
        "Library/Logs",
        "Library/Saved Application State",
        "Library/Containers",
    ];

    let mut out = Vec::new();
    for root in search_roots {
        let root = home.join(root);
        let Ok(entries) = fs::read_dir(&root) else {
            continue;
        };
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_lowercase();
            let normalized: String = name.chars().filter(|c| c.is_alphanumeric()).collect();
            if normalized.contains(&needle) {
                let path = entry.path();
                let (size, _) = dir_stats(&path);
                out.push(Leftover {
                    path: path.to_string_lossy().to_string(),
                    size_bytes: size,
                });
            }
        }
    }
    out.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
    out
}

/// Uninstall an app: move the bundle and any selected leftovers to Trash.
/// Only bundles under /Applications (or ~/Applications) and leftovers under
/// the user's home are accepted.
pub fn uninstall_app(app_path: &str, leftover_paths: &[String]) -> CleanReport {
    let mut report = CleanReport {
        cleaned_bytes: 0,
        cleaned_items: 0,
        failed_items: 0,
    };
    let home = dirs::home_dir().unwrap_or_default();
    let app = Path::new(app_path);

    let app_allowed = app_path.ends_with(".app")
        && (app.starts_with("/Applications") || app.starts_with(home.join("Applications")));

    let mut targets: Vec<&Path> = Vec::new();
    if app_allowed && app.exists() {
        targets.push(app);
    } else {
        eprintln!("refusing to uninstall {}", app_path);
    }
    for p in leftover_paths {
        let p = Path::new(p);
        if p.starts_with(&home) && p.exists() {
            targets.push(p);
        }
    }

    for target in targets {
        let (size, _) = dir_stats(target);
        match trash::delete(target) {
            Ok(_) => {
                report.cleaned_bytes = report.cleaned_bytes.saturating_add(size);
                report.cleaned_items += 1;
            }
            Err(e) => eprintln!("skipping {}: {}", target.display(), e),
        }
    }
    record_history("App uninstall", &report);
    report
}

/// Which kind of item a cleanup history entry refers to.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
pub struct HistoryEntry {
    pub timestamp: String,
    pub kind: String,
    pub cleaned_bytes: u64,
    pub cleaned_items: u64,
}

fn history_file() -> Option<PathBuf> {
    dirs::data_dir().map(|d| d.join("cleaner").join("history.json"))
}

pub fn read_history() -> Vec<HistoryEntry> {
    let Some(path) = history_file() else {
        return vec![];
    };
    let Ok(data) = fs::read_to_string(&path) else {
        return vec![];
    };
    serde_json::from_str(&data).unwrap_or_default()
}

pub fn record_history(kind: &str, report: &CleanReport) {
    let Some(path) = history_file() else { return };
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let mut entries = read_history();
    entries.insert(
        0,
        HistoryEntry {
            timestamp: chrono::Local::now().format("%Y-%m-%d %H:%M").to_string(),
            kind: kind.to_string(),
            cleaned_bytes: report.cleaned_bytes,
            cleaned_items: report.cleaned_items,
        },
    );
    entries.truncate(50);
    if let Ok(data) = serde_json::to_string_pretty(&entries) {
        let _ = fs::write(&path, data);
    }
}

pub fn clear_history() {
    if let Some(path) = history_file() {
        let _ = fs::remove_file(path);
    }
}

/// A duplicate group: files that look identical (same size + content hash).
#[derive(Serialize, Clone, Debug)]
pub struct DuplicateGroup {
    pub size_bytes: u64,
    pub files: Vec<String>,
}

fn sample_hash(path: &Path, size: u64) -> Option<u64> {
    use std::hash::{Hash, Hasher};
    let mut f = fs::File::open(path).ok()?;
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    size.hash(&mut hasher);
    let mut buf = vec![0u8; 64 * 1024];
    let n = std::io::Read::read(&mut f, &mut buf).ok()?;
    buf[..n].hash(&mut hasher);
    Some(hasher.finish())
}

pub fn find_duplicates(limit: usize) -> Vec<DuplicateGroup> {
    let Some(home) = dirs::home_dir() else {
        return vec![];
    };
    let mut by_size: std::collections::HashMap<u64, Vec<PathBuf>> =
        std::collections::HashMap::new();

    for entry in WalkDir::new(&home)
        .max_depth(5)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| !e.path().starts_with(home.join("Library")))
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            if let Ok(meta) = entry.metadata() {
                let size = meta.len();
                if size > 1024 * 1024 {
                    by_size
                        .entry(size)
                        .or_default()
                        .push(entry.path().to_path_buf());
                }
            }
        }
    }

    let mut by_hash: std::collections::HashMap<(u64, u64), Vec<PathBuf>> =
        std::collections::HashMap::new();
    for (size, files) in by_size {
        if files.len() < 2 {
            continue;
        }
        for f in files {
            if let Some(h) = sample_hash(&f, size) {
                by_hash.entry((size, h)).or_default().push(f);
            }
        }
    }

    let mut groups: Vec<DuplicateGroup> = by_hash
        .into_iter()
        .filter(|(_, files)| files.len() >= 2)
        .map(|((size, _), files)| DuplicateGroup {
            size_bytes: size,
            files: files
                .iter()
                .map(|p| p.to_string_lossy().to_string())
                .collect(),
        })
        .collect();
    groups.sort_by(|a, b| {
        (b.files.len() as u64 * b.size_bytes).cmp(&(a.files.len() as u64 * a.size_bytes))
    });
    groups.truncate(limit);
    groups
}

/// Browser cache category entry.
#[derive(Serialize, Clone, Debug)]
pub struct BrowserEntry {
    pub id: String,
    pub browser: String,
    pub kind: String,
    pub path: String,
    pub size_bytes: u64,
}

pub fn browser_entries() -> Vec<BrowserEntry> {
    let Some(home) = dirs::home_dir() else {
        return vec![];
    };
    let candidates: Vec<(&str, &str, &str, PathBuf)> = vec![
        (
            "safari",
            "Safari",
            "Cache",
            home.join("Library/Caches/com.apple.Safari"),
        ),
        (
            "safari-appcache",
            "Safari",
            "Web data",
            home.join("Library/Caches/com.apple.Safari.WebKit.WebContent"),
        ),
        (
            "chrome",
            "Chrome",
            "Cache",
            home.join("Library/Caches/Google/Chrome"),
        ),
        (
            "chrome-data",
            "Chrome",
            "Profile cache",
            home.join("Library/Application Support/Google/Chrome/Default/Cache"),
        ),
        (
            "firefox",
            "Firefox",
            "Cache",
            home.join("Library/Caches/Firefox"),
        ),
        (
            "firefox-data",
            "Firefox",
            "Profile cache",
            home.join("Library/Application Support/Firefox/Profiles"),
        ),
    ];
    candidates
        .into_iter()
        .filter(|(_, _, _, p)| p.exists())
        .map(|(id, browser, kind, path)| {
            let (size_bytes, _) = dir_stats(&path);
            BrowserEntry {
                id: id.to_string(),
                browser: browser.to_string(),
                kind: kind.to_string(),
                path: path.to_string_lossy().to_string(),
                size_bytes,
            }
        })
        .collect()
}

/// An app that launches at login.
#[derive(Serialize, Clone, Debug)]
pub struct StartupItem {
    pub name: String,
    pub path: String,
}

pub fn startup_items() -> Vec<StartupItem> {
    let mut roots = vec![
        PathBuf::from("/Library/LaunchAgents"),
        PathBuf::from("/Library/LaunchDaemons"),
    ];
    if let Some(home) = dirs::home_dir() {
        roots.insert(0, home.join("Library/LaunchAgents"));
    }
    let mut out = Vec::new();
    for root in roots {
        let Ok(entries) = fs::read_dir(&root) else {
            continue;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map(|e| e == "plist").unwrap_or(false) {
                out.push(StartupItem {
                    name: path
                        .file_stem()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string(),
                    path: path.to_string_lossy().to_string(),
                });
            }
        }
    }
    out.sort_by(|a, b| a.name.cmp(&b.name));
    out
}

/// Disable a startup item by moving its plist to the Trash.
pub fn disable_startup(path: &str) -> Result<(), String> {
    let p = Path::new(path);
    let allowed = ["/Library/LaunchAgents", "/Library/LaunchDaemons"]
        .iter()
        .any(|d| p.starts_with(d))
        || dirs::home_dir()
            .map(|h| p.starts_with(h.join("Library/LaunchAgents")))
            .unwrap_or(false);
    if !allowed || !path.ends_with(".plist") {
        return Err("refusing to disable this item".into());
    }
    trash::delete(p).map_err(|e| e.to_string())
}

/// A file not modified for a long time.
#[derive(Serialize, Clone, Debug)]
pub struct OldFile {
    pub path: String,
    pub size_bytes: u64,
    pub days_old: u64,
}

pub fn old_files(days: u64, limit: usize) -> Vec<OldFile> {
    let Some(home) = dirs::home_dir() else {
        return vec![];
    };
    let now = std::time::SystemTime::now();
    let min_age = std::time::Duration::from_secs(days * 24 * 60 * 60);
    let mut out: Vec<OldFile> = Vec::new();

    for entry in WalkDir::new(&home)
        .max_depth(5)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| !e.path().starts_with(home.join("Library")))
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            if let Ok(meta) = entry.metadata() {
                if let Ok(modified) = meta.modified() {
                    if let Ok(age) = now.duration_since(modified) {
                        if age > min_age && meta.len() > 1024 * 1024 {
                            out.push(OldFile {
                                path: entry.path().to_string_lossy().to_string(),
                                size_bytes: meta.len(),
                                days_old: age.as_secs() / 86400,
                            });
                        }
                    }
                }
            }
        }
    }
    out.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
    out.truncate(limit);
    out
}

/// A file inside a category, for the details view.
#[derive(Serialize, Clone, Debug)]
pub struct DetailFile {
    pub path: String,
    pub size_bytes: u64,
}

pub fn category_details(path: &str, limit: usize) -> Vec<DetailFile> {
    let mut out = Vec::new();
    for entry in WalkDir::new(path)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            if let Ok(meta) = entry.metadata() {
                out.push(DetailFile {
                    path: entry.path().to_string_lossy().to_string(),
                    size_bytes: meta.len(),
                });
            }
        }
    }
    out.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
    out.truncate(limit);
    out
}

/// Permanently empty the system Trash / Recycle Bin (OS-specific).
pub fn empty_trash() -> Result<CleanReport, String> {
    let mut report = CleanReport {
        cleaned_bytes: 0,
        cleaned_items: 0,
        failed_items: 0,
    };

    #[cfg(target_os = "windows")]
    {
        let status = std::process::Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                "Clear-RecycleBin -Force -ErrorAction Stop",
            ])
            .status()
            .map_err(|e| e.to_string())?;
        if status.success() {
            report.cleaned_items = 1;
            record_history("Empty Recycle Bin", &report);
            return Ok(report);
        }
        return Err("Could not empty the Recycle Bin".into());
    }

    #[cfg(target_os = "macos")]
    {
        // Measure first so we can report freed space.
        if let Some(home) = dirs::home_dir() {
            let trash_dir = home.join(".Trash");
            if let Ok(entries) = fs::read_dir(&trash_dir) {
                for entry in entries.flatten() {
                    let (size, _) = dir_stats(&entry.path());
                    report.cleaned_bytes = report.cleaned_bytes.saturating_add(size);
                    report.cleaned_items += 1;
                }
            }
            // Empty via Finder — this handles protected/locked items that
            // plain fs::remove fails on.
            let status = std::process::Command::new("osascript")
                .args([
                    "-e",
                    "tell application \"Finder\" to empty trash",
                ])
                .status()
                .map_err(|e| e.to_string())?;
            if !status.success() {
                return Err(
                    "macOS blocked emptying the Trash. Allow Cleaner to control Finder in System Settings → Privacy & Security → Automation, then try again."
                        .into(),
                );
            }
            // Verify it's actually empty now.
            let after = std::process::Command::new("osascript")
                .args([
                    "-e",
                    "tell application \"Finder\" to count items in trash",
                ])
                .output()
                .ok()
                .and_then(|o| String::from_utf8(o.stdout).ok())
                .and_then(|s| s.trim().parse::<u64>().ok())
                .unwrap_or(0);
            if after > 0 {
                return Err(
                    "Could not empty the Trash. Check System Settings → Privacy & Security → Automation."
                        .into(),
                );
            }
        }
        record_history("Empty Trash", &report);
        return Ok(report);
    }

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        let trash_dir = dirs::data_dir().map(|d| d.join("Trash"));
        if let Some(dir) = trash_dir {
            if let Ok(entries) = fs::read_dir(&dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    let (size, _) = dir_stats(&path);
                    let removed = if path.is_dir() {
                        fs::remove_dir_all(&path).is_ok()
                    } else {
                        fs::remove_file(&path).is_ok()
                    };
                    if removed {
                        report.cleaned_bytes = report.cleaned_bytes.saturating_add(size);
                        report.cleaned_items += 1;
                    }
                }
            }
        }
        record_history("Empty Trash", &report);
        Ok(report)
    }
}

/// Find the largest files in the user's home folder (skips Library and
/// permission-protected entries), capped at `limit` results.
pub fn large_files(limit: usize) -> Vec<LargeFile> {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/"));
    let mut files: Vec<(PathBuf, u64)> = Vec::new();
    for entry in WalkDir::new(&home)
        .max_depth(6)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| !e.path().starts_with(home.join("Library")))
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            if let Ok(meta) = entry.metadata() {
                if meta.len() > 50 * 1024 * 1024 {
                    files.push((entry.path().to_path_buf(), meta.len()));
                }
            }
        }
    }
    files.sort_by(|a, b| b.1.cmp(&a.1));
    files
        .into_iter()
        .take(limit)
        .map(|(p, s)| LargeFile {
            path: p.to_string_lossy().to_string(),
            size_bytes: s,
        })
        .collect()
}

/// Disk usage of the root volume.
pub fn disk_usage() -> Result<DiskUsage, String> {
    let total = fs2::total_space("/").map_err(|e| e.to_string())?;
    let available = fs2::available_space("/").map_err(|e| e.to_string())?;
    Ok(DiskUsage {
        total_bytes: total,
        used_bytes: total.saturating_sub(available),
        available_bytes: available,
    })
}
