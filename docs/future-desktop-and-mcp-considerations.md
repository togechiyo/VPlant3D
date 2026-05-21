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

## ElectronとMCPの関係

Electron化とMCP化は独立している。

優先順位:

1. Web + RelayのMVPを固める
2. OBS実機でRender/Control分離が機能することを確認する
3. 必要ならElectronでControl/Relayを包む
4. さらに必要ならMCP serverをRelayの横に追加する

Electron化すると、MCP serverを同梱しやすくなる可能性はある。ただし、MCPだけならElectronなしでもNode serverとして実装できる。

## 判断

### 今やるべきではない

ハッカソンMVPでは、Electron化もMCPサーバー化も導入しない。

理由:

- 現在の最大リスクはOBS実機での透明RenderとRelay同期
- Electronは配布体験を改善するが、実装・テスト・権限の面積が大きい
- MCPはCodex運用には魅力があるが、配信者向けMVPの体験価値には直結しにくい

### 後日やる価値はある

Electron:

- 一般ユーザーに配る段階で有力
- Control/Relayをワンクリック起動にできる

MCP:

- Codex主導開発をさらに進める段階で有力
- アプリ状態確認、デバッグ、表情/VRMA操作の自動化に向く

## 次に決めること

- OBS実機でLocal Relay構成が動くか
- ユーザー向け配布を重視するか、ハッカソン提出だけを重視するか
- Control PageをChromeで十分とするか、専用デスクトップアプリが必要か
- Codexが操作できる内部APIをまずRelayに作るか
- MCP serverを入れる場合、読み取り専用から始めるか

## 参考

- [Electron Process Model](https://www.electronjs.org/docs/latest/tutorial/process-model)
- [Electron Automated Testing](https://www.electronjs.org/docs/latest/tutorial/automated-testing)
- [Model Context Protocol Architecture](https://modelcontextprotocol.io/docs/learn/architecture)
- [Model Context Protocol Specification: Architecture](https://modelcontextprotocol.io/specification/2025-06-18/architecture)
