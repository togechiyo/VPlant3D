# HolisticMotionCapture 調査メモ

確認日: 2026-05-25

## 結論

HolisticMotionCapture は、VPlant3Dへ直接導入する候補ではなく、Unity実装の参考資料として扱う。

理由:

- Unityアプリ / Unity packageであり、VPlant3DのWeb + Three.js + `@pixiv/three-vrm` 構成には直接入らない
- 依存は `HolisticBarracuda`、UniVRM、Unity Barracuda系で、ブラウザ実行ではない
- package最終更新は2023年で、UniVRM 0.108.0 / VRM 0.x前提。READMEにVRM 1.0非対応とある
- ただし、MediaPipe Holistic相当の出力をVRMボーンへ入れる実装として、pose / hand / face の考え方は参考になる

VPlant3Dでは、依存追加しない。参考にするなら、LowPassFilter、手指ボーンの初期姿勢補正、顔のblink/mouth計算、30fps制限の考え方に限定する。

## 参照

- HolisticMotionCapture GitHub: https://github.com/creativeIKEP/HolisticMotionCapture
- HolisticMotionCapture releases: https://github.com/creativeIKEP/HolisticMotionCapture/releases
- Unity package npm: https://www.npmjs.com/package/jp.ikep.holistic-motion-capture
- HolisticBarracuda GitHub: https://github.com/creativeIKEP/HolisticBarracuda
- HolisticMotionCapture README: https://github.com/creativeIKEP/HolisticMotionCapture/blob/main/Packages/HolisticMotionCapture/README.md

## 何か

HolisticMotionCapture は、単眼カラーWebカメラだけで人物のpose、face、handsを推定し、VRM avatarの姿勢・表情・手を動かすUnityアプリ。

README上の機能:

- VRM avatar読み込み
- カメラ入力
- 背景画像設定
- Windowsではvirtual camera出力
- macOSではSyphon出力
- pose / face / hands を同時または個別に動かす
- 上半身のみモード
- Look Camera

開発者向けには `jp.ikep.holistic-motion-capture` Unity packageが提供されており、`HolisticMotionCapturePipeline` を `Animator` に対して使う。

```cs
motionCapture = new HolisticMotionCapturePipeline(avatar);
motionCapture.AvatarPoseRender(webCam);
```

## Package / license / 更新状況

`npm view jp.ikep.holistic-motion-capture` で確認した情報:

| 項目 | 値 |
| --- | --- |
| package | `jp.ikep.holistic-motion-capture` |
| version | `1.1.0` |
| license | Apache-2.0 |
| modified | 2023-02-12 |
| Unity | 2020.3.11f1 |
| dependency | `jp.ikep.mediapipe.holistic@1.1.0` |

`jp.ikep.mediapipe.holistic` は `HolisticBarracuda` 系で、依存にBlazeFace、FaceLandmark、Iris、BlazePalm、HandLandmark、BlazePoseなどを持つ。こちらのnpm modifiedは2022-09-25。

READMEには、HolisticMotionCapture packageがUniVRM sourceを含み、UniVRM 0.108.0相当で、VRM 1.0には未対応と記載されている。

## 実装構造

リポジトリ内の主要ファイル:

- `Packages/HolisticMotionCapture/Scripts/HolisticMotionCapture.cs`
- `Packages/HolisticMotionCapture/Scripts/HolisticMotionCapture_Pose.cs`
- `Packages/HolisticMotionCapture/Scripts/HolisticMotionCapture_Hand.cs`
- `Packages/HolisticMotionCapture/Scripts/HolisticMotionCapture_Face.cs`
- `Packages/HolisticMotionCapture/Scripts/LowPassFilter.cs`
- `Packages/HolisticMotionCapture/Scripts/BoneToHolisticIndex.cs`

`HolisticMotionCapturePipeline.AvatarPoseRender()` は最大30fpsに制限し、1回の入力texture処理後にPose、Hand、Faceを順番に適用する。

処理順:

1. `holisticPipeline.ProcessImage(...)`
2. `PoseRender(...)`
3. `HandRender(left)`
4. `HandRender(right)`
5. `FaceRender(...)`

これはVPlant3DのController側でも参考になる。入力検出と描画を分けても、avatar state適用はフレーム単位で一貫した順序にするべき。

## Pose実装の要点

`HolisticMotionCapture_Pose.cs` では、VRM avatarの初期ボーン方向を保存し、MediaPipe world landmarkから各ボーンの回転を作っている。

主な特徴:

- 起動時にT-poseからA-poseへ近づけるため、上腕を60度下げる
- `HumanBodyBones` とHolistic landmark indexの対応表を持つ
- hips/spine/chest/head、肩から手、腰から足のbone chainを作る
- 各boneについて、親bone、子bone、初期rotation、inverse rotationを保存する
- `TriangleNormal(spine, leftHip, rightHip)` からavatar forwardを推定する
- pose world landmarkにLowPassFilterをかける
- scoreが低ければ初期姿勢へLerpで戻す
- 上半身のみモードでは脚を動かさない

VPlant3Dへの参考点:

- VRM/モデルの初期ボーン方向からinverse rotationを作る
- MediaPipe landmarkを直接角度にするより、bone chainごとの初期補正を持つ
- score低下時に即neutralへ落とさずLerpする
- full bodyではなく上半身のみモードを明確に持つ

注意点:

- Unity `Animator` / `HumanBodyBones` 前提
- `Quaternion.LookRotation(-toChild, forward)` を世界回転で直接boneへ入れる方式で、Three.js normalized boneへそのまま移植はできない
- VPlant3Dで問題になった腕IKの自然さは、ここでも完全解決ではない

## Hand実装の要点

`HolisticMotionCapture_Hand.cs` では、手首と各指ボーンについて初期姿勢とinverse rotationを作り、hand landmarkから手首・指の回転を作っている。

主な特徴:

- 左右手ごとに `wrist -> finger proximal/intermediate/distal` のchainを作る
- middle proximal方向をhand direction、index proximal方向を補助軸として、手のup/forwardを作る
- hand landmarkの座標を `(-x, y, -z)` に変換する
- wrist scoreが低い場合はResetHandする
- 手首rotationを作り、手首ねじれ回避のためlowerArmにも20%だけ手首rotationを混ぜる
- 指は各bone landmarkからchild landmarkへの方向を使い、`Quaternion.LookRotation` で回転させる

VPlant3Dへの参考点:

- hand-only landmarkは「指と手首回転」に使い、腕全体の手首位置決めには使っていない
- 指ごとに初期ボーン方向とinverse rotationを持つ設計
- 手首ねじれをlowerArmへ少し逃がす設計
- detection scoreが低い時は保持/復帰を明示的に扱う

注意点:

- この方式は手首位置を解決しない
- webcamだけで「手を体の前の正しい位置に置く」問題には直接効かない
- VPlant3Dで再利用するなら、腕IKではなく「指curl / palm rotation」の参考に留める

## Face実装の要点

`HolisticMotionCapture_Face.cs` では、VRM 0.xの `VRMBlendShapeProxy` を使い、blink、pupil、mouthを制御している。

主な特徴:

- Face / eye landmarksにLowPassFilterを適用
- EAR的な眼の縦横比からblinkを計算
- min/max EARを動的に更新し、blinkを0/1へ寄せる
- mouthは唇距離、口幅、目間距離からA/I/U/E/Oを推定
- 口形状ごとにLowPassFilter
- look targetがある場合は `VRMLookAtHead` を使う

VPlant3Dへの参考点:

- MediaPipe blendshapeが不安定な場合の、landmark距離ベースfallback
- blinkを中途半端にせず、閾値で開閉へ寄せる設計
- mouth A/I/U/E/O を唇開きと横幅から分配する考え方

注意点:

- VPlant3Dは現在MediaPipe Face Blendshapesを使っている
- VRM 0.x `VRMBlendShapeProxy` 前提で、three-vrm 3.x の `expressionManager` とは違う

## LowPassFilter

`LowPassFilter` は速度に応じてcutoffを変える簡易One Euro Filter系の実装に近い。

概念:

- `alpha = r / (r + 1)`
- `r = 2π * cutoff * dt`
- `cutoff = p2 + p1 * |dx|`
- 動きが速い時は追従を速くし、遅い時は平滑化する

VPlant3Dへの参考価値は高い。

現在のVPlant3Dには固定係数smoothが多い。表情や頭/体の追従性問題では、固定smoothより速度適応型filterの方が扱いやすい可能性がある。

## VPlant3D候補としての評価

### 直接導入

不可。

理由:

- Unity packageであり、Web/Three.js runtimeではない
- UniVRM 0.108.0 / VRM 0.x前提
- Barracuda / Unity Animator / HumanBodyBonesに強く依存
- VPlant3DはOBS Browser Source向けのWebアプリで、配布・実行前提が違う

### アルゴリズム参考

有効。

参考優先度:

| 領域 | 優先度 | 理由 |
| --- | --- | --- |
| LowPassFilter | 高 | 固定smoothより追従性/安定性の両立に使える可能性 |
| Face blink/mouth fallback | 中 | 現行blendshapeが不安定な場合の代替案 |
| Hand finger rotation | 中 | 指curl再開時の初期姿勢補正として参考になる |
| Pose full body rotation | 低 | Web/VRM/任意モデルでは破綻リスクが高い |
| Arm IK | 低 | 手首位置問題の直接解決ではない |

## KalidoKit / Human / HolisticMotionCapture 比較

| 観点 | KalidoKit | @vladmandic/human | HolisticMotionCapture |
| --- | --- | --- | --- |
| 種別 | JS rig solve | JS統合検出API | Unity app/package |
| 保守 | 非推奨 | 本体は現行寄り | 最終更新2023 |
| VRM実例 | あり | human-three-vrmあり | Unity/UniVRM実装 |
| Web導入 | 可能だが非推奨 | 可能 | 不可 |
| Hand参考 | curl/rotation | detection/curl参考 | bone初期姿勢・finger rotation参考 |
| 腕位置解決 | 弱い | 弱い | 弱い |
| VPlant3D短期導入 | しない | しない | しない |

## 方針

短期:

- 導入しない
- ハンドトラッキングUIはしまったまま
- `LowPassFilter` の思想を、表情や頭/体の追従改善へ応用できるか検討する

中期:

- 手指を再開するなら、HolisticMotionCaptureのhand初期姿勢補正を参考にする
- ただし最初は指curlのみ
- 手首位置と腕IKは扱わない

長期:

- webcam単体の腕/手位置より、手動操作・VRMA・外部トラッキング・VMCを優先する

## 結論

HolisticMotionCaptureは「UnityでVRMをHolistic mocapする完成例」として非常に参考になる。

ただしVPlant3Dの現在の技術スタックへ直接持ち込む候補ではない。特にハンドトラッキングの難所である手首位置・腕IKは、この実装でも根本解決していない。採用価値があるのは、速度適応型LowPassFilter、VRMボーン初期姿勢からinverse rotationを作る考え方、顔/口のlandmark距離ベース計算である。
