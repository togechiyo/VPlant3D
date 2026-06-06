mod relay;

use std::path::PathBuf;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let frontend_dir = resolve_frontend_dir(app);
            let (relay_handle, _relay_task) = tauri::async_runtime::block_on(relay::start_relay(
                relay::RelayConfig::new(frontend_dir),
            ))
            .map_err(|error| format!("failed to start VPlant3D Rust relay: {error}"))?;

            println!(
                "VPlant3D Rust relay running at http://{}:{}",
                relay_handle.host, relay_handle.port
            );
            println!("VPlant3D Controller URL: {}", relay_handle.controller_url);
            println!("VPlant3D OBS Render URL: {}", relay_handle.obs_render_url);

            if let Some(window) = app.get_webview_window("main") {
                let url = tauri::Url::parse(&relay_handle.controller_url)
                    .map_err(|error| format!("invalid VPlant3D relay URL: {error}"))?;
                window
                    .navigate(url)
                    .map_err(|error| format!("failed to open VPlant3D controller: {error}"))?;
            }

            app.manage(relay_handle);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running VPlant3D");
}

fn resolve_frontend_dir(app: &tauri::App) -> PathBuf {
    let mut candidates = Vec::new();
    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("dist"));
        candidates.push(resource_dir.join("_up_").join("dist"));
    }
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(exe_dir.join("dist"));
            candidates.push(exe_dir.join("_up_").join("dist"));
        }
    }

    candidates.push(relay::default_frontend_dir());
    select_existing_frontend_dir(candidates).unwrap_or_else(relay::default_frontend_dir)
}

fn select_existing_frontend_dir(candidates: impl IntoIterator<Item = PathBuf>) -> Option<PathBuf> {
    candidates
        .into_iter()
        .find(|candidate| candidate.join("index.html").is_file())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        fs,
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn selects_tauri_resource_up_dist_when_present() {
        let root = unique_test_dir("tauri-up-dist");
        let plain_dist = root.join("dist");
        let up_dist = root.join("_up_").join("dist");
        fs::create_dir_all(&up_dist).expect("create test dist");
        fs::write(up_dist.join("index.html"), "<!doctype html>").expect("write index");

        let selected = select_existing_frontend_dir([plain_dist, up_dist.clone()]);

        assert_eq!(selected, Some(up_dist));
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn selects_portable_exe_sidecar_dist_when_present() {
        let root = unique_test_dir("tauri-portable-dist");
        let portable_dist = root.join("_up_").join("dist");
        fs::create_dir_all(&portable_dist).expect("create portable dist");
        fs::write(portable_dist.join("index.html"), "<!doctype html>").expect("write index");

        let selected = select_existing_frontend_dir([root.join("dist"), portable_dist.clone()]);

        assert_eq!(selected, Some(portable_dist));
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn ignores_frontend_candidates_without_index_html() {
        let root = unique_test_dir("tauri-missing-index");
        let dist = root.join("dist");
        fs::create_dir_all(&dist).expect("create empty dist");

        let selected = select_existing_frontend_dir([dist]);

        assert_eq!(selected, None);
        let _ = fs::remove_dir_all(root);
    }

    fn unique_test_dir(name: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock should be after epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("vplant3d-{name}-{nanos}"))
    }
}
