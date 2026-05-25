# @vladmandic/human + three-vrm 調査メモ

確認日: 2026-05-25

## 結論

`@vladmandic/human` は、顔・体・手・ジェスチャーを1つのAPIで扱える統合ライブラリとして有力だが、VPlant3Dの短期MVPへ導入しない。

判断:

- `@vladmandic/human` 本体はMITで、比較的保守されている
- `human-three-vrm` という `Human + Three.js + @pixiv/three-vrm` の実例がある
- ただし `human-three-vrm` は2024-09-06にarchive済み
- その実装でも、手は主に `hand rotation + finger curls` で、手首位置や腕IKの自然さは限定的
- VPlant3Dの現課題である「任意VRMで手が自然な位置に来る」は、Humanへ置き換えても残る

採用するなら、依存追加ではなく、まず実装参考として読む。導入スパイクをやる場合も、Controller Pageの検出debugまでに限定し、OBS RenderやVRM反映へ即接続しない。

## 参照

- `@vladmandic/human` GitHub: https://github.com/vladmandic/human
- `@vladmandic/human` Wiki: https://github.com/vladmandic/human/wiki
- `@vladmandic/human` TypeDoc: https://vladmandic.github.io/human/typedoc/classes/Human.html
- `@vladmandic/human` Models: https://github.com/vladmandic/human/wiki/Models
- `@vladmandic/human` npm: https://www.npmjs.com/package/@vladmandic/human
- `human-three-vrm` GitHub: https://github.com/vladmandic/human-three-vrm
- `human-three-vrm` source `human-vrm.ts`: https://raw.githubusercontent.com/vladmandic/human-three-vrm/main/src/human-vrm.ts
- `human-three-vrm` source `vrm-calculate.ts`: https://raw.githubusercontent.com/vladmandic/human-three-vrm/main/src/vrm-calculate.ts

## @vladmandic/human とは

`@vladmandic/human` はTensorFlow.jsベースの統合human analysisライブラリ。

README / Wikiで確認できる主な機能:

- 3D face detection / face mesh / face rotation
- face description / recognition
- body pose tracking
- 3D hand / finger tracking
- iris / gaze tracking
- emotion / age / gender
- gesture recognition
- body segmentation
- object detection

入力は `HTMLVideoElement`、`Canvas`、`ImageBitmap`、`Tensor` など広く扱える。

基本形:

```ts
import { Human } from '@vladmandic/human';

const human = new Human({ backend: 'webgl' });
await human.load();
await human.warmup();
const result = await human.detect(video);
```

`human.next(result)` による補間結果取得もあり、検出fpsと描画fpsを分ける設計に向く。

## Models / runtime

Humanのdefault models:

| 領域 | Default model |
| --- | --- |
| Face Detection | MediaPipe BlazeFace Back |
| Face Mesh | MediaPipe FaceMesh |
| Iris | MediaPipe Iris |
| Emotion | Oarriaga Emotion |
| Body | MoveNet Lightning |
| Hand | HandTrack + MediaPipe HandLandmarks |
| Segmentation | Google Selfie |
| Object | CenterNet MobileNet v3 |

backendはWebGLなどを指定できる。VPlant3DではThree.js WebGL rendererと同じブラウザ上で動かすため、GPU resource競合やfps低下を再検証する必要がある。

## human-three-vrm

`human-three-vrm` は `@vladmandic/human`、`three`、`@pixiv/three-vrm` を使ったVRM avatar animationサンプル。

状態:

- GitHub repo: `vladmandic/human-three-vrm`
- License: MIT
- Archived: 2024-09-06
- dependencies:
  - `@vladmandic/human`
  - `@pixiv/three-vrm`
  - `three`
- three-vrm versionは古い `^1.0.5`

READMEでの実装範囲:

| 領域 | 実装 |
| --- | --- |
| Face | head angle, eye blinks, gaze, simple emotions, mouth open |
| Body | shoulder lean, elbow/wrist/hip/knee positions |
| Hands | hand rotation, finger curls |

READMEには、bodyの未実装としてfront/back detection、詳細な脚・腕位置、入力検証による不自然動作回避が挙げられている。これはVPlant3Dで詰まった点と一致する。

## human-three-vrm 実装から見えること

### 顔

`vrm-calculate.ts` では、`res.face[0].rotation.angle` を使ってhead/neckを回し、face meshからblink/mouthを計算している。

VPlant3Dへの参考:

- 顔回転と体leanを差し引く考え方
- blinkをmesh距離比から作る方法
- mouth openを上下唇距離 / 顔高さ比で作る方法

ただしVPlant3DはすでにMediaPipe Face Blendshapesを使っているため、全面置換の優先度は低い。

### 体

Bodyは2D keypointの角度から胸、上腕、下腕、脚を回している。

例:

- shoulder間角度でchest roll
- shoulder/elbow角度でupperArm
- elbow/wrist角度差でlowerArm

これはシンプルだが、2D角度を直接VRM bone rotationへ入れる方式なので、任意VRMで安定した自然さを得るには弱い。VPlant3Dが試して失敗した「roll/角度を直接入れる」方式に近い。

### 手

Handはbody wristに近いhand boxを左右に割り当て、以下を行っている。

- pinky/thumbのz差から手のひら回転を推定
- `hand.landmarks[finger].curl` が `half` / `full` なら指ボーンへ一定角を入れる
- index/palmの角度からhand boneのy回転を入れる

参考になる点:

- 手の左右割り当てにbody wristとの距離を使う
- 指は位置ではなくcurlだけに落とす
- 手首位置をhand-only landmarksから作らない

参考にしない方がいい点:

- 指curlが `half/full` の段階値で、細かい表現には弱い
- VRMボーンへ直接rotationを入れており、モデル差に弱い
- 手首・肘・肩の自然なIK解決はしていない

## KalidoKit / MediaPipe Tasks / Human 比較

| 観点 | MediaPipe Tasks Vision 現行 | KalidoKit | @vladmandic/human |
| --- | --- | --- | --- |
| 役割 | 検出API | landmarks -> rig solve | 統合検出API + 補間 |
| 保守 | 現行Google系API | 非推奨 | 本体は比較的現行 |
| 顔 | Face Landmarker blendshapes | solve参考 | face mesh/rotation/emotion |
| 体 | Pose Landmarker 33点 | solve参考 | MoveNet等 |
| 手 | Hand Landmarker 21点 | solve参考 | HandTrack + MediaPipe hand |
| VRM例 | 自前実装が必要 | 参考実装あり | `human-three-vrm` あり。ただしarchive |
| 今の問題への効果 | 検出は取れる | mapping参考になる | 検出統合・補間は魅力。ただし腕/手IK問題は残る |

## VPlant3Dでの採用判断

### 依存としての導入

短期ではしない。

理由:

- 既存MediaPipe Tasks Visionからの置き換え範囲が広い
- TFJS/WebGL backendがThree.jsと同居するため、パフォーマンス再検証が必要
- 顔・体・手のすべてをHumanへ寄せると、既存relay/debug/test設計を作り直す必要がある
- `human-three-vrm` のVRM実装は古く、archive済みで、VPlant3Dの現行three-vrm 3.xとは差分が大きい

### 参考としての利用

使う価値はある。

特に参考にする:

- `human.next(result)` のような検出結果補間設計
- hand box と pose wrist の距離で左右手を割り当てる考え方
- hand-only landmarksを腕位置に使わず、指curl / palm rotationに限定する考え方
- face mesh距離比からblink/mouthを作るフォールバック

### スパイクする場合

別ブランチで、以下の範囲に限定する。

1. `@vladmandic/human` をdynamic importで入れる
2. Control Pageだけで `human.detect(video)` を動かす
3. `result.body` / `result.hand` / `result.face` をdebug overlayへ表示する
4. FPS、初回ロード、bundle増加、Three.js描画への影響を測る
5. VRMへは反映しない

導入評価の合格条件:

- Control Pageで30fps相当の操作感が維持できる
- Three.js canvasとWebGL backendが目立って競合しない
- 現行MediaPipe Tasksより結果が安定する、または補間APIで明確に扱いやすい
- モデルassetの配布・キャッシュ方針が整理できる

## ハンド周りへの具体方針

ハンドトラッキングを再開する場合でも、腕IKをすぐ復活させない。

推奨順序:

1. `Human` / `human-three-vrm` / KalidoKitの手指処理を読み、指curlだけ純ロジック化する
2. Hand landmarksから「指を開く/握る」だけをdebug表示する
3. VRM指ボーンへ弱く反映する
4. 手首回転はOFFまたは小さく入れる
5. 腕位置はPose wrist IKではなく、手動操作または固定ポーズを優先する

つまり、VPlant3Dでの手は以下に分ける。

| 要素 | 方針 |
| --- | --- |
| 指curl | Human/KalidoKitを参考に再実装する価値あり |
| 手首回転 | 後回し。モデル差が大きい |
| 手首位置 | webcam単体では不安定。MVPでは扱わない |
| 腕IK | 凍結。将来やるなら明示キャリブレーション必須 |

## 結論

`@vladmandic/human + three-vrm` は、VPlant3Dにとって「依存候補」より「参考実装」として価値が高い。

特に `human-three-vrm` は、VRM avatarへ何をどこまで簡単に反映できるか、逆にどこで破綻するかが見える。短期的には採用せず、手指curlや補間設計の参考に留める。
