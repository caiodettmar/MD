use std::fs;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::config::AppConfig;
use crate::file_ops::{config_path, session_dir};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TabSnapshot {
    pub id: String,
    pub path: Option<String>,
    pub title: String,
    pub markdown: String,
    pub dirty: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionState {
    pub tabs: Vec<TabSnapshot>,
    pub active_tab_id: Option<String>,
    pub saved_at: String,
}

#[tauri::command]
pub fn load_config(app: AppHandle) -> Result<AppConfig, String> {
    let path = config_path(&app)?;
    if !path.exists() {
        return Ok(AppConfig::default());
    }

    let raw = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| format!("Invalid config file: {e}"))
}

#[tauri::command]
pub fn save_config(app: AppHandle, config: AppConfig) -> Result<(), String> {
    let path = config_path(&app)?;
    let raw = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(path, raw).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_session(app: AppHandle) -> Result<Option<SessionState>, String> {
    let path = session_dir(&app)?.join("session.json");
    if !path.exists() {
        return Ok(None);
    }

    let raw = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let session: SessionState = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
    Ok(Some(session))
}

#[tauri::command]
pub fn save_session(app: AppHandle, session: SessionState) -> Result<(), String> {
    let dir = session_dir(&app)?;
    let path = dir.join("session.json");
    let raw = serde_json::to_string_pretty(&session).map_err(|e| e.to_string())?;
    fs::write(path, raw).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_storage_info(app: AppHandle) -> Result<String, String> {
    crate::file_ops::storage_root(&app).map(|p| p.to_string_lossy().into_owned())
}
