# 手動操作入力の検討

調査日: 2026-05-22

## 結論

マウス操作やゲームコントローラー操作は、今のVPlant3Dのスタックでもかなり現実的。外部トラッキング接続より軽く、ブラウザ/OBS Browser Source/Control Page分離設計とも相性がよい。

特に「モーキャプを使いたくない人向け」「カメラが使えないOBS環境向け」「配信中に少しだけ表情や向きを動かしたい用途」に効く。VPlant3Dの独自性としても、単なる自動トラッキングではなく、OBS用の軽量アバター演出コントローラーへ寄せられる。

最初に入れるなら、マウス左ドラッグで顔/上半身の向きを変える機能が一番よい。次にゲームパッドのスティックで頭、体、表情、VRMA再生を操作する。

## 位置づけ

VPlant3Dの入力系は、以下のように複数のsourceを持つ形にすると整理しやすい。

| 入力 | 得意なこと | 弱いこと |
| --- | --- | --- |
| MediaPipe | カメラだけで顔/体/手を自動追跡 | 検出落ち、OBS権限、顔バレ配慮、ノイズ |
| マイク | 低コストな口パク | 表情や頭は動かせない |
| VRMA | 安定した決めモーション | ライブ感は低い |
| 外部トラッカー | 高品質な顔/全身入力 | 機材、UDP relay、設定が重い |
| マウス | すぐ使える、配信者が意図を出しやすい | 手がふさがる |
| ゲームパッド | 手元で連続操作しやすい | 対応デバイス差、最初にボタン入力が必要 |

手動操作は、トラッキングの代替ではなく「演出用の上書きレイヤー」として扱うのがよい。

## マウス操作

ブラウザ標準のPointer Eventsで実装する。MDNによるとPointer Eventsは、mouse、pen、touchを単一のDOMイベントモデルとして扱える。ドラッグ中にcanvas外へ出ても操作を継続したいので、`setPointerCapture()` を使う。

### 推奨操作

| 操作 | 機能 | 備考 |
| --- | --- | --- |
| 左ドラッグ | 顔のyaw/pitch | まずはこれだけで十分 |
| Shift + 左ドラッグ | 上半身yaw/roll | 頭だけ動く違和感を避けたい時 |
| 右ドラッグ | モデル位置調整 | 既存の位置調整スライダーと同期 |
| ホイール | 拡大縮小 | 既存のscaleと同期 |
| ダブルクリック | 顔/上半身向きをリセット | 配信中に戻しやすい |
| 中クリックまたはAlt + ドラッグ | 目線/顔向き微調整 | 後回しでよい |

Control Pageの16:9プレビューcanvas上だけで操作する。OBS Render Page側は操作UIを持たず、既存relay経由で反映する。

### 係数の考え方

- ドラッグ量をそのまま角度にせず、上限とdeadzoneを置く
- マウスを離したら即リセットしない
- リセットは自動復帰モードと保持モードを選べるようにする
- 頭だけでなく、少しだけ胸/体にも分配すると自然

例:

```ts
type ManualPointerPose = {
  headYaw: number;   // -1..1
  headPitch: number; // -1..1
  headRoll: number;  // -1..1
  chestYaw: number;  // -1..1
  chestRoll: number; // -1..1
};
```

初期係数の候補。

| 値 | 目安 |
| --- | --- |
| head yaw | 最大60度 |
| head pitch | 最大35度 |
| head roll | 最大15度 |
| chest yaw | head yawの20から30% |
| chest roll | head rollの10から20% |
| smoothing | 0.15から0.25 |
| release | 0.02から0.06 |

## ゲームパッド操作

ブラウザ標準のGamepad APIで実装する。MDNでは、接続/切断イベントと `navigator.getGamepads()` による状態取得が提供される。すでに接続済みのゲームパッドは、ページ表示後にユーザーがボタンやスティックを操作した時点で見える場合がある。

### 推奨マッピング

標準ゲームパッド前提。デバイス差があるので、最初は設定画面に「入力確認」だけ出す。

| 入力 | 機能 |
| --- | --- |
| 右スティックX/Y | 顔yaw/pitch |
| 左スティックX | 体yaw |
| 左スティックY | モデル上下または前後感の調整 |
| L2/R2 | 顔rollまたは体roll |
| A | 表情: 笑顔 |
| B | 表情: 驚き |
| X | VRMA 1再生/停止 |
| Y | VRMA 2再生/停止 |
| LB/RB | 表情/VRMAプリセット切り替え |
| Start | 手動入力ON/OFF |
| Select/Back | リセット |

### 注意点

- ブラウザやOSによってボタン番号やaxisがずれる可能性がある
- ページにフォーカスが必要な場合がある
- OBS Browser Sourceでゲームパッド入力を直接取るより、Control Pageで受けてrelayする方が安全
- 接続状態、デバイス名、入力値を確認する小さなデバッグ表示が必要
- 配信事故を避けるため、初期状態はゲームパッド操作OFFがよい

## 入力優先順位

手動操作は「加算」ではなく「上書きまたはブレンド」にする。

推奨は以下。

| 対象 | 優先順位 |
| --- | --- |
| 顔/頭 | 手動操作が有効なら、MediaPipe頭の上にブレンド。完全上書きも選択可 |
| 体 | 手動操作はMediaPipe体の補助として弱く加算 |
| 表情 | ボタン表情は一定時間ホールドし、トラッキング表情より強く出す |
| 口 | マイク口パクを基本維持。ボタン表情と競合する時だけ口を弱める |
| VRMA | 手動操作中も再生できるが、頭/表情は手動上書きを優先 |

実装上は `manualControl` を既存のrelay stateに混ぜるより、まずControl側で最終的な `target pose` を作ってから送る方が簡単。ただし後から外部トラッカーも増えるなら、入力sourceを保持した正規化レイヤーへ寄せた方が長期的にはよい。

## UI方針

コントローラー画面の縦配置に合わせるなら、操作パネルは以下の並びがよい。

1. VRM読み込み
2. 手動操作
3. 顔/口
4. 体トラック
5. 手
6. VRMA
7. 位置調整
8. 外部接続/診断

手動操作パネルには、最小限以下を置く。

- 手動操作ON/OFF
- マウス操作ON/OFF
- ゲームパッド操作ON/OFF
- 顔向き保持/自動復帰
- リセット
- 入力状態: `未操作` / `マウス操作中` / `ゲームパッド接続`

長い説明文は置かず、必要ならdocs側に逃がす。

## 具体実装案

### 目標

「カメラなしモード」の中核として、コントローラー側の16:9モデルプレビューを手動操作キャンバスにする。

初期スコープは以下。

- 左クリックドラッグ: 顔向き
- 中ボタンドラッグ: モデル位置
- ホイール: 拡大縮小
- 右クリックドラッグ: モデル全体のY回転
- ダブルクリック: 手動顔向きリセット

ゲームパッドは、この基礎ができた後に同じ内部形式へ入力する。

### 入力割り当て

| 操作 | 対象 | 内部反映 | 初期挙動 |
| --- | --- | --- | --- |
| 左ドラッグ | 顔yaw/pitch | `HeadRetargetPose` に手動値をブレンド | 離しても保持 |
| Shift + 左ドラッグ | 胸/体yaw/roll | `UpperBodyRetargetPose` に手動値をブレンド | 後回し |
| Alt + 左ドラッグ | 顔roll | `HeadRetargetPose.roll` | 後回し |
| 中ドラッグ | モデルX/Y | `avatarOffsetX/Y` | 既存スライダーと同期 |
| ホイール | 拡大縮小 | `avatarScale` | 既存スライダーと同期 |
| 右ドラッグ | 全体Y回転 | `avatarRotationY` | 既存スライダーと同期 |
| ダブルクリック | リセット | 手動head/bodyだけ0へ | avatar transformは戻さない |

中クリックはブラウザによってオートスクロールが出ることがあるので、プレビュー上では `auxclick` と `contextmenu` を止める。右ドラッグも同様にcontext menuを止める。

### ファイル構成

```text
src/input/manual-control.ts
test/manual-control.test.ts
```

`manual-control.ts` はDOMを触らない純粋ロジックにする。

候補API:

```ts
export type ManualPointerButton = "primary" | "auxiliary" | "secondary";

export interface ManualPointerDrag {
  button: ManualPointerButton;
  deltaX: number;
  deltaY: number;
  viewportWidth: number;
  viewportHeight: number;
  shiftKey?: boolean;
  altKey?: boolean;
}

export interface ManualPoseState {
  enabled: boolean;
  headYaw: number;
  headPitch: number;
  headRoll: number;
  chestYaw: number;
  chestRoll: number;
}

export interface ManualAvatarDelta {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotationY: number;
}

export function updateManualPoseFromDrag(
  previous: ManualPoseState,
  drag: ManualPointerDrag,
  options?: Partial<ManualControlOptions>,
): ManualPoseState;

export function createAvatarDeltaFromDrag(
  drag: ManualPointerDrag,
  currentScale: number,
): ManualAvatarDelta;
```

### Relayへの載せ方

最初は `RelayRenderState` に `manual` フィールドを増やさず、Control Page側で既存の `headRetargetPose` / `upperBodyRetargetPose` に合成して送る。

理由:

- Render Page側の補間は既にある
- relay schema変更を小さくできる
- OBS Render Pageは「最終姿勢を受け取って滑らかに表示する」責務のままでよい

ただし後から外部トラッカーやゲームパッドを足すなら、以下のような入力source別状態へ分ける余地を残す。

```ts
type TrackingInputSource = "mediapipe" | "manual" | "gamepad" | "external";
```

### 合成ルール

Control Pageで毎フレーム以下の順で最終姿勢を作る。

1. MediaPipe / 自動揺れ / VRMAなど既存の姿勢を作る
2. 手動操作が有効ならheadへ上書き寄りにブレンドする
3. chestへは弱く分配する
4. relayへ送る

初期値:

| 項目 | 値 |
| --- | --- |
| head yaw最大 | 60度 |
| head pitch最大 | 35度 |
| head roll最大 | 0度、Alt対応時に15度 |
| chest yaw分配 | head yawの20% |
| chest roll分配 | 0%から開始 |
| drag sensitivity | プレビュー幅の半分で最大yaw |
| release | なし。保持 |
| reset | ダブルクリックまたはボタン |

顔向きは保持にする。自動復帰は後から選択式にする。ここを急いで入れると、現在避けたい「棒立ちへ戻ろうとしてブレる」挙動を再発させやすい。

### UI追加

既存の縦配置Control Pageでは、VRMの直下に「手動操作」カードを置く。

表示内容は最小限。

- 手動操作ON/OFF
- マウス操作ON/OFF
- 顔向きリセット
- 状態: `未操作` / `顔操作` / `位置調整` / `回転`

説明文は増やさない。操作説明はカード下部の短い一行か、docsに逃がす。

プレビュー上には、必要なら小さな操作ヒントだけ出す。

```text
左: 顔 / 中: 位置 / 右: 回転 / Wheel: 拡大
```

### DOM接続

Control Pageのみでイベントを受ける。

- `pointerdown`
- `pointermove`
- `pointerup`
- `pointercancel`
- `lostpointercapture`
- `wheel`
- `dblclick`
- `contextmenu`
- `auxclick`

`pointerdown` 時に `setPointerCapture(pointerId)` を呼ぶ。これにより、ドラッグ中にcanvas外へ出ても操作が切れにくい。

OBS Render Pageではイベントを受けない。

### 既存コードとの接続箇所

| 既存箇所 | 変更内容 |
| --- | --- |
| `src/main.ts` のUI生成 | 手動操作カードを追加 |
| `src/main.ts` のcanvas初期化 | Control Page preview canvasへpointer/wheelイベントを接続 |
| `publishRelayState()` | 既存の最終 `headRetargetPose` / `upperBodyRetargetPose` をそのまま送る |
| `applyRelayRenderState()` | 基本変更なし |
| `src/relay/messages.ts` | 初期実装では変更なし |
| `src/state/app-store.ts` | ON/OFF、状態テキスト、必要ならmanual enabledを追加 |

### テスト方針

Unit test:

- 左ドラッグXがhead yawへ変換される
- 左ドラッグYがhead pitchへ変換される
- 上限でclampされる
- 中ドラッグがoffset deltaへ変換される
- 右ドラッグがrotationY deltaへ変換される
- wheelがscale deltaへ変換され、下限/上限に収まる
- resetでmanual poseがneutralになる

E2E:

- Control Pageに手動操作カードが表示される
- OBS Pageでは手動操作UIが表示されない
- プレビューcanvas上でdragしてもページスクロールやcontext menuが邪魔しない
- 可能ならdrag後に状態表示が `顔操作` へ変わる

### 実装の小さな区切り

1. 純粋関数とunit testだけ追加
2. UIカードと状態だけ追加
3. 左ドラッグで顔yaw/pitch
4. ダブルクリックリセット
5. 中ドラッグ位置、wheel拡大
6. 右ドラッグ回転
7. 必要ならShift/Alt拡張

各段階で `npm run test`、UI接続後は `npm run test:e2e` を通す。1から4までできれば「カメラなしモード」の手触りは確認できる。

## 実装順

### Phase 1: マウス顔向き

- `src/input/manual-control.ts` を追加
- pointer dragから `ManualPointerPose` を作る純粋関数をテストする
- Control Page preview canvasに `pointerdown/move/up/cancel` を接続
- `setPointerCapture()` を使ってドラッグ抜けを防ぐ
- Relayへ手動poseを送る
- OBS Render Pageで既存の頭/体retargetにブレンドする

### Phase 2: 手動操作UI

- 手動操作ON/OFF
- 保持/自動復帰
- リセット
- 操作中ステータス
- E2EでControl Pageに手動操作パネルが出ること、OBS modeでUIが隠れることを確認

### Phase 3: ゲームパッド

- `gamepadconnected` / `gamepaddisconnected` を監視
- `requestAnimationFrame` で `navigator.getGamepads()` をpollする
- deadzoneとaxis正規化を純粋関数テストする
- まず右スティック顔向き、A/B表情だけ実装
- ボタン割り当て変更は後回し

### Phase 4: プリセット操作

- ワンボタン表情
- 複数VRMAスロット再生
- 表情ホールド時間
- ゲームパッドボタン割り当て

## リスク

- マウス操作は手がふさがるため、配信中に常用するより待機中/演出向き
- ゲームパッドはOS/ブラウザ/機種差がある
- 手動入力とMediaPipeが同じボーンを同時に動かすと競合する
- 自動復帰が強いと、今問題になっている「戻ろうとしてピクつく」挙動を再発させる
- OBS Render Pageで入力を受けず、必ずControl Pageで入力する運用にする必要がある

## 判定

外部トラッカー連携より先に、マウス手動操作を入れる価値は高い。理由は、実装が軽く、ブラウザ標準APIだけで完結し、OBS権限問題やトラッキング不安定への逃げ道になるから。

ゲームパッドはMVP後半向き。ただし実装そのものは重くないので、マウス手動操作の正規化レイヤーを作った後なら自然に追加できる。

## 参考リンク

- [Pointer events - MDN](https://developer.mozilla.org/docs/Web/API/Pointer_events)
- [Element.setPointerCapture() - MDN](https://developer.mozilla.org/docs/Web/API/Element/setPointerCapture)
- [Gamepad API - MDN](https://developer.mozilla.org/docs/Web/API/Gamepad_API)
- [Using the Gamepad API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API)
