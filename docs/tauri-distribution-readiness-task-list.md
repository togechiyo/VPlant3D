# Tauri配布ビルド前タスクリスト

確認日: 2026-06-05

## 目的

VPlant3DをTauriアプリとして配布できる形へ近づける前に、必要な作業を洗い出す。

現状のTauri実装は「Controller UIを開くshell」であり、Local Relay serverはTauri / Rust内にはまだ実装されていない。配布物として自然に使えるアプリにするには、Controller、Relay、OBS Render URL、権限、ビルド、実機確認をまとめて整える必要がある。

## 現状

- `src-tauri/` の最小scaffoldはある
- `npm run tauri:dev` はTauriの `beforeDevCommand` で既存Node relay flowを起動する
- `npm run tauri:dev:attached` は、すでに動いているrelayへTauri windowだけ接続する
- OBS Renderは引き続きOBS Browser Sourceで `http://127.0.0.1:<port>/?obs=1&transparent=1` を開く
- Tauri / Rust製Local Relay serverは未実装
- Node relay sidecar化も未実装
- 配布用のmacOS / Windows build、署名、公証、インストーラー確認は未着手

## 方針

締切前の優先順位は、単体配布の美しさよりデモ安定性を優先する。

ただし、配布用ビルドを作るなら「アプリを起動したらrelayが立ち、Controllerが開き、OBSへ貼るURLが分かる」状態が最低ラインになる。

## 公式情報からの注意点

- Tauri sidecarは `externalBin` に指定した外部バイナリを同梱できるが、実ファイル名にはtarget tripleが必要になる。例としてApple Silicon macOSでは `aarch64-apple-darwin` のようなsuffixが付く。
- Tauri localhost pluginはbuild済みfrontendをlocalhostで配信する選択肢になる。
- macOS app bundleは `tauri build` で作れるが、配布ではcode signing / notarizationを別途検討する必要がある。
- Windows配布ではcode signing certificateやWindows向け署名設定が必要になり得る。

参照:

- Tauri Sidecar: https://v2.tauri.app/develop/sidecar/
- Tauri Localhost Plugin: https://v2.tauri.app/plugin/localhost/
- Tauri macOS Application Bundle: https://v2.tauri.app/distribute/macos-application-bundle/
- Tauri Windows Code Signing: https://tauri.app/distribute/sign/windows/

## 配布前に決めること

### 1. Relay方式

候補:

- Rust relayへ移植する
- 既存Node relayをsidecar化する
- ハッカソン提出では `npm run dev` fallbackを残し、TauriはController launcherに留める

推奨:

- 短期ではRust relay移植を第一候補にする。ただし、実装リスクが高ければNode relay sidecarへ切り替える
- Web fallbackは必ず残す

判断基準:

- OBS Renderのピクつき問題を再発させないこと
- `/relay/ws`、`/relay/assets`、`/relay/debug-log` の互換を保てること
- macOS / Windows両方で起動管理しやすいこと

### 2. Tauri windowとURL

決めること:

- Tauri Controller windowは常に `/?control=1` を開く
- OBS Render URLは `127.0.0.1` 推奨、`localhost` 代替を維持する
- 起動したrelayのportをUIに表示する
- port衝突時の挙動を決める

推奨:

- 既定portは `5173`
- 使用中なら空きportへfallbackし、Controller UIとOBS URLへ反映する
- 既存relayがVPlant3D互換なら接続、互換でなければ別portへ逃がす

### 3. 権限と設定保存

決めること:

- Web localStorageを当面維持するか、Tauri Storeへ移行するか
- Clipboard APIだけで足りるか、Tauri clipboard pluginを使うか
- カメラ / マイク権限の説明をREADMEにどう書くか

推奨:

- 配布直前はlocalStorage維持
- クリップボードはWeb APIで足りる限りpluginを増やさない
- Tauri Store移行は提出後でもよい

## 実装タスク

### Phase A: Rust relay実装の調査と最小移植

- [ ] 既存Node relayの責務を棚卸しする
  - [ ] HTTP frontend配信
  - [ ] WebSocket `/relay/ws`
  - [ ] asset upload `/relay/assets`
  - [ ] latest state replay
  - [ ] active control guard
  - [ ] debug sample collection
  - [ ] `/relay/debug-log`
- [ ] Rust側のHTTP / WebSocketライブラリ候補を決める
- [ ] relay message schemaは `src/relay/messages.ts` と互換にする
- [ ] asset uploadの保存先と寿命を決める
- [ ] latest VRM / VRMA asset replayを実装する
- [ ] latest static / motion state replayを実装する
- [ ] active control guardを実装する
- [ ] debug-log endpointを実装する
- [ ] Rust relay単体テストを書く
- [ ] Node relayとRust relayの挙動比較テストを作る

### Phase B: Tauriからrelayを起動・管理する

- [ ] Tauri起動時に空きportを決める
- [ ] Rust relayをTauri stateとして起動する
- [ ] app終了時にrelayを停止する
- [ ] relay起動失敗時のエラーをController UIへ表示する
- [ ] 起動したhost / portをControllerへ渡す
- [ ] OBS Render URL生成に実portを反映する
- [ ] `npm run tauri:dev` とWeb fallbackの両方が動くようにする
- [ ] `tauri:dev:attached` の役割を見直す

### Phase C: build済みfrontendの扱い

- [ ] dev時はVite dev serverを使うか、Rust relayがViteへproxyするか決める
- [ ] build時に `dist/` をTauri/Rust relayから配信する
- [ ] `/?control=1`、`/?obs=1`、`/relay/*` のroutingを整理する
- [ ] 直接ファイルURLではなくlocalhost配信に寄せる
- [ ] Tauri localhost pluginを使うか、自前Rust relayがfrontendも配信するか決める

### Phase D: Controller UI調整

- [ ] Tauri実行中かどうかの表示を最小限入れる
- [ ] 起動中relayのhost / portを表示する
- [ ] OBS Render URLのコピー導線を最上位にする
- [ ] Debug / Control URLは通常導線から隠したままにする
- [ ] relay未起動、port衝突、OBS未接続を分かりやすく表示する
- [ ] Web fallback時も同じUIで動くようにする

### Phase E: Tauri permissions / capabilities

- [ ] `src-tauri/capabilities/default.json` を最小権限にする
- [ ] shell任意実行を許可しない
- [ ] sidecarを使う場合だけ必要なshell permissionを追加する
- [ ] filesystem / dialog / clipboard pluginを使うか判断する
- [ ] カメラ / マイクはWebView権限として実機確認する

### Phase F: macOS build

- [ ] `npm run tauri:build` をmacOSで通す
- [ ] `.app` が生成されることを確認する
- [ ] 初回起動時のGatekeeper挙動を確認する
- [ ] VRMファイル選択を確認する
- [ ] マイク権限を確認する
- [ ] カメラ権限を確認する
- [ ] OBS Browser SourceでRender URLを確認する
- [ ] 背景透過をOBSで確認する
- [ ] 必要なら署名 / notarizationを検討する

### Phase G: Windows build

- [ ] Windows実機またはCIでbuild方針を決める
- [ ] WebView2前提をREADMEへ書く
- [ ] WindowsでTauriアプリが起動することを確認する
- [ ] WindowsでVRMファイル選択を確認する
- [ ] Windowsでマイク / カメラ権限を確認する
- [ ] Windows OBS Browser SourceでRender URLを確認する
- [ ] 配布する場合は署名の有無と警告表示を確認する

### Phase H: ドキュメントと提出物

- [ ] READMEにTauri版の起動方法を書く
- [ ] READMEにWeb fallback手順を書く
- [ ] READMEにOBS Browser Source URLの貼り方を書く
- [ ] READMEに既知の制限を書く
- [ ] `docs/human-handoff-board.md` にmacOS / Windows確認項目を整理する
- [ ] `docs/submission-checklist.md` をTauri状況に合わせて更新する
- [ ] スクリーンショットにTauri Controllerを含めるか決める

## テストタスク

### Web側

- [ ] `npm run test`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run test:e2e`

### Rust / Tauri側

- [ ] `cargo test`
- [ ] `cargo clippy` を入れるか判断する
- [ ] `cargo fmt --check`
- [ ] `npm run tauri:dev`
- [ ] `npm run tauri:dev:attached`
- [ ] `npm run tauri:build`

### 人力確認

- [ ] Tauri Controller起動
- [ ] Tauri ControllerからVRM読み込み
- [ ] マイク口パク
- [ ] カメラモード
- [ ] OBS Render接続
- [ ] 透明背景
- [ ] VRMA再生
- [ ] アプリ終了時にrelayが残らない
- [ ] 再起動時にport衝突しない

## Cut Line

締切前に時間が足りない場合の切り順:

1. Windows配布buildを切る
2. macOS署名 / notarizationを切る
3. Rust relay完全移植を切り、Node relay + Web fallbackに戻す
4. Tauri配布物を切り、Web Controller + OBS Renderで提出する

最後まで守るもの:

- Web版Controller / OBS Renderが動く
- OBSでVRMが表示される
- 透明背景
- マイク口パク
- READMEに起動手順がある

## 次のGoal案

```text
/goal Prepare VPlant3D for a distributable Tauri app by implementing or prototyping in-app relay startup. Read AGENTS.md, docs/work-log.md, docs/tauri-controller-technical-plan.md, docs/tauri-distribution-readiness-task-list.md, docs/obs-architecture-redesign.md, docs/tdd-for-codex.md, and docs/human-handoff-board.md first. Keep the Web fallback working. Start by auditing the current Node relay behavior, then choose the smallest safe approach between Rust relay prototype and Node sidecar startup. Preserve OBS Render URLs, ?obs=1, ?transparent=1, ?control=1, VRM/VRMA loading, mic mouth, camera mode, manual control, and existing tests. Add Rust or pure logic tests where feasible. Run npm run test, npm run lint, npm run build, npm run test:e2e, cargo test where applicable, and try npm run tauri:dev / npm run tauri:build if feasible. Update docs/work-log.md and docs/human-handoff-board.md. Stop when the app can start or attach to a relay without manual terminal setup, or when the exact blocker and fallback path are documented.
```
