mod config;
mod file_ops;
mod session;

#[tauri::command]
fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            file_ops::read_markdown_file,
            file_ops::write_markdown_file,
            session::load_config,
            session::save_config,
            session::load_session,
            session::save_session,
            session::get_storage_info,
            exit_app,
        ])
        .setup(|app| {
            let _ = file_ops::storage_root(app.handle());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running MD");
}
