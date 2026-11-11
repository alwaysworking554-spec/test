// Shared entry point for desktop and mobile (iOS / Android).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_eventkit::init())
        .run(tauri::generate_context!())
        .expect("error while running Miami Organizer");
}
