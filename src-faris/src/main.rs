#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{fs, path::Path, process::Command};
use tauri::Manager;

fn app_data_dir_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Gagal membaca folder data aplikasi: {error}"))?;

    fs::create_dir_all(&directory)
        .map_err(|error| format!("Gagal menyiapkan folder data aplikasi: {error}"))?;

    Ok(directory)
}

#[tauri::command]
fn get_app_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    Ok(app_data_dir_path(&app)?.to_string_lossy().into_owned())
}

#[tauri::command]
fn open_app_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    let directory = app_data_dir_path(&app)?;
    open_directory(&directory)?;
    Ok(directory.to_string_lossy().into_owned())
}

fn open_directory(path: &Path) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let result = Command::new("open").arg(path).spawn();

    #[cfg(target_os = "windows")]
    let result = Command::new("explorer").arg(path).spawn();

    #[cfg(all(unix, not(target_os = "macos")))]
    let result = Command::new("xdg-open").arg(path).spawn();

    result
        .map(|_| ())
        .map_err(|error| format!("Gagal membuka folder data aplikasi: {error}"))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![get_app_data_dir, open_app_data_dir])
        .run(tauri::generate_context!())
        .expect("error while running Absen Kelas");
}
