mod relay;

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

fn resolve_frontend_dir(app: &tauri::App) -> std::path::PathBuf {
    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled_dist = resource_dir.join("dist");
        if bundled_dist.join("index.html").exists() {
            return bundled_dist;
        }
    }

    relay::default_frontend_dir()
}
