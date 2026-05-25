# KalidoKit / TensorFlow.js Pose Detection 調査メモ

確認日: 2026-05-25

## 結論

VPlant3Dでは、短期的に KalidoKit や TensorFlow.js Pose Detection へ置き換えない。

- KalidoKit はVRM/Live2D向けのリターゲット計算として参考価値はあるが、公式READMEで非推奨化が明記されている
- TensorFlow.js Pose Detection はMoveNet / BlazePose / PoseNetを統一APIで扱えるが、現在使っている MediaPipe Tasks Vision を置き換えても、VRMへの自然な腕・手リターゲット問題は解決しない
- ハッカソンMVPでは、カメラ系モーキャプを広げるより、安定しているマイク口パク、表情ボタン、手動操作、VRMA、見た目調整を優先する

採用するなら、KalidoKitは依存追加ではなくアルゴリズム参考、TensorFlow.js Pose Detectionは別ブランチで比較スパイクに限定する。

## 参照

- KalidoKit GitHub: https://github.com/yeemachine/kalidokit
- KalidoKit npm: https://www.npmjs.com/package/kalidokit
- TensorFlow.js Pose Detection README: https://github.com/tensorflow/tfjs-models/blob/master/pose-detection/README.md
- TensorFlow.js Models: https://www.tensorflow.org/js/models
- TensorFlow Blog: High Fidelity Pose Tracking with MediaPipe BlazePose and TensorFlow.js: https://blog.tensorflow.org/2021/05/high-fidelity-pose-tracking-with-mediapipe-blazepose-and-tfjs.html
- @tensorflow-models/pose-detection npm: https://www.npmjs.com/package/@tensorflow-models/pose-detection

## KalidoKit

### 何か

KalidoKit は、MediaPipe / TensorFlow.js の face、pose、hand系モデルのランドマーク出力から、顔blendshape、目、姿勢、手指の回転値を計算するJavaScriptライブラリ。

公式READMEでは、Facemesh、BlazePose、Handpose、Holisticと互換があり、VRMモデルやLive2D avatarのrigging向けに設計されたと説明されている。

主なAPI:

- `Face.solve(facelandmarkArray, options)`
- `Pose.solve(poseWorld3DArray, poseLandmarkArray, options)`
- `Hand.solve(handLandmarkArray, "Right" | "Left")`
- `Face.stabilizeBlink(...)`

### 状態

- npm package: `kalidokit`
- npm latest: `1.1.5`
- npm last publish: 4年前
- license: MIT
- dependencies: 0
- GitHub stars: 約5.6k
- 公式READMEに「officially deprecated」と記載あり

### VPlant3Dでの利点

- VRM/VTuber用途を前提にした既存知見を読める
- 顔、目、姿勢、手指のsolve方法がまとまっている
- Blink安定化や手指角度計算の考え方は参考になる
- MITで、ライセンス上は参照しやすい

### VPlant3Dでの問題

- 非推奨化済みで、今から依存として採用するには保守リスクが高い
- 現行の MediaPipe Tasks Vision API とは入力形式や前提がずれる可能性がある
- KalidoKitを入れても、任意VRMの腕IK、モデル別ボーン軸、OBS relay、手が体の前に来る制約は別途必要
- VPlant3Dの現在の問題は「検出」より「VRMへの安定した流し込み」であり、KalidoKit採用だけでは解決しない

### 判断

依存追加はしない。

使う場合は以下に限定する。

- `Face.stabilizeBlink` 相当のまばたき安定化ロジックの参考
- `Hand.solve` 相当の指カール・手首回転算出の参考
- `Pose.solve` の肩/肘/手首からの角度計算を読む

ただし、コードを直接移植する場合はライセンス表記と実装差分確認が必要。

## TensorFlow.js Pose Detection

### 何か

`@tensorflow-models/pose-detection` は、TensorFlow.js models repoの姿勢検出API。

対応モデル:

| Model | Keypoints | 特徴 |
| --- | ---: | --- |
| MoveNet | 17 | 高速。ブラウザで50fps以上を狙えると説明されている |
| BlazePose | 33 | 顔・手・足まわりを含む追加点。3D keypointsとsegmentationも返せる |
| PoseNet | 17 | 複数人pose対応。ただし古め |

基本API:

```ts
import * as poseDetection from '@tensorflow-models/pose-detection';

const detector = await poseDetection.createDetector(
  poseDetection.SupportedModels.BlazePose,
  { runtime: 'tfjs', modelType: 'lite' },
);

const poses = await detector.estimatePoses(video);
```

返り値は `Pose[]`。`keypoints` は画像座標、`keypoints3D` はBlazePoseで利用可能。READMEではBlazePoseの3D keypointsについて、hip中心を原点とするおおむね `-1..1` の2m立方体空間として説明されている。

### Runtime

BlazePoseは、TensorFlow.js Pose Detection API内で次のruntimeを選べる。

| Runtime | 特徴 |
| --- | --- |
| `tfjs` | TensorFlow.js runtime。WebGL backendを使える。Nodeなど広い環境に寄せやすい |
| `mediapipe` | MediaPipe runtime。WASM + GPU accelerationで、公式Blogでは高速なout-of-the-box推論が説明されている |

TensorFlow Blogでは、MediaPipe runtimeは初期ページロードが小さい一方、detector作成時にruntime/model assetを読むと説明されている。TFJS runtimeはWebGL backendなどを初期ロードし、モデルassetはdetector作成時に読む。

### VPlant3Dでの利点

- MoveNetを使えば、上半身の軽い姿勢検出だけなら高速化の余地がある
- BlazePoseのAPIなら33 keypointsで、現在のMediaPipe Pose Landmarkerに近い構造を扱える
- `tfjs` runtimeに寄せると、MediaPipe Tasks Visionとは別の実行経路で比較できる
- `@tensorflow-models/pose-detection` はApache-2.0で、VPlant3Dの依存としては扱いやすい

### VPlant3Dでの問題

- MoveNetは17 keypointsなので、手首位置は取れても手指や足先の補助点はない
- BlazePoseを使うなら、現在のMediaPipe Pose Landmarkerと得られる情報は大きく変わらない
- TFJS runtimeはWebGLを使うため、Three.js WebGL rendererとGPU resource競合を確認する必要がある
- `tfjs` runtime、backend、modelを追加するとbundle / lazy-load / model hosting設計が増える
- APIを替えても、VRMへの自然な腕IK、キャリブレーション、ポール方向、モデル差吸収は残る

### 現在の MediaPipe Tasks Vision との比較

| 観点 | MediaPipe Tasks Vision 現行 | TensorFlow.js Pose Detection |
| --- | --- | --- |
| 既存実装 | すでに導入済み | 新規導入が必要 |
| 顔/手/姿勢 | Pose / Face / Hand Landmarkerを使用中 | Pose Detectionは姿勢のみ。顔/手は別modelが必要 |
| Pose keypoints | Pose Landmarkerで33点 | BlazePose 33点、MoveNet/PoseNet 17点 |
| runtime | MediaPipe TasksのWASM/CPU中心で運用 | TFJS WebGL/WASMまたはMediaPipe runtime |
| Three.js共存 | 既に動作確認済み | WebGL backend利用時は再検証が必要 |
| ハンド問題への効果 | 検出は取れるが流し込みが難しい | 同じく流し込みが難しい |

## 採用判断

### 今すぐやらない

ハッカソンMVPでは導入しない。

理由:

- 既存MediaPipe実装から置き換える作業量に対して、デモ価値が不確実
- ハンドトラッキングの主問題はライブラリではなくretargeting品質
- 依存追加、モデルasset、WebGL backend、OBS/Chrome差分の検証が増える

### 後で試すなら

比較スパイクとして以下を別ブランチで行う。

1. `@tensorflow-models/pose-detection` と `@tensorflow/tfjs-backend-webgl` をdynamic importで導入
2. Control PageだけでMoveNet SinglePose Lightningを試す
3. MediaPipe Poseと同じskeleton overlayへ流す
4. FPS、CPU/GPU負荷、検出安定性、モデル読み込み時間を比較する
5. VRM retargetingには接続せず、検出品質比較だけで止める

BlazePose比較をする場合も、まずはoverlayまで。VRM腕IKへ再接続しない。

## VPlant3D方針

短期:

- KalidoKitは入れない
- TensorFlow.js Pose Detectionも入れない
- ハンドトラッキングUIはしまったままにする
- カメラなし操作、マイク口パク、表情、VRMA、ライトを優先する

中期:

- KalidoKitのsolve実装を読んで、参考になる式だけVPlant3D側の純ロジックとして再実装する
- TensorFlow.js Pose Detectionは、MediaPipe Tasks Visionが明確に問題になった場合だけ比較する

長期:

- 外部トラッキング、iFacialMocap/VMC、または手動操作を主軸にする方が、OBS向けアバターレイヤーとして安定しやすい
