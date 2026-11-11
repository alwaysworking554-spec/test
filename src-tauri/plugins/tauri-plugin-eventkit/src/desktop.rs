use serde_json::Value;
use std::marker::PhantomData;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::{Error, Result};

pub fn init<R: Runtime>(_app: &AppHandle<R>, _api: PluginApi<R, ()>) -> crate::Result<Eventkit<R>> {
    Ok(Eventkit(PhantomData))
}

/// Desktop has no EventKit; every call fails with `Unsupported`.
pub struct Eventkit<R: Runtime>(PhantomData<fn() -> R>);

impl<R: Runtime> Eventkit<R> {
    pub fn call(&self, _method: &str, _payload: Value) -> Result<Value> {
        Err(Error::Unsupported)
    }
}
