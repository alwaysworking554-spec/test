const COMMANDS: &[&str] = &[
    "get_permission",
    "request_access",
    "open_settings",
    "list_calendars",
    "fetch_events",
    "upsert_event",
    "delete_event",
    "register_listener",
    "remove_listener",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).ios_path("ios").build();
}
