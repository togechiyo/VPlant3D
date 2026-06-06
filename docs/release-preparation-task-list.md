# Release Preparation Task List

作成日: 2026-06-06

## 目的

VPlant3D for OBSをハッカソン提出・GitHub公開・配布ビルドへ進めるために、main更新、タグ、GitHub Release、GitHub Actions、ビルド成果物、提出前確認のタスクを洗い出す。

締切が近いため、理想的な配布自動化よりも「壊れないmain」「再現できるbuild」「提出に使えるrelease」を優先する。

## 現状

- 作業ブランチ: `codex/vite-foundation`
- `main` はまだ最新状態ではない可能性が高い
- Web版は `npm run dev` でNode relayつき起動できる
- Tauri版はRust relay prototypeを持つ
- macOS `.app` 生成までは確認済み
- DMG作成は `bundle_dmg.sh` で失敗中
- Windows buildは未確認
- `.github/workflows/` はまだ存在しない
- README / HowToUseは整備中

## リリース方針

### 推奨リリース単位

- `v0.1.0-hackathon` または `v0.1.0`
- ハッカソン提出用の初回公開版
- 完成品ではなく、MVP / prototype releaseとして明記する

### 守るもの

- Web版Controller / OBS Renderが動く
- Node relay fallbackが動く
- Tauri版が起動できる、または未解決点がREADMEに明記されている
- OBS Browser Source用URLがREADME / HowToUseにある
- local-assetsや権利未確認素材を含めない
- mainはテスト済みの状態にする

### 切ってよいもの

- Windows配布build
- DMG自動作成
- code signing / notarization
- 高度なGitHub Actions matrix
- Tauri自動release添付

## Phase 1: main更新前の整理

- [ ] 作業ツリーを確認する
- [ ] README / HowToUse / work-logの未コミット差分を確認する
- [ ] `local-assets/` がstageされていないことを確認する
- [ ] `npm run test`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run test:e2e`
- [ ] `cargo fmt --check`
- [ ] `cargo test`
- [ ] 必要なら `npm run tauri:dev` を起動確認する
- [ ] 可能なら `npm run tauri:build` を再確認する
- [ ] DMG失敗が続く場合は既知の制限としてREADME / HowToUse / human handoffに残す
- [ ] ここまで通ったら作業ブランチをcommit / pushする

## Phase 2: mainへ反映する

選択肢:

- GitHub PRを作ってmergeする
- ローカルで `main` へmergeしてpushする

推奨:

- 可能ならPRを作り、差分を見てからmergeする
- 締切が厳しければローカルmergeでもよいが、merge前後で確認コマンドを通す

タスク:

- [ ] `git fetch`
- [ ] `main` の最新状態を確認する
- [ ] `codex/vite-foundation` の差分を確認する
- [ ] PRを作る、またはローカルmerge方針を決める
- [ ] mainへmergeする
- [ ] mainで `npm run test`
- [ ] mainで `npm run lint`
- [ ] mainで `npm run build`
- [ ] mainで `npm run test:e2e`
- [ ] mainで `cargo test`
- [ ] mainをpushする

## Phase 3: GitHub Actionsを追加する

### 最小CI

まずはPR / pushでWeb側が壊れていないことを見る。

候補ファイル:

- `.github/workflows/ci.yml`

内容:

- checkout
- setup-node
- npm ci
- npm run test
- npm run lint
- npm run build
- Playwright install
- npm run test:e2e

注意:

- PlaywrightはCI時間が重い場合がある
- 締切前にCIが不安定なら、E2Eを別workflowまたは手動workflowに分ける

### Tauri build workflow

候補ファイル:

- `.github/workflows/tauri-build.yml`

内容:

- workflow_dispatch
- tag push時に起動
- macOS runnerでTauri build
- Windows runnerは余裕があれば
- build artifactとして `.app` / `.dmg` / `.msi` / `.exe` を保存

注意:

- macOS DMGがローカルで失敗しているため、最初はartifact保存までを目標にする
- code signing / notarizationなしでは警告が出る
- WindowsはWebView2と署名の確認が必要

### Release workflow

候補:

- `softprops/action-gh-release`
- `tauri-apps/tauri-action`

短期推奨:

- まずは手動でGitHub Releaseを作る
- ActionsはCIとartifact buildまで
- 自動Release添付は、macOS DMG問題が解決してから

## Phase 4: タグとGitHub Release

タスク:

- [ ] release対象commitをmainで決める
- [ ] `package.json` と `src-tauri/tauri.conf.json` のversionを決める
- [ ] `CHANGELOG.md` を作るか、Release Notesを直接書く
- [ ] tag名を決める
  - 候補: `v0.1.0-hackathon`
  - 候補: `v0.1.0`
- [ ] `git tag -a v0.1.0-hackathon -m "VPlant3D hackathon release"`
- [ ] `git push origin v0.1.0-hackathon`
- [ ] GitHub ReleaseをDraftで作る
- [ ] README / HowToUse / Submission Checklistへのリンクを入れる
- [ ] 既知の制限を書く
- [ ] 配布物を添付するか決める

## Phase 5: Release成果物

最低限:

- [ ] GitHub source code archive
- [ ] README
- [ ] HowToUse
- [ ] デモ動画URL
- [ ] スクリーンショット

できれば:

- [ ] macOS `.app` zip
- [ ] macOS DMG
- [ ] Windows app / installer

今回は切ってよい:

- [ ] 署名済みmacOS DMG
- [ ] notarized macOS app
- [ ] 署名済みWindows installer

## Phase 6: 提出前チェック

- [ ] GitHub repositoryが公開状態か確認する
- [ ] READMEがGitHub上できれいに表示される
- [ ] HowToUseがGitHub上できれいに表示される
- [ ] ReleaseがDraftまたは公開済み
- [ ] デモ動画URLを用意する
- [ ] スクリーンショットを用意する
- [ ] VRMモデル利用条件を確認する
- [ ] 使用素材のクレジットを用意する
- [ ] `#MadeWithVRM` 投稿文を確認する
- [ ] Web版起動手順が再現できる
- [ ] Tauri版を使う場合は `.app` 起動確認済み
- [ ] OBS Browser Sourceで透明背景を確認する

## GitHub Actions実装順

おすすめ順:

1. `ci.yml` で `npm run test` / `lint` / `build`
2. `ci.yml` にPlaywright E2Eを追加
3. `tauri-build.yml` を手動workflowとして追加
4. macOS artifactを保存
5. Windows artifactを追加
6. tag pushでworkflow起動
7. GitHub Releaseへartifact添付

締切前に止めるなら、1と2だけでも価値がある。

## Release Notes案

```text
VPlant3D for OBS v0.1.0-hackathon

初回ハッカソン向けMVPリリースです。

主な機能:
- OBS Browser Source向けVRM表示
- 透明背景Render URL
- マイク音量連動の簡易口パク
- 自動まばたき / 表情プリセット / 手動マウス操作
- VRMA読み込み・再生
- Web Controller + Local Relay
- Tauri Controller + Rust Local Relay prototype

既知の制限:
- macOS DMG作成は未解決
- Windows buildは未確認
- カメラモーキャプは実験機能
- ハンド/腕トラッキングは提出デモでは非推奨
- 署名 / notarizationは未対応
```

## 次のGoal案

```text
/goal Prepare VPlant3D release infrastructure for the hackathon release. Read AGENTS.md, docs/work-log.md, docs/release-preparation-task-list.md, docs/submission-checklist.md, docs/tauri-distribution-readiness-task-list.md, docs/how-to-use.md, and README.md first. Keep Web fallback and Tauri Rust relay behavior unchanged. Add minimal GitHub Actions CI for npm test/lint/build and Playwright E2E if stable. Add a manual Tauri build workflow if feasible. Update README/docs with release limitations. Run npm run test, npm run lint, npm run build, npm run test:e2e, cargo fmt --check, and cargo test. Do not tag or publish a GitHub Release unless explicitly requested. Commit and push when done.
```
