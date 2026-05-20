# Work Log

このファイルは、Codexの作業コンテキストが圧縮・中断・再開されても流れを復元できるようにするための作業ログである。

設計として確定した内容は各topicのdocsへ移し、このファイルには「何をしていたか」「何が成功したか」「何が失敗したか」「次に何をするつもりだったか」を時系列で残す。

## 運用ルール

- 大きめの作業を始める前に、その日の作業方針を書く
- 実装、調査、検証、失敗、方針変更があったら短く追記する
- 次にやる予定を必ず残す
- 大きな作業前には、できればテスト済みの状態でコミットして退避地点を作る
- 作業後は、動く単位・レビューしやすい単位でコミットし、必要ならpushする
- コンテキスト圧縮や中断から戻ったら、まずこのファイルとAGENTS.mdを読む
- 長くなったら古い日付を別ファイルに分割してよい
- 確定した仕様は、このログに閉じ込めず該当docsへ反映する

## Entry Template

```md
## YYYY-MM-DD HH:mm JST

### Goal

- 

### Did

- 

### Worked

- 

### Failed / Blocked

- 

### Decisions

- 

### Next

- 
```

## 2026-05-20 Initial Project Setup

### Goal

- VPlant3D for OBSの初期リポジトリ土台を作る
- VRMアワード / `#MadeWithVRM` 向けの前提をdocsへ残す
- Codex主導で短期開発するための運用ドキュメントを整える

### Did

- `README.md` にプロジェクト概要、スコープ、想定スタック、docsリンクを追加
- `docs/vrm-award.md` を追加し、VRMアワードと `#MadeWithVRM` の調査結果を記録
- `docs/vplant3d-for-obs.md` を追加し、アプリ構想を保存
- `docs/third-party-libraries.md` を追加し、予定ライブラリと役割を整理
- `docs/mmd-modoki-reference.md` を追加し、MMD_modokiから借りる考え方と持ち込まない範囲を整理
- `AGENTS.md` を追加し、Codex向けの作業ルールを定義
- `src/`、`test/`、`index.html` を追加
- 初期土台を `cbbd1d1 Initialize VPlant3D project docs` としてコミットし、`origin/main` へプッシュ
- `docs/codex-usage-2026-05-20.md` を追加し、Codex app / CLI / Chrome拡張 / subagents / `/goal` / Automations運用を整理
- `docs/human-handoff-board.md` を追加し、人力確認が必要な作業の伝言板を作成
- `docs/tdd-for-codex.md` を追加し、Codex主導開発でのTDD運用を整理
- `local-assets/` にVRM / VRMA素材が追加されたことを確認し、`docs/local-assets.md` にインベントリを記録
- 想定画面サイズとデザイン方向を確認し、関連docsへ反映

### Worked

- GitHub `origin/main` への初回pushは成功
- VRMアワード公式サイト、Codex公式ドキュメント、MMD_modoki GitHubを参照してdocsを整備できた
- Chrome拡張は、この環境で使用許可済みとして運用に組み込んだ
- Alicia VRM、Kizuna AI KAMATTE VRM 0.x / 1.0、VRMA MotionPack 7種を確認できた

### Failed / Blocked

- AvatarSample_A/B/C の利用条件は未確認
- Kizuna AI KAMATTEとAvatarSample_A/B/Cは公開デモ前に配布元・利用条件の再確認が必要

### Decisions

- VPlant3DはOBS Browser Source向けの軽量VRM / VRMA 3Dアバターレイヤーとして進める
- MMD_modokiの直接移植ではなく、運用思想と構成の考え方だけ借りる
- OBSはChromium系なので、開発中の挙動確認ではGoogle Chrome / Codex Chrome拡張を積極利用する
- 人力確認が必要なものは `docs/human-handoff-board.md` に記録する
- 純ロジックはTDDを心がけ、描画・OBS・MediaPipe・権限まわりはブラウザ/人力確認と組み合わせる
- Codexは調査しながら実装し、重要な知見をdocsに残す
- 大きな作業前には、可能な限りテスト済みコミットを作る
- `main` は常に動く版として扱い、大きな実験は `codex/<topic>` ブランチまたはworktreeへ分離する
- 締切3日前を目安に新しい大機能を止め、提出物と安定化へ切り替える
- 提出に必要なものは `docs/submission-checklist.md` で管理する
- GitHubに載せない大きな素材・参考VRM・録画素材は `local-assets/` に置く
- 初期開発のVRM候補は `local-assets/vrm/Alicia_VRM/Alicia/VRM/AliciaSolid.vrm`
- 初期開発のVRMA候補は `local-assets/vrma/VRMA_MotionPack/vrma/VRMA_02.vrma`
- Codexはアプリ作成に集中し、ハッカソン提出・デモ動画最終収録は人間が担当する
- 想定画面サイズは1920x1080
- デザインは無彩色ダークグレーをベースに、ネオングリーンとネオンブルーをアクセントにする
- 画像素材は原則としてAI生成または人間作成のものを使い、ネット画像の流用は避ける

### Next

- `package.json` を作成し、Vite + TypeScript + Vitestの最小構成を入れる
- Three.jsの最小描画を追加する
- `npm run test` / `npm run build` / 可能なら `npm run lint` を整える
- 最初の純ロジックとしてOBS query parsingをTDDで作る候補がある

## 2026-05-20 Vite Foundation

### Goal

- `codex/vite-foundation` ブランチで開発環境を整える
- Vite + TypeScript + Vitest + ESLintの最小構成を作る
- Three.js / VRM / VRMA / MediaPipe関連ライブラリを導入する
- 最初の純ロジックとしてOBS query parsingをTDDで追加する

### Did

- 作業開始前の `main` は `db3d1c3 Document project operating plan`
- `codex/vite-foundation` ブランチを作成
- Node.js `v24.14.1`、npm `11.11.0` を確認
- npm registryで主要パッケージの現行バージョンを確認
- `package.json` / `package-lock.json` を作成
- Vite / TypeScript / Vitest / ESLint設定を追加
- `three`、`@pixiv/three-vrm`、`@pixiv/three-vrm-animation`、`@mediapipe/tasks-vision` を導入
- OBS query parsingをTDDで追加
- Three.js WebGLの最小シーンとダークグレー + ネオングリーン / ネオンブルーのSetup UIを追加
- READMEに開発コマンドとOBS風URL例を追加
- `docs/third-party-libraries.md` にインストール済み依存のバージョン・ライセンスを反映

### Worked

- `npm run test` は成功
- `npm run build` は成功
- `npm run lint` は成功
- Vite dev server は `http://127.0.0.1:5173/` で起動
- `curl` でdev serverのHTTP 200とHTMLを確認

### Failed / Blocked

- 最初のbuildでは `@types/three`、CSS import型、Vitest configの型で失敗したが修正済み
- 最初のlintでは `package.json` が `type: commonjs` になっていたためESLint flat configのESM読み込みに失敗したが、`type: module` に修正済み
- このターンではCodex Chrome拡張の直接操作ツールが露出していないため、Chrome視認確認は未実施

### Decisions

- 依存追加と構成変更を含むため、mainではなく `codex/vite-foundation` で作業する
- 初期レンダラーは安定優先でThree.js WebGLRendererにする。WebGPUは後続タスクで調査・切替検討する
- 最初のTDD対象はOBS query parsingにした

### Next

- 可能ならChromeで `http://127.0.0.1:5173/` と `?obs=1&transparent=1` の視認確認を行う
- Foundationの差分をコミットする
- 次の実装候補はOBS Mode / transparent modeのUI挙動強化、またはVRM loader調査
