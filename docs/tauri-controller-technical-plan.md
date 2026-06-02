# Tauri Controller 技術検討

確認日: 2026-06-02

## 結論

VPlant3DをTauri化する場合、Tauriは「描画アプリ」ではなく「Controller / Relay launcher」として使う。

OBSに映す最終描画は引き続きOBS Browser Source内Chromiumで行う。Tauri windowは配信者が操作するController UI、Local Relay起動、OBS URL共有、設定保存、ファイル選択を担当する。

この分離を守ると、Tauriの軽量さを得ながら、WebView差分がOBS出力そのものを壊すリスクを抑えられる。

```text
Tauri App
  Controller UI
  Relay process launcher
  OBS URL copy
  Config / recent files
        |
        | http://127.0.0.1:<port> / WebSocket
        v
Local Relay
  /?control=1
  /?obs=1&transparent=1
  /relay/ws
  /relay/assets
        |
        v
OBS Browser Source
  Render Page
  Transparent VRM output
```

## 公式情報から見た前提

Tauri公式は、TauriをHTML / JavaScript / CSSのUIとRustなどのバックエンドロジックを組み合わせるフレームワークとして説明している。小さいバイナリ、OSネイティブWebView、任意のフロントエンド利用が主要な利点。

TauriのWebViewは実行環境依存で、WindowsはMicrosoft Edge WebView2、macOSはWKWebView、Linuxはwebkitgtkを使う。つまり、ChromeやOBS内Chromiumと完全同一ではない。

Tauri v2ではcapability / permissionで、フロントエンドから使えるOS機能やplugin権限を明示的に制限する。shell、dialog、clipboard、storeなどを使う場合は権限設計が必要。

Local RelayをTauriに同梱する方法としては、外部バイナリをsidecarとして埋め込む方式がある。公式ドキュメントでは `externalBin` とtarget triple付きバイナリ名が必要になる。

TauriのWebDriverテストはWindows / Linuxが中心で、macOSはWKWebView driver toolがないため公式にはdesktop WebDriver対象外。macOSではPlaywrightでWeb版を検証し、Tauri版は手動確認またはRust側の単体テストを組み合わせる。

## VPlant3DでTauri化する価値

### 得られるもの

- Node/npmを知らないユーザーにも「アプリを起動するだけ」で使ってもらいやすい
- ControllerとRelayをワンクリックで起動できる
- OBSへ貼るURLをアプリ上で表示・コピーできる
- macOS / Windows向けに「配布物」として見せやすい
- Electronより軽い配布物を狙える
- `VPlant3D for OBS` というアプリ感が出る

### 得られないもの

- OBS Browser Sourceの設定作業はなくならない
- OBS内Chromiumの透過・描画・WebSocket挙動確認は引き続き必要
- Tauri WebViewでカメラ / マイク / MediaPipeがChromeと同じ挙動になる保証はない
- macOS / Windows両方のビルドと権限確認は別途必要

## 採用範囲

### やる

- Tauri scaffoldを追加する
- Tauri windowでController UIを表示する
- RelayをTauri起動と同時に起動する
- ControllerにOBS Render URLを表示・コピーする
- Tauri版が失敗してもWeb Controller fallbackを残す
- macOSで開発ビルドを確認する
- Windowsは人間実機確認タスクとしてHuman Handoff Boardへ載せる

### やらない

- OBS RenderをTauri windowへ移す
- OBSの代わりに録画・配信機能を持つ
- Tauri WebViewだけでMediaPipe品質を保証する
- いきなりNode sidecarを完全同梱して配布完成まで狙う
- MCPサーバー化と同時に進める

## 実装方式の候補

### 案A: Tauriが既存Node Relayを起動する

Tauriから既存の `server/vplant-relay.mjs` 相当を起動し、Controller windowは `http://127.0.0.1:<port>/?control=1` を開く。

利点:

- 現在のWeb / OBS設計をほぼ維持できる
- Playwright E2Eの大部分を流用できる
- OBS URLも今と同じ

欠点:

- 配布時にNode runtimeをどう同梱するかが問題
- sidecar化するならplatformごとのバイナリ準備が必要
- 最小提出物としては少し重い

### 案B: Tauri Rust側にLocal Relayを移植する

Rust側でHTTP / WebSocket / asset uploadを実装し、Vite build済みfrontendを配信する。

利点:

- Node同梱が不要
- Tauriらしい単体アプリになりやすい
- 起動・終了・ポート管理をRust側で一元化しやすい

欠点:

- WebSocket relay、asset upload、debug-logをRustで再実装する必要がある
- 既存のNode relayで解決済みだったOBS問題を再発させるリスク
- 締切前にやるには大きい

### 案C: まずTauriはLauncherだけにする

TauriはController用の軽いランチャーとして起動し、開発中は `npm run dev` または既存relayに接続する。配布完成ではなく、ハッカソンデモ用の「アプリっぽい入口」を作る。

利点:

- 最も低リスク
- Web版を壊さない
- Tauri UI / 権限 / WebView挙動を早く検証できる

欠点:

- 完全な単体配布アプリではない
- ユーザーがNode環境なしで使う完成形にはまだ遠い

## 推奨ルート

締切が2026-06-07なので、段階的に進める。

### Phase 1: Tauri scaffold + Web Controller表示

目的:

- Tauriアプリとして起動する
- Controller UIをTauri windowで見られる
- OBS URLコピーのUIを確認できる

実装:

- `src-tauri/` を追加
- Tauri v2を導入
- dev時は既存Vite / Relayへ接続
- build時はVite build済みassetsをTauri windowで表示するか、まずはexternal URLで既存relayへ接続する

停止条件:

- `npm run tauri dev` 相当でController windowが開く
- OBS Render URLが表示される
- Web Controller fallbackが残る

### Phase 2: Relay起動管理

目的:

- ユーザーが別ターミナルで `npm run dev` しなくてもよくする

候補:

- まずはTauriからNode Relayをspawnする
- 配布用は後でsidecar化を検討する

注意:

- sidecarを使う場合、Tauri公式の通りtarget triple付きバイナリ名と `externalBin` 設定が必要
- shell plugin権限は最小にする
- 任意コマンド実行を許可しない

### Phase 3: 設定保存とOBS URL共有

目的:

- host / port / transparent / debugをアプリで管理する
- OBSへ貼るURLを確実にコピーできる

実装候補:

- Tauri Store pluginで設定保存
- Clipboard pluginまたは既存Web Clipboard APIでURLコピー
- Relay接続状態をController UIに表示

### Phase 4: 権限と実機検証

確認するもの:

- macOS Tauri windowでVRM選択ができる
- macOS Tauri windowでマイク権限が出る
- macOS Tauri windowでカメラ権限が出る
- MediaPipeがTauri WebViewで動く
- OBS Browser SourceはRender URLへ接続できる
- WindowsでWebView2とカメラ/マイクが動く

失敗時:

- TauriはRelay launcher + URL共有に限定
- Controller操作はChromeで行うfallbackをREADMEに残す

## 最初の実装で触るファイル候補

- `package.json`
  - `tauri` scripts追加
  - `@tauri-apps/cli` dev dependency追加
- `src-tauri/`
  - `Cargo.toml`
  - `tauri.conf.json`
  - `src/lib.rs` または `src/main.rs`
  - `capabilities/default.json`
- `src/main.ts`
  - Tauri環境かどうかでOBS URL生成を調整する可能性あり
- `docs/human-handoff-board.md`
  - macOS / Windows実機確認項目
- `README.md`
  - Tauri版が動いた後に起動方法を追加

## リスク

### WebView差分

TauriのWebViewはOS依存。Chromeと同じではない。VPlant3Dで特に危ないのは、MediaPipe、WebGL / WebGPU、カメラ/マイク権限、ファイル入力。

対策:

- OBS RenderはOBS Browser Sourceに残す
- Tauri Controllerが不安定ならChrome Controller fallback
- 最初のTauri目標を「Controller表示 + URL共有」に絞る

### Relay二重起動

既存の `npm run dev` とTauri起動Relayが同じportを取り合う可能性がある。

対策:

- 起動時にport availabilityを確認する
- 既存Relayが動いていれば接続する
- Tauriが起動したRelayのportをUIへ表示する

### sidecar配布

Node Relayをsidecar化する場合、platformごとのバイナリ化が必要。公式ドキュメント上もtarget triple付きファイル名が必要。

対策:

- ハッカソン前はsidecar完全同梱を必須にしない
- macOSローカルdevでまずControllerアプリ化を通す
- 配布完成は提出後に回す判断も残す

### テスト

Tauri公式WebDriverはWindows / Linux中心で、macOSはWKWebView driverがない。今のmacOS開発環境ではTauri E2EをPlaywright並みに回すのは難しい。

対策:

- Web版のPlaywright E2Eは維持する
- Tauri Rust側は起動・設定生成などを小さくテストする
- Tauri実機確認はHuman Handoff Boardに明記する

## ハッカソン向けDone条件

最低ライン:

- Web版Controller / OBS Renderは今まで通り動く
- Tauri windowでController UIを開ける
- OBS Render URLをTauri windowからコピーできる
- Tauri版が不安定な場合のWeb fallback手順がREADMEにある

できれば:

- Tauri起動時にLocal Relayも起動する
- macOS app bundleを作れる
- Windows確認手順を用意できる

やりすぎライン:

- RustへRelay完全移植
- Node sidecar完全配布
- Tauri内MediaPipe品質保証
- 自動更新、署名、インストーラー整備

## 次の実装Goal案

```text
/goal Add a minimal Tauri v2 controller scaffold for VPlant3D. Read AGENTS.md, docs/work-log.md, docs/tauri-controller-technical-plan.md, docs/hackathon-finish-task-list.md, and docs/obs-architecture-redesign.md first. Preserve the existing Web Controller and OBS Render behavior. Do not replace the Node relay yet. Add Tauri config and scripts so a Tauri window can open the Controller UI in development, show/copy the OBS Render URL, and keep Web fallback working. Keep permissions minimal. Run npm run test, npm run lint, npm run build, and any Tauri dev/build command that is available. Update docs/work-log.md and docs/human-handoff-board.md with what still requires macOS/Windows/manual confirmation. Stop when Tauri Controller launches locally or when missing Rust/Tauri prerequisites are documented with the next setup step.
```

## 参照

- Tauri: What is Tauri?  
  https://v2.tauri.app/start/
- Tauri: Process Model  
  https://v2.tauri.app/concept/process-model/
- Tauri: Capabilities  
  https://v2.tauri.app/security/capabilities/
- Tauri: Embedding External Binaries  
  https://v2.tauri.app/develop/sidecar/
- Tauri: Localhost Plugin  
  https://v2.tauri.app/plugin/localhost/
- Tauri: WebDriver Testing  
  https://v2.tauri.app/develop/tests/webdriver/
- Tauri: Prerequisites  
  https://v2.tauri.app/start/prerequisites/
