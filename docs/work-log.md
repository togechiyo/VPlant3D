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
