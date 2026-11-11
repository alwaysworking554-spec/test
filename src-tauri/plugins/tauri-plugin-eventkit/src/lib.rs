//! EventKit bridge. Every command is a thin pass-through to the Swift plugin on iOS
//! (`ios/Sources/EventKitPlugin.swift`); on other platforms the commands return `Unsupported`
//! and the frontend uses its mock provider instead (only iOS has EventKit).
use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

mod commands;
mod error;
#[cfg(not(target_os = "ios"))]
mod desktop;
#[cfg(target_os = "ios")]
mod mobile;

pub use error::{Error, Result};

#[cfg(not(target_os = "ios"))]
use desktop::Eventkit;
#[cfg(target_os = "ios")]
use mobile::Eventkit;

pub trait EventkitExt<R: Runtime> {
    fn eventkit(&self) -> &Eventkit<R>;
}

impl<R: Runtime, T: Manager<R>> EventkitExt<R> for T {
    fn eventkit(&self) -> &Eventkit<R> {
        self.state::<Eventkit<R>>().inner()
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("eventkit")
        .invoke_handler(tauri::generate_handler![
            commands::get_permission,
            commands::request_access,
            commands::open_settings,
            commands::list_calendars,
            commands::fetch_events,
            commands::upsert_event,
            commands::delete_event,
            commands::register_listener,
            commands::remove_listener,
        ])
        .setup(|app, api| {
            #[cfg(target_os = "ios")]
            let eventkit = mobile::init(app, api)?;
            #[cfg(not(target_os = "ios"))]
            let eventkit = desktop::init(app, api)?;
            app.manage(eventkit);
            Ok(())
        })
        .build()
}
