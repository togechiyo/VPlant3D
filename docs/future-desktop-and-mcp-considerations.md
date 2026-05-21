# Future Desktop App and MCP Considerations

Last updated: 2026-05-21

## 目的

VPlant3Dを将来Electronデスクトップアプリ化するか、またはMCPサーバー化するかを検討する。

この文書は検討メモであり、現時点では導入しない。ハッカソンMVPでは、現在のWeb + Local Relay構成を優先する。

## 現在の前提

現在の構成:

- Chrome Control Page: `/?control=1`
- OBS Render Page: `/?obs=1&transparent=1`
- Local Relay: `server/vplant-relay.mjs`

この構成で、OBS Browser Source内でカメラ/マイクを直接扱わず、Chrome側で操作・入力・MediaPipeを担当できるようになった。

## Electron化の検討

### 期待できる利点

Electron化すると、Control PageとLocal Relayをひとつのデスクトップアプリとして配布できる。

利点:

- ユーザーが `npm run dev` を起動しなくてよくなる
- Local Relayをアプリ内部に同梱できる
- VRM/VRMAファイル選択、最近使ったファイル、設定保存を扱いやすくなる
- Chromeとは別の専用操作パネルとして見せられる
- 将来、OBS Render URLをアプリ内でコピー表示できる
- 権限やファイルパスの扱いを、Web単体よりアプリ寄りに整理できる

VPlant3Dの最終形としては、ElectronアプリがControl/Relayを持ち、OBSにはRender URLだけを入れる形が自然に見える。

```text
Electron App
  Control UI
  Local Relay
  VRM / VRMA file manager
        ↓
OBS Browser Source
  Render Page only
```

### 重くなる点

Electronはmain processとrenderer processに分かれる。Electron公式ドキュメントでも、BrowserWindowは別のrenderer processにWebページを読み込むと説明されている。Node.jsやOSに近い処理はmain/preload側に寄せる必要があり、今の単純なブラウザアプリより設計面が増える。

重くなる点:

- main / renderer / preload の責務分離が必要
- IPC設計が増える
- 自動テストが増える
- 配布、署名、アップデート、macOS権限まわりが増える
- OBSに渡すRender URLとの接続確認は結局必要
- ハッカソン残り期間に対して実装面積が大きい

Electron公式のAutomated Testing文書では、Electron自身が独自のテストソリューションを積極保守しているわけではなく、WebdriverIOやPlaywrightの `_electron` APIを使う方法が紹介されている。つまり自動テストは可能だが、今のPlaywrightブラウザE2Eよりは面倒になる。

### 導入するならいつか

今ではない。

候補タイミング:

- Web + Relay版でOBS実機動作が固まった後
- デモ提出後
- 「ユーザーがNode/npmを触らず起動できる」ことが明確な価値になった時
- 設定保存、素材管理、OBS URL表示など、デスクトップ化の利点が実装量に見合う時

### Electron化する場合の最小案

いきなり全機能をElectronへ移植しない。

最小案:

1. 既存Vite frontendをrendererとして表示する
2. 既存Local Relayをmain process側に移す、または同梱Node serverとして起動する
3. Control PageをElectron windowに表示する
4. OBS Render Pageは引き続き `http://127.0.0.1:<port>/?obs=1&transparent=1`
5. Playwright `_electron` で起動確認だけ足す

この場合も、OBS Browser SourceはElectron内に入れない。OBSは引き続き外部のRender Pageを見る。

## MCPサーバー化の検討

### MCPとは何に使うか

MCPは、AIアプリケーションが外部ツールやデータへ接続するためのclient-server構成を取る。公式仕様では、MCP hostが複数のMCP serverへ接続し、JSON-RPC 2.0ベースのmessageでtools/resources/promptsなどを扱う。

VPlant3DでMCPサーバー化を考える場合、ユーザー向け機能というより、Codexなどのコーディングエージェントがアプリ状態を読み書きしやすくするための開発/運用補助になる。

### 期待できる利点

MCPサーバーを持つと、エージェントがVPlant3Dを「外から操作できる道具」として扱える。

候補tool:

- `get_app_state`
  - 現在のVRM/VRMA、Relay接続、OBS Render接続状態を返す
- `set_avatar_transform`
  - X/Y/scale/rotationを変更する
- `trigger_expression`
  - 表情presetを押す
- `play_vrma_slot`
  - 指定slotのVRMAを再生する
- `stop_vrma`
  - VRMA停止
- `get_handoff_items`
  - 人間確認が必要な項目を返す
- `capture_render_snapshot`
  - 可能ならRender Pageのスクリーンショットや状態を返す

候補resource:

- `vplant://state`
- `vplant://config`
- `vplant://work-log`
- `vplant://human-handoff`

利点:

- Codexが長時間作業中にアプリ状態を直接確認しやすい
- UIを手でクリックしなくても、表情・位置・VRMAを操作できる
- 回帰確認を自然言語タスクから呼びやすくなる
- 将来、デモ準備や提出チェックリストの自動確認に使える

### 重くなる点

MCPサーバー化は、一般ユーザーの配信体験に直接効くとは限らない。

重くなる点:

- MCP server contractの設計が必要
- toolsの安全性、入力検証、権限範囲を決める必要がある
- Codex/ClaudeなどMCP host側の接続設定が必要
- OBS実機やカメラ/マイクの人力確認はMCPでも消えない
- 開発補助としては便利だが、ハッカソン提出価値として見せにくい

特に、VRM/VRMAファイルやカメラ/マイクの扱いは、MCP toolから安易に触らせない方がよい。ユーザー操作と権利確認が必要な素材は、人間が明示的に選ぶ前提を維持する。

### MCP化するなら何をサーバーにするか

MCPサーバーをVPlant3D本体そのものに埋め込むより、Local Relayの横に置くのがよい。

```text
Codex / MCP Host
        ↓ MCP
VPlant3D MCP Server
        ↓ internal API
Local Relay
        ↓ WebSocket / HTTP
Control Page / OBS Render Page
```

理由:

- UI実装とMCP tool contractを分離できる
- Electron化してもWeb版でも同じRelay APIを使える
- MCPは開発者向けoptional layerにできる
- 一般ユーザーはMCPなしで使える

### MCP toolの設計方針

導入するなら、最初は読み取り中心にする。

Phase 1:

- `get_status`
- `list_vrma_slots`
- `get_current_transform`
- `get_recent_errors`

Phase 2:

- `set_avatar_transform`
- `trigger_expression`
- `play_vrma_slot`
- `stop_vrma`

Phase 3:

- `run_smoke_check`
- `write_handoff_note`
- `export_debug_bundle`

カメラ開始、マイク開始、ローカルファイル選択は、最初はMCP toolにしない。権限や顔バレ、素材権利の事故を避ける。

## Tauri化の検討

### 期待できる利点

Tauriは、ElectronのようにChromiumを丸ごと同梱するのではなく、OS側のWebViewを使う。Tauri公式のProcess Modelでは、WindowsはMicrosoft Edge WebView2、macOSはWKWebView、Linuxはwebkitgtkを使うと説明されている。

VPlant3Dの思想である「軽量なOBS向けVRM/VRMAレイヤー」とは相性がよい。

利点:

- Electronより配布サイズを小さくしやすい
- Control / Relayをワンクリック起動アプリとして包める
- Rust側でローカルファイル、設定保存、ポート管理を扱える
- OBSへ入れるRender URLをアプリ内で表示/コピーできる
- Node/npmを触らないユーザーにも配布しやすい

### VPlant3Dでの現実的な役割

Tauriに3D描画の最終責任を持たせない。

VPlant3Dでは、最終的な配信映像はOBS Browser Source内のChromiumが描画する。TauriはControl UI、Local Relay、設定保存、ファイル選択、URLコピーを担当する軽量コントローラーとして使うのがよい。

```text
Tauri App
  Control UI
  Local Relay launcher
  VRM / VRMA file manager
  Config / URL copy
        ↓ WebSocket / HTTP
OBS Browser Source
  Render Page
  VRM / VRMA drawing
  Transparent output
```

この構成なら、Tauri側WebViewのWebGPU対応差分が出ても、OBS Render Pageの最終描画には直接影響しにくい。

### 注意点

Tauriは軽いが、WebView差分がある。

注意点:

- macOS WKWebView、Windows WebView2、Linux webkitgtkでWeb API挙動が変わる可能性がある
- WebGPU、MediaPipe、カメラ/マイク権限はTauri内で必ず検証が必要
- Rust toolchain、Tauri設定、permission設定が増える
- Tauri公式はWebDriverによるE2Eテストを案内しているが、今のPlaywrightブラウザE2Eより運用が増える
- Control UIでMediaPipeまで動かすなら、Tauri内WebViewでのカメラ/マイク確認が必要

### Tauri化する場合の最小案

最初からMediaPipeや3D previewをTauri内で完全保証しない。

最小案:

1. 既存Web + Relay構成を維持する
2. TauriはLocal Relay起動とControl URL表示から始める
3. Control UIをTauri windowで開く
4. OBS Render Pageは引き続き `http://127.0.0.1:<port>/?obs=1&transparent=1`
5. カメラ/マイク/MediaPipeがTauri内で不安定な場合、Chrome Control Page fallbackを残す

### Electronとの比較

Electron:

- Chromium同梱なのでChrome/OBS Chromiumに近い挙動を期待しやすい
- WebGPU / MediaPipe / browser APIの見通しは比較的立てやすい
- ただし配布サイズとメモリ使用量が大きい

Tauri:

- 軽い
- VPlant3Dの「軽量」思想と合う
- ただしOS WebView依存なので、WebGPU / MediaPipe / permissionまわりは検証必須

VPlant3Dでは描画をOBS内Chromiumに残せるため、TauriはElectronより有力な後日候補になりうる。Tauriは「描画アプリ」ではなく「軽量Control/Relayランチャー」として考える。

### 採用判断

今は導入しない。

後日、一般ユーザーに配布する段階では、Electronより先にTauriを試す価値がある。

採用条件:

- OBS Render PageがWeb + Relayで安定している
- TauriからLocal Relayを安定起動できる
- Tauri windowでControl UIが実用上問題なく動く
- カメラ/マイク/MediaPipeが不安定な場合でもChrome fallbackを残せる

## Desktop AppとMCPの関係

Electron/Tauri化とMCP化は独立している。

優先順位:

1. Web + RelayのMVPを固める
2. OBS実機でRender/Control分離が機能することを確認する
3. 必要ならTauriでControl/Relayを軽量に包む
4. TauriのWebView差分が問題になる場合のみElectronを再検討する
5. さらに必要ならMCP serverをRelayの横に追加する

Desktop app化すると、MCP serverを同梱しやすくなる可能性はある。ただし、MCPだけならElectron/TauriなしでもNode serverとして実装できる。

## 判断

### 今やるべきではない

ハッカソンMVPでは、Electron化、Tauri化、MCPサーバー化はいずれも導入しない。

理由:

- 現在の最大リスクはOBS実機での透明RenderとRelay同期
- Electronは配布体験を改善するが、実装・テスト・権限の面積が大きい
- Tauriは軽量配布に向くが、WebView差分とカメラ/マイク/MediaPipe検証が必要
- MCPはCodex運用には魅力があるが、配信者向けMVPの体験価値には直結しにくい

### 後日やる価値はある

Tauri:

- 一般ユーザーに配る段階で最初に試す価値がある
- Control/Relayランチャーとして使うならVPlant3Dの軽量思想と合う

Electron:

- TauriのWebView差分が問題になった時の保険
- Chromium同梱による安定性を優先する場合に再検討する

MCP:

- Codex主導開発をさらに進める段階で有力
- アプリ状態確認、デバッグ、表情/VRMA操作の自動化に向く

## 次に決めること

- OBS実機でLocal Relay構成が動くか
- ユーザー向け配布を重視するか、ハッカソン提出だけを重視するか
- Control PageをChromeで十分とするか、Tauri製の専用コントローラーが必要か
- Tauri内WebViewでカメラ/マイク/MediaPipeを担当させるか、Chrome fallbackを残すか
- Codexが操作できる内部APIをまずRelayに作るか
- MCP serverを入れる場合、読み取り専用から始めるか

## 参考

- [Electron Process Model](https://www.electronjs.org/docs/latest/tutorial/process-model)
- [Electron Automated Testing](https://www.electronjs.org/docs/latest/tutorial/automated-testing)
- [Tauri Architecture](https://v2.tauri.app/concept/architecture/)
- [Tauri Process Model](https://tauri.app/concept/process-model/)
- [Tauri WebDriver Testing](https://v2.tauri.app/develop/tests/webdriver/)
- [Model Context Protocol Architecture](https://modelcontextprotocol.io/docs/learn/architecture)
- [Model Context Protocol Specification: Architecture](https://modelcontextprotocol.io/specification/2025-06-18/architecture)
