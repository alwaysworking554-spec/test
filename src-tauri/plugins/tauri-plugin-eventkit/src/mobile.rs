use serde_json::Value;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::Result;

tauri::ios_plugin_binding!(init_plugin_eventkit);

pub fn init<R: Runtime>(_app: &AppHandle<R>, api: PluginApi<R, ()>) -> crate::Result<Eventkit<R>> {
    let handle = api.register_ios_plugin(init_plugin_eventkit)?;
    Ok(Eventkit(handle))
}

/// Handle to the Swift `EventKitPlugin`.
pub struct Eventkit<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Eventkit<R> {
    pub fn call(&self, method: &str, payload: Value) -> Result<Value> {
        self.0.run_mobile_plugin(method, payload).map_err(Into::into)
    }
}
