# AITuber向けMCP連携案

## 目的

VPlant3DをAITuber向けに拡張する場合、AIエージェントがアバターを操作し、結果を確認できる外部インターフェースがあると価値が出る。

この文書では、MCP(Model Context Protocol)対応を「AIがVPlant3Dを配信アバター表示ツールとして扱うための追加レイヤー」として検討する。

重要なのは、MCPを通常ユーザー向けUIの置き換えにしないこと。まずは通常のTauri Controller / OBS Render / Local Relay構成を安定させ、その上にAITuberやマルチモーダルAI向けの操作口を足す。

## 想定ユースケース

### 1. AIが表情を切り替える

AITuberの返答内容に合わせて、AIが表情プリセットを切り替える。

例:

- 明るい返答: `happy`
- 驚いた返答: `surprised`
- 謝罪や反省: `sad`
- 強いリアクション: `angry`
- 通常会話: `neutral` または全表情解除

VPlant3D側では、VRM 0.x / 1.0の表情名差分を内部で吸収し、AI側には安定した名前だけを見せる。

### 2. AIがVRMAリアクションを再生する

ユーザーコメントや会話イベントに合わせて、AIが短いVRMAを再生する。

例:

- 挨拶モーション
- 喜びリアクション
- びっくりリアクション
- 待機モーション
- エンディングポーズ

VRMAはまだ普及していないため、最初は「使える人向けの追加演出」として扱う。MCP対応により、AITuber側のシナリオ制御から呼びやすくなる。

### 3. AIがモデル位置や画角を調整する

AIまたは外部スクリプトが、配信画面の構成に合わせてアバターの位置・拡大率・回転を切り替える。

例:

- 雑談: バストアップ
- ゲーム実況: 右下に小さく配置
- コメント読み: 左寄せ
- サムネイル撮影: 中央アップ

この用途では、完全な数値操作よりも「プリセット切り替え」が安全で使いやすい。

### 4. AIが現在の見た目を確認する

マルチモーダルAIが呼び元の場合、VPlant3Dからレンダリング済み画像を返せると、AIが「今どう見えているか」を確認できる。

これはAITuber用途ではかなり重要。

AIが画像を見られると、以下のような確認が可能になる。

- アバターが画面内に入っているか
- 顔が中央付近にあるか
- 表情が期待通りか
- 口が開きっぱなしになっていないか
- 背景透過用Renderに余計なUIが出ていないか
- 明るすぎる、暗すぎる、見切れているなどの問題がないか

そのためMCP対応は、操作toolだけでなく観測toolも持つべき。

## 基本設計

VPlant3DのMCP対応は、Local Relayの横に薄いMCPサーバーを置く構成がよい。

```text
AITuber / MCP Host
        |
        | MCP
        v
VPlant3D MCP Server
        |
        | internal HTTP / WebSocket
        v
VPlant3D Local Relay
        |
        +--> Controller
        |
        +--> OBS Render
```

理由:

- 既存のController / OBS Render構成を壊さない
- Web fallbackとTauri版の両方に乗せやすい
- MCPを使わない一般ユーザーの導線を複雑にしない
- RelayのControl API / Observation APIを先に整備すれば、MCP以外の外部連携にも使える

## APIの分け方

### Control API

AIや外部ツールがVPlant3Dを操作するためのAPI。

候補:

- 表情を切り替える
- 表情を解除する
- VRMAスロットを再生する
- VRMAを停止する
- アバター位置プリセットを選ぶ
- アバター位置を数値指定する
- ライトプリセットを選ぶ
- 手動Look方向を指定する

### Observation API

AIや外部ツールがVPlant3Dの状態を確認するためのAPI。

候補:

- 現在の接続状態を返す
- 現在のVRM / VRMA状態を返す
- 現在の表情値を返す
- 現在のアバター位置を返す
- OBS Render接続の有無を返す
- レンダリング済み画像を返す
- 直近エラーを返す

AITuber向けには、Control APIよりObservation APIの方が差別化になりやすい。AIが「操作したつもり」ではなく「見た目を確認してから次の行動を選べる」ため。

## MCP tool案

### `vplant3d_get_status`

現在の状態を返す。

返す情報:

- app version
- relay status
- controller connected
- obs render connected
- loaded VRM name
- VRM version
- loaded VRMA slots
- current expression preset
- current control mode
- current avatar transform

### `vplant3d_set_expression`

表情プリセットを切り替える。

入力:

- `preset`: `neutral` / `happy` / `angry` / `sad` / `relaxed` / `surprised` / `none`
- `transitionMs`: optional

方針:

- 存在しない表情は安全に無視する
- VRM 0.x / 1.0のalias解決はVPlant3D側で行う
- `none` は全プリセット表情を0へ戻す

### `vplant3d_play_motion`

登録済みVRMAスロットを再生する。

入力:

- `slotId`
- `loop`: optional
- `restart`: optional

方針:

- ローカルファイルをMCPから直接選ばせない
- 事前にユーザーがControllerで読み込んだVRMAだけを再生対象にする
- ファイル権利とローカルパス露出の事故を避ける

### `vplant3d_set_avatar_framing`

アバターの位置・拡大・回転を変更する。

入力:

- `preset`: optional
- `x`
- `y`
- `scale`
- `rotationY`

方針:

- 最初はプリセット中心が安全
- 数値指定は範囲を強く制限する
- OBS Renderで見切れる設定は警告を返す

### `vplant3d_capture_render`

現在のRender画像を返す。

返す情報:

- PNGまたはJPEG
- width / height
- capture source: `controller-preview` / `obs-render`
- timestamp
- related state summary

実装候補:

1. Controller preview canvasから取得する
2. OBS Render canvasから取得する
3. RelayがRenderへcapture requestを送り、Renderが画像を返す

最初はController previewからのcaptureが実装しやすい。ただしAITuber本番の見た目確認としては、OBS Render側のcaptureが理想。

### `vplant3d_get_render_diagnostics`

画像を返さず、軽い状態だけ返す。

返す情報:

- frame age
- current expression values
- current head/body pose
- render connected
- last runtimeState sequence
- dropped frames
- asset loaded

OBS側のピクつき調査で作ったdebug overlayの知見をAPI化するイメージ。

## Resource案

MCP resourceとして、読み取り専用の状態を提供する。

- `vplant3d://status`
- `vplant3d://config`
- `vplant3d://render/latest`
- `vplant3d://errors/recent`
- `vplant3d://vrma/slots`

ただし、画像はresourceよりtoolで明示的に取得する方が安全。大きなバイナリを勝手に読ませないため。

## 安全設計

### カメラとマイクはMCPから開始しない

カメラ開始、マイク開始、デバイス選択は、最初はMCP toolにしない。

理由:

- カメラは顔バレ事故につながる
- マイクは音声入力権限が絡む
- ブラウザ / Tauri / OS権限の挙動が複雑
- AITuberの自動操作で勝手に開始されると怖い

開始はユーザーがController UIで行う。MCPは状態確認と、許可済み状態での表情・モーション操作に限定する。

### ローカルファイル選択はMCPから行わない

VRM / VRMAファイルの読み込みも、最初はController UIからのみ行う。

理由:

- モデル利用条件の確認が必要
- ローカルパスやファイル一覧をAIに渡すべきではない
- 誤ったモデルや未許可素材を自動で使う事故を避ける

MCPからは「既に読み込まれているものを操作する」範囲にする。

### 外部アクセスを許可しない

初期実装では、MCPサーバーとControl APIはlocalhost限定にする。

推奨:

- bind addressは `127.0.0.1`
- LAN公開はしない
- tokenまたはsession secretを導入する
- OBS Render URLとは別に、MCP用secretを持つ
- debug endpointは明示的に有効化された時だけ使う

AITuber用途では別プロセス連携が多いが、まずは同一PC内の安全な連携に限定する。

## 実装段階

### Phase 0: Local Control / Observation APIを先に作る

MCPより先に、VPlant3D内部向けのHTTP / WebSocket APIを整理する。

やること:

- `GET /api/status`
- `POST /api/expression`
- `POST /api/framing`
- `POST /api/vrma/play`
- `POST /api/vrma/stop`
- `GET /api/render/capture`

この段階ではMCPはまだ実装しない。MCP以外の外部連携やテストにも使える土台を作る。

### Phase 1: 読み取り専用MCP

最初のMCPは読み取り中心。

やること:

- `vplant3d_get_status`
- `vplant3d_get_render_diagnostics`
- `vplant3d_capture_render`

狙い:

- AIがVPlant3Dの状態を把握できる
- マルチモーダルAIが見た目を確認できる
- 危険な操作をまだ入れない

### Phase 2: 安全な操作MCP

次に、ユーザー操作の代替として安全な範囲を開ける。

やること:

- `vplant3d_set_expression`
- `vplant3d_play_motion`
- `vplant3d_stop_motion`
- `vplant3d_set_avatar_framing`

狙い:

- AITuberが会話内容に応じて表情・動きを切り替えられる
- カメラなし運用でもAIらしいリアクションを作れる

### Phase 3: AITuber workflow向けプリセット

AITuber用途に寄せた高レベルtoolを追加する。

候補:

- `vplant3d_react_to_message`
- `vplant3d_set_scene_mood`
- `vplant3d_prepare_thumbnail_pose`
- `vplant3d_reset_to_idle`

この段階では、単なる低レベル操作ではなく「配信で使う意図」をtool名にする。

## レンダリング済み画像の返し方

### Controller preview capture

Controller側の16:9 preview canvasをcaptureする。

長所:

- 実装しやすい
- Tauri内で完結しやすい
- AIの確認用途には十分な場合がある

短所:

- OBS Renderと完全一致しない可能性がある
- transparent modeやOBS側のサイズとは違う

### OBS Render capture

OBS Render側のcanvasをcaptureし、Relay経由でMCPへ返す。

長所:

- 実際にOBSへ出している見た目に近い
- 透明背景、画角、表情の確認に強い

短所:

- OBS Browser Source内から画像を返す経路が必要
- 画像サイズが大きいと通信負荷が増える
- 連続captureは重くなりうる

### 推奨

初期実装はController preview captureで始める。次にOBS Render captureを追加する。

captureは連続ストリーミングではなく、AIが必要な時に1枚要求する方式にする。

## 通信設計との関係

MCP対応は、現在のLocal Relayを置き換えるものではない。

推奨構成:

```text
Runtime Channel:
  Controller -> Local Relay -> OBS Render
  WebSocket
  runtimeState / asset / VRMA command

Control API:
  External tools / MCP -> Local Relay or Controller
  HTTP + WebSocket
  expression / motion / framing / light

Observation API:
  External tools / MCP -> Local Relay or Render
  HTTP
  status / diagnostics / capture image
```

WebRTCは将来の別端末操作やリモート操作には候補になるが、MCP/AITuber用途の最初の実装には重い。まずはlocalhost上のHTTP + WebSocketで十分。

## Booth商品としての見せ方

MCP対応は一般ユーザーには伝わりにくいが、AITuber向けには刺さる可能性がある。

訴求文の方向:

- AIから表情やモーションを切り替えられる
- AIが現在の見た目を画像で確認できる
- OBS Browser Sourceにそのまま出せる
- カメラなしでも、AIリアクションとマイク口パクで配信感を作れる

ただし、初月5万円を狙う段階では、MCPは本体の主機能ではなく「今後伸ばす方向」として扱うのがよい。まずはWindows portable、OBS導入手順、手動操作、マイク口パク、表情プリセットの安定性を優先する。

## リスク

- MCP Host側の設定がユーザーには難しい
- AITuber界隈でもMCPが標準とは限らない
- 画像captureを頻繁に行うと重くなる
- AIが勝手にカメラ/マイク/ファイルへ触る設計にすると危険
- OBS RenderとController previewの差分で、AIの見た目判断がずれる可能性がある
- MCP実装に寄せすぎると、通常配信者向けの使いやすさが後回しになる

## 当面の結論

AITuber向けMCP対応は有望。ただし、今すぐMCP本体を実装するより、先にLocal Relayまわりを「外部操作できるAPI」として整理するのがよい。

優先順位:

1. Windows portable版の通常利用を安定させる
2. Controller UIから表情・位置・VRMA・OBS URLを簡単に使えるようにする
3. Local Control API / Observation APIを追加する
4. レンダリング済み画像captureをAPI化する
5. 読み取り専用MCPを追加する
6. 表情・VRMA・位置調整のMCP操作を追加する

VPlant3Dの独自性としては、「OBS Browser Source向けの軽量VRM表示」に加えて、「AIが見た目を確認しながらアバターを操作できる」方向がかなり良い。これは単なるVTuberツールではなく、AITuberの画面上身体を作る道具として説明できる。
