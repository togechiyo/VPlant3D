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
