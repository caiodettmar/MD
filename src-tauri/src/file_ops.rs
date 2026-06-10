use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilePayload {
    pub path: String,
    pub content: String,
    pub encoding: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WriteResult {
    pub path: String,
    pub saved_at: String,
}

fn decode_utf8(bytes: &[u8]) -> Result<String, String> {
    let payload = if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
        &bytes[3..]
    } else {
        bytes
    };

    String::from_utf8(payload.to_vec()).map_err(|e| format!("Invalid UTF-8 file: {e}"))
}

#[tauri::command]
pub fn read_markdown_file(path: String) -> Result<FilePayload, String> {
    let bytes = fs::read(&path).map_err(|e| format!("Failed to read file: {e}"))?;
    let content = decode_utf8(&bytes)?;

    Ok(FilePayload {
        path,
        content,
        encoding: "utf-8".into(),
    })
}

#[tauri::command]
pub fn write_markdown_file(path: String, content: String) -> Result<WriteResult, String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {e}"))?;
    }

    fs::write(&path, content.as_bytes()).map_err(|e| format!("Failed to write file: {e}"))?;

    Ok(WriteResult {
        path,
        saved_at: chrono::Utc::now().to_rfc3339(),
    })
}

pub fn storage_root(app: &AppHandle) -> Result<PathBuf, String> {
    if let Ok(exe_dir) = app.path().executable_dir() {
        let portable_root = exe_dir.join("MD");
        if portable_root.join("portable.flag").exists() {
            fs::create_dir_all(&portable_root).map_err(|e| e.to_string())?;
            return Ok(portable_root);
        }
    }

    let root = dirs::data_dir()
        .ok_or_else(|| "Could not resolve application data directory".to_string())?
        .join("MD");

    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    Ok(root)
}

pub fn session_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = storage_root(app)?.join("session");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

pub fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(storage_root(app)?.join("config.json"))
}
