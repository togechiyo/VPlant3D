# Mic Reactive Mouth Notes

最終更新日: 2026-05-20

## 採用API

Mic Reactive Mouthは、Web Audio APIとMediaDevices APIでマイク音量を取得し、VRMの口開きExpressionへ反映する。

参照した一次情報:

- MDN `MediaDevices.getUserMedia()`: https://developer.mozilla.org/docs/Web/API/MediaDevices/getUserMedia
- MDN `AnalyserNode`: https://developer.mozilla.org/docs/Web/API/AnalyserNode
- installed package types: `node_modules/@pixiv/three-vrm-core/types/expressions/VRMExpressionManager.d.ts`

実装方針:

1. Setup Modeの `Start mic` ボタンで `navigator.mediaDevices.getUserMedia({ audio: true })` を呼ぶ
2. `AudioContext` と `MediaStreamAudioSourceNode` を作り、`AnalyserNode` へ接続する
3. `AnalyserNode.getFloatTimeDomainData()` で波形サンプルを取得する
4. RMSを計算し、thresholdとsensitivityで0.0-1.0へ正規化する
5. attack / release smoothingで急なちらつきを抑える
6. VRMが読み込まれていれば `vrm.expressionManager?.setValue('aa', mouthOpen)` を呼ぶ

## 現在の実装範囲

- Setup Modeに `Mic Reactive Mouth` パネルを追加
- Start / Stop操作、RMSメーター、Mouthメーターを表示
- `aa` Expressionへ単純な口開き値を反映
- RMS、正規化、smoothingはVitestで検証
- PlaywrightではUIが表示され、OBS Modeでは非表示になることを確認

## 制限

- 音素解析ではない。声量ベースの簡易口パクである
- マイク権限はブラウザのユーザー操作が必要なため、実マイク入力の自動E2Eはまだ行っていない
- OBS Browser Source内でのマイク権限、音声デバイス選択、遅延は未確認
- VRMA再生中の表情トラックと `aa` Expressionが競合する可能性がある
- 現時点ではthreshold、sensitivity、attack、releaseをUIから調整できない

## 次の改善候補

- 感度、しきい値、attack、releaseのSetup UIを追加する
- Mic Test用のfake audioまたは録音素材を使ったPlaywright確認を検討する
- VRMA再生中に口パクを優先するか、VRMA表情を優先するかのモードを追加する
- OBS Browser Sourceでマイク権限が取れるか確認する
