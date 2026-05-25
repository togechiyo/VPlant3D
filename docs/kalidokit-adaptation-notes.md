# KalidoKit リターゲット移植メモ

確認日: 2026-05-25

## 結論

KalidoKit は依存追加せず、MITライセンス表記つきで必要な計算だけVPlant3D側へ適用する。

今回採用した範囲:

- `Hand.solve` の「手のひら平面から手首回転を出す」考え方
- `Hand.solve` の左右手で index / little MCP を入れ替える手のひら方向判定

今回採用しない範囲:

- KalidoKit packageそのものの依存追加
- `Pose.solve` 全体の置き換え
- VRMボーン名へ直接対応するKalidoKitのfinger map
- 手首位置IKの解決

## 参照

- KalidoKit GitHub: https://github.com/yeemachine/kalidokit
- KalidoKit npm: https://www.npmjs.com/package/kalidokit
- npm package: `kalidokit@1.1.5`
- License: MIT
- Copyright: Copyright (c) 2021 yeemachine

## 実装判断

KalidoKitの `Hand.solve` は、HandLandmarker 21点から手首・指ボーンの回転値を作る。VPlant3Dで欲しい「手首が意図した位置に来る」問題は、これだけでは解決しない。

ただし、既存のVPlant3D実装は手首回転を2D方向と簡易距離から推定していたため、手のひらが回った時の向きが不安定になりやすかった。そこで、手首回転だけをKalidoKit方式に寄せた。

具体的には:

- wrist、index MCP、little MCP の3点で手のひら平面を作る
- その平面からroll/pitch/yawを計算する
- VPlant3Dの既存 `HandRetargetTarget` 形式である `wristPitch` / `wristYaw` / `wristRoll` に変換する
- 指カールは既存の0..1圧縮値を維持する

## 制約

- KalidoKitの腕計算は基本的に回転ソルバで、手首位置IKではない
- PoseLandmarkerの肩・肘・手首だけで自然な手首位置を作るには、キャリブレーション、腕長、ポール方向、体の前に出す制約が別途必要
- VPlant3DのハンドトラッキングUIは現在しまっているため、この変更は再有効化前の下準備

## 次の実装候補

1. `Pose.solve` / `calcArms` 相当をVPlant3Dの純ロジックに移植する
2. ただしOBSへ送る前に、既存のIK target方式とKalidoKit-style rotation方式を切り替え可能にする
3. 実モデルで、腕を上げる、肘を曲げる、手を体の前に出す、手首をひねる、の4ケースだけ確認する
4. 失敗する場合は、ハンドトラッキングをMVPから外し、手動操作と表情・ライトを優先する
