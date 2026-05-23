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

## 2026-05-23 OBS Render Cleanup Planning

### Goal

- OBS側だけ表情・口・まばたき・頭/体の戻りやカクつきが出る問題について、実装を続ける前に整理設計を立てる

### Did

- `src/main.ts`、`src/relay/messages.ts`、`server/vplant-relay.mjs`、`docs/obs-architecture-redesign.md` を確認
- `docs/obs-render-code-cleanup-plan.md` を追加し、現状診断、目標アーキテクチャ、通信設計、段階的な分割計画をまとめた

### Worked

- `main.ts` にControl UI、MediaPipe、mic、manual control、Relay送受信、OBS Render適用が集中していることを整理できた
- `motionState` / `expressionState` の分離は一時対処として有効だが、長期的には `runtimeState` へ寄せる方針を明文化できた

### Failed / Blocked

- まだ実装はしていない
- OBS側で本当にどの値が戻っているかは、debug overlayを入れて確認する必要がある

### Decisions

- 次の実装は機能追加ではなく、まずOBS Render debug overlayで受信値と適用値を見えるようにする
- その後、`motionState` と `expressionState` を `runtimeState` へ統合する
- OBS Render側は入力モード判断を持たず、受け取った正規化済みstateを描画するだけに寄せる

### Next

- Phase 0として `?debug=1` のOBS Render debug overlayを追加する
- overlayで runtime sequence / age / blink / mouth / head / dropped frames / bufferedAmount を確認できるようにする
- その結果を見て、原因が通信前かVRM適用時か切り分ける

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

## 2026-05-20 Tailwind and Zustand Setup

### Goal

- Tailwind CSS v4をViteへ導入し、素のCSSが膨らむ前にUIの土台を整える
- Zustand vanilla storeを導入し、Setup Mode / OBS Mode / transparent modeなどの状態を集約する

### Did

- Tailwind公式Vite導入手順とZustand公式vanilla store APIを確認
- npm registryで `tailwindcss` / `@tailwindcss/vite` / `zustand` の現行バージョンを確認
- `tailwindcss` `4.3.0` と `@tailwindcss/vite` `4.3.0` を追加
- `zustand` `5.0.13` を追加
- Vite設定にTailwind pluginを追加
- Setup Mode UIをTailwind class中心に変更
- `src/state/app-store.ts` を追加し、OBS/transparent/rendererNameをZustand vanilla storeで管理
- `test/app-store.test.ts` を追加

### Worked

- `npm run test` は成功
- `npm run build` は成功
- `npm run lint` は成功

### Failed / Blocked

- なし

### Decisions

- Tailwindはv4のVite plugin方式で入れる
- ZustandはReactなしの `zustand/vanilla` を使う
- Setup Mode UIはTailwind中心、全体背景やcanvasなどの基礎CSSは `src/style.css` に残す

### Next

- Tailwind/Zustand追加差分をコミットする
- 次はVRM loaderまたはOBS Mode / transparent modeのブラウザ確認に進む

## 2026-05-20 Minimal VRM Loader

### Goal

- Setup Modeでローカル `.vrm` ファイルを選択し、Three.js sceneへ表示する
- `@pixiv/three-vrm` を使った小さなVRM loader moduleを追加する
- 純ロジックはVitestで確認し、描画/ファイル選択の人力確認事項は伝言板へ残す

### Did

- `src/vrm/vrm-file.ts` を追加し、`.vrm` 拡張子、空ファイル、サイズ上限、エラーメッセージ生成を分離
- `src/vrm/load-vrm.ts` を追加し、Three.js `GLTFLoader` と `@pixiv/three-vrm` `VRMLoaderPlugin` でVRMを読み込む処理を実装
- VRM読み込み後に `VRMUtils.removeUnnecessaryVertices`、`combineSkeletons`、`rotateVRM0` を適用するようにした
- Zustand storeへ `vrmStatus`、`vrmFileName`、`vrmError` と状態遷移アクションを追加
- Setup Mode UIへ `Load local VRM` ファイル入力とロード状態表示を追加
- VRMロード成功時にplaceholder cubeを外し、VRMをsceneへ配置し、animation loopで `vrm.update(delta)` を呼ぶようにした
- READMEにSetup ModeのローカルVRM入力を追記
- `docs/human-handoff-board.md` にChrome/OBSでのVRMファイル選択と表示確認を追加

### Worked

- `npm run test` は成功
- `npm run build` は成功
- `npm run lint` は成功
- Vite dev serverは `http://127.0.0.1:5173/` でHTTP 200を返した
- Node上の確認スクリプトで `local-assets/vrm/Alicia_VRM/Alicia/VRM/AliciaSolid.vrm` が `VRMLoaderPlugin` によりVRMとしてパースできた

### Failed / Blocked

- Node上の素朴な `GLTFLoader.parseAsync` は `self is not defined` で失敗した。Node検証では `globalThis.self = globalThis` とダミー `createImageBitmap` を補ってパース確認した
- Playwrightはこの環境に入っておらず、Codex Chrome拡張の直接操作ツールも露出していなかったため、Chrome上のファイル選択と実描画確認は未実施
- OBS Browser SourceでのVRM表示確認は未実施

### Decisions

- 初回VRMロードはローカルfile inputのみ対応する。モデルファイルはGitHubへ載せない
- OBS Mode / transparent modeのquery挙動は既存のまま維持する
- VRMの表示位置は、読み込んだモデルのbounding boxを使ってデフォルトカメラ向けに正規化する
- Chrome/OBS/ファイル選択の確認は人力確認項目として扱い、実装は進める

### Next

- ChromeでAlicia VRMを選択し、Setup Modeでモデルが表示されることを確認する
- OBS Browser Sourceで `?obs=1&transparent=1` の透明背景とVRM表示を確認する
- 次の実装候補はVRMロード設定のlocalStorage保存、またはVRMA読み込み・再生の最小実装

## 2026-05-20 Playwright Setup

### Goal

- Codexがブラウザ上のSetup Mode / OBS Mode / VRM file inputを自動確認できるようにする
- GitHubへ載せない `local-assets/` を使ったローカルE2Eは、素材がある場合だけ実行できるようにする

### Did

- `@playwright/test` をdev dependencyに追加
- `playwright.config.ts` を追加し、Vite dev serverを自動起動してChromiumでE2Eを走らせる設定を作成
- `npm run test:e2e` scriptを追加
- `test/e2e/app.spec.ts` を追加し、Setup Mode、OBS transparent mode、Alicia VRM file inputのE2E確認を実装
- `local-assets/vrm/Alicia_VRM/Alicia/VRM/AliciaSolid.vrm` がない環境ではVRMロードE2Eをskipするようにした
- VitestがPlaywright testを拾わないよう `vite.config.ts` で `test/e2e/**` を除外
- Playwright生成物 `playwright-report/` と `test-results/` を `.gitignore` / ESLint ignoreへ追加
- READMEとthird-party librariesへPlaywrightを追記
- Human Handoff BoardのVRMファイル選択確認を、Playwright ChromiumではDone、人間Chrome目視確認はTodoとして整理

### Worked

- `npx playwright install chromium` は成功
- `npm run test:e2e` は成功。Alicia VRMをfile inputへ渡し、`VRM loaded.` とファイル名表示まで確認できた
- `npm run test` は成功
- `npm run build` は成功
- `npm run lint` は成功

### Failed / Blocked

- 最初はVitestが `test/e2e/app.spec.ts` を拾って失敗したため、Vitestの対象からE2Eを除外した
- Playwright実行中にESLintを並列実行すると生成中の `test-results` と衝突することがあったため、生成物をignore対象にした
- Playwright Chromiumでは自動確認できたが、人間のGoogle Chromeでの見た目確認とOBS Browser Source確認は未実施

### Decisions

- ローカルPlaywrightを主なブラウザ自動確認手段にする
- GitHub ActionsへのPlaywright導入は、CIで使える合法・軽量なテストVRMを決めてから検討する
- 当面のCI候補は `npm run test` / `npm run build` / `npm run lint` を優先する

### Next

- 人間のGoogle Chromeでモデルの見え方を目視確認する
- OBS Browser Sourceで透明背景とVRM表示を確認する
- 次の実装候補はVRMA読み込み・再生、またはVRM設定のlocalStorage保存

## 2026-05-20 Minimal VRMA Playback

### Goal

- Setup Modeでローカル `.vrma` を読み込み、現在のVRMへ適用してPlay/Stop/Loop操作できるようにする
- `@pixiv/three-vrm-animation` の採用APIと制限をdocsへ残す
- Playwright Chromiumで、Alicia VRM + VRMA_02の最小再生フローを自動確認する

### Did

- `@pixiv/three-vrm-animation` 公式TypeDocとinstalled package typesを確認
- `src/vrma/vrma-file.ts` を追加し、`.vrma` 拡張子、空ファイル、サイズ上限、エラー文言を分離
- `src/vrma/playback-state.ts` を追加し、Play/Stop/Loopの純状態遷移をテスト可能にした
- `src/vrma/load-vrma.ts` を追加し、`GLTFLoader` + `VRMAnimationLoaderPlugin` で `gltf.userData.vrmAnimations[0]` を読み込むようにした
- Zustand storeへVRMA load status、file name、duration、playback status、loop stateを追加
- Setup Mode UIへVRMA file input、Play、Stop、Loop checkbox、VRM必須表示を追加
- VRMA読み込み後、現在のVRMに対して `createVRMAnimationClip` と `THREE.AnimationMixer` で再生するようにした
- `VRMLookAtQuaternionProxy` を明示的に追加し、`createVRMAnimationClip` の自動生成警告を避けた
- `THREE.Clock` の非推奨警告を避けるため、animation loopのdelta計算を `requestAnimationFrame` timestampベースへ変更
- Playwright E2Eを更新し、Setup Mode / OBS transparent mode / Alicia VRM / VRMA_02 Play/Stopを確認するようにした
- `docs/vrma-implementation-notes.md` を追加
- README、third-party libraries、Human Handoff Boardを更新

### Worked

- `npm run test` は成功
- `npm run test:e2e` は成功。Alicia VRM + VRMA_02を読み込み、Play/Stop状態まで確認できた
- `npm run build` は成功
- `npm run lint` は成功

### Failed / Blocked

- 最初のE2Eでは `Load local VRM` が `Load local VRMA` に部分一致して落ちたため、exact matchへ修正した
- 最初のE2EではVRMAファイル名の正規表現が過剰escapeで落ちたため修正した
- Playwrightはモーションの再生状態を確認できるが、動きの品質や見栄えは判定できない
- OBS Browser SourceでのVRMA再生確認は未実施

### Decisions

- 初回は1つ目の `VRMAnimation` だけを採用する
- VRMを差し替えた場合は同じVRMAからclip/mixerを作り直す
- VRMがない状態ではVRMA Playを無効化し、UIに必要条件を出す
- GitHubへ載せないVRMA MotionPackはローカルPlaywright確認だけに使う

### Next

- 人間のGoogle ChromeでVRMA_02の動きがデモとして自然か確認する
- OBS Browser SourceでVRM + VRMA + transparent modeを確認する
- 次の実装候補はLoop off終了時のUI同期、再生速度/Restart、またはマイク音量連動くちパク

## 2026-05-20 Mic Reactive Mouth

### Goal

- マイク音量ベースの簡易口パクを、VRMの `aa` Expressionへ接続する
- マイク権限や実声確認が必要な部分はHuman Handoff Boardへ残す
- 純ロジックはTDDで検証する

### Did

- MDN `MediaDevices.getUserMedia()` と `AnalyserNode`、`@pixiv/three-vrm-core` の `VRMExpressionManager.setValue` 型を確認
- `src/audio/mic-mouth.ts` を追加し、RMS計算、threshold/sensitivity正規化、attack/release smoothingを実装
- `src/audio/mic-reactive-mouth.ts` を追加し、Web Audio APIでマイク波形を取得する薄いランタイムクラスを実装
- Zustand storeへ `micStatus`、`micError`、`micLevel`、`mouthOpen` と状態更新アクションを追加
- Setup Modeへ `Mic Reactive Mouth` パネル、Start / Stop、Level / Mouthメーターを追加
- animation loop内でマイクフレームをsampleし、VRMの `aa` Expressionへ反映するようにした
- Playwright E2EへMic UI表示とOBS Mode非表示確認を追加
- `docs/mic-reactive-mouth-notes.md` を追加
- README、third-party libraries、Human Handoff Boardを更新

### Worked

- `npm run test` は成功
- `npm run test:e2e` は成功
- `npm run build` は成功
- `npm run lint` は成功

### Failed / Blocked

- 実マイク入力はユーザー許可と人間の発話が必要なため、PlaywrightではUI表示確認までにした
- OBS Browser Sourceでのマイク権限と口パク確認は未実施

### Decisions

- MVPでは音素解析ではなくRMS音量ベースの簡易口パクにする
- 初期パラメータは `threshold: 0.025`、`sensitivity: 8`、`attack: 0.55`、`release: 0.16` とする
- まずはVRMの `aa` Expressionだけを駆動する
- マイク権限確認と見た目調整は人間確認タスクとして進める

### Next

- 人間のGoogle ChromeでMic Reactive Mouthの許可、メーター、口の動きを確認する
- OBS Browser Sourceでマイク権限と透明背景表示を確認する
- 次の実装候補はMediaPipe debug view、またはMic感度調整UI

## 2026-05-20 MediaPipe Pose Debug Spike

### Goal

- MediaPipe上半身モーションキャプチャーの最初の検証UIを作る
- カメラ許可、ランドマーク検出、肩/胴体トラッキングの見込みを人間が確認できる状態にする
- 低リスクなVRMA再生状態同期も改善する

### Did

- MediaPipe Pose Landmarker Web公式ガイドとinstalled package typesを確認
- `src/mocap/mediapipe-pose-debug.ts` を追加し、`FilesetResolver` と `PoseLandmarker` を使う小さなruntime wrapperを実装
- `src/mocap/pose-landmarks.ts` を追加し、肩、腰、胴体中心、肩幅、肩傾き、胴体lean、上半身visibilityを要約する純ロジックを分離
- `test/pose-landmarks.test.ts` を追加
- Zustand storeへ `poseStatus`、error、landmark count、upper-body visibility、summary textを追加
- Setup Modeへ `MediaPipe Pose Debug` パネル、Start / Stop、camera preview、canvas overlay、visibility meterを追加
- Playwright E2EへMediaPipe debug UI表示とOBS Mode非表示確認を追加
- VRMA Loop off再生終了時にUI stateを `stopped` へ戻す同期を追加
- `docs/mediapipe-pose-debug-notes.md` を追加
- README、third-party libraries、Human Handoff Boardを更新

### Worked

- `npm run test` は成功
- `npm run test:e2e` は成功
- `npm run build` は成功。ただしbundle size warningは継続
- `npm run lint` は成功
- Playwright ChromiumでSetup Mode / OBS transparent / Alicia VRM / VRMA_02 Play-Stopは引き続き成功

### Failed / Blocked

- 実カメラ入力はユーザー許可と人間の動きが必要なため、PlaywrightではUI表示確認までにした
- MediaPipe WASM/modelは現在ネットワークURLから取得するため、オフラインOBS運用にはまだ弱い
- MediaPipeの `detectForVideo()` は同期実行なので、品質調整段階で重ければWeb Worker化を検討する

### Decisions

- 初回スパイクではVRM骨へのretargetingは行わず、上半身ランドマークのデバッグ表示に留める
- 既存Three.js WebGL contextとの衝突を避けるため、MediaPipe delegateはまずCPUにする
- カメラpreviewはユーザー視点で自然なようにmirror表示する。後続のretargetingでは座標系を改めて明示する
- MediaPipe model/wasmのローカル配布は次の安定化タスクとして扱う

### Next

- 人間のGoogle ChromeでMediaPipe Pose Debugのカメラ許可、ランドマーク追従、肩/胴体summaryの妥当性を確認する
- 確認結果が良ければ、胸/首/肩のごく控えめなVRM retargetingをsmoothing付きで試す
- カメラ/Mic感度調整UI、またはlocalStorageによる設定保存を検討する

## 2026-05-20 OBS Viewport E2E Alignment

### Goal

- Playwright Chromiumの自動確認を、OBS想定の1920x1080 viewportに固定する

### Did

- `playwright.config.ts` のChromium projectで `Desktop Chrome` device設定を展開した後に1920x1080 viewportを指定するよう修正
- Setup Mode E2Eで `page.viewportSize()` が1920x1080であることを確認するassertionを追加

### Worked

- `npm run test:e2e` は成功
- `npm run lint` は成功

### Failed / Blocked

- なし

### Decisions

- OBS Browser Sourceの想定解像度に合わせ、E2Eの基本viewportは1920x1080で固定する

### Next

- 今後のUI追加時も1920x1080で収まりを確認する
- 必要になったらモバイルではなくOBS向けの小さめBrowser Sourceサイズを別projectとして追加する

## 2026-05-20 MediaPipe Lazy Load

### Goal

- MediaPipe Pose Debugを使わない通常起動時のbundle負荷を下げる

### Did

- `src/main.ts` のMediaPipe runtime importをtype-only + dynamic importへ変更
- `Start camera` を押してから `src/mocap/mediapipe-pose-debug.ts` を読み込むようにした

### Worked

- `npm run test` は成功
- `npm run test:e2e` は成功
- `npm run build` は成功。MediaPipe pose debug chunkが分離され、main JS chunkは約938KBから約802KBへ下がった
- `npm run lint` は成功

### Failed / Blocked

- main JS chunkはまだ500KBを超えており、Viteのchunk size warningは継続

### Decisions

- カメラ系の重い依存は、ユーザーが明示的に使うまで遅延読み込みする

### Next

- さらに軽量化するなら、VRMA loaderやPlaywright対象外の重い機能もdynamic import候補にする

## 2026-05-21 Human Verification and Pose Privacy

### Goal

- 人間のChrome確認結果を反映する
- MediaPipe Pose Debugでカメラ画像が見えないようにし、VTuber用途の顔バレリスクを避ける

### Did

- 人間がVRM読み込み、VRMA読み込み/再生、マイク口パク連動、MediaPipeカメラ動作を確認済み
- MediaPipe Pose Debugのvideo要素を透明表示にし、骨組みcanvasだけが見えるUIへ変更
- Setup Modeに `Camera image hidden. Skeleton only.` を表示
- Playwright E2Eへカメラ画像非表示のCSS確認を追加
- README、MediaPipe notes、Human Handoff Boardを更新

### Worked

- これから自動テストで確認する

### Failed / Blocked

- カメラ画像が見えるデバッグUIはVTuber用途では顔バレリスクがあるため不採用

### Decisions

- 今後のカメラ/モーキャプ系UIでは、デフォルトで生カメラ映像を出さない
- デバッグに必要な場合も骨組み、メーター、数値を優先する

### Next

- `npm run test` / `npm run test:e2e` / `npm run build` / `npm run lint` を実行する
- 問題なければコミット/プッシュする

## 2026-05-21 MediaPipe Upper Body Retarget Spike

### Goal

- MediaPipeの骨組み検出をVRMの上半身へ控えめに反映する
- VRM読み込み後のデフォルト画角を、OBS/VTuber用途で扱いやすい上半身寄りへ変更する

### Did

- `src/mocap/upper-body-retarget.ts` を追加し、torso lean / shoulder tiltから胸・首のyaw/rollを作る純ロジックを実装
- `test/upper-body-retarget.test.ts` を追加
- MediaPipe Pose Debug active中だけ、VRMの `upperChest` または `chest` と `neck` に小さな回転を反映するようにした
- landmark visibilityが低い時やPose Debug停止時は上半身骨をrest quaternionへ戻すようにした
- VRMロード後のカメラを上半身アップ寄りに変更した
- README、MediaPipe notes、Human Handoff Boardを更新

### Worked

- `npm run test` は成功
- `npm run test:e2e` は成功
- `npm run build` は成功。ただしbundle size warningは継続
- `npm run lint` は成功

### Failed / Blocked

- 実際の追従の強さ・自然さは人間の動きと目視確認が必要

### Decisions

- 初回retargetは胸/upperChestと首のみ。腕、手、頭位置の本格反映はまだ行わない
- MediaPipe停止中はVRMA playbackを壊さないよう、retarget処理を実行しない
- デフォルト画角は全身確認よりも配信用の上半身見栄えを優先する

### Next

- 人間のChromeで、肩傾きと左右leanがVRMへ反映されるか確認する
- 追従が弱ければgainを上げる。強い/揺れるならmax rotationやsmoothingを調整する
- 操作UIとしてMocap enable、sensitivity、reset poseを追加するか検討する

## 2026-05-21 Mocap Mirror and Camera Framing

### Goal

- MediaPipe retargetの左右反転を選べるようにする
- 中央へ戻る補正が強すぎる問題を緩め、小さめの傾きでも反映されるようにする
- VRMロード後の画角をさらに上半身アップにし、顔が中央ちょい上に来るよう寄せる

### Did

- `Mirror mocap input` checkboxをSetup Modeへ追加し、初期値をonにした
- `poseMirrorInput` をZustand storeへ追加
- `createUpperBodyRetargetPose` に `mirrorInput` optionを追加
- MediaPipe retargetの `minVisibility` を下げ、yaw/roll gainとmax rotationを上げ、smoothingを速くした
- VRMロード後カメラを `position: (0, 1.58, 2.55)`、lookAtを `(0, 1.38, 0)` に変更
- Playwright E2Eへmirror checkbox表示と初期checked確認を追加
- README / MediaPipe notes / Human Handoff Boardを更新

### Worked

- `npm run test` は成功
- `npm run test:e2e` は成功
- `npm run build` は成功。ただしbundle size warningは継続
- `npm run lint` は成功
- Codex in-app browserで `Mirror mocap input` 表示とconsole errorなしを確認

### Failed / Blocked

- 実際の左右反転の直感性、補正量、顔位置は人間の目視確認が必要

### Decisions

- 反転ありを初期値にする。カメラ鏡像の直感に寄せるため
- sensitivity sliderはまだ作らず、まずはon/off反転と固定gain調整で確認する

### Next

- 人間のChromeでMirror on/off、補正量、上半身画角を確認する
- まだ弱い場合はsensitivity sliderを追加する

## 2026-05-21 Face and Hand Tracking Spike

### Goal

- VRM仕様とMediaPipe Face/HandのWeb APIを確認し、フェイストラッキング、リップシンク、ハンドトラッキングの最初の実装を入れる
- 生カメラ映像は表示しない方針を維持する

### Did

- VRM 1.0 expression spec、VRM expression overview、MediaPipe Face Landmarker / Hand Landmarker Web docsを確認
- `src/mocap/mediapipe-face-hand.ts` を追加し、FaceLandmarker / HandLandmarker runtime wrapperを実装
- `src/mocap/face-expression-retarget.ts` を追加し、MediaPipe face blendshapeからVRM preset expressionへの変換を実装
- `src/mocap/hand-landmarks.ts` を追加し、handednessとvisibility summaryを分離
- Face tracking active中はMic Reactive MouthがVRM `aa` を上書きしないようにした
- Setup ModeのMediaPipe panelへ `Face expressions / lip sync` と `Hand skeleton` のcheckboxとstatusを追加
- Hand Landmarkerの結果を黒いデバッグpanel上に緑の手骨格として描くようにした
- `docs/face-hand-tracking-notes.md` を追加
- README、third-party libraries、Human Handoff Boardを更新

### Worked

- `npm run test` は成功
- `npm run test:e2e` は成功
- `npm run build` は成功。ただしbundle size warningは継続
- `npm run lint` は成功

### Failed / Blocked

- 実際の表情追従・口形状・手骨格の品質は人間のChrome確認が必要
- 手のVRM指ボーン反映は未実装。まず骨格検出の安定性を見る

### Decisions

- Face trackingはVRMのpreset expressionだけを使う
- Face tracking active中はMic Reactive Mouthとの口制御競合を避ける
- Hand trackingはまずskeleton overlayまで。指retargetingやgesture反応は次段階

### Next

- 人間のChromeでFace expressions / lip syncとHand skeletonを確認する
- Faceのgainが強い/弱い場合はmappingを調整する
- Hand skeletonが安定するなら、次に手振り/ピースなどのgesture reactionか、控えめな指retargetを検討する

## 2026-05-21 Avatar Framing Controls

### Goal

- キャラ位置・サイズ・角度をSetup Modeから調整できるようにする

### Did

- Zustand storeへ `avatarOffsetX`、`avatarOffsetY`、`avatarScale`、`avatarRotationY` とreset actionを追加
- Setup Modeへ `Avatar Framing` panelを追加
- X / Y / Scale / Rotate Y sliderと `Reset framing` buttonを追加
- VRMロード後の自動fit結果をbase transformとして保存し、slider値を相対的に反映するようにした
- Playwright E2EへAvatar Framing UI表示確認を追加
- README、Human Handoff Boardを更新

### Worked

- `npm run test` は成功
- `npm run test:e2e` は成功
- `npm run build` は成功。ただしbundle size warningは継続
- `npm run lint` は成功

### Failed / Blocked

- localStorage保存は未実装。リロードすると初期値に戻る

### Decisions

- 初回は永続保存よりも、その場でOBS画角を作れることを優先する
- fit後のbase transformに対する相対操作にして、VRMごとの差を吸収しやすくする

### Next

- 人間のChromeでAvatar Framingの操作感を確認する
- 使いやすければlocalStorage保存とOBS Modeへの引き継ぎを追加する

## 2026-05-21 Face Mirror, Blink Curve, and Idle Arms

### Goal

- 人間確認で見つかった違和感を直す
- 体幹mocapがmirror反映なのに顔だけ非mirrorになる問題を解消する
- blinkが半目に見えやすい問題を減らす
- VRMロード直後のT pose腕を、腰の横あたりへ自然に下げる

### Did

- `createVrmFaceExpressionWeights` に `mirrorInput` optionを追加
- `Mirror mocap input` が有効なとき、face blendshapeのleft/right categoryを入れ替えてからVRM expressionへ流すようにした
- blink weightを線形ではなく、開き/閉じへ寄せるカーブに変更した
- VRMロード直後にupper/lower armとhandへ軽いidle pose回転を入れるようにした
- idle pose適用後のbone quaternionをrestとして保存するため、既存の上半身mocap復帰処理との整合を保った
- Face/Hand tracking notesへmirrorとblink curveの方針を追記

### Worked

- `npm run test -- face-expression-retarget` は成功
- `npm run test` は成功
- `npm run test:e2e` は成功
- `npm run build` は成功。ただしbundle size warningは継続
- `npm run lint` は成功
- In-app browserでSetup Mode表示を確認
- Playwrightでlocal Alicia VRMを読み込み、腕がT poseではなく下がることをスクリーンショットで確認

### Failed / Blocked

- 最初の腕下げ符号が逆で、腕が上がる状態になった。スクリーンショット確認で発見し、左右のZ回転符号を反転して修正した
- 実カメラでのface mirrorの体感は人間確認が必要

### Decisions

- 顔のmirrorは独立toggleを増やさず、まず `Mirror mocap input` に揃える
- blinkはbinaryにしすぎず、中間を短くする程度のカーブに留める
- 腕下げはVRMAや後続mocapの邪魔を避けるため、ロード直後のidle poseとして最小限にする

### Next

- 人間のChromeで、mirror有効時の顔左右とblinkの見た目を確認する
- 腕位置がモデルごとに合わない場合は、Setup ModeにIdle arm pose strengthかpresetを追加する

## 2026-05-21 Head Retarget and Lighting Tune

### Goal

- 人間確認で出た追加調整を入れる
- 肘は曲げず、腕を下げた初期姿勢にする
- blinkが弱すぎたので、半目を避けつつ反応量を少し戻す
- Face Landmarkerから頭向きを取得し、VRM headへ控えめに反映する
- Aliciaで白飛び気味だった描画を照明とtone mappingで落ち着かせる

### Did

- `src/mocap/head-retarget.ts` を追加し、MediaPipe facial transformation matrixからhead pitch/yaw/rollを作る純ロジックを分離
- Face Landmarkerの `outputFacialTransformationMatrixes` を有効化
- Face tracking frameでhead poseを平滑化し、VRM `Head` boneへ小さく反映するようにした
- 体幹mocapとの競合を避けるため、Headだけをface tracking側で制御し、Chest/Neckは既存pose retargetに残した
- idle arm poseからLowerArm回転を外し、肘を真っ直ぐ寄りにした
- blink curveを少し軽くして、閉じ反応が見えやすい値に調整した
- key/rim lightを弱め、ambient greenをやめてneutral hemisphere lightへ変更
- `renderer.outputColorSpace`、`ACESFilmicToneMapping`、`toneMappingExposure` を設定した
- Face/Hand tracking notesへhead retargetの方針を追記

### Worked

- `npm run test -- face-expression-retarget head-retarget` は成功
- `npm run test` は成功
- `npm run test:e2e` は成功
- `npm run build` は成功。ただしbundle size warningは継続
- `npm run lint` は成功
- Playwrightでlocal Alicia VRMを読み込み、肘が真っ直ぐ寄りになり、白飛びが弱まったことをスクリーンショットで確認

### Failed / Blocked

- 頭向きの符号と体感は実カメラで人間確認が必要。MediaPipe matrix座標とVRM head座標の最終チューニングは確認後に行う
- 照明はAliciaでは落ち着いたが、暗色モデルでは暗すぎる可能性がある。後でlight presetやexposure sliderが必要かもしれない

### Decisions

- 頭向きは最初から大きく動かさず、上限付きの控えめな追従にする
- 肘曲げはモデル依存で違和感が出やすいので、MVPの初期姿勢では入れない
- 白飛び対策はまず照明強度を下げ、色付きambientを避ける

### Next

- 人間のChromeでblink反応、head yaw/pitch/rollの向き、照明の見た目を確認する
- 必要ならSetup Modeにblink sensitivity、head tracking strength、lighting exposureを追加する

## 2026-05-21 Head Mirror Direction Tune

### Goal

- 人間確認で、頭回転が弱く、mirror時の回転方向が直感と逆に見える問題を直す

### Did

- Head retargetのpitch/yaw/roll gainと最大回転を上げた
- Head retargetのデフォルト平滑化を少し上げ、反応量を出しつつ急な揺れを抑える方向にした
- `mirrorInput` のyaw/roll符号を反転し、mirror ON時の体感に合わせた
- `test/head-retarget.test.ts` を更新し、mirror ON/OFFの符号と強めたgainを固定した

### Worked

- `npm run test -- head-retarget` は成功
- `npm run build` は成功。ただしbundle size warningは継続
- `npm run lint` は成功

### Failed / Blocked

- 実カメラでの最終体感は人間確認が必要

### Next

- Chromeで頭を左右/上下/傾きに動かして、mirror ON時の方向と強さを確認する
- まだ強弱が合わなければSetup Modeにhead tracking strength sliderを追加する

## 2026-05-21 Front Lighting and Head Tilt Tune

### Goal

- 人間確認で、モデルがまだ少し暗いこと、照明を正面やや上からにしたいこと、頭の傾きももう少し欲しいことに対応する

### Did

- `toneMappingExposure` を少し上げた
- key lightをカメラ正面側のやや上へ移動し、強度を上げた
- rim lightは少し弱め、全体fillのhemisphere lightを少し上げた
- Head retargetのroll gainとmax rollを上げ、傾きが見えやすいようにした
- `test/head-retarget.test.ts` の期待値を更新

### Worked

- `npm run test -- head-retarget` は成功
- `npm run build` は成功。ただしbundle size warningは継続
- `npm run lint` は成功
- Playwrightでlocal Alicia VRMを読み込み、正面上寄り照明と明るさをスクリーンショット確認した

### Failed / Blocked

- Head rollの実カメラ体感は人間確認が必要

### Next

- Chromeで頭の傾きが十分か確認する
- 照明がモデルごとに合わない場合は、Setup Modeにlighting exposure / presetを追加する

## 2026-05-21 Head Nod and Roll Direction Tune

### Goal

- 人間確認で、頭が常に水平を取るように見える違和感を直す
- うなづき方向の動きをもっと取れるようにする

### Did

- Head retargetのyaw mirror方向は維持しつつ、rollだけ独立した符号に分けた
- mirror ON時のrollを反転し、水平補正ではなく頭の傾きとして出る方向へ調整した
- pitch gainとmax pitchを上げ、うなづき/見上げを拾いやすくした
- `test/head-retarget.test.ts` を更新し、yawとrollの符号を別々に固定した

### Worked

- `npm run test -- head-retarget` は成功
- `npm run build` は成功。ただしbundle size warningは継続
- `npm run lint` は成功

### Failed / Blocked

- 実カメラでのうなづき量とroll方向は人間確認が必要

### Next

- Chromeで頭を傾けたときに、水平補正ではなく自然な傾きに見えるか確認する
- うなづきが強すぎる場合はpitchだけ少し戻す

## 2026-05-21 Subtle Torso Turn and Upper Arm Spike

### Goal

- 人間確認で、体の横回転も少しだけ取りたいという要望に対応する
- 可能なら腕を肘まで、まずは上腕だけ控えめにtrackingする

### Did

- `summarizeUpperBodyPose` に肩のz差から `torsoTurn` を追加
- 肩と肘の2D位置から `leftArmLift` / `rightArmLift` を追加
- `createUpperBodyRetargetPose` で、torso leanに加えて `torsoTurn` を小さくchest yawへ混ぜるようにした
- elbow liftを左右UpperArmのroll deltaへ控えめに変換した
- VRM反映側でLeft/RightUpperArmへrest pose基準の追加回転を流すようにした
- pose summary / upper body retargetのテストを更新

### Worked

- `npm run test -- pose-landmarks upper-body-retarget` は成功
- `npm run test` は成功
- `npm run test:e2e` は成功
- `npm run build` は成功。ただしbundle size warningは継続
- `npm run lint` は成功

### Failed / Blocked

- 上腕trackingの方向と強さは実カメラで人間確認が必要
- 肘より先、手首、指、IKは未実装

### Decisions

- 体の横回転は重み少なめにし、既存の体幹lean/rollを壊さないようにする
- 腕はまずUpperArmだけ、rest姿勢からの追加回転に留める
- 手首や肘IKは今回入れず、動きの方向性を見てから判断する

### Next

- Chromeで体を横に回したとき、胸が少しついてくるか確認する
- 腕を横に上げたとき、肩から肘までが少し反応するか確認する
- 腕が暴れる場合はmaxArmRollを下げるか、Setup Mode toggleを追加する

## 2026-05-21 Camera LookAt and Mirror Fixes

### Goal

- 人間確認で、目線をカメラ向き固定にしたい要望に対応する
- 肘trackingと肩奥行き由来の体向きにmirrorが効いていない問題を直す

### Did

- VRM `lookAt.target` 用のscene objectを追加し、毎フレームcamera positionへ同期するようにした
- VRMロード時に `lookAt.autoUpdate = true` とcamera targetを設定するようにした
- Upper body retargetで、`torsoTurn` のmirror方向をlean/tiltとは別に修正した
- mirror ON時は左右のelbow liftをswapしてからUpperArmへ流すようにした
- `test/upper-body-retarget.test.ts` を更新し、torso turnとarm lift mirrorの符号を固定した

### Worked

- `npm run test -- upper-body-retarget` は成功
- `npm run test` は成功
- `npm run test:e2e` は成功
- `npm run build` は成功。ただしbundle size warningは継続
- `npm run lint` は成功

### Failed / Blocked

- 実カメラでの目線固定とmirror方向は人間確認が必要

### Next

- Chromeで目線が常にカメラ寄りに見えるか確認する
- 体を横回転したときと肘を上げたとき、mirror ONの直感に合うか確認する

## 2026-05-21 Head Yaw and Torso Turn Gain Tune

### Goal

- 人間確認で、肘trackingは良いので維持する
- 体の横回転をもう少し強める
- 頭の傾きrollは少し抑える
- 頭の横回転yawは真横近くまで向けるように上限を広げる

### Did

- Head retargetのyaw gainを上げ、max yawを大きく広げた
- 真横近い顔向きのyaw上限をテストで固定した
- Head retargetのroll gainとmax rollを下げ、傾きが出すぎないようにした
- 肩奥行き由来のtorso turn weightを上げ、chest yawへより見える形で混ぜた
- `test/head-retarget.test.ts` と `test/upper-body-retarget.test.ts` を更新

### Worked

- `npm run test -- head-retarget upper-body-retarget` は成功
- `npm run test` は成功
- `npm run test:e2e` は成功
- `npm run build` は成功。ただしbundle size warningは継続
- `npm run lint` は成功

### Failed / Blocked

- 真横近くの頭yawと体の横回転量は実カメラで人間確認が必要

### Next

- Chromeで頭を横に大きく振ったとき、上限に当たりすぎず自然に真横寄りまで向くか確認する
- 体を横に回したとき、胸の追従が十分か確認する

## 2026-05-21 Softer Torso Roll From Head Tilt

### Goal

- 人間確認で、頭の傾きが体へ反映されすぎて見える問題を少し緩める

### Did

- 肩傾き由来のchest roll係数を下げた
- chest rollからneck rollへの追従係数も下げた
- 体の横回転yawと肘trackingは変更しなかった
- `test/upper-body-retarget.test.ts` の期待値を更新

### Worked

- `npm run test -- upper-body-retarget` は成功
- `npm run build` は成功。ただしbundle size warningは継続
- `npm run lint` は成功

### Failed / Blocked

- 実カメラでの体幹rollの体感は人間確認が必要

### Next

- Chromeで頭だけ傾けたとき、体がついてきすぎないか確認する

## 2026-05-21 Smooth Tracking Loss and Limit Edges

### Goal

- trackingが外れた時や上限に当たった時に、モデルがピクっと急に戻る問題を減らす

### Did

- Head retargetにsoft clampを追加し、yaw/pitch/rollが上限へ硬く当たりすぎないようにした
- soft clamp後も真横寄りyawが出るようにhead yaw上限を少し広げた
- Face trackingが一時的に外れた時は、head poseを通常より遅いrelease係数でゼロへ戻すようにした
- Upper body retargetも、検出なし/visibility不足になった時に即disabledへ落とさず、既存motionが残っている間はsmoothでゆっくりゼロへ戻すようにした
- head / upper bodyのrelease挙動をテストに追加

### Worked

- `npm run test -- head-retarget upper-body-retarget` は成功
- `npm run test` は成功
- `npm run build` は成功。ただしbundle size warningは継続
- `npm run lint` は成功

### Failed / Blocked

- 実カメラでのtracking loss時の戻り方は人間確認が必要

### Next

- Chromeでわざと顔/上半身を外して、戻りが急すぎないか確認する
- まだピクつく場合はrelease係数をさらに下げるか、数フレームのholdを追加する

## 2026-05-21 Setup Bottom Dock UI

### Goal

- Setup panelを左固定から下ドックへ変更する
- 欄ごとの緑背景が文字と干渉して読みにくい問題を、枠線中心の見た目へ直す

### Did

- Setup Mode panelを画面下の横スクロールドックへ変更
- 各機能欄を横並びカードとして配置
- 高さのあるMediaPipe欄はカード内で縦スクロールできるようにした
- 緑アクセントのボタン背景を透明にし、緑は枠線・文字・チェック類へ寄せた
- hover時の緑背景も白の薄い背景へ変更

### Worked

- `npm run build` は成功。ただしbundle size warningは継続
- `npm run test:e2e` は成功
- `npm run lint` は成功
- Playwrightでlocal Alicia VRMを読み込み、下ドック表示をスクリーンショット確認した

### Failed / Blocked

- 下ドックの高さ・横スクロール量は人間のChrome確認が必要

### Next

- Chromeで操作感を確認し、必要ならdock heightやカード幅を調整する
- よければ将来的にカテゴリタブ化や折りたたみも検討する

## 2026-05-21 Compact Setup Dock Toolbar

### Goal

- 下ドックの縦幅占有を減らす
- ON/OFFやStart/Stop系の操作をドック上段へ寄せる
- アプリタイトル表示を一旦なくして、操作と状態確認を優先する

### Did

- Setup Dockを上段toolbar + 下段detail card rowの2段構成へ変更
- `Load local VRM`、`Load local VRMA`、VRMA Play/Stop/Loop、Mic Start/Stop、Camera Start/Stop、Mirror/Face/Hand toggleを上段toolbarへ移動
- タイトル/説明カードを削除
- 詳細カードから重複する操作ボタンを削除し、状態表示・スライダー・メーター中心にした
- E2Eで参照している表示テキストは維持した

### Worked

- `npm run build` は成功。ただしbundle size warningは継続
- `npm run test:e2e` は成功
- `npm run lint` は成功
- Playwrightでlocal Alicia VRMを読み込み、コンパクトな下ドック表示をスクリーンショット確認した

### Failed / Blocked

- 実際のChrome操作で、toolbar横スクロール量やボタン密度の確認が必要

### Next

- 必要ならtoolbarボタンをアイコン化、カテゴリごとにグルーピング、または詳細カードの折りたたみを追加する

## 2026-05-21 Tracking-First Dock Order

### Goal

- Setup Dockの項目順を、左から頭系、体トラック、ハンドトラックの順にする
- 操作ツールバーと詳細カードの意味的な並びを揃える

### Did

- Toolbar先頭を `Face expressions / lip sync`、Mic、Camera、Mirror、Handの順へ変更
- VRM/VRMA loadとmotion playbackはtracking操作群の右へ移動
- Detail card rowを `Head / Face`、`Body Track`、`Hand Track`、`VRM Model`、`Avatar Framing`、`VRMA Motion`、statusの順へ変更
- Head / Face cardへMic Reactive MouthとFace tracking statusを集約
- Body Track cardへMediaPipe Pose Debug、skeleton preview、upper-body visibilityを集約
- Hand Track cardを独立させ、hand tracking statusを表示

### Worked

- `npm run build` は成功。ただしbundle size warningは継続
- `npm run test:e2e` は成功
- `npm run lint` は成功
- Playwrightでlocal Alicia VRMを読み込み、Head/Body/Hand順のdock表示をスクリーンショット確認した

### Failed / Blocked

- 右端status cardは画面幅によって横スクロールが必要

### Next

- 操作感を見て、必要ならstatus cardを縮めるか非表示/折りたたみにする

## 2026-05-21 Camera-Free Idle Controls and VRMA Slots

### Goal

- カメラでモーションキャプチャーを使いたくないユーザー向けに、自動瞬き、軽い姿勢揺らぎ、VRM表情プリセットを追加する
- VRMAを複数読み込み、Setup Dockからワンボタンで選択再生できるようにする

### Did

- `src/idle/auto-blink.ts` を追加し、一定間隔で短く閉じる自動瞬きロジックを実装
- `src/idle/idle-sway.ts` を追加し、MediaPipe停止中かつVRMA非再生中だけ胸/首へ小さなidle swayを入れるようにした
- `src/vrm/expression-presets.ts` を追加し、Neutral / Happy / Surprise / Relaxの表情プリセットをSetup Dockから反映できるようにした
- VRMA file inputを複数選択対応にし、読み込んだVRMAをスロット一覧へ表示して、各スロットのボタンから即再生できるようにした
- Setup Mode E2EにAuto blink、Idle sway、Expression preset、VRMA slot表示の確認を追加
- READMEへカメラなしidle機能と複数VRMAスロットを追記

### Worked

- `npm run test` は成功
- `npm run build` は成功。ただし既存のbundle size warningは継続
- `npm run lint` は成功
- `npm run test:e2e` は成功
- Browser previewでAuto blink、Idle sway、Expression preset、No VRMA slots loaded表示を確認した

### Failed / Blocked

- 初回E2EではVRMAファイル名がファイル表示とスロットボタンの2箇所に出るためstrict modeで落ちた。`#vrma-file-text` と `#vrma-slot-list button` へ検証対象を分けて修正した
- 自動瞬き、idle sway、表情プリセットの見た目の好みは人間のChrome/OBS確認が必要

### Next

- 表情プリセットをモデル差異に強くするため、VRMが持つexpression名の検出と未対応presetの無効表示を検討する
- VRMAスロットに短い表示名編集、再生中ハイライト、ショートカットを追加する
- カメラなしモードのidle sway強度をSetup Dockで調整できるようにする

## 2026-05-21 Integrated Dock Controls

### Goal

- Load VRMを左端の最も目立つ位置へ移動する
- 独立ツールバーを廃止し、各操作を関連カード内へ統合して横スクロール負荷を下げる
- Hand TrackがVRM指制御までできるように見える誤解を減らす

### Did

- Setup Dock先頭を `VRM Model` cardにし、`Load local VRM` を大きめのボタンとして配置
- Head / Face cardへFace/Lips、Auto blink、Mic Start/Stop、Expression presetを統合
- Body Track cardへIdle sway、Mirror input、Camera Start/Stopを統合
- Hand cardを `Hand Skeleton` に改名し、`Debug overlay only` と `VRM finger retarget is not implemented yet.` を表示
- VRMA Motion cardへLoad local VRMA、Play/Stop、Loopを統合
- 独立した上段toolbarを削除し、dock内は横一列のcard rowだけにした

### Worked

- `npm run build` は成功。ただし既存のbundle size warningは継続
- `npm run test` は成功
- `npm run lint` は成功
- `npm run test:e2e` は成功

### Failed / Blocked

- E2Eで `Hand skeleton` が見出しとcheckbox labelの2箇所に出てstrict modeになったため、見出しのexact matchとinputチェックへ分けて修正した

### Next

- 実際のChrome/OBSで、VRM Modelが左端で迷わず押せるか、カード横スクロール量が許容範囲か確認する
- Hand trackingをVRM finger retargetまで進める場合は、MediaPipe hand landmarksからVRM finger bonesへの対応表とmirror方針を先に設計する

## 2026-05-21 Prioritized Capture Controls

### Goal

- Mic / CameraのStart/Stopを各項目内の上側へ移動し、操作しやすくする
- Hand track checkboxで、手の骨格デバッグだけでなく腕/上半身retargetもON/OFFできるようにする

### Did

- Head / Face cardの上側に `Start mic` / `Stop mic` を移動
- Body Track cardの上側に `Start camera` / `Stop camera` を移動
- Hand cardのcheckbox表示を `Arm / hand track` に変更
- `Arm / hand track` をOFFにした時、上半身/腕retargetをリセットし、Hand skeleton frame処理も止めるようにした
- Camera active中でも `Arm / hand track` checkboxは操作できるようにした

### Worked

- `npm run build` は成功。ただし既存のbundle size warningは継続
- `npm run test:e2e` は成功
- `npm run test` は成功
- `npm run lint` は成功

### Failed / Blocked

- 実際のカメラ入力中に `Arm / hand track` を切り替えた時の見た目は、人間のChrome確認が必要

### Next

- `Arm / hand track` OFF時にskeleton overlay上の腕線も非表示にするか、pose debug表示だけは残すかを使用感で決める

## 2026-05-21 Compact Japanese Setup UI

### Goal

- Setup Dockの説明書きを減らし、操作を邪魔しない密度にする
- UI表示を日本語へ統一する

### Did

- Setup Dock内のカード名、ボタン、ステータス、補助テキストを日本語化した
- 長い説明文を削り、`VRMが必要`、`トラック中`、`骨格表示` など短い状態表示へ変更
- Hand cardから未実装説明文を削除し、`腕/手トラック` と `骨格表示` の短い表示へ整理した
- 表情プリセットを `通常`、`笑顔`、`驚き`、`ゆるめ` に変更した
- E2Eとstoreテストの期待文言を日本語UIへ合わせた

### Worked

- `npm run test` は成功
- `npm run build` は成功。ただし既存のbundle size warningは継続
- `npm run lint` は成功
- `npm run test:e2e` は成功
- Browser previewで `VRMを読み込む`、`マイク開始`、`カメラ開始`、`腕/手トラック` が表示され、旧説明文が消えていることを確認した

### Failed / Blocked

- `VRMが必要` がマイクカードとVRMAカードの2箇所に出てE2E strict modeになったため、`#vrma-requirement-text` へ検証対象を絞った

### Next

- 実際のChrome表示で、日本語ラベルの折り返しやカード内スクロール量が邪魔でないか確認する

## 2026-05-21 Face Source Modes and Hand Toggle Split

### Goal

- 手の骨格表示ON/OFFで上半身トラックまで止まる挙動をやめる
- まばたきと口の入力元を、モーキャプ/自動またはマイク/オフから選べるようにする

### Did

- Hand cardのcheckboxを `手の骨格` に変更し、MediaPipe hand skeletonの表示/処理だけを切り替えるようにした
- 上半身/腕retargetはBody Track側のカメラ処理として独立させ、手の骨格OFFでも継続するようにした
- 顔/口cardに `まばたき` selectorを追加し、`モーキャプ` / `自動` / `オフ` を選べるようにした
- 顔/口cardに `口` selectorを追加し、`モーキャプ` / `マイク` / `オフ` を選べるようにした
- Face trackerは、まばたきまたは口がモーキャプを必要とする時だけ有効になるようにした
- マイク口パクは `口 = マイク` の時だけVRM `aa` に反映するようにした

### Worked

- `npm run build` は成功。ただし既存のbundle size warningは継続
- `npm run test` は成功
- `npm run lint` は成功
- `npm run test:e2e` は成功
- Browser previewで `まばたき`、`口`、`モーキャプ`、`マイク`、`手の骨格` の表示を確認した

### Failed / Blocked

- まばたき/口の切り替えを実カメラ・実マイクで人間が目視確認する必要がある

### Next

- 実機確認後、デフォルトを `まばたき=モーキャプ / 口=マイク` のままでよいか調整する

## 2026-05-21 Keep Head Tracking Independent From Face Modes

### Goal

- まばたきや口の入力方式をモーキャプ以外にしても、頭の動きが制限されないようにする
- 頭の向きは表情ではなく、カメラ姿勢入力として扱う

### Did

- Face trackerを、まばたき/口のモードから切り離して、カメラ起動中は頭トラック用に維持するようにした
- `まばたき=自動/オフ` や `口=マイク/オフ` でも `applyHeadRetarget()` が継続するようにした
- Face tracker statusは、表情モーキャプが不要な時は `頭: トラック中` と表示するようにした

### Worked

- `npm run build` は成功。ただし既存のbundle size warningは継続
- `npm run test` は成功
- `npm run lint` は成功
- `npm run test:e2e` は成功

### Failed / Blocked

- 実カメラで、まばたき=自動/オフ時にも頭の向きが自然に残るかは人間の目視確認が必要

### Next

- 手の骨格OFF時に肘トラッキングが残る挙動は、現状Body Track側の仕様として残す。必要ならBody側に腕トラック専用のON/OFFを追加する

## 2026-05-21 OBS Architecture Redesign

### Goal

- OBS Browser Sourceで背景透過とカメラ取得が安定しない問題を受け、OBS向けHTMLアプリの根本設計を見直す
- カメラ・マイク・MediaPipeをOBS内で完結させる前提をやめ、実装方針をドキュメント化する

### Did

- `docs/obs-architecture-redesign.md` を追加した
- OBS Render Page、Chrome Control / Capture Page、Local Relayの3分割構成を採用候補として整理した
- OBS側は `/?obs=1&transparent=1` でUIなし・透過・描画専用にする方針を書いた
- Chrome側は `/?control=1` でVRM/VRMA選択、カメラ、マイク、MediaPipe、表情、姿勢、モーション操作を担当する方針を書いた
- Local RelayはWebSocket/Nodeで、VRM/VRMAファイル共有とavatar state同期を担当する方針を書いた
- READMEとVPlant3Dコンセプト文書から新設計へリンクした

### Worked

- OBSの仕様差分をアプリの失敗として抱え込まず、OBSはrender-onlyに絞る設計へ切り出せた
- 透明背景、カメラ権限、マイク権限、MediaPipe処理を別々に検証できる構成になった

### Failed / Blocked

- 今回は設計ドキュメント更新のみ。コード変更と自動テストは未実施
- OBS Browser SourceでローカルRelayへWebSocket接続できるかは実装後にOBS実機確認が必要

### Next

- `/?obs=1&transparent=1` をRender Page、`/?control=1` をControl Pageとして明確に分離する
- 最小のLocal Relayを追加し、Chrome ControlからOBS Renderへavatar framingや表情値を送る
- VRM/VRMAファイルはControlからRelayへ渡し、OBS RenderがRelay URLから読む方式をMVP候補にする

## 2026-05-21 Control / Render Split MVP

### Goal

- 今の一体型画面を、Chrome操作用Control PageとOBS表示用Render Pageへ分離する
- Chromeで選んだVRM/VRMAとavatar stateをLocal Relay経由でOBS Render Pageへ渡す

### Did

- `npm run dev` をVite単体ではなく `server/vplant-relay.mjs` 起動に変更した
- Local RelayにWebSocket `/relay/ws` と一時asset HTTP endpoint `/relay/assets` を追加した
- `src/relay/messages.ts` と `src/relay/client.ts` を追加し、Control/Render間のmessageとasset uploadを整理した
- `/?control=1` をControl Pageとして扱い、`/?obs=1&transparent=1` はUIなしRender Pageとして維持した
- Control Pageで読み込んだVRM/VRMAをRelayへuploadし、Render PageがRelay URLから読み込むようにした
- avatar transform、表情値、head/upper body pose、VRMA loop/play/stop/select commandをWebSocketでRender Pageへ送るようにした
- PlaywrightにControl URL確認と、ControlからRenderへのVRM relay確認を追加した

### Worked

- `npm run test` は成功
- `npm run lint` は成功
- `npm run build` は成功。ただし既存のbundle size warningは継続
- `npm run test:e2e` は成功
- Codex in-app browserで `/?control=1` に操作UIがあり、`/?obs=1&transparent=1` には操作UIがないことを確認した

### Failed / Blocked

- 最初に `npm run test -- --runInBand` を実行したが、Vitestでは未対応optionだったため失敗。通常の `npm run test` で成功
- OBS Browser Source実機でWebSocketと `/relay/assets` が通るかは人間確認が必要
- Render Page側でVRMA commandがasset loadより先に来るケースの厳密なqueue処理はまだ薄い

### Next

- OBSでChrome ControlからRenderへVRM表示が反映されるか確認する
- Relay接続状態をControl Pageに短いbadgeで表示する
- VRMA asset load完了前にplay commandが来た場合のpending command処理を追加する
- Control/Render間の同期対象を整理し、送信頻度やmessageサイズを調整する

## 2026-05-21 Future Desktop / MCP Consideration

### Goal

- 本体アプリのElectron化と、VPlant3DのMCPサーバー化を導入前に検討する
- ハッカソンMVPに入れるべきか、後日候補にするべきかを整理する

### Did

- `docs/future-desktop-and-mcp-considerations.md` を追加した
- Electron化はControl/Relayを配布しやすくする後日候補として整理した
- MCPサーバー化はCodexなどのエージェントが状態確認・操作しやすくする開発/運用補助として整理した
- どちらも現時点では導入しない判断を明記した
- READMEのDocumentation一覧に追加した

### Worked

- ElectronとMCPを、MVPの配信者向け価値と、後日の開発運用価値に分けて判断できる形にできた
- Electron公式Process Model / Automated Testing、MCP公式Architectureを参照して考察に反映した

### Failed / Blocked

- 実装はしていない
- Electron化した場合のmacOS権限、署名、配布、OBS連携の実コストは未検証
- MCP hostからの接続やtool contractは未設計

### Next

- まずOBS実機でControl/Render/Relay構成を確認する
- Electron化は提出後、配布体験を改善する必要が出たら再検討する
- MCP化はCodexからの状態確認やデバッグ自動化が本当に必要になったら、読み取り専用toolから検討する

## 2026-05-21 Tauri Controller Consideration

### Goal

- ElectronではなくTauriでControl/Relayを軽量に包む案を検討する
- 描画はOBS内Chromiumに残し、Tauriはコントローラーに徹する方向を整理する

### Did

- `docs/future-desktop-and-mcp-considerations.md` にTauri化の検討を追記した
- Tauriは描画アプリではなく、Control UI、Local Relay launcher、ファイル/設定管理、OBS URLコピーを担当する案として整理した
- WebGPUや最終描画品質はOBS Render Pageに残す方針を明記した
- Tauri公式Architecture、Process Model、WebDriver Testingを参照した

### Worked

- ElectronのChromium同梱による安定性と、Tauriの軽量配布のトレードオフを整理できた
- VPlant3DではOBS内Chromiumが最終描画を担当するため、TauriはElectronより先に試す後日候補になりうると判断できた

### Failed / Blocked

- Tauriは導入していない
- Tauri内WebViewでカメラ/マイク/MediaPipeが安定するかは未検証
- Tauri化してもOBS Browser Source実機確認は別途必要

### Next

- まずは現在のWeb + Relay構成をOBSで確認する
- 提出前に余裕がある場合のみ、TauriをRelay launcherとして試すか判断する
- Tauri検証時はChrome Control Page fallbackを残す

## 2026-05-21 Relay Replay for Late OBS Render

### Goal

- Control側ではVRMを読み込めるが、OBS側Render Pageにモデルが出ない問題を改善する
- OBS Browser SourceがControlより後に開いたりrefreshした場合でも、最新VRM asset通知を受け取れるようにする

### Did

- Local Relayが最新のVRM asset、VRMA slot、state、VRMA command messageを保持するようにした
- WebSocket新規接続時に、保持している最新messageを再送するようにした
- Playwrightに、Controlで先にVRMを読み込んでからRender Pageを開くE2Eを追加した
- OBS確認用dev serverを修正版Relayで再起動した

### Worked

- `npm run test:e2e` は成功
- `npm run lint` は成功
- `npm run test` は成功
- `npm run build` は成功。ただし既存のbundle size warningは継続

### Failed / Blocked

- OBS Browser Source実機での再確認は人間確認待ち
- OBS側CEFでWebSocket自体が遮断されている場合は、さらにHTTP polling fallbackなどが必要になる可能性がある

### Next

- OBS側Browser Sourceをrefreshするか、一度削除して再追加し、`?obs=1&transparent=1` でVRMが出るか確認する
- まだ出ない場合は、OBS Render Pageに接続/asset受信状態の小さなdebug表示を `?debug=1` で出せるようにする

## 2026-05-21 Control Preview Compact and Transparent Render Pass

### Goal

- Control側のモデルプレビューを小さくし、操作ドックの情報密度を上げる
- OBS Render Pageの透過が効かない問題を改善する

### Did

- Control Pageではカメラを引いて、モデルプレビューを小さく表示するようにした
- Setup Dockを少し高くし、カード幅と余白を詰めた
- `transparent=1` 時にHTML root、body、viewport、canvas背景を明示的に透明化した
- Three.js rendererに `premultipliedAlpha: false` と `setClearAlpha(0)` を指定した
- 透明OBS Renderではグリッドを非表示にした
- Relayが状態を持つようになったため、Playwright E2Eを1 workerで直列実行するようにした
- OBS確認用dev serverを修正版で再起動した

### Worked

- `npm run test:e2e` は成功
- `npm run build` は成功。ただし既存のbundle size warningは継続
- `npm run test` は成功
- `npm run lint` は成功

### Failed / Blocked

- Playwright E2Eを並列実行すると、stateful Relayの最新messageがテスト間で干渉したため、直列実行へ変更した
- OBS Browser Sourceで本当に透明になるかは人間確認待ち

### Next

- OBS側で背景が透明になるか確認する
- まだ黒背景が残る場合は、OBS Browser Source設定のCustom CSS、source background、alpha handlingを確認し、`?debug=1` の背景診断表示を追加する

## 2026-05-21 Vertical Control Layout

### Goal

- Control Pageのモデルプレビューを小さくし、操作パネルを縦配置で詰め込む
- OBS RenderとControlの役割差が見た目にも分かるようにする

### Did

- Control PageのSetup Dockを下ドックから右サイドバーへ変更した
- 操作カードを横スクロールではなく縦スクロールで並べるようにした
- Control Pageのcanvas幅を操作パネル分だけ縮め、モデルプレビューがパネルの下に潜りにくい形にした
- Control Page用カメラをさらに引いて、モデルを小さめに表示するようにした
- OBS確認用dev serverを縦レイアウト版で再起動した

### Worked

- `npm run test:e2e` は成功
- `npm run build` は成功。ただし既存のbundle size warningは継続
- `npm run lint` は成功
- `npm run test` は成功

### Failed / Blocked

- 実際のChrome操作感は人間確認待ち
- 右サイドバー幅やモデルプレビューの大きさは、表示画面サイズによって再調整が必要になる可能性がある

### Next

- Chromeで縦操作パネルのスクロール量と見やすさを確認する
- 必要ならカード順をVRM/顔/体/手/位置/VRMAから、配信中操作頻度順に再配置する

## 2026-05-21 Compact Control Preview Card

### Goal

- 画面分割時にControl Pageがきれいに見えるよう、モデルプレビューを小さな簡易ビューとして扱う
- 操作パネルを簡易プレビューの下に縦配置する

### Did

- Control Pageのscene canvasを右上の小さなプレビュー枠へ変更した
- 操作パネルをプレビュー枠の下へ移動した
- Control Page用カメラを簡易プレビュー向けに調整した
- プレビューcanvasが操作ボタンのクリックを遮らないよう `pointer-events: none` にした
- OBS確認用dev serverを簡易プレビュー版で再起動した

### Worked

- `npm run test:e2e` は成功
- `npm run test` は成功
- `npm run lint` は成功
- `npm run build` は成功。ただし既存のbundle size warningは継続

### Failed / Blocked

- 初回E2EではプレビューcanvasがVRMA再生ボタンのクリックを遮ったため、Control側canvasのpointer eventsを無効化した
- 実際の画面分割時の見た目は人間確認待ち

### Next

- Chromeで、右上の簡易プレビューと縦操作パネルが狭い画面でも破綻しないか確認する
- 必要なら簡易プレビューの高さ、パネル幅、カード順を調整する

## 2026-05-21 Restore Visible Control Panel

### Goal

- Compact preview変更後にControl Pageの操作パネルが見えなくなった問題を修正する

### Did

- Control panelの位置指定をTailwind utilityから `.control-panel` CSSへ移した
- Control preview canvasとControl panelのz-indexを明示した
- `.control-panel` をpreview canvasより前面に出すようにした
- 小さい画面高向けにpreview heightとpanel topのmedia queryを追加した
- OBS確認用dev serverを修正版で再起動した

### Worked

- `npm run test:e2e` は成功
- `npm run build` は成功。ただし既存のbundle size warningは継続
- `npm run lint` は成功
- `npm run test` は成功

### Failed / Blocked

- 人間のChrome画面で操作パネルが戻ったかは確認待ち

### Next

- Chrome側をリロードし、右上previewと右下control panelが見えるか確認する

## 2026-05-21 OBS Render Head-Centered Framing

### Goal

- OBSに映すRender Pageでモデル上部が見切れがちな問題を改善する
- カメラの視芯付近にキャラの顔/頭が来るようにする

### Did

- OBS Render Page用の上半身カメラを少し引いた
- Render PageのlookAtを顔/頭寄りの高さへ上げた
- Control Pageの簡易プレビュー用カメラには影響しないよう、Control/Renderでカメラ設定を分けたまま調整した
- OBS確認用dev serverを修正版で再起動した

### Worked

- `npm run test:e2e` は成功
- `npm run build` は成功。ただし既存のbundle size warningは継続
- `npm run lint` は成功
- `npm run test` は成功

### Failed / Blocked

- OBS実機での見切れ改善は人間確認待ち

### Next

- OBS Browser Sourceを再読み込みし、顔が画面中央付近に来るか確認する
- 必要ならRender専用の「顔位置/上半身/全身」framing presetを追加する

## 2026-05-21 First Hand Tracking Retarget

### Goal

- MediaPipe Hand Landmarkerの手骨格からVRM指ボーンへ最低限の指カールを流し込む
- Control PageだけでなくOBS Render Pageにも指状態を同期する

### Did

- `src/mocap/hand-landmarks.ts` に手ランドマークから親指/人差し指/中指/薬指/小指のカール量を作る純粋ロジックを追加した
- `test/hand-landmarks.test.ts` に開いた手、握った手、ミラー、検出ロスト時の減衰テストを追加した
- VRM標準のnormalized finger bonesへカール量を適用する処理を追加した
- relay stateにhand poseを追加し、Control PageからOBS Render Pageへ指カールを送るようにした
- 手UIを「骨格表示」から「指トラック」寄りの表記に変更した
- `docs/face-hand-tracking-notes.md` と `docs/third-party-libraries.md` を更新した

### Worked

- `npm run test -- test/hand-landmarks.test.ts` は成功
- `npm run test` は成功
- `npm run lint` は成功
- `npm run build` は成功。ただし既存のbundle size warningは継続
- 初回 `npm run test:e2e` はUI文言変更で失敗したが、E2E期待値を「指トラック」「手 / 指」に更新後は成功
- Browserで `http://127.0.0.1:5173/?control=1` と `?obs=1&transparent=1` を確認し、Control UIとOBS Render canvasが表示されることを確認した

### Failed / Blocked

- 初回E2Eでは旧文言「手の骨格」「骨格表示」を探して失敗した
- 指ボーンの曲がる軸と強さはモデル差が出やすいため、人間のChrome/OBS確認が必要
- 手首IKや指の開き、ジェスチャー反応は未実装

### Next

- Chromeで手を開閉し、指が自然な向きに曲がるか確認する
- OBS Render Page側でも同じ指カールが反映されるか確認する
- 必要なら指ごとのカール符号・強さを調整する

## 2026-05-21 Hand Wrist Retarget Fix

### Goal

- MediaPipe側で手は取れているが、モデルへの流し込みが見えない問題を改善する

### Did

- 手の流し込みを指カールだけでなく、手首/前腕の回転にも反映するよう変更した
- 手首から中指付け根への方向を使って `wristRoll` を作り、手を開いていてもモデル側に動きが見えるようにした
- palm centerと奥行きから軽い `wristYaw`、指先距離から軽い `wristPitch` を作った
- relay messageのhand poseを、指カールのみから手首回転込みの構造へ拡張した
- ハンドロジックのテストに手首回転ケースを追加した

### Worked

- `npm run test` は成功
- `npm run lint` は成功
- `npm run build` は成功。ただし既存のbundle size warningは継続
- `npm run test:e2e` は成功

### Failed / Blocked

- 実カメラでの手首回転方向、左右ミラー、強さは人間確認が必要
- 指ボーンのカール方向もモデル差があるため、まだ追加調整の可能性あり

### Next

- Chromeで手を開いたまま傾け、モデルの手首/前腕が追従するか確認する
- 握った時に指のカールが見えるか確認する
- OBS Render Page側にも同じ手首/指状態が出るか確認する

## 2026-05-21 Lower Arm Pose Retarget Fix

### Goal

- 手ランドマークは取れているが、肘/下腕が動かず手の位置が下がったままになる問題を修正する

### Did

- MediaPipe Poseの肘・手首ランドマークから `leftLowerArmLift` / `rightLowerArmLift` を算出するようにした
- 上半身retarget poseに `leftLowerArmRoll` / `rightLowerArmRoll` を追加した
- VRMの `LeftLowerArm` / `RightLowerArm` に下腕ロールを適用するようにした
- Hand Landmarker側は手首/指の細かい向き、Pose Landmarker側は腕の位置、という分担に整理した
- relay stateにも下腕ロールを含め、OBS Render Pageへ同期されるようにした
- pose/upper-body retargetのテストを追加・更新した

### Worked

- `npm run test` は成功
- `npm run lint` は成功
- `npm run build` は成功。ただし既存のbundle size warningは継続
- `npm run test:e2e` は成功

### Failed / Blocked

- 実カメラでの肘・手首方向、左右ミラー、下腕の強さは人間確認が必要

### Next

- Chromeで腕を上げ、肘から手首までがモデル側で追従するか確認する
- 下腕が曲がりすぎる/逆向きなら `maxLowerArmRoll` と左右符号を調整する

## 2026-05-21 Elbow Bend IK-Like Retarget

### Goal

- 手首位置を目標にして肘に角度をつける、IKに近い下腕挙動へ寄せる

### Did

- Pose Landmarkerの肩・肘・手首から肘角度を推定する `leftLowerArmBend` / `rightLowerArmBend` を追加した
- 下腕retargetを、手首の上下移動より肘角度を優先する方式へ変更した
- 手首の上下情報は補助として残し、肘角度が小さい時だけ弱く効くようにした
- pose/upper-body retargetのテストを追加・更新した

### Worked

- `npm run test` は成功
- `npm run lint` は成功
- `npm run build` は成功。ただし既存のbundle size warningは継続
- `npm run test:e2e` は成功

### Failed / Blocked

- 本物のIKソルバーではなく、2D肩・肘・手首角度からの近似。実カメラでの見え方確認が必要
- Hand Landmarkerの手首位置をPose側へ融合する処理はまだ未実装

### Next

- 手を顔の横に持ってきた時、肘が折れて手首目標へ近づくか確認する
- まだ手首位置が遠い場合、Hand Landmarkerのwrist点をPose wristの補正に使う

## 2026-05-21 Hand Toggle Stops Arm Retarget

### Goal

- 手トラックOFF時に、MediaPipe由来の腕・手の反映も止められるようにする

### Did

- `Hand / finger` チェックボックスを、指だけでなく上腕・下腕・手首のretarget有効/無効として扱うようにした
- 手トラックOFF時は上腕/下腕retarget値を即ゼロにし、手首/指retargetもリセットするようにした
- 胴体・首の上半身トラックは残るため、腕だけ暴れる時に止められる
- upper-body retargetの純粋ロジックに `trackArms` オプションを追加し、腕OFF時のテストを追加した

### Worked

- `npm run test -- test/upper-body-retarget.test.ts` は成功
- `npm run test` は成功
- `npm run lint` は成功
- `npm run build` は成功。ただし既存のbundle size warningは継続
- `npm run test:e2e` は成功

### Failed / Blocked

- 実カメラで、チェックOFF時に腕の揺れが止まるかは人間確認が必要

### Next

- Chromeでカメラ使用中に `手 / 指` をOFFにし、腕・手が戻って動かないか確認する
- 必要ならUI文言を「腕 / 手」へ変更して意味をさらに明確にする

## 2026-05-21 Vertical Control Layout

### Goal

- コントローラー画面を、上に16:9モデルプレビュー、その下に縦並び操作パネルという配置へ変更する

### Did

- Control Pageを縦flexレイアウトに変更した
- モデルプレビューを上部中央、16:9、最大幅720px相当にした
- 操作パネルをプレビュー直下に同じ幅で配置し、内部スクロールする形にした
- 左右余白は画面幅に応じて自動調整される
- E2Eにプレビューの16:9比率、パネルが下に来ること、幅が揃うことの確認を追加した

### Worked

- `npm run test:e2e -- test/e2e/app.spec.ts:11` は成功
- `npm run test` は成功
- `npm run lint` は成功
- `npm run build` は成功。ただし既存のbundle size warningは継続
- `npm run test:e2e` は成功

### Failed / Blocked

- 初回E2EではCSS `calc()` の乗除算に頼った高さ指定が期待通り動かず、canvasが全高扱いになった
- flex + `aspect-ratio` + explicit widthで修正した

### Next

- Chromeで、縦長ウィンドウにした時にプレビューと操作パネルの密度が意図通りか確認する
- 必要なら最大幅720px、低画面高時560pxの値を調整する

## 2026-05-21 Control Preview Aspect Fix

### Goal

- コントローラーのモデルプレビューが横伸びして見える問題を修正する

### Did

- Control PageではcanvasのCSSサイズだけでなく、Three.js rendererの描画バッファもプレビュー枠の実寸に合わせるようにした
- Control Pageのcamera aspectもプレビューcanvasの実寸から計算するようにした
- Render/OBS Pageはこれまで通りwindow全体サイズを使う
- E2Eでcanvas CSS比率だけでなくdrawing buffer比率も16:9に近いことを確認するようにした

### Worked

- `npm run test:e2e -- test/e2e/app.spec.ts:11` は成功
- `npm run test` は成功
- `npm run lint` は成功
- `npm run build` は成功。ただし既存のbundle size warningは継続
- `npm run test:e2e` は成功

### Failed / Blocked

- 前回はCSSの枠だけ16:9で、Three.js内部はwindow全体aspectのままだったため横伸びした

### Next

- Chromeでモデルプレビューが横伸びせず、自然な比率で表示されるか確認する

## 2026-05-21 Render Motion Smoothing And Hand Default Off

### Goal

- OBS Render Pageでモデルがカクつく/ピクピクする問題を軽減する
- 手トラックをデフォルトOFFにして、必要な時だけ使う運用にする

### Did

- Controlから受信したrelay pose/expressionをRender側では直接適用せず、目標値として保持するようにした
- Render側のanimation frameごとに頭、上半身、手、表情を補間して適用するようにした
- relay更新間隔による段差が、そのままモデルへ出ないようにした
- `handTrackingEnabled` の初期値を `false` に変更した
- E2Eとstore testの期待値を、手トラック初期OFFへ更新した

### Worked

- `npm run test` は成功
- `npm run lint` は成功
- `npm run build` は成功。ただし既存のbundle size warningは継続
- `npm run test:e2e` は成功

### Failed / Blocked

- OBS実機でのカクつき改善は人間確認が必要
- まだMediaPipe検出自体のノイズは残る可能性があるため、必要ならControl側にもdeadzoneや低域通過フィルタを追加する

### Next

- OBSで同じ動作を確認し、フレーム落ちっぽい段差が減ったか見る
- まだピクつく場合は、relay送信頻度、補間係数、MediaPipe入力側の安定化を調整する

## 2026-05-21 Slow Retarget Release

### Goal

- OBS Render Pageで、検出が弱くなった瞬間に棒立ちへ戻ろうとしてブレる問題を軽減する

### Did

- Render側のrelay補間を、目標が有効な時と無効/未検出の時で分けた
- 有効なモーションへは通常速度で追従し、未検出で棒立ちへ戻る時はかなり遅く戻すようにした
- `smoothUpperBodyRetargetPose` の未検出時release量も小さくし、短い検出落ちで上半身が強く戻らないようにした

### Worked

- `npm run test -- test/upper-body-retarget.test.ts` は成功
- `npm run test` は成功
- `npm run lint` は成功
- `npm run build` は成功。ただし既存のbundle size warningは継続
- `npm run test:e2e` は成功

### Failed / Blocked

- OBS実機でのブレ改善は人間確認が必要

### Next

- OBSで、検出が一瞬弱くなる場面でも棒立ちへ吸われるようなブレが減ったか確認する
- まだ残る場合は、Control側で姿勢targetを一定時間ホールドする

## 2026-05-22 External Tracking Research

### Goal

- 外部トラッキング接続、iFacialMocap、VMC Protocol、VTube Studio系の入力を調べ、VPlant3Dへ入れる場合の設計を整理する

### Did

- 公式/一次情報を中心に、VMC Protocol、iFacialMocap通信仕様、VTube Studio Public API、VTube Studio iOS tracking UDPサンプルを確認した
- `docs/external-tracking-research.md` を作成した
- ブラウザ/OBSへ直接UDPを入れるのではなく、Node側ローカル中継サーバーで受信して既存WebSocket relayへ流す方針を整理した
- iFacialMocapは顔専用、VMCはボーン/表情汎用、VTube Studio iOS trackingはiPhone顔トラッカー候補として扱う方針にした

### Worked

- 既存のControl Page / OBS Render Page分離設計と、外部入力adapter方式は相性がよい
- まずはiFacialMocap parserの純粋関数テストから始められる見通し

### Failed / Blocked

- iFacialMocap、VTube Studio iOS tracking、VMC送信元アプリは実機/実アプリがないと品質確認できない
- 外部トラッキングはUDP/OSCが多く、ブラウザ単体実装には向かない

### Next

- 実装するなら、まず `server/external-tracking/` に正規化型とiFacialMocap文字列parserを追加する
- 人間側でiFacialMocapまたはVMC送信元アプリを使う予定があるか確認する
- VMCは最初から全身ボーンを扱わず、表情とhead/chestだけに絞る

## 2026-05-22 Manual Control Research

### Goal

- マウス操作やゲームコントローラーでモデルを手動操作する方向性を検討し、VPlant3Dへ入れる場合の設計を整理する

### Did

- Pointer Events、Pointer Capture、Gamepad APIの公式情報を確認した
- `docs/manual-control-research.md` を作成した
- マウス左ドラッグで顔向き、Shift+ドラッグで上半身、ゲームパッド右スティックで顔向きという入力案を整理した
- 手動操作はトラッキングの代替ではなく、演出用の上書き/ブレンドレイヤーとして扱う方針にした

### Worked

- マウス手動操作はブラウザ標準APIだけで実装でき、外部UDP/OSC連携より軽い
- 今のControl Pageで入力を受け、OBS Render Pageへrelayする構成と相性がよい

### Failed / Blocked

- ゲームパッドはOS/ブラウザ/機種差があり、実機入力確認が必要
- 自動復帰を強くしすぎると、現在問題になっている「棒立ちへ戻ろうとしてピクつく」挙動を再発させる可能性がある

### Next

- 実装するなら、まず `src/input/manual-control.ts` にドラッグ量から正規化poseを作る純粋関数を追加する
- Control Page preview canvasにpointer操作を接続し、顔yaw/pitchだけ最小実装する
- ゲームパッドはマウス操作の正規化レイヤーができた後に右スティック顔向きから追加する

## 2026-05-22 Manual Control Implementation Plan

### Goal

- コントローラー側モデルプレビューで、マウス操作により顔向き、モデル位置、拡大、全体回転を操作する実装案を具体化する

### Did

- `docs/manual-control-research.md` に具体実装案を追記した
- 左ドラッグは顔yaw/pitch、中ドラッグはモデルX/Y、ホイールは拡大縮小、右ドラッグは全体Y回転、ダブルクリックは手動顔向きリセットにする案を整理した
- 初期実装では `RelayRenderState` を増やさず、Control Page側で既存の `headRetargetPose` / `upperBodyRetargetPose` へ合成して送る方針にした
- `src/input/manual-control.ts` と `test/manual-control.test.ts` を追加する実装単位を決めた

### Worked

- 既存のrelay schemaを大きく変えずに始められる
- Render Page側の補間処理をそのまま使える
- 手動顔向きは保持を初期挙動にすることで、棒立ちへ戻る時のブレを避けやすい

### Failed / Blocked

- 中ボタンドラッグはブラウザのオートスクロールと競合する可能性があるため、`auxclick` やpointer handlingの実ブラウザ確認が必要
- 実装後の手触りはChromeで人間確認が必要

### Next

- 次に実装へ進むなら、純粋関数のテストから始める
- 最小目標は左ドラッグ顔向き、ダブルクリックリセット、Control Pageの手動操作カード

## 2026-05-22 Manual Mouse Control MVP

### Goal

- コントローラー側モデルプレビューで、マウス操作によるカメラなしVTuber向けの手動操作MVPを実装する

### Did

- `src/input/manual-control.ts` を追加し、ドラッグ/ホイール入力を手動姿勢とavatar transformへ変換する純粋関数を実装した
- 左ドラッグで顔yaw/pitch、Alt+左ドラッグで顔roll、中ドラッグでモデルX/Y、右ドラッグで全体Y回転、ホイールで拡大縮小を操作できるようにした
- Control Pageに「手動操作」カードを追加し、手動操作ON/OFF、マウスON/OFF、顔向きリセット、状態表示を追加した
- 手動顔向きは離しても保持し、ダブルクリックまたはボタンでリセットする挙動にした
- Control Page preview canvas上では `contextmenu` / `auxclick` を抑制し、Pointer Captureでドラッグ操作を安定させた
- Unit testとE2Eを追加した

### Worked

- `npm run test` は成功
- `npm run lint` は成功
- `npm run build` は成功。ただし既存のbundle size warningは継続
- `npm run test:e2e` は成功
- Playwrightで左/中/右ドラッグとホイール操作の状態反映を確認できた

### Failed / Blocked

- 最初のE2Eでは `手動操作` テキストが見出しとラベルの2箇所にあり、strict locatorで失敗した。対象をIDベースに変更して修正した
- 中ボタンドラッグの実際のブラウザ/マウス挙動は人間確認が必要

### Next

- Chromeでモデルを読み込んだ状態で、顔向き保持、位置調整、右ドラッグ回転の手触りを確認する
- 顔向きの感度、保持/自動復帰、胸への分配量を人間の感覚に合わせて調整する
- 次の拡張候補はゲームパッド右スティック顔向き、表情ボタン、複数VRMAスロットのワンボタン再生

## 2026-05-22 Look Controls Plan

### Goal

- モデルの見た目を調整するライト、リムライト、エッジ、アウトライン系機能の実装案を控えておく

### Did

- `docs/look-controls-plan.md` を作成した
- 既存のkey/fill/rim lightをUI化するライト/リムライト調整案を整理した
- VRM内蔵アウトラインはモデル作者の意図を尊重し、全体倍率だけ触る方針にした
- 追加アウトラインは黒縁と外ふちを別レイヤーとして扱う案を整理した
- 追加アウトラインは透明背景/OBS/負荷検証が必要なので、ライト系とは別フェーズにした

### Worked

- 既に `keyLight`、`rimLight`、`fillLight` があるため、Phase 1は比較的小さく始められる
- ハッカソンMVPでは、ライト/リムライトUIだけでも見栄え改善として価値がある

### Failed / Blocked

- VRM内蔵アウトラインの具体プロパティは、`@pixiv/three-vrm` とMToon materialの実体確認が必要
- 2段アウトラインは映えるが、OBS透明背景やpostprocess負荷の検証が必要

### Next

- 実装するなら、まず `src/look/look-presets.ts` とライト/リムライトUIから始める
- 追加アウトラインは別ブランチまたは検証スパイクで試す

## 2026-05-22 Three Light Look Control Plan

### Goal

- Key / Fill / Rim の3灯すべてをDirectionalLightにそろえるルック操作案を具体化する

### Did

- `docs/look-controls-plan.md` に3灯UI案と実装順を追記した
- 現在の `HemisphereLight` fillを `DirectionalLight` fillへ置き換える方針にした
- MVP UIはプリセット、Key/Fill倍率、Rim強度/色/方向に絞る案にした
- `RelayRenderState` にlook設定を載せ、Control PageとOBS Render Pageの見た目を同期する方針を明記した

### Worked

- 3灯構成は配信/撮影に馴染みがあり、ユーザーにも説明しやすい
- 実装は既存ライトの置き換えと設定反映が中心で、アウトラインより低リスク

### Failed / Blocked

- 見た目の良し悪しはモデル依存なので、実装後にAliciaと別モデルで人間確認が必要

### Next

- 実装するなら `src/look/look-presets.ts` とstore/relayのlook設定追加から始める
- 最初は3灯UIだけにし、アウトラインは別タスクとして残す

## 2026-05-22 Three Light Look Controls MVP

### Goal

- Key / Fill / RimをすべてDirectionalLightにそろえ、Control Pageから3灯ルックを操作できるようにする

### Did

- `src/look/look-presets.ts` を追加し、標準/明るめ/正面上/ネオン/輪郭強調プリセットを実装した
- `fillLight` を `HemisphereLight` から `DirectionalLight` に置き換えた
- storeにlook設定を追加し、プリセット、Key倍率、Fill倍率、Rim強度/色/方向を管理できるようにした
- `RelayRenderState` にlook設定を追加し、Control PageからOBS Render Pageへ3灯設定を同期するようにした
- Control Pageに「ルック / 3灯ライト」カードを追加した
- look presetのunit test、store test、E2Eを追加した

### Worked

- `npm run test` は成功
- `npm run lint` は成功
- `npm run build` は成功。ただし既存のbundle size warningは継続
- `npm run test:e2e` は成功
- E2Eで3灯UIの表示、操作、OBS Render PageでUIが隠れることを確認できた

### Failed / Blocked

- 実際の見た目の良し悪しはモデル依存なので、Chrome/OBSで人間確認が必要
- buildのbundle size warningは既存通り継続

### Next

- Aliciaと別モデルで、標準/明るめ/正面上/ネオン/輪郭強調の見え方を確認する
- 必要ならKey/Fill/Rimの初期値、プリセット強度、露出を調整する
- アウトライン/モデル線は別タスクとして検討を続ける

## 2026-05-22 Render Stable State Smoothing

### Goal

- OBS Render Pageで、モデル位置/回転/拡大とライト設定がrelay更新ごとに即時反映され、ブルブル震えたり明滅したりする問題を軽減する

### Did

- `src/relay/render-smoothing.ts` を追加した
- OBS Render Pageではavatar transformとlook lightsを即時適用せず、最後に受け取った値をtargetとして保持し、animation frameごとにゆっくり補間するようにした
- ポーズ/表情は従来通り速め、モデル位置/回転/拡大とライトは低速追従に分けた
- avatar回転は最短角度で補間するようにした
- ライトは色、強度、位置、露出を補間するようにした
- 単体テストを追加した

### Worked

- `npm run test` は成功
- `npm run lint` は成功
- `npm run build` は成功。ただし既存のbundle size warningは継続
- `npm run test:e2e` は成功

### Failed / Blocked

- OBS実機でのブルブル/明滅改善は人間確認が必要

### Next

- OBSでモデル位置、回転、ライトプリセット、リム設定を動かし、震えや明滅が減ったか確認する
- まだ残る場合は、Controlから送る静的状態を変更時だけ送信するか、Render側の補間速度をさらに下げる

## 2026-05-22 Three Light Direction Separation

### Goal

- 3灯ライトが同じように照らして見える問題を減らし、Key / Fill / Rim の役割差を画面上で分かりやすくする
- OBS側で影や遮蔽設定由来のちらつきを増やさない

### Did

- `look-presets` に Key / Fill / Rim それぞれの照射先 target を追加した
- Key は斜め上前、Fill は反対側の低め弱め、Rim は背面側から顔/肩へ向ける構成に見直した
- Fill の強度を下げ、Rim の距離と強度を上げて輪郭側の差が出やすい値にした
- `DirectionalLight.target` を明示して、全ライトが原点付近へ向いて似た照り方になる状態を避けた
- `renderer.shadowMap.enabled = false` を明示した。現時点ではOBS Browser Sourceでの安定性を優先し、リアルタイム影による遮蔽は使わない
- Render側のライト補間で light target も補間するようにした

### Worked

- unit testでライト方向、Rim方向、target補間を検証できるようにした

### Next

- Chrome/OBSで標準、正面上、ネオン、輪郭強調を見比べる
- まだ似て見える場合は、Fillをさらに弱めるか、Rimを疑似アウトライン寄りに強める
- 影による遮蔽は、OBSでちらつきや負荷が出にくい見通しが立ってから別途検討する

## 2026-05-22 Static Relay Hold For Look And Framing

### Goal

- OBS Render Pageで、移動/拡大/回転や照明が復帰力っぽく揺れる問題を減らす
- ローカル通信なのに静的な設定まで30fpsで追従してカクつく状態を避ける
- リムライトをより演出寄りに強め、上後ろ方向を真上に近づける

### Did

- OBS Render Pageでは avatar transform と look settings のsignatureを保持し、値が変わったときだけ適用するようにした
- 静的な移動/拡大/回転/照明は補間せず、最後に受け取った入力値をそのまま保持するようにした
- モーション/表情は従来通り連続更新のままにした
- Rimのsoft/medium/strong全体を強め、neon/edgeプリセットのRimをより飛ばす方向にした
- `top-back` Rim方向を背面奥よりも真上寄りへ移動した

### Next

- OBSで移動/拡大/回転/ライトを触り、復帰力っぽい揺れが減ったか確認する
- まだカクつく場合は、relay messageを「motion」と「static」に型レベルで分離し、staticはUI操作イベントだけで送る

## 2026-05-22 Mocap Hold And Deadband

### Goal

- MediaPipe検出が一瞬外れた時に、頭/体/手がneutralへ戻ってプルプルする問題を減らす
- 小さなランドマーク揺れがそのまま骨へ入って細かく震える問題を減らす

### Did

- head retargetは未検出フレームではneutralへ戻さず、最後の可視ポーズを保持するようにした
- upper body retargetも未検出フレームでは最後の可視ポーズを保持するようにした
- hand retargetも手が一瞬消えた時に指/手首をneutralへ戻さず保持するようにした
- head/body/handの平滑化に小さな差分を無視するdeadbandを追加した
- 既存テストを「復帰」から「保持」前提へ更新し、deadbandのテストを追加した

### Next

- OBSでカメラトラック中に一瞬検出が外れる動きを試し、プルプル復帰が減ったか確認する
- まだ残る場合は、relay stateを生の検出状態と平滑済みposeに分け、OBS側で保持時間を明示的に管理する

## 2026-05-23 VRM Meta License Research

### Goal

- VRM 0.x / 1.0 に含まれるアバター利用条件、商用利用、改変・再配布条件を実装に向けて整理する

### Did

- VRM公式ドキュメント、VRM 0.0仕様、VRM 1.0 meta仕様、`@pixiv/three-vrm` の `VRM0Meta` / `VRM1Meta` 型を確認した
- VRM 0.x と 1.0 のmeta項目差分、デフォルト値、正規化方針を `docs/vrm-meta-implementation-notes.md` にまとめた
- VPlant3Dでは `vrm.meta.metaVersion` で分岐し、共通の `NormalizedVrmLicenseMeta` に変換する方針にした

### Next

- `src/vrm/vrm-license-meta.ts` を追加し、VRM 0.x / 1.0 のメタ情報を正規化する
- Control Pageに「モデル利用条件」カードを追加し、危険そうな条件を警告バッジで表示する

## 2026-05-23 Relay Static / Motion Split

### Goal

- ハンドトラッキング追加後に目立つOBS側のカクつき、照明チカチカ、復帰っぽい揺れを減らす
- 毎フレーム送る必要がないモデル位置/拡大/回転/照明を、モーション更新のpayloadから分離する

### Did

- relay messageを `staticState` と `motionState` に分割した
- `staticState` は avatar transform、look settings、VRMA loop を含み、Control側で値が変わった時だけ送るようにした
- `motionState` は expression と pose だけを含み、約15fpsへ落とした
- WebSocketの送信bufferが詰まっている時はmotion送信をスキップし、古い姿勢が順番待ちになる状態を減らした
- motion payloadは小数を丸め、hand poseは手トラック有効時だけ送るようにした
- Local Relay serverは `motionState` / `staticState` の最新保持を軽い文字列判定で行い、毎motionでJSON parseしないようにした
- 旧 `state` messageは互換用に受け取れるまま残した

### Worked

- `npm run test` は成功
- `npm run lint` は成功
- `npm run build` は成功。ただし既存のbundle size warningは継続
- `npm run test:e2e` は成功

### Next

- OBS実機で、ハンドトラッキングON時のカクつきと照明チカチカが減るか確認する
- まだ残る場合は、motionStateをさらに10fpsへ下げる、またはhead/body/hand/expressionを個別channelに分ける

## 2026-05-23 Render Motion Interpolation Tuning

### Goal

- relay分割でピクつきは改善したが、OBS側の動きが低フレームレート気味で硬く見える問題を軽減する

### Did

- 通信頻度は維持したまま、Render側のmotion smoothing speedを上げた
- head/body/handの追従速度を `18` から `28` に上げた
- expressionの追従速度を `34` から `42` に上げた

### Next

- OBS実機で動きの硬さと残像感を確認する
- まだ硬い場合は、motion送信を24fps相当へ上げるか、Render側で前後2点補間する方式を検討する

## 2026-05-23 15fps Relay Motion Interpolation Buffer

### Goal

- ControlからOBS Renderへ送るmotionStateを15fps相当に抑えつつ、OBS側の見た目は硬くならないようにする
- 通信量増加で再びピクつきや照明チカチカが戻ることを避ける

### Did

- motionState送信間隔を `66ms` にし、15fps相当に戻した
- Render側で受信motionStateを直近2フレーム保持し、約 `80ms` 遅延した表示時刻でhead/body/hand/expressionを線形補間するようにした
- 補間後のposeを既存のRender側smoothingへ渡す構成にし、通信頻度と描画追従を分離した
- 補間ロジックを `src/relay/motion-interpolation.ts` として分離し、単体テストを追加した

### Worked

- `npm run test` は成功
- `npm run lint` は成功
- `npm run build` は成功。ただし既存のbundle size warningは継続
- `npm run test:e2e` は成功

### Next

- OBS実機で15fps送信＋補間の硬さ、遅延感、ピクつきの有無を確認する
- まだ硬い場合は、補間遅延を `100ms` 前後へ増やす、またはhead/body/hand別に補間・追従速度を分ける

## 2026-05-23 30fps Relay Motion Rebalance

### Goal

- 15fps送信＋80ms補間で残ったカクつきと、まばたき/口パクの追従遅れを改善する

### Did

- motionState送信間隔を `33ms` に戻し、30fps相当にした
- Render側のpose補間遅延を `80ms` から `35ms` へ短くした
- expressionは補間バッファを通さず、最新受信値をすぐtargetへ反映するようにした
- expression smoothing speedを上げ、まばたき/口パクの戻りと追従を速くした

### Next

- OBS実機で30fps送信時のカクつき、表情の追従性、通信負荷を確認する
- まだ硬い場合はposeだけ30fps送信、expressionは毎フレーム近く送るなどchannel分離を検討する

## 2026-05-23 Relay Tracking Loss Hold Fix

### Goal

- 30fps送信へ戻した後に再発した、頭/体が一瞬neutralへ戻るようなびくつきを抑える

### Did

- motion interpolationで「有効pose → 検出なしneutral」を中間補間しないようにした
- head/bodyは次フレームがdisabledの場合、短い欠落として前回の有効poseを保持する
- 補間モジュールに回帰テストを追加した

### Next

- OBS実機で頭/体の復帰びくつきが消えたか確認する
- まだ残る場合は、RelayMotionFrameにpose種別ごとの最終有効時刻を持たせ、保持時間を明示的に制御する

## 2026-05-23 Face Expression Jitter Reduction

### Goal

- まばたきと口パクのモーキャプが小刻みにぴくぴくする問題を抑える

### Did

- blink入力の低スコア帯を0へ落とし、目が開いている時の細かい揺れをまばたきとして扱わないようにした
- mouth系expressionに小さな入力dead zoneを追加し、口を閉じている時のノイズを0へ寄せた
- `smoothFaceExpressionWeights` にchannelごとのdeadbandとnear-zero snapを追加した
- Render側expression smoothingを少し落とし、30fps送信時に細かい表情ノイズを追いすぎないようにした

### Next

- OBS実機でまばたき/口パクのぴくつきと、発話時・瞬き時の反応遅れが許容範囲か確認する
- まだ揺れる場合は、まばたきだけ短いhysteresis state machineに分離する

## 2026-05-23 Mocap Mouth Release Tuning

### Goal

- 口を開けっぱなしにしている時、MediaPipeの一瞬の低スコア/0スコアでモデルの口が勝手に閉じる問題を抑える

### Did

- 口系expressionだけ開く時と閉じる時のsmoothingを非対称にした
- 開く方向は従来通り速く追従し、閉じる方向はreleaseを遅くして一瞬の0入力で閉じ切らないようにした
- 口が開いた状態から一瞬0が来ても値を保持寄りにする回帰テストを追加した

### Next

- OBS実機で口を開けっぱなしにした時の勝手なパクパクが減ったか確認する
- まだ残る場合は、口系だけ短時間のpeak holdまたはhysteresis state machineへ分離する

## 2026-05-23 Direct Mocap Mouth Mapping

### Goal

- MediaPipeの表情がモデルへ素直に流し込まれていない感触を減らす

### Did

- 口系expressionの解釈を薄くし、`jawOpen` / `mouthStretch` / `mouthFunnel` / `mouthPucker` / `mouthSmile` をVRM表情へより直接マップするようにした
- `aa` は丸口補正で差し引かず、`jawOpen` をそのまま使うようにした
- 口系のdead zoneをかなり小さくし、小さな口の動きも落としすぎないようにした
- 口の閉じ方向releaseを強すぎない程度へ戻し、保持しすぎて不自然になる問題を減らした

### Next

- OBS実機で「口を開けっぱなし」「すぼめ口」「笑顔」の入力が直感に近いか確認する
- まだ違和感がある場合は、VRM visemeを複数同時に入れる方式ではなく、dominant viseme 1つだけを選ぶ方式を試す

## 2026-05-23 Mocap Expression Hold Semantics

### Goal

- MediaPipeモーキャプで「目を閉じたまま」「口を開けたまま」が素直に維持できるようにする

### Did

- blink / mouth 系expressionを、near-zero snapや非対称releaseの対象から外した
- blink / mouth 系はごく小さなdeadbandだけ残し、入力値へ対称に追従するようにした
- 閉眼状態と開口状態が同時に維持されることを単体テストに追加した

### Next

- OBS実機で閉眼キープ、開口キープ、閉眼＋開口の同時入力が維持されるか確認する
- まだ片方が消える場合は、VRM側のexpression override設定や表情preset同士の競合を調べる

## 2026-05-23 OBS Mocap Expression Hold Fix

### Goal

- OBS側だけ、閉眼/ウインク/開口が標準表情へ戻ろうとする問題を抑える

### Did

- Control側ですでに平滑化した表情値を送っているため、OBS Render側では追加の `smoothFaceExpressionWeights` をかけず、受信した表情値をそのまま適用するようにした
- MediaPipeの `faceBlendshapes` が一瞬空になったフレームでは、表情をneutralへ戻さず前回値を保持するようにした

### Next

- OBS実機でウインク保持、閉眼保持、開口保持ができるか確認する
- まだ戻る場合は、VRM expression override / blink表情と他表情の競合、またはRelay送信値のログ表示を追加して調べる

## 2026-05-23 Faster Mocap Face Tracking

### Goal

- OBS側で表情だけ追従性が悪い問題を改善する

### Did

- OBS側の二重smoothは既に外れていたため、Control側でMediaPipe表情を `smoothFaceExpressionWeights` へ通す量を見直した
- 顔モーキャプの表情平滑化を `0.45` から `0.85` へ上げ、blink / mouth が入力へかなり速く追従するようにした

### Next

- OBS実機でウインク、閉眼、開口、口形状変化の追従性を確認する
- まだ遅い場合は、blink / mouth はsmoothを完全に外し、happy / surprisedだけ平滑化する

## 2026-05-23 Lip Sync Off Mouth Reset Fix

### Goal

- 口設定を `オフ` にしても、OBS側で口がぱくぱくする問題を止める

### Did

- `applyMouthOpen()` が `aa` だけを更新していたため、過去の `ih/ou/ee/oh` が残る問題を修正した
- 口系expressionを `aa/ih/ou/ee/oh` まとめて適用・リセットする `applyMouthExpressions()` を追加した
- `口=オフ` の時はControl側表示とRelay送信の両方で口系expressionを必ず0にするようにした
- `口=マイク` の時は `aa` だけを送信し、他の口形状は0にするようにした

### Next

- OBS実機で `口=オフ` の時に `aa/ih/ou/ee/oh` が動かないか確認する
- まだ動く場合はVRM expression presetやVRMA側の口表情上書きを確認する

## 2026-05-23 Relay Motion Freshness Investigation / Fix

### Goal

- Control側では表情が綺麗だが、OBS側だけ標準表情へ戻る/追従が悪い原因を通信方式込みで潰す

### Findings

- WebSocket relayは `motionState` を受けるたび全クライアントへ順序配送していた
- OBS側が一瞬詰まると、古い表情フレームも順番に再生され、ウインク/閉眼/開口が通常表情へ戻るように見える可能性が高い
- Render側のpose補間関数はexpressionも補間していたが、表情はリアルタイム用途なので補間より最新値優先がよい

### Did

- `RelayMotionState` に `sentAt` を追加した
- OBS Render側で古すぎるmotionStateと逆順/重複sequenceを破棄するようにした
- Render側のmotion補間ではexpressionを補間せず、最新stateのexpressionを保持するようにした
- relay serverでmotionState送信先のbufferが詰まっている場合、その古いmotionStateを送らず次の最新motionを待つようにした

### Next

- OBS実機でウインク/閉眼/開口が古い通常表情フレームへ戻らないか確認する
- まだ戻る場合は、expressionStateをmotionStateから分離し、表情だけ最新値coalesce専用channelへ移す

## 2026-05-23 OBS Render Relay Expression Split

### Goal

- OBS側だけ表情が標準へ戻る/追従が悪い問題に対して、OBS Render側のRelay処理を整理する

### Did

- 表情同期を `motionState` から分離し、新しい `expressionState` messageを追加した
- Control側は表情を約60fpsで `expressionState` として送るようにした
- OBS Render側は `expressionState` を受けたらpose補間を待たず即適用するようにした
- OBS Render側は古い/逆順の `expressionState` を破棄するようにした
- `motionState` は引き続きpose同期用として残し、表情は最新値専用channelを優先する形に整理した

### Next

- OBS実機で閉眼/ウインク/開口の保持と追従が改善したか確認する
- まだ戻る場合は、VRM/VRMAのexpression上書き順を調べるため、OBS Render側にdebug overlayで受信expression値と実適用値を表示する
