# AGENTS.md

## 目的

このリポジトリは、OBS Browser Source に直接読み込める軽量 VRM / VRMA 3D アバターレイヤー `VPlant3D for OBS` です。

このプロジェクトは、VRMアワード / `#MadeWithVRM` オンラインハッカソン向けの実用的な試作として扱ってください。

作業目的は主に以下です。

- VRM / VRMA をOBS配信ワークフローに接続する
- OBSに差し込める軽量3Dアバターレイヤーを作る
- 透明背景、くちパク、簡易モーション、見た目づくりを短期間で成立させる
- 実装判断や調査結果を `docs/` に残す
- ハッカソン提出作業やデモ動画の最終収録は人間が担当するため、Codexはアプリ作成に集中する

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
- 作業の流れ、成功、失敗、次にやることは [docs/work-log.md](./docs/work-log.md) に残す
- ハッカソン向けの判断では、完成度よりデモ安定性を優先する
- 透明背景モードを壊す可能性がある演出は慎重に扱う
- UIを追加するときは、Setup ModeとOBS Modeのどちらに属するかを明確にする
- OBS ModeではUI非表示、表示専用、pointer-events無効化を基本にする
- 外部モデルやサンプルアセットを追加する場合は、利用規約・再配布可否・作者表記を確認する
- 大きな素材、参考VRM、VRMA、録画素材、権利確認が必要な素材は `local-assets/` に置く。`local-assets/` はGitHubへ載せない
- `local-assets/` の使い方は [docs/local-assets.md](./docs/local-assets.md) を参照する
- 画像素材は原則として生成するか、人間が作成したものを使う。ネット上の画像を安易に借りて使わない
- 生成画像を使う場合も、用途、生成日、プロンプト概要を [docs/local-assets.md](./docs/local-assets.md) またはwork-logに記録する

## UI / Visual Direction

想定画面サイズ:

- 1920x1080

デザイン方向:

- 無彩色ダークグレーをベースにする
- ネオングリーンとネオンブルーをアクセントカラーにする
- Setup Modeは落ち着いた暗色ツールUIにする
- OBS ModeはUIを非表示にし、アバターと3D要素の見え方を優先する
- 透明背景モードでは、背景前提の装飾や重いポストエフェクトに依存しない
- ボタン、状態表示、選択中、スライダー、アウトライン、軽い発光にアクセントカラーを使う
- 文字サイズとコントロールは1920x1080のOBSキャンバス上で読みやすい密度にする

## Git運用

大きな作業を始める前には、必ず現在の状態を確認し、可能ならテスト済みの状態でコミットしてください。

基本方針:

- 大きな実装、依存追加、構成変更、レンダリング基盤変更の前には、作業前コミットを作る
- 作業前コミットは、できれば `npm run test`、`npm run build`、lint導入後は `npm run lint` が通った状態で作る
- まだ確認コマンドがない初期段階では、少なくとも `git status` と差分を確認してからコミットする
- 作業中も、動く単位・レビューしやすい単位で小さくコミットする
- 壊れた実験はmainへ混ぜず、branchまたはworktreeで分離する
- pushは、ユーザーに共有したい節目、作業中断前、または大きな変更後に行う
- コミット前には `docs/work-log.md` のNextや結果を必要に応じて更新する
- 失敗しているテストを残したままコミットしない。例外がある場合は、コミットメッセージや最終報告で明示する

推奨タイミング:

- 大きな作業前: テスト済みコミット
- 小さな機能完了後: 実装 + テスト + docsをコミット
- 調査メモ追加後: docsだけでもコミットしてよい
- 作業終了時: work-log更新、status確認、必要ならpush

コミットメッセージは短く具体的にする。

例:

- `Set up Vite TypeScript foundation`
- `Add OBS query parsing tests`
- `Implement transparent OBS mode`
- `Document WebGPU fallback findings`

## ブランチ / Worktree運用

`main` は常に動く版として扱ってください。

基本方針:

- 小さく安全な変更は `main` に直接コミットしてよい
- 大きな実装、壊れやすい実験、依存更新は `codex/<topic>` ブランチまたはworktreeで分離する
- WebGPU、VRMA、MediaPipe、OBS Browser Source固有の挙動確認は分離作業を推奨する
- 実験ブランチで成功した場合は、必要な差分だけをmainへ取り込む
- 壊れた実験は無理に救わず、知見をdocsへ残して破棄してよい

ブランチ名例:

- `codex/vite-foundation`
- `codex/obs-transparent-mode`
- `codex/vrm-loader`
- `codex/mic-reactive-mouth`
- `codex/vrma-playback`
- `codex/mediapipe-spike`

## Daily Loop

作業開始時:

1. `git status` を確認する
2. 必要なら `git pull --ff-only` で最新化する
3. [docs/work-log.md](./docs/work-log.md) を読む
4. 今日のGoalとNextを短く書く
5. 大きな作業前なら、現在の状態をテストしてコミットする

作業中:

1. 1タスク1目的で進める
2. 不確かなAPIは公式ドキュメントを確認する
3. 純ロジックはTDDを優先する
4. 動く単位でテスト・ビルド・ブラウザ確認を行う
5. 人力確認が必要なら [docs/human-handoff-board.md](./docs/human-handoff-board.md) に記録して別作業へ進む

作業終了時:

1. `npm run test`、`npm run build`、lint導入後は `npm run lint` を可能な範囲で実行する
2. Chromeまたはin-app browserで必要な表示確認を行う
3. `docs/work-log.md` に結果、失敗、次にやることを書く
4. 変更を小さくコミットする
5. 共有すべき節目ならpushする

## Definition of Done

実装タスクは、原則として以下を満たしたらDoneとする。

- 目的の振る舞いが実装されている
- 関連する単体テストが追加または更新されている
- `npm run test` が通る
- 型・ビルドに関わる変更では `npm run build` が通る
- lint導入後は `npm run lint` が通る
- UI / 3D描画 / ブラウザ挙動に関わる変更ではChromeまたはin-app browserで確認している
- OBS固有の確認が必要な場合はHuman Handoff Boardに記録している
- 重要な仕様・制約・判断がdocsへ反映されている
- `docs/work-log.md` に作業結果とNextが残っている

例外:

- スパイク調査や失敗調査では、実装が入らなくても調査メモとwork-logが残っていればDoneとしてよい
- 人力確認待ちの項目は、Human Handoff Boardへ記録されていればCodex側のタスクは一旦Doneとしてよい

## MVP Freeze Line

ハッカソン提出前は、機能追加を止めて安定化へ切り替えるタイミングを守ってください。

目安:

- 締切3日前: 新しい大機能の追加を原則停止する
- 締切2日前: バグ修正、README、提出文、デモ動画、スクリーンショットに集中する
- 締切前日: 依存追加、レンダリング基盤変更、MediaPipeなど不安定な実験は行わない
- 当日: 提出物確認、権利表記確認、投稿作業、最終動作確認のみ

締切直前に切る候補:

- MediaPipe上半身トラッキング
- VRMA記録・書き出し
- HTML-in-Canvas
- 高度なポストエフェクト
- OBJ読み込み
- 複雑なUI設定

守る候補:

- OBS Browser Sourceで表示できること
- 透明背景
- VRM表示
- マイク音量連動くちパク
- 1分デモで価値が伝わること
- READMEと投稿文

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

## 調査しながら実装する運用

このプロジェクトでは、コーディングエージェントが積極的に調べながら作業することを推奨します。

特に、Three.js、WebGPU、VRM、VRMA、MediaPipe、OBS Browser Source、Chrome拡張、Codex機能など、APIや実行環境の仕様が変わり得る領域では、実装前または実装中に公式ドキュメント・一次情報を確認してください。

基本ループ:

1. 関連する既存docsとAGENTS.mdを読む
2. 不確かなAPIや仕様があれば公式ドキュメントを確認する
3. 小さく実装する
4. テスト、ビルド、ブラウザ確認を行う
5. 分かった制約、採用した方針、失敗した方法を `docs/` に残す
6. 人力確認が必要なら [docs/human-handoff-board.md](./docs/human-handoff-board.md) に記録する
7. 次にやることを [docs/work-log.md](./docs/work-log.md) に残す

ドキュメントに残すべきもの:

- 公式ドキュメントで確認したAPIや制約
- OBS Browser SourceやChromeで実際に確認した挙動
- WebGPU / WebGL fallbackの判断
- VRM 0.x / 1.0差分への対応方針
- VRMA再生の制限
- MediaPipeで人力確認が必要な点
- 依存ライブラリのバージョン・ライセンス判断
- `local-assets/` に置いた素材の用途や権利確認状況
- ハッカソン提出に使える説明文やデモ手順

ドキュメントに残さなくてよいもの:

- すぐ消える一時的なコマンド出力
- 実装中の細かい試行錯誤すべて
- 公式情報で確認できない推測だけの内容
- READMEに書くほどではない内部メモで、再利用価値がないもの

調査結果を書く場合は、できるだけ参照URL、確認日、結論、VPlant3Dでの判断を含めてください。

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
- この環境ではCodex Chrome拡張機能が導入済みで、ユーザーから使用許可も得ている。OBS Browser SourceはChromium系のため、WebGPU、WebGL、マイク、カメラ、DevTools、実Chromeでの表示差分確認が必要な場合はChrome拡張を積極的に使う
- ログイン不要のlocalhost確認ではin-app browserを先に使ってよい。実ブラウザ固有の挙動確認ではChrome拡張を使う
- OBS Browser Source特有の挙動は、通常ブラウザ確認だけで完了扱いにしない
- Codexだけでは確認できない人力作業が出た場合は、[docs/human-handoff-board.md](./docs/human-handoff-board.md) に記録してから、進められる別作業を進める

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

## TDD運用

Codex主導の実装では、可能な範囲でテスト駆動開発（TDD）を使ってください。

このプロジェクトでは、t-wadaさんが紹介しているTDDの流れを踏まえ、Red-Green-Refactorの前にテストリストを置く `List-Red-Green-Refactor` として扱います。

基本の進め方:

1. 変更したい振る舞いをテストリストにする
2. テストリストから1つだけ選ぶ
3. 失敗するテストを書く
4. 失敗を確認する
5. 最小実装でテストを通す
6. テストが通ったまま整理する
7. 次のテストへ進む

TDD向きの領域:

- URL query parsing
- OBS Mode / transparent mode判定
- config schema / localStorage用データ変換
- マイクRMS計算
- attack / release smoothing
- mouth value正規化
- Look / Style Wall / Image Panel preset選択
- 状態遷移
- エラー分類とユーザー向けメッセージ

TDDだけでは足りない領域:

- Three.js / WebGPUの実描画
- OBS Browser Sourceでの透明背景
- VRM / VRMAの見た目やリターゲット品質
- MediaPipeの認識品質
- マイク・カメラ権限

これらはChrome拡張、in-app browser、OBS本体、人力確認を組み合わせて確認してください。

テスト配置:

- 純ロジックの単体テストは `test/` に置く
- 対象モジュールが `src/obs/query.ts` なら、対応テストは `test/obs-query.test.ts` のようにする
- ブラウザやDOMに依存しない関数を優先して切り出す
- 描画や権限が絡む確認は、単体テストではなくブラウザ確認・OBS確認・Human Handoff Boardへ分ける

テストを書くときの注意:

- 実装詳細ではなく外部から見た振る舞いをテストする
- 1つのテストでは1つの振る舞いに集中する
- private関数を直接テストするために公開範囲を広げない
- テスト名は「何が、どんな条件で、どうなるか」が分かるようにする
- flakyなテストを追加しない
- ランダム、時刻、ブラウザ権限、実カメラ入力は直接単体テストしない
- 失敗しているテストを残したままコミットしない

確認コマンド:

- `package.json` 作成後は `npm run test` を基本確認にする
- 純ロジック変更では `npm run test` を実行する
- 型やビルドに影響する変更では `npm run build` も実行する
- lint導入後は `npm run lint` も実行する
- コマンドを実行できなかった場合は、理由を最終報告に明記する

詳細は [docs/tdd-for-codex.md](./docs/tdd-for-codex.md) を参照してください。

## 影響範囲が広い注意領域

- WebGPU RendererはOBS Browser Source内で動作差が出る可能性がある
- WebGL fallbackの有無は早めに判断する
- 透明背景とBloom / DOF / Fog / 色収差などのポストエフェクトは相性が悪い場合がある
- VRM Expression名やVRM 0.x / 1.0差分に注意する
- VRMA再生はモデル差し替え時のリターゲット品質に注意する
- MediaPipeのボーンリターゲットは沼りやすいため、首・胸・肩までで止める判断を許容する
- OBS Browser Sourceのマイク・カメラ権限は通常ブラウザと挙動が異なる可能性がある
- Chrome拡張で確認するときは、アクセスするホスト、ログイン状態、ブラウザ履歴、秘密情報の扱いに注意する

## ドキュメント運用

大きめの変更を始める前に、まず `docs/` に既存の設計メモや調査メモがないか確認してください。

コンテキスト圧縮、中断、再開が起きた場合は、まず以下を読んで現在地を復元してください。

1. [AGENTS.md](./AGENTS.md)
2. [docs/work-log.md](./docs/work-log.md)
3. 現在の作業に関係するtopic別docs

新しいドキュメントを作るときの方針:

- 特別な理由がなければ、プロジェクト内メモは日本語で書く
- できるだけ 1 ドキュメント 1 トピックにする
- READMEは外向け、`docs/` は設計・調査・判断の記録として使う
- [docs/work-log.md](./docs/work-log.md) は時系列の作業メモとして使う
- チェックリストを肥大化させるより、必要に応じて別メモを追加する
- 人間の判断・素材確認・実機操作が必要な項目は [docs/human-handoff-board.md](./docs/human-handoff-board.md) に集約する

参照開始点:

- [docs/vplant3d-for-obs.md](./docs/vplant3d-for-obs.md)
- [docs/vrm-award.md](./docs/vrm-award.md)
- [docs/third-party-libraries.md](./docs/third-party-libraries.md)
- [docs/mmd-modoki-reference.md](./docs/mmd-modoki-reference.md)
- [docs/human-handoff-board.md](./docs/human-handoff-board.md)
- [docs/tdd-for-codex.md](./docs/tdd-for-codex.md)
- [docs/work-log.md](./docs/work-log.md)
- [docs/local-assets.md](./docs/local-assets.md)

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

## Codex / goal運用

長時間かかるが停止条件が明確な作業では、Codex CLIの実験的機能 `/goal` の利用を検討してください。

`/goal` に向いている作業:

- Vite + TypeScript + Three.jsの初期構成を完成させる
- OBS Mode / transparent modeを実装して確認する
- VRM読み込みから表示までを通す
- マイクRMS取得から口Expression反映までを通す
- VRMA読み込み・再生の最小実装を通す
- 1分デモに必要な提出物をそろえる

`/goal` を使う場合は、必ず以下を明示する:

- 1つの目的
- 停止条件
- 最初に読むファイル
- 検証コマンド
- 触ってよい範囲
- 触らない範囲
- 人力が必要になった場合に [docs/human-handoff-board.md](./docs/human-handoff-board.md) へ記録すること

goalが広がりすぎた場合は `/goal pause` し、小さいgoalに切り直してください。
