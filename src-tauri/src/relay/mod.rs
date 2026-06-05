use axum::{
    body::Bytes,
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        DefaultBodyLimit, Path, Query, State,
    },
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    net::{Ipv4Addr, SocketAddr},
    path::{Path as FsPath, PathBuf},
    sync::{Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};
use tokio::{net::TcpListener, sync::mpsc, task::JoinHandle};
use tower_http::services::{ServeDir, ServeFile};
use uuid::Uuid;

const DEFAULT_HOST: Ipv4Addr = Ipv4Addr::LOCALHOST;
const DEFAULT_PORT: u16 = 5173;
const MAX_ASSET_BYTES: usize = 256 * 1024 * 1024;
const MAX_DEBUG_EVENTS: usize = 2000;

#[derive(Clone, Debug)]
pub struct RelayConfig {
    pub preferred_port: u16,
    pub frontend_dir: PathBuf,
}

impl RelayConfig {
    pub fn new(frontend_dir: PathBuf) -> Self {
        Self {
            preferred_port: DEFAULT_PORT,
            frontend_dir,
        }
    }
}

#[derive(Clone, Debug)]
pub struct RelayHandle {
    pub host: String,
    pub port: u16,
    pub controller_url: String,
    pub obs_render_url: String,
}

#[derive(Clone)]
struct AppState {
    relay: RelayState,
}

pub async fn start_relay(config: RelayConfig) -> Result<(RelayHandle, JoinHandle<()>), String> {
    let listener = bind_preferred_or_next(config.preferred_port)
        .await
        .map_err(|error| format!("failed to bind Rust relay: {error}"))?;
    let port = listener
        .local_addr()
        .map_err(|error| format!("failed to read Rust relay address: {error}"))?
        .port();
    let relay = RelayState::new(port);
    let app = create_router(relay, config.frontend_dir);

    let server = axum::serve(listener, app.into_make_service());
    let task = tokio::spawn(async move {
        if let Err(error) = server.await {
            eprintln!("VPlant3D Rust relay stopped with error: {error}");
        }
    });

    let host = DEFAULT_HOST.to_string();
    Ok((
        RelayHandle {
            host: host.clone(),
            port,
            controller_url: format!("http://{host}:{port}/?control=1"),
            obs_render_url: format!("http://{host}:{port}/?obs=1&transparent=1"),
        },
        task,
    ))
}

fn create_router(relay: RelayState, frontend_dir: PathBuf) -> Router {
    let index_file = frontend_dir.join("index.html");
    let static_service = ServeDir::new(frontend_dir).fallback(ServeFile::new(index_file));

    Router::new()
        .route("/relay/health", get(health))
        .route("/relay/debug-log", get(debug_log).delete(clear_debug_log))
        .route("/relay/assets", post(upload_asset))
        .route("/relay/assets/{id}", get(download_asset))
        .route("/relay/ws", get(websocket))
        .with_state(AppState { relay })
        .layer(DefaultBodyLimit::max(MAX_ASSET_BYTES))
        .fallback_service(static_service)
}

async fn bind_preferred_or_next(preferred_port: u16) -> std::io::Result<TcpListener> {
    for port in preferred_port..preferred_port.saturating_add(20) {
        let address = SocketAddr::from((DEFAULT_HOST, port));
        match TcpListener::bind(address).await {
            Ok(listener) => return Ok(listener),
            Err(error) if error.kind() == std::io::ErrorKind::AddrInUse => continue,
            Err(error) => return Err(error),
        }
    }

    TcpListener::bind(SocketAddr::from((DEFAULT_HOST, 0))).await
}

async fn health(State(state): State<AppState>) -> Json<Value> {
    let snapshot = state.relay.snapshot();
    Json(json!({
        "ok": true,
        "app": "vplant3d",
        "relay": "rust",
        "port": snapshot.port,
        "activeControlId": snapshot.active_control_id,
        "clientCount": snapshot.client_count,
    }))
}

async fn debug_log(State(state): State<AppState>) -> Json<Value> {
    let snapshot = state.relay.snapshot();
    Json(json!({
        "generatedAt": now_ms(),
        "activeControlId": snapshot.active_control_id,
        "clientCount": snapshot.client_count,
        "events": snapshot.debug_events,
    }))
}

async fn clear_debug_log(State(state): State<AppState>) -> Json<Value> {
    state.relay.clear_debug_events();
    Json(json!({ "ok": true }))
}

#[derive(Deserialize)]
struct AssetUploadQuery {
    kind: Option<String>,
}

async fn upload_asset(
    State(state): State<AppState>,
    Query(query): Query<AssetUploadQuery>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let kind = match AssetKind::parse(query.kind.as_deref()) {
        Some(kind) => kind,
        None => return json_error(StatusCode::BAD_REQUEST, "kind must be vrm or vrma"),
    };

    if body.len() > MAX_ASSET_BYTES {
        return json_error(StatusCode::PAYLOAD_TOO_LARGE, "asset is too large");
    }

    let encoded_name = headers
        .get("x-vplant3d-file-name")
        .and_then(|value| value.to_str().ok())
        .filter(|value| !value.trim().is_empty());
    let name = encoded_name
        .and_then(|value| percent_decode(value).ok())
        .unwrap_or_else(|| format!("{}-{}", kind.as_str(), Uuid::new_v4()));
    let content_type = headers
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("application/octet-stream")
        .to_string();
    let asset = state
        .relay
        .insert_asset(kind, name, content_type, body.to_vec());

    Json(json!({
        "id": asset.id,
        "kind": asset.kind.as_str(),
        "name": asset.name,
        "url": format!("/relay/assets/{}", asset.id),
    }))
    .into_response()
}

async fn download_asset(State(state): State<AppState>, Path(id): Path<String>) -> Response {
    let Some(asset) = state.relay.get_asset(&id) else {
        return json_error(StatusCode::NOT_FOUND, "asset not found");
    };

    let mut headers = HeaderMap::new();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_str(&asset.content_type)
            .unwrap_or_else(|_| HeaderValue::from_static("application/octet-stream")),
    );
    headers.insert(
        header::CONTENT_LENGTH,
        HeaderValue::from_str(&asset.bytes.len().to_string())
            .unwrap_or_else(|_| HeaderValue::from_static("0")),
    );
    headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    if let Ok(value) = HeaderValue::from_str(&percent_encode(&asset.name)) {
        headers.insert("x-vplant3d-file-name", value);
    }

    (headers, asset.bytes).into_response()
}

async fn websocket(State(state): State<AppState>, ws: WebSocketUpgrade) -> Response {
    ws.on_upgrade(move |socket| handle_websocket(state.relay, socket))
}

async fn handle_websocket(relay: RelayState, socket: WebSocket) {
    let (client_id, mut outbound) = relay.register_client();
    for message in relay.latest_messages() {
        relay.send_to(client_id, message);
    }

    let (mut sender, mut receiver) = socket.split();
    let writer = tokio::spawn(async move {
        while let Some(message) = outbound.recv().await {
            if sender.send(Message::Text(message.into())).await.is_err() {
                break;
            }
        }
    });

    relay.push_debug_event(json!({
        "kind": "connection",
        "socketId": client_id,
    }));

    while let Some(Ok(message)) = receiver.next().await {
        let Message::Text(text) = message else {
            continue;
        };
        let text = text.to_string();
        relay.handle_client_message(client_id, text);
    }

    relay.remove_client(client_id);
    writer.abort();
}

fn json_error(status: StatusCode, error: &str) -> Response {
    (status, Json(json!({ "error": error }))).into_response()
}

fn percent_decode(value: &str) -> Result<String, ()> {
    let bytes = value.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;

    while index < bytes.len() {
        if bytes[index] == b'%' && index + 2 < bytes.len() {
            let hex = std::str::from_utf8(&bytes[index + 1..index + 3]).map_err(|_| ())?;
            let byte = u8::from_str_radix(hex, 16).map_err(|_| ())?;
            decoded.push(byte);
            index += 3;
        } else {
            decoded.push(bytes[index]);
            index += 1;
        }
    }

    String::from_utf8(decoded).map_err(|_| ())
}

fn percent_encode(value: &str) -> String {
    value
        .bytes()
        .flat_map(|byte| {
            if byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'-' | b'_') {
                vec![byte as char]
            } else {
                format!("%{byte:02X}").chars().collect()
            }
        })
        .collect()
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
enum AssetKind {
    Vrm,
    Vrma,
}

impl AssetKind {
    fn parse(value: Option<&str>) -> Option<Self> {
        match value {
            Some("vrm") => Some(Self::Vrm),
            Some("vrma") => Some(Self::Vrma),
            _ => None,
        }
    }

    fn as_str(&self) -> &'static str {
        match self {
            Self::Vrm => "vrm",
            Self::Vrma => "vrma",
        }
    }
}

#[derive(Clone)]
struct RelayAsset {
    id: String,
    kind: AssetKind,
    name: String,
    content_type: String,
    bytes: Vec<u8>,
}

#[derive(Clone, Debug, Default)]
struct RelaySnapshot {
    port: Option<u16>,
    active_control_id: Option<usize>,
    client_count: usize,
    debug_events: Vec<Value>,
}

#[derive(Clone, Default)]
struct RelayState {
    inner: Arc<Mutex<RelayInner>>,
}

#[derive(Default)]
struct RelayInner {
    port: Option<u16>,
    clients: HashMap<usize, RelayClient>,
    assets: HashMap<String, RelayAsset>,
    next_client_id: usize,
    active_control_id: Option<usize>,
    debug_events: Vec<Value>,
    latest_vrm_asset_message: Option<String>,
    latest_vrma_slots_message: Option<String>,
    latest_state_message: Option<String>,
    latest_static_state_message: Option<String>,
    latest_motion_state_message: Option<String>,
    latest_expression_state_message: Option<String>,
    latest_runtime_state_message: Option<String>,
    latest_vrma_command_message: Option<String>,
}

struct RelayClient {
    role: Option<ClientRole>,
    sender: mpsc::UnboundedSender<String>,
    last_realtime_at: u64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
enum ClientRole {
    Control,
    Render,
    Other(String),
}

impl ClientRole {
    fn from_value(value: Option<&str>) -> Option<Self> {
        match value {
            Some("control") => Some(Self::Control),
            Some("render") => Some(Self::Render),
            Some(other) => Some(Self::Other(other.to_string())),
            None => None,
        }
    }

    fn as_str(&self) -> &str {
        match self {
            Self::Control => "control",
            Self::Render => "render",
            Self::Other(value) => value.as_str(),
        }
    }
}

#[derive(Debug, PartialEq, Eq)]
enum MessageKind {
    Hello(Option<ClientRole>),
    DebugSample,
    RuntimeState,
    MotionState,
    ExpressionState,
    StaticState,
    State,
    VrmaCommand,
    VrmaSlots,
    VrmAsset,
    Other,
}

impl RelayState {
    fn new(port: u16) -> Self {
        Self {
            inner: Arc::new(Mutex::new(RelayInner {
                port: Some(port),
                ..RelayInner::default()
            })),
        }
    }

    fn register_client(&self) -> (usize, mpsc::UnboundedReceiver<String>) {
        let (sender, receiver) = mpsc::unbounded_channel();
        let mut inner = self.inner.lock().expect("relay mutex poisoned");
        inner.next_client_id += 1;
        let client_id = inner.next_client_id;
        inner.clients.insert(
            client_id,
            RelayClient {
                role: None,
                sender,
                last_realtime_at: 0,
            },
        );
        (client_id, receiver)
    }

    fn remove_client(&self, client_id: usize) {
        let mut inner = self.inner.lock().expect("relay mutex poisoned");
        let role = inner
            .clients
            .get(&client_id)
            .and_then(|client| client.role.as_ref())
            .map(|role| role.as_str().to_string());
        inner.clients.remove(&client_id);
        if inner.active_control_id == Some(client_id) {
            inner.active_control_id = None;
        }
        push_debug_event_locked(
            &mut inner,
            json!({
                "kind": "close",
                "socketId": client_id,
                "role": role.unwrap_or_else(|| "unknown".to_string()),
            }),
        );
    }

    fn send_to(&self, client_id: usize, message: String) {
        let sender = self
            .inner
            .lock()
            .expect("relay mutex poisoned")
            .clients
            .get(&client_id)
            .map(|client| client.sender.clone());

        if let Some(sender) = sender {
            let _ = sender.send(message);
        }
    }

    fn handle_client_message(&self, client_id: usize, message: String) {
        let kind = classify_message(&message);
        let mut recipients = Vec::new();

        {
            let mut inner = self.inner.lock().expect("relay mutex poisoned");

            match kind {
                MessageKind::Hello(role) => {
                    if let Some(client) = inner.clients.get_mut(&client_id) {
                        client.role = role.clone();
                    }
                    if role == Some(ClientRole::Control) {
                        inner.active_control_id = Some(client_id);
                    }
                    let active_control_id = inner.active_control_id;
                    push_debug_event_locked(
                        &mut inner,
                        json!({
                            "kind": "hello",
                            "socketId": client_id,
                            "role": role.as_ref().map(ClientRole::as_str).unwrap_or("unknown"),
                            "activeControlId": active_control_id,
                        }),
                    );
                    return;
                }
                MessageKind::DebugSample => {
                    let role = client_role_string(&inner, client_id);
                    push_debug_event_locked(
                        &mut inner,
                        json!({
                            "kind": "renderSample",
                            "socketId": client_id,
                            "role": role,
                        }),
                    );
                    return;
                }
                _ => {}
            }

            if kind.is_realtime() && should_reject_realtime_from_locked(&inner, client_id) {
                let role = client_role_string(&inner, client_id);
                let active_control_id = inner.active_control_id;
                push_debug_event_locked(
                    &mut inner,
                    json!({
                        "kind": "realtime",
                        "socketId": client_id,
                        "role": role,
                        "accepted": false,
                        "reason": "stale-control",
                        "activeControlId": active_control_id,
                    }),
                );
                return;
            }

            if kind.is_realtime() && client_role(&inner, client_id) == Some(ClientRole::Control) {
                inner.active_control_id = Some(client_id);
                if let Some(client) = inner.clients.get_mut(&client_id) {
                    client.last_realtime_at = now_ms();
                }
            }

            remember_latest_locked(&mut inner, &kind, &message);
            if kind.is_realtime() {
                let role = client_role_string(&inner, client_id);
                let active_control_id = inner.active_control_id;
                let message_type = kind.type_name();
                push_debug_event_locked(
                    &mut inner,
                    json!({
                        "kind": "realtime",
                        "socketId": client_id,
                        "role": role,
                        "accepted": true,
                        "message": { "type": message_type },
                        "activeControlId": active_control_id,
                    }),
                );
            }

            recipients.extend(
                inner
                    .clients
                    .iter()
                    .filter(|(id, _)| **id != client_id)
                    .map(|(_, client)| client.sender.clone()),
            );
        }

        for sender in recipients {
            let _ = sender.send(message.clone());
        }
    }

    fn latest_messages(&self) -> Vec<String> {
        let inner = self.inner.lock().expect("relay mutex poisoned");
        [
            inner.latest_vrm_asset_message.clone(),
            inner.latest_vrma_slots_message.clone(),
            inner.latest_state_message.clone(),
            inner.latest_static_state_message.clone(),
            inner.latest_runtime_state_message.clone(),
            inner.latest_motion_state_message.clone(),
            inner.latest_expression_state_message.clone(),
            inner.latest_vrma_command_message.clone(),
        ]
        .into_iter()
        .flatten()
        .collect()
    }

    fn insert_asset(
        &self,
        kind: AssetKind,
        name: String,
        content_type: String,
        bytes: Vec<u8>,
    ) -> RelayAsset {
        let asset = RelayAsset {
            id: Uuid::new_v4().to_string(),
            kind,
            name,
            content_type,
            bytes,
        };
        let mut inner = self.inner.lock().expect("relay mutex poisoned");
        inner.assets.insert(asset.id.clone(), asset.clone());
        asset
    }

    fn get_asset(&self, id: &str) -> Option<RelayAsset> {
        self.inner
            .lock()
            .expect("relay mutex poisoned")
            .assets
            .get(id)
            .cloned()
    }

    fn snapshot(&self) -> RelaySnapshot {
        let inner = self.inner.lock().expect("relay mutex poisoned");
        RelaySnapshot {
            port: inner.port,
            active_control_id: inner.active_control_id,
            client_count: inner.clients.len(),
            debug_events: inner.debug_events.clone(),
        }
    }

    fn push_debug_event(&self, event: Value) {
        let mut inner = self.inner.lock().expect("relay mutex poisoned");
        push_debug_event_locked(&mut inner, event);
    }

    fn clear_debug_events(&self) {
        self.inner
            .lock()
            .expect("relay mutex poisoned")
            .debug_events
            .clear();
    }
}

impl MessageKind {
    fn is_realtime(&self) -> bool {
        matches!(
            self,
            Self::RuntimeState | Self::MotionState | Self::ExpressionState
        )
    }

    fn type_name(&self) -> &'static str {
        match self {
            Self::RuntimeState => "runtimeState",
            Self::MotionState => "motionState",
            Self::ExpressionState => "expressionState",
            Self::StaticState => "staticState",
            Self::State => "state",
            Self::VrmaCommand => "vrmaCommand",
            Self::VrmaSlots => "vrmaSlots",
            Self::VrmAsset => "asset",
            Self::DebugSample => "debugSample",
            Self::Hello(_) => "hello",
            Self::Other => "unknown",
        }
    }
}

fn classify_message(message: &str) -> MessageKind {
    let Ok(value) = serde_json::from_str::<Value>(message) else {
        return MessageKind::Other;
    };
    let Some(message_type) = value.get("type").and_then(Value::as_str) else {
        return MessageKind::Other;
    };

    match message_type {
        "hello" => MessageKind::Hello(ClientRole::from_value(
            value.get("role").and_then(Value::as_str),
        )),
        "debugSample" => MessageKind::DebugSample,
        "runtimeState" => MessageKind::RuntimeState,
        "motionState" => MessageKind::MotionState,
        "expressionState" => MessageKind::ExpressionState,
        "staticState" => MessageKind::StaticState,
        "state" => MessageKind::State,
        "vrmaCommand" => MessageKind::VrmaCommand,
        "vrmaSlots" => MessageKind::VrmaSlots,
        "asset" if value.pointer("/asset/kind").and_then(Value::as_str) == Some("vrm") => {
            MessageKind::VrmAsset
        }
        _ => MessageKind::Other,
    }
}

fn remember_latest_locked(inner: &mut RelayInner, kind: &MessageKind, message: &str) {
    match kind {
        MessageKind::RuntimeState => inner.latest_runtime_state_message = Some(message.to_string()),
        MessageKind::ExpressionState => {
            inner.latest_expression_state_message = Some(message.to_string())
        }
        MessageKind::MotionState => inner.latest_motion_state_message = Some(message.to_string()),
        MessageKind::StaticState => inner.latest_static_state_message = Some(message.to_string()),
        MessageKind::State => inner.latest_state_message = Some(message.to_string()),
        MessageKind::VrmaCommand => inner.latest_vrma_command_message = Some(message.to_string()),
        MessageKind::VrmaSlots => inner.latest_vrma_slots_message = Some(message.to_string()),
        MessageKind::VrmAsset => inner.latest_vrm_asset_message = Some(message.to_string()),
        _ => {}
    }
}

fn should_reject_realtime_from_locked(inner: &RelayInner, client_id: usize) -> bool {
    if client_role(inner, client_id) != Some(ClientRole::Control) {
        return false;
    }

    let Some(active_control_id) = inner.active_control_id else {
        return false;
    };
    if active_control_id == client_id {
        return false;
    }

    let Some(active_control) = inner.clients.get(&active_control_id) else {
        return false;
    };
    now_ms().saturating_sub(active_control.last_realtime_at) <= 1000
}

fn client_role(inner: &RelayInner, client_id: usize) -> Option<ClientRole> {
    inner
        .clients
        .get(&client_id)
        .and_then(|client| client.role.clone())
}

fn client_role_string(inner: &RelayInner, client_id: usize) -> String {
    client_role(inner, client_id)
        .map(|role| role.as_str().to_string())
        .unwrap_or_else(|| "unknown".to_string())
}

fn push_debug_event_locked(inner: &mut RelayInner, mut event: Value) {
    if let Value::Object(object) = &mut event {
        object.insert("at".to_string(), Value::from(now_ms()));
    }
    inner.debug_events.push(event);

    if inner.debug_events.len() > MAX_DEBUG_EVENTS {
        let drain_count = inner.debug_events.len() - MAX_DEBUG_EVENTS;
        inner.debug_events.drain(0..drain_count);
    }
}

pub fn default_frontend_dir() -> PathBuf {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    manifest_dir
        .parent()
        .unwrap_or_else(|| FsPath::new("."))
        .join("dist")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classify_runtime_messages() {
        assert_eq!(
            classify_message(r#"{"type":"runtimeState","state":{"sequence":1}}"#),
            MessageKind::RuntimeState,
        );
        assert_eq!(
            classify_message(r#"{"type":"hello","role":"control"}"#),
            MessageKind::Hello(Some(ClientRole::Control)),
        );
        assert_eq!(
            classify_message(r#"{"type":"asset","asset":{"kind":"vrm"}}"#),
            MessageKind::VrmAsset,
        );
    }

    #[test]
    fn remembers_latest_messages_in_replay_order() {
        let relay = RelayState::default();
        let (client_id, _rx) = relay.register_client();

        relay.handle_client_message(
            client_id,
            r#"{"type":"staticState","state":{"vrmaLoop":true}}"#.to_string(),
        );
        relay.handle_client_message(
            client_id,
            r#"{"type":"runtimeState","state":{"sequence":8,"sentAt":10}}"#.to_string(),
        );
        relay.handle_client_message(
            client_id,
            r#"{"type":"asset","asset":{"kind":"vrm","id":"a"}}"#.to_string(),
        );

        let latest = relay.latest_messages();
        assert_eq!(latest.len(), 3);
        assert!(latest[0].contains(r#""type":"asset""#));
        assert!(latest[1].contains(r#""type":"staticState""#));
        assert!(latest[2].contains(r#""type":"runtimeState""#));
    }

    #[test]
    fn active_control_guard_rejects_stale_control_realtime() {
        let relay = RelayState::default();
        let (first_id, mut first_rx) = relay.register_client();
        let (second_id, mut second_rx) = relay.register_client();

        relay.handle_client_message(first_id, r#"{"type":"hello","role":"control"}"#.to_string());
        relay.handle_client_message(
            first_id,
            r#"{"type":"runtimeState","state":{"sequence":1,"sentAt":1}}"#.to_string(),
        );
        let _ = first_rx.try_recv();
        let _ = second_rx.try_recv();
        relay.handle_client_message(
            second_id,
            r#"{"type":"hello","role":"control"}"#.to_string(),
        );
        relay.handle_client_message(
            second_id,
            r#"{"type":"runtimeState","state":{"sequence":2,"sentAt":2}}"#.to_string(),
        );
        let _ = first_rx.try_recv();
        relay.handle_client_message(
            first_id,
            r#"{"type":"runtimeState","state":{"sequence":3,"sentAt":3}}"#.to_string(),
        );

        assert!(second_rx.try_recv().is_err());
    }

    #[test]
    fn validates_asset_kind_and_round_trips_asset() {
        assert_eq!(AssetKind::parse(Some("vrm")), Some(AssetKind::Vrm));
        assert_eq!(AssetKind::parse(Some("vrma")), Some(AssetKind::Vrma));
        assert_eq!(AssetKind::parse(Some("png")), None);

        let relay = RelayState::default();
        let asset = relay.insert_asset(
            AssetKind::Vrm,
            "model.vrm".to_string(),
            "model/gltf-binary".to_string(),
            vec![1, 2, 3],
        );
        let loaded = relay.get_asset(&asset.id).expect("asset should exist");

        assert_eq!(loaded.name, "model.vrm");
        assert_eq!(loaded.bytes, vec![1, 2, 3]);
    }

    #[test]
    fn encodes_and_decodes_file_names() {
        let name = "表情 test.vrm";
        let encoded = percent_encode(name);
        assert_eq!(percent_decode(&encoded), Ok(name.to_string()));
    }
}
