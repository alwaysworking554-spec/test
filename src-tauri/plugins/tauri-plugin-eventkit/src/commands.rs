use serde_json::{json, Value};
use tauri::{command, ipc::Channel, AppHandle, Runtime};

use crate::{EventkitExt, Result};

#[command]
pub(crate) async fn get_permission<R: Runtime>(app: AppHandle<R>) -> Result<Value> {
    app.eventkit().call("getPermission", json!({}))
}

#[command]
pub(crate) async fn request_access<R: Runtime>(app: AppHandle<R>) -> Result<Value> {
    app.eventkit().call("requestAccess", json!({}))
}

#[command]
pub(crate) async fn open_settings<R: Runtime>(app: AppHandle<R>) -> Result<Value> {
    app.eventkit().call("openSettings", json!({}))
}

#[command]
pub(crate) async fn list_calendars<R: Runtime>(app: AppHandle<R>) -> Result<Value> {
    app.eventkit().call("listCalendars", json!({}))
}

#[command]
pub(crate) async fn fetch_events<R: Runtime>(app: AppHandle<R>, payload: Value) -> Result<Value> {
    app.eventkit().call("fetchEvents", payload)
}

#[command]
pub(crate) async fn upsert_event<R: Runtime>(app: AppHandle<R>, payload: Value) -> Result<Value> {
    app.eventkit().call("upsertEvent", payload)
}

#[command]
pub(crate) async fn delete_event<R: Runtime>(app: AppHandle<R>, payload: Value) -> Result<Value> {
    app.eventkit().call("deleteEvent", payload)
}

/// Called by `addPluginListener` from the frontend; the Swift plugin keeps the channel and
/// pushes `changed` events (EKEventStoreChanged) through it.
#[command]
pub(crate) async fn register_listener<R: Runtime>(app: AppHandle<R>, event: String, handler: Channel<Value>) -> Result<Value> {
    app.eventkit().call("registerListener", json!({ "event": event, "handler": handler }))
}

#[command]
pub(crate) async fn remove_listener<R: Runtime>(app: AppHandle<R>, event: String, channel_id: u32) -> Result<Value> {
    app.eventkit().call("removeListener", json!({ "event": event, "channelId": channel_id }))
}
