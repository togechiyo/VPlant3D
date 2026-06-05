# Tauri化前アプリ機能仕上げ計画

最終更新日: 2026-06-05

## 目的

TauriでControllerを包む前に、Web版Controllerとして必要なアプリ機能を揃える。

Tauri化後にUIや状態設計を大きく変えると、Web版、Tauri版、OBS Renderの3箇所で同じ問題を直すことになる。先にWeb版で入力デバイス、設定保存、OBS URL共有、接続状態、README導線を固め、Tauriはそれを起動・配布しやすくする薄い外側として扱う。

## 方針

- OBS Renderは引き続き描画専用にする
- カメラ、マイク、ファイル選択、設定UIはController側に置く
- Tauri前の変更は、ブラウザ版でも価値があり、Tauri版へそのまま持ち込めるものに限定する
- ハンド/腕トラッキングの品質改善は再開しない。実験扱いとして隔離する
- 2026-06-07締切を考え、MVPの主役は「VRM表示 + OBS URL共有 + マイク口パク + 表情 + 手動操作 + 見た目調整」に固定する

## 実装対象

### 1. 入力デバイス選択

目的:

- 複数マイク、複数カメラ環境で、ユーザーが使うデバイスを明示的に選べるようにする
- Tauri版でも同じUIを使えるように、ブラウザ標準のMediaDevices APIを基本にする

実装案:

- `src/media/media-devices.ts` を追加する
  - `listMediaInputDevices()` を作る
  - `audioinput` と `videoinput` を分ける
  - 権限前はlabelが空になるため、`label || "マイク 1"` / `"カメラ 1"` のfallback名を返す
  - `deviceId`、`groupId`、`kind`、`label`、`displayName` を持つ軽い型を定義する
- `src/audio/` 側のマイク開始処理に `deviceId` を渡せるようにする
  - `navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: selectedId } } })`
  - `default` または未選択なら従来通り `{ audio: true }`
- MediaPipe / camera開始処理に `deviceId` を渡せるようにする
  - `getUserMedia({ video: { deviceId: { exact: selectedId } } })`
  - 失敗時は既定カメラへfallbackする
- Controller UI
  - マイク&手動モードに `マイク` select と `再取得` button
  - カメラモードに `カメラ` select と `再取得` button
  - 権限前にデバイス名が出ない場合は「権限許可後に再取得」と短く表示する
  - Start済みの状態でデバイスを変えた場合は、いったん停止して再開始するか、次回開始から反映する。MVPでは「次回開始から反映」でよい

テスト:

- `test/media-devices.test.ts`
  - audioinput / videoinputを分類できる
  - 空labelをfallback名にできる
  - 保存済みdeviceIdが一覧にない場合はdefaultへfallbackする
- E2E
  - selectと再取得buttonが表示される
  - 権限なしでもUIが壊れない

人力確認:

- macOSで外部マイク/カメラを接続し、選択したデバイスが使われること
- Tauri後に同じUIで権限とdevice labelが取れること

### 2. 設定保存

目的:

- リロードやTauri再起動後に、最低限の見た目・入力設定が戻るようにする
- Tauri Storeへ移す前に、保存対象とschemaをWeb版localStorageで固める

保存対象:

- selected microphone deviceId
- selected camera deviceId
- selected control mode
- mic mouth / blink mode
- manual control enabled / manual mouse enabled / idle sway enabled
- pose mirror
- avatar transform
  - offsetX
  - offsetY
  - scale
  - rotationY
- look settings
  - keyIntensityScale
  - keyColorHex
  - keyPosition
  - keyShadowEnabled
- VRMA loop

保存しないもの:

- VRM / VRMAファイル本体
- local file path
- カメラ/マイクの生データ
- relay runtime state
- MediaPipe検出値

実装案:

- `src/config/app-config.ts` を追加する
  - `AppConfigV1` 型
  - `createDefaultAppConfig()`
  - `normalizeAppConfig(input)`
  - `pickConfigFromState(state)`
  - `applyConfigToStore(config, store)`
- `src/config/local-storage.ts` を追加する
  - keyは `vplant3d.config.v1`
  - JSON parse失敗時はdefaultへ戻す
  - 保存はUI変更のたび即時でもよいが、過剰書き込みを避けるなら短いdebounceを入れる
- Storeの状態変更を購読し、保存対象だけをlocalStorageへ書く
- 起動時にlocalStorageを読み、store初期化後に反映する
- Tauri化後は同じ`AppConfigV1`をTauri Store pluginへ移植できるよう、localStorage依存を薄くする

テスト:

- 不正JSONをdefaultへ戻せる
- 古い/欠けたconfigをnormalizeできる
- avatar transformとlook settingsを保存/復元できる
- 存在しないdeviceIdはdevice list取得後にdefaultへfallbackする

人力確認:

- 位置、拡大、ライト、モードを変えてリロードしても戻る
- デバイスを抜いた場合に壊れずdefaultへ戻る

### 3. OBS URL共有と接続状態

目的:

- Tauri版で一番重要になる「OBSへ貼るURL」を、Web版の時点で分かりやすくする
- ControllerとOBS Renderがつながっているか、ユーザーがすぐ分かるようにする

実装案:

- `src/obs/render-url.ts` を追加する
  - `createObsRenderUrl({ origin, host, port, transparent, debug })`
  - `createControlUrl({ origin, host, port })`
  - `127.0.0.1` / `localhost` の候補を生成する
- OBS URLカードを整理する
  - 推奨: `127.0.0.1`
  - 代替: `localhost`
  - 透明背景ON/OFFのtoggle
  - debug URLは折りたたみ、または小さいbuttonでコピー
  - Render URLコピーを大きめにする
  - Control URLは小さめに残す
- Relay接続状態を表示する
  - Controller -> Relay: `Relay接続中` / `Relay未接続`
  - OBS Render接続: `OBS接続中` / `OBS未接続`
  - Relay側がrender client数を返せるならそれを使う
  - 難しい場合は、Render Pageからheartbeatを送ってControllerに最終受信時刻を表示する
- `?debug=1`の通常露出は避ける
  - debug URLは「開発用」と明記する

テスト:

- URL生成の単体テスト
  - portあり/なし
  - transparent/debug flag
  - localhost / 127.0.0.1候補
- E2E
  - URLカードに推奨Render URLが出る
  - コピーbuttonが存在する
  - 通常OBS URLにdebugが混ざらない

人力確認:

- OBS Browser Sourceへ推奨URLを貼って表示される
- OBSを閉じる/開くで接続状態表示が変わる

### 4. UIの最終整理

目的:

- Tauri windowに入れても迷わない操作順にする
- 説明文ではなく、ボタン、状態、選択値で伝える

整理案:

- 上から順に固定する
  - title
  - 16:9 preview
  - 表情プリセット
  - VRM読み込み
  - 操作モード
  - 現在選択中モードの詳細
  - 位置調整
  - キーライト
  - VRMA
  - OBS URL
  - 開発/実験項目
- 実験項目
  - ハンド/腕トラック
  - MediaPipe debug表示
  - debug URL
  - 通常操作からは見えにくい下部へ移動
- 表情
  - `なし` は全表情ゼロ
  - `自然` はneutralがある時だけ適用
  - モデルにない表情はfallbackし、なければ無視
  - ボタン押下は少しだけsmooth transitionを維持する

テスト:

- E2Eで主要項目の順序・存在を確認する
- OBS ModeではUIが出ないことを維持する

### 5. README / 提出導線

目的:

- GitHubを見た人が「何のアプリで、どう動かすか」をすぐ分かるようにする
- Tauri化後もWeb fallbackがあることを説明できるようにする

READMEに必要な内容:

- 冒頭に一文
  - `VPlant3D for OBS is a lightweight VRM avatar layer and controller for OBS Browser Source.`
- スクリーンショット
- 主な機能
  - VRM表示
  - OBS Browser Source
  - 透明背景
  - マイク口パク
  - カメラなし手動操作
  - 表情プリセット
  - VRMA再生
  - キーライト調整
- 最短起動
  - `npm install`
  - `npm run dev`
  - Control URL
  - OBS Render URL
- OBS設定
  - Browser Source URL
  - width/height 1920x1080
  - transparent
  - FPS目安
- 制限
  - 腕/手トラックは実験
  - カメラ/マイク権限はブラウザ/Tauri環境で差がある
  - VRM/VRMAファイルはユーザーがローカルで選ぶ
  - VRMAリターゲット品質はモデル依存
- Tauri版
  - 導入後に追記する
  - Web版fallbackを残す

### 6. Human Handoff整理

目的:

- Codexだけでは確認できない項目を明確にして、Tauri後に詰まらないようにする

更新対象:

- `docs/human-handoff-board.md`
  - 複数マイク確認
  - 複数カメラ確認
  - OBS Render URL貼り付け確認
  - 透明背景確認
  - Tauri macOS確認
  - Tauri Windows確認
- `docs/submission-checklist.md`
  - 現在の実装状況に合わせる

## 実装順

### Phase A: デバイス選択

1. `media-devices` moduleを追加
2. マイク開始にselected audio deviceを渡す
3. カメラ開始にselected video deviceを渡す
4. Controller UIへselectと再取得buttonを追加
5. 単体テスト / E2E

完了条件:

- マイク/カメラselectが表示される
- 権限前でもUIが壊れない
- 選択値をstart処理へ渡せる

### Phase B: 設定保存

1. `AppConfigV1` schemaを追加
2. localStorage load/saveを追加
3. storeへ反映
4. deviceId fallbackを追加
5. 単体テスト / E2E

完了条件:

- リロード後にモード、位置、ライト、デバイス選択が復元される
- 不正configで壊れない

### Phase C: OBS URL / 接続状態

1. URL生成moduleを追加
2. OBS URLカードを整理
3. Relay/Render接続状態を表示
4. コピーbuttonをE2Eで確認

完了条件:

- 推奨OBS URLをコピーできる
- 通常URLとdebug URLが分かれている
- OBS Render接続の有無が分かる

### Phase D: ドキュメントとFreeze

1. READMEを更新
2. submission checklistを更新
3. human handoff boardを整理
4. ハンド/腕トラックを実験として明記

完了条件:

- 初見でも起動とOBS設定ができるREADMEになっている
- ハッカソン締切前の確認項目が明確になっている

## Tauriへ進む条件

Tauri scaffoldへ進んでよい条件:

- マイク/カメラのデバイス選択UIがWeb版で動く
- 設定保存がWeb版で動く
- OBS Render URLをコピーできる
- OBS Render接続状態が分かる
- READMEにWeb版fallback手順がある
- `npm run test`
- `npm run lint`
- `npm run build`
- `npm run test:e2e`

Tauriへ進む前に切るもの:

- ハンドトラッキング品質改善
- 腕IK調整
- 外部トラッキング接続
- VRMA記録/書き出し
- WebGPU専用表現
- 複雑な見た目プリセット追加

## リスク

### デバイス名が出ない

ブラウザは権限許可前にdevice labelを空にすることがある。

対策:

- fallback名を表示する
- 権限許可後に `再取得` を押せるようにする

### Tauri WebViewでカメラ/マイク挙動が違う

TauriはChromeではなくOS WebViewを使う。

対策:

- Web Controller fallbackを残す
- Tauri最初の目標をController表示 + URL共有に絞る
- カメラ/マイクはmacOS/Windowsで人力確認する

### 設定保存が壊れて起動不能になる

localStorageに壊れたJSONが残る可能性がある。

対策:

- `normalizeAppConfig()` を必ず通す
- parse失敗時はdefaultへ戻す
- 「設定リセット」buttonを追加する余地を残す

### OBS接続状態が正確に取れない

Relayの実装状況によっては、Render client数を直接取れない可能性がある。

対策:

- 最初はheartbeat / 最終受信時刻で実装する
- 表示は「推定」として控えめにする

## 推奨 /goal

```text
/goal Prepare VPlant3D app features before Tauri packaging. Read AGENTS.md, docs/work-log.md, docs/pre-tauri-app-readiness-plan.md, docs/hackathon-finish-task-list.md, docs/tauri-controller-technical-plan.md, docs/obs-architecture-redesign.md, and docs/tdd-for-codex.md first. Do not add Tauri yet. Implement microphone and camera device selection, localStorage-based settings persistence, improved OBS Render URL sharing, and minimal OBS Render connection status in small verified phases. Preserve OBS Render behavior, transparent mode, VRM loading, VRMA playback, mic mouth, auto blink, manual mouse control, camera mode, and current tests. Keep hand/arm tracking experimental and do not tune it. Add focused tests for media device normalization, config persistence, URL generation, and UI behavior. Run npm run test, npm run lint, npm run build, and npm run test:e2e after meaningful milestones. Update README.md, docs/work-log.md, docs/human-handoff-board.md, and docs/submission-checklist.md as needed. Commit and push stable milestones. Stop when the Web Controller has device selection, saved settings, clearer OBS URLs, connection status, and docs are ready for Tauri scaffold, or when remaining work is documented as human/Tauri verification.
```
