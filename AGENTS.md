# AGENTS.md

## 目的

このリポジトリは、OBS Browser Source に直接読み込める軽量 VRM / VRMA 3D アバターレイヤー `VPlant3D for OBS` です。

このプロジェクトは、VRMアワード / `#MadeWithVRM` オンラインハッカソン向けの実用的な試作として扱ってください。

作業目的は主に以下です。

- VRM / VRMA をOBS配信ワークフローに接続する
- OBSに差し込める軽量3Dアバターレイヤーを作る
- 透明背景、くちパク、簡易モーション、見た目づくりを短期間で成立させる
- 実装判断や調査結果を `docs/` に残す

すべての機能を広げるより、ハッカソン期間内に説明しやすく、デモしやすく、壊れにくい形を優先してください。

## 現在の優先度

汎用VTuber配信ソフト化より、OBS Browser Source 向けの軽量レイヤーを優先してください。

優先度が高い領域:

- Vite + TypeScript + Three.js の最小構成
- OBS Browser Source での表示
- 背景透過モード
- VRM読み込みと表示
- マイク音量連動の簡易くちパク
- Look / Shader プリセット
- VRMA読み込み・再生
- Style Wall / Image Panel
- README、デモ手順、`#MadeWithVRM` 向け説明文

優先度が低い、または実験寄りの領域:

- MediaPipe上半身トラッキング
- VRMA記録・書き出し
- HTML-in-Canvas / Floating Web Panel
- OBJ読み込み
- 高度なポストエフェクト
- Electron化

コアなOBS表示体験と実験機能が競合する場合は、OBS表示体験を優先してください。

## このプロジェクトの位置づけ

- このリポジトリはMMD_modokiの直接移植ではない
- MMD_modokiから借りるのは、TypeScript 3Dツールとしての構成・分離・運用の考え方
- Babylon.js / babylon-mmd / MMD編集機能は持ち込まない
- VPlant3Dは Three.js / WebGPU / `@pixiv/three-vrm` / `@pixiv/three-vrm-animation` を前提にする
- 録画、配信、音声ミキシング、コメント表示、字幕、シーン制御はOBS側に任せる

関連メモ:

- [docs/vplant3d-for-obs.md](./docs/vplant3d-for-obs.md)
- [docs/vrm-award.md](./docs/vrm-award.md)
- [docs/third-party-libraries.md](./docs/third-party-libraries.md)
- [docs/mmd-modoki-reference.md](./docs/mmd-modoki-reference.md)

## このリポジトリ固有のルール

- 手動のファイル編集は `apply_patch` を使う
- ユーザーが行った無関係な差分は戻さない
- 明示的な依頼がない限り、大規模リファクタより小さく局所的な修正を優先する
- 挙動変更や重要な知見が出たら、必要に応じて `docs/` にメモを残す
- ハッカソン向けの判断では、完成度よりデモ安定性を優先する
- 透明背景モードを壊す可能性がある演出は慎重に扱う
- UIを追加するときは、Setup ModeとOBS Modeのどちらに属するかを明確にする
- OBS ModeではUI非表示、表示専用、pointer-events無効化を基本にする
- 外部モデルやサンプルアセットを追加する場合は、利用規約・再配布可否・作者表記を確認する

## 外部公式ドキュメントの確認

Three.js / WebGPU / `@pixiv/three-vrm` / `@pixiv/three-vrm-animation` / MediaPipe / OBS Browser Source など、外部ライブラリや実行基盤に関わる作業では、記憶や推測だけで進めず、必要に応じて公式ドキュメントや一次情報を確認してください。

特に以下の作業では積極的に参照してください。

- Three.jsのRenderer、Material、AnimationMixer、Loaderまわりの実装
- WebGPU RendererとWebGL fallbackの互換性判断
- `@pixiv/three-vrm` のVRM読み込み、Expression、Humanoid、LookAt制御
- `@pixiv/three-vrm-animation` のVRMA読み込み・再生
- MediaPipe Tasks VisionのAPIやブラウザ制約
- OBS Browser Source内ChromiumでのWebGPU、マイク、透明背景の挙動

調査で得た重要な知見や、公式ドキュメントと実装上の差分・制約が見つかった場合は、必要に応じて `docs/` に短い調査メモを残してください。

## 確認コマンド

`package.json` 作成後は、基本の確認コマンドをREADMEまたはdocsに明記してください。

想定する確認コマンド:

```bash
npm run lint
npm run test
npm run build
```

コード変更後は、可能な範囲で該当コマンドを実行してください。確認できなかった場合は、その旨を明確に伝えてください。

追加の確認ルール:

- 純ロジック変更では、可能なら単体テストを追加・実行する
- 初期化処理、Renderer、VRM読み込み、OBS Mode、URL query処理に関わる変更では、ブラウザでの手動確認も重視する
- フロントエンドの見た目や3D描画を変えた場合は、可能ならPlaywrightやブラウザ確認でスクリーンショットを確認する
- OBS Browser Source特有の挙動は、通常ブラウザ確認だけで完了扱いにしない

## コードベースの想定主要箇所

現時点では未実装だが、実装時は責務を小さく分けること。

想定構成:

- `src/main.ts`
  - アプリ起動、モード判定、初期化
- `src/render/`
  - Three.js renderer、scene、camera、lights、animation loop
- `src/vrm/`
  - VRM読み込み、Expression、Humanoid、LookAt制御
- `src/vrma/`
  - VRMA読み込み・再生
- `src/audio/`
  - Web Audio API、マイク音量RMS、くちパク値生成
- `src/obs/`
  - URL query、OBS Mode、transparent mode
- `src/ui/`
  - Setup Mode UI
- `src/presets/`
  - Look / Shader、Style Wall、Image Panel presets
- `test/`
  - 純ロジックの単体テスト
- `docs/`
  - 設計メモ、調査メモ、仕様、提出準備

## 影響範囲が広い注意領域

- WebGPU RendererはOBS Browser Source内で動作差が出る可能性がある
- WebGL fallbackの有無は早めに判断する
- 透明背景とBloom / DOF / Fog / 色収差などのポストエフェクトは相性が悪い場合がある
- VRM Expression名やVRM 0.x / 1.0差分に注意する
- VRMA再生はモデル差し替え時のリターゲット品質に注意する
- MediaPipeのボーンリターゲットは沼りやすいため、首・胸・肩までで止める判断を許容する
- OBS Browser Sourceのマイク・カメラ権限は通常ブラウザと挙動が異なる可能性がある

## ドキュメント運用

大きめの変更を始める前に、まず `docs/` に既存の設計メモや調査メモがないか確認してください。

新しいドキュメントを作るときの方針:

- 特別な理由がなければ、プロジェクト内メモは日本語で書く
- できるだけ 1 ドキュメント 1 トピックにする
- READMEは外向け、`docs/` は設計・調査・判断の記録として使う
- チェックリストを肥大化させるより、必要に応じて別メモを追加する

参照開始点:

- [docs/vplant3d-for-obs.md](./docs/vplant3d-for-obs.md)
- [docs/vrm-award.md](./docs/vrm-award.md)
- [docs/third-party-libraries.md](./docs/third-party-libraries.md)
- [docs/mmd-modoki-reference.md](./docs/mmd-modoki-reference.md)

## エージェント向け実務ガイド

- レビュー依頼では、要約より先にバグ、回帰、リスク、欠けているテストを重視する
- 探索的な機能では、無理にfragileな実装を入れるより、設計メモや調査メモを残して止める判断をしてよい
- アーキテクチャ上の摩擦が見えたら、隠さずドキュメントに残す
- 楽観的な言い回しより、制約とトレードオフを明示する
- 1タスク1目的で短く切る
- mainブランチには常に動く版を残す
- 新機能追加より、1分デモで伝わる安定性を優先する
- `VRM in OBS. Render only. OBS does the broadcast.` を判断基準にする

## Codex / サブエージェント運用

長大な作業、調査範囲が広い作業、または複数領域にまたがる実装では、必要に応じてサブエージェントの使用を推奨します。

サブエージェントを使うべき場面:

- Three.js / WebGPU / OBS Browser Source の互換性調査
- `@pixiv/three-vrm` や `@pixiv/three-vrm-animation` のAPI調査
- MMD_modokiから参考にできる構造の調査
- 大きな機能を `render`、`vrm`、`audio`、`ui` などに分けて並行実装する場合
- 実装と並行してテスト、ドキュメント、ライセンス確認を進めたい場合
- レンダリング変更後のブラウザ確認やリスク洗い出し

サブエージェント運用のルール:

- 1サブエージェントには1目的だけを渡す
- 書き込み範囲を明確に分ける
- 同じファイルを複数サブエージェントに同時編集させない
- 探索エージェントには、結論、根拠、参照URL、推奨アクションを短く返させる
- 実装エージェントには、変更ファイル、確認コマンド、残リスクを報告させる
- サブエージェントの結果は鵜呑みにせず、最終的に親エージェントが統合・確認する
- 迷ったら、実装より先に小さな調査タスクとして切り出す

ただし、ユーザーから明示的にサブエージェント利用を許可されていない場合は、通常のCodex実行環境のルールに従ってください。
