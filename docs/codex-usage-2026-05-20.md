# Codex活用メモ 2026-05-20

最終確認日: 2026-05-20

## 目的

VPlant3D for OBSは、2026年5月20日から6月7日まで開催される `#MadeWithVRM` 第1回オンラインハッカソンに向けた短期開発プロジェクトである。

開発期間が2週間ちょっとしかないため、Codexを単なる補助ではなく、実装・調査・検証・ドキュメント整備の主担当として使う前提で運用する。

このメモでは、2026年5月20日時点で公式情報から確認できるCodexの能力と、VPlant3Dでの使い方を整理する。

## 公式情報から確認したCodexの位置づけ

OpenAIの公式説明では、Codexはコードを書き、レビューし、出荷するためのAIエージェントである。

Codexは以下のような作業を担当できる。

- コードベースを読み、理解する
- ファイルを編集する
- コマンドを実行する
- テストやビルドを走らせる
- バグ修正、機能追加、リファクタ、移行作業を進める
- GitHub連携により、リポジトリで作業し、PR作成まで進める
- 複数タスクを背景で並列実行する

公式ドキュメントでは、Codex webはクラウド上の独自環境でバックグラウンド作業でき、GitHubアカウントを接続するとリポジトリ作業やプルリクエスト作成ができると説明されている。

## 利用できる主な作業面

Codexは複数の作業面を持つ。

| 作業面 | 使いどころ |
| --- | --- |
| Codex app | 複数プロジェクト・複数スレッドを並行して進めるデスクトップ作業場 |
| Codex CLI | ターミナルでリポジトリを読み、編集し、コマンド実行する対話型作業 |
| IDE Extension | エディタで開いているファイル文脈と同期しながら相談・実装する |
| Codex web / cloud | GitHub連携されたリポジトリで、クラウド環境にタスクを委譲する |

今回のVPlant3Dでは、まずローカルのCodex app / CLIを中心に進める。GitHub側で独立した調査やPR単位の作業が必要になったら、Codex web / cloudやワークツリー利用を検討する。

## Codex appで使える機能

公式のCodex app機能ページでは、以下が確認できる。

- 複数プロジェクトを1つのアプリ内で扱える
- スキルを利用できる
- Automationsで定期作業を実行できる
- Local / Worktree / Cloud のモードを選べる
- Git diffの確認、ステージ、コミット、プッシュ、PR作成ができる
- Git worktreeで作業を分離できる
- 統合ターミナルでテスト、lint、ビルド、Git操作を実行できる
- in-app browserでローカル開発サーバーや公開ページをプレビューできる
- browser commentで画面上の特定箇所へフィードバックを付けられる
- Computer UseによりmacOSアプリなどGUI操作が必要な作業を補助できる
- PDF、スプレッドシート、ドキュメント、プレゼンなどの非コード成果物も扱える
- thread automationで、同じスレッド文脈を保ったまま定期的に続きを実行できる

VPlant3Dでは、特に以下が重要になる。

- in-app browserでフロントエンドの見た目を確認する
- 統合ターミナルで `npm run lint`、`npm run test`、`npm run build` を実行する
- Git diffを見ながら小さくコミットする
- Worktreeで実験的なWebGPU / VRM / VRMA作業を分離する
- Automationsで「毎朝未完了タスクとリスクを整理する」などを回す

## Chrome拡張機能

Codex Chrome extensionは、CodexがユーザーのChromeを使ってブラウザタスクを実行するための拡張機能である。

公式ドキュメントでは、Chrome拡張はログイン済みブラウザ状態が必要なサイト、たとえばLinkedIn、Salesforce、Gmail、社内ツールなどで使うものとして説明されている。一方で、ローカル開発サーバー、ファイルプレビュー、ログイン不要の公開ページでは、まずCodexのin-app browserを使うことが推奨されている。

今回の環境では、ユーザーがCodexのChrome使用を許可済みで、Chrome拡張機能も導入済みである。OBS Browser SourceはChromium系であるため、Google Chromeでの確認はOBSでの挙動に比較的近い確認手段として扱える。そのため、VPlant3Dでは以下のように使い分ける。

| 確認対象 | 推奨ブラウザ |
| --- | --- |
| 通常のlocalhost表示確認 | in-app browserまたはChrome拡張 |
| 実際のChromeでの表示差分確認 | Chrome拡張 |
| WebGPU / WebGL挙動確認 | Chrome拡張 |
| マイク・カメラ権限確認 | Chrome拡張 |
| DevToolsでのconsole / network確認 | Chrome拡張 |
| OBS Browser Source固有の最終確認 | OBS本体 |

VPlant3DはOBS Browser Source向けアプリだが、開発中の実装確認ではChromeが重要になる。理由は以下。

- Three.js / WebGPU / WebGLの挙動を実ブラウザで確認できる
- マイク・カメラ権限の挙動を実際のChromeプロファイルで確認できる
- DevToolsでconsole errorやnetwork errorを確認できる
- canvas、透明背景、アニメーション、パフォーマンスを観察しやすい
- 将来的にGitHub、`#MadeWithVRM`、ドキュメント投稿などログイン済みサイトを扱う場合にも使える

ただし、Chrome拡張は強い権限を持つ。公式ドキュメントでは、Chrome側の権限として、ページデバッガーへのアクセス、すべてのWebサイト上のデータの読み取り・変更、閲覧履歴、通知、ブックマーク、ダウンロード、ネイティブアプリ連携、タブグループ管理などが表示される場合があると説明されている。

そのため、Chrome利用時は以下を守る。

- Codexに触らせるサイトを必要最小限にする
- 新しいホストへのアクセス許可は内容を確認してから許可する
- ブラウザ履歴や秘密情報を不用意に文脈へ入れない
- ログイン済みサイトでの操作は、ユーザーが見ている状態で行う
- VPlant3Dの通常開発確認では、まずlocalhostとDevTools用途に限定する

トラブル時は、Chrome拡張がConnectedになっているか、Codex側のChrome pluginが有効か、同じChromeプロファイルに拡張が入っているかを確認する。

## サブエージェント

公式ドキュメントによると、Codexは明示的に依頼された場合に、専門化したサブエージェントを並列起動できる。

サブエージェントが有効な場面は以下。

- コードベース探索
- 調査
- テストログ分析
- レビュー
- 複数観点からのリスク洗い出し
- 大きな機能計画の分割実装

ただし、サブエージェントは自動では起動されない。ユーザーが「サブエージェントを使って」「並列で委譲して」など明示した場合に使う。また、各サブエージェントは独自にモデルとツールを使うため、単一エージェントよりトークン消費が増える。

VPlant3Dでは、サブエージェントを以下のように使う。

| サブエージェント用途 | 例 |
| --- | --- |
| 調査 | Three.js WebGPU RendererがOBS Browser Sourceで使えるか調べる |
| API確認 | `@pixiv/three-vrm` のExpression制御、VRMA再生方法を調べる |
| 設計レビュー | `src/render` と `src/vrm` の責務分離をレビューする |
| 実装分担 | `audio`、`obs`、`ui` など書き込み範囲を分けて進める |
| 検証 | Playwrightやブラウザ確認で表示崩れ・透明背景を確認する |
| ドキュメント | README、提出文、`#MadeWithVRM` 投稿文を整える |

サブエージェント運用の基本は、`AGENTS.md` に記載した通り、1エージェント1目的、書き込み範囲の分離、最終統合は親エージェントが行う、で進める。

## /goal

`/goal` は、Codexに長時間作業のための持続的な目的を与えるためのCLI slash commandである。

公式のユースケースページでは、`/goal` は「Codexに複数ターンにわたって作業を続けさせ、検証可能な停止条件に向かわせたい場合」に使うものとして説明されている。コード移行、大きなリファクタ、デプロイのリトライループ、実験、ゲーム、サイドプロジェクトのように、明確な成功条件と検証ループがある作業に向いている。

Codex CLIの公式slash commandページでは、`/goal` は実験的機能であり、`features.goals` が有効な場合に使えると説明されている。有効化は `/experimental` から行うか、`config.toml` の `[features]` に `goals = true` を追加する。

基本操作:

| Command | Meaning |
| --- | --- |
| `/goal <objective>` | goalを設定する |
| `/goal` | 現在のgoalを表示する |
| `/goal pause` | goalを一時停止する |
| `/goal resume` | goalを再開する |
| `/goal clear` | goalを削除する |

公式ドキュメントでは、goal本文は空でなく、最大4,000文字までとされている。長い指示はファイルに書いて、そのファイルをgoalから参照するのがよい。

### VPlant3Dでの使いどころ

VPlant3Dでは、`/goal` は「今日の大きな到達点」をCodexに持たせる用途で使う。

向いている作業:

- Vite + TypeScript + Three.jsの最小構成を完成させる
- WebGPU / WebGL fallbackを調査し、動く最小描画まで持っていく
- VRM読み込みから表示までを作る
- マイクRMS取得から口Expression反映までを作る
- VRMA読み込み・再生を最小実装する
- 1分デモに必要なREADME / docs / スクリーンショット準備を整える

向いていない作業:

- 方向性がまだ曖昧な企画相談
- 見た目の好みの決定
- VRMモデルや素材の権利判断
- OBS本体やMediaPipeカメラ確認など人間の実機操作が必要な作業
- 関係の薄い複数タスクの寄せ集め

### 良いgoalの条件

公式ドキュメントでは、良いgoalは「1つのプロンプトより大きく、無制限のバックログより小さい」ものだと説明されている。VPlant3Dでは以下を必ず含める。

- 1つの目的
- 明確な停止条件
- 先に読むファイル
- 実行すべき検証コマンド
- 進捗ログの残し方
- 触ってよい範囲、触らない範囲
- 人力が必要になった場合の `docs/human-handoff-board.md` への記録

### VPlant3D用goal例

初回の実装基盤:

```text
/goal Implement the first Vite + TypeScript + Three.js foundation for VPlant3D. Read AGENTS.md, docs/vplant3d-for-obs.md, and docs/third-party-libraries.md first. Stop when npm scripts for lint, test, and build exist, the app shows a minimal Three.js scene in Chrome, and README/docs mention how to run it. Keep changes scoped to project setup and minimal rendering.
```

OBS透明背景:

```text
/goal Implement OBS Mode and transparent background support. Read AGENTS.md and docs/vplant3d-for-obs.md first. Stop when ?obs=1 hides setup UI, ?transparent=1 renders the canvas with transparent background in Chrome, and the behavior is documented. Do not add VRM loading yet.
```

マイクくちパク:

```text
/goal Implement microphone RMS analysis for Mic Reactive Mouth. Read AGENTS.md and docs/vplant3d-for-obs.md first. Stop when a pure RMS/smoothing module has tests, Chrome can request microphone permission, and the setup UI shows a normalized mouth value. If human microphone confirmation is required, record it in docs/human-handoff-board.md.
```

VRM読み込み:

```text
/goal Implement minimal VRM loading and display using @pixiv/three-vrm. Read AGENTS.md, docs/third-party-libraries.md, and official @pixiv/three-vrm docs first. Stop when a user can load a local VRM file, see it in the Three.js scene, and build/test pass. Do not add VRMA or MediaPipe in this goal.
```

VRMA再生:

```text
/goal Implement minimal VRMA loading and playback. Read AGENTS.md, docs/vplant3d-for-obs.md, and official @pixiv/three-vrm-animation docs first. Stop when a loaded VRM can play one VRMA motion, loop/stop controls exist in Setup Mode, and limitations are documented.
```

### 運用メモ

- `/goal` は長時間自走用なので、開始前に停止条件を曖昧にしない
- goal中でも、人力が必要なものはHuman Handoff Boardへ逃がす
- goalが広がりすぎたら `/goal pause` して、次の小さいgoalに切り直す
- goal完了後は `git diff`、テスト、ブラウザ確認、必要なら `/review` を行う
- Codex appではgoalはpreview扱いなので、挙動が不安定な場合は通常のタスク分割とサブエージェント運用に戻す

## AGENTS.md

Codexは作業前に `AGENTS.md` を読み、グローバル設定とプロジェクト固有設定を組み合わせて指示として扱う。

公式ドキュメントでは、Codexは以下の順で指示ファイルを発見・結合すると説明されている。

- Codex home配下のグローバル `AGENTS.md` または `AGENTS.override.md`
- プロジェクトルートから現在ディレクトリまでの `AGENTS.md` または `AGENTS.override.md`
- より深いディレクトリの指示ほど後に結合され、前の指示を上書きしやすい

このリポジトリにはすでに [AGENTS.md](../AGENTS.md) を置いている。今後のCodex作業では、ここをプロジェクトの運用憲法として扱う。

## 権限とサンドボックス

Codexには、ローカルコマンドのファイルシステム・ネットワークアクセスを制限する権限プロファイルがある。

公式ドキュメントでは、組み込みプロファイルとして以下が説明されている。

- `:read-only`: ローカルコマンド実行を読み取り専用に保つ
- `:workspace`: アクティブなワークスペース内での書き込みを許可する
- `:danger-full-access`: ローカルのサンドボックス制限を外す

VPlant3Dでは、通常はワークスペース内の作業に閉じる。依存追加、ネットワーク調査、Git pushなど、外部影響がある操作は意図を明確にする。

## Automations

Codex appではAutomationsにより、定期的なバックグラウンドタスクを実行できる。

公式ドキュメントでは、Automationsは結果をinboxに追加し、報告することがなければ自動アーカイブされると説明されている。また、Gitリポジトリではローカルプロジェクトまたは専用worktreeで実行できる。

VPlant3Dで使うなら、以下が候補になる。

- 毎朝、未完了タスク・ビルド状況・リスクを整理する
- 毎晩、READMEとdocsの更新漏れを確認する
- ハッカソン締切前に提出チェックリストを確認する
- GitHub IssuesやTODOコメントを定期的に棚卸しする

ただし、ハッカソン序盤は手動で高速に進め、繰り返し作業が見えてからAutomation化する。

## VPlant3Dでの実務運用

2週間ちょっとの短期開発では、以下の運用にする。

### 1. 親エージェント主導

親エージェントは、ユーザーの意図、企画、スコープ、進捗、最終判断を保持する。

主な担当:

- 今日やるタスクの選定
- 実装順の判断
- サブエージェントへの委譲
- 結果の統合
- Git操作
- README / docs更新
- デモ可能状態の維持

### 2. 小さなタスクに分ける

大きな依頼をそのまま実装しない。

例:

- TASK-001: Vite + TypeScript + Three.jsの最小構成
- TASK-002: 透明背景OBSモード
- TASK-003: マイクRMS取得
- TASK-004: 音量値を口Expressionへ反映
- TASK-005: VRM読み込み
- TASK-006: Lookプリセット
- TASK-007: VRMA再生
- TASK-008: Style Wall
- TASK-009: Image Panel

### 3. 毎回確認する

実装ごとに以下を確認する。

- `npm run lint`
- `npm run test`
- `npm run build`
- ブラウザ表示
- 可能ならOBS Browser Sourceでの表示

ブラウザ表示確認では、まずin-app browserで素早く確認し、描画・権限・DevTools確認が必要な場合はChrome拡張を使う。特にWebGPU、WebGL、マイク入力、カメラ入力、透明背景、canvas描画に触れた変更では、OBSに近いChromium系確認としてChromeでの確認を優先する。

Codexだけでは確認できない作業、たとえばOBS本体でのBrowser Source確認、MediaPipeのカメラ入力確認、デモ用VRMモデルの権利確認、デモ動画収録などは、[Human Handoff Board](./human-handoff-board.md) に記録する。

まだ `package.json` がない段階では、作成後に確認コマンドをREADMEとAGENTS.mdに反映する。

### 4. 実験は分離する

WebGPU、VRMA、MediaPipe、透明背景ポストエフェクトは詰まりやすい。実験はworktreeまたは明確なブランチで分離し、mainには動く版を残す。

### 5. docsを軽く更新し続ける

短期開発では、記憶よりメモが強い。

以下をdocsに残す。

- 技術判断
- ハマった点
- 動いた構成
- 動かなかった構成
- 提出時に使える説明文
- スクリーンショットやデモで見せる流れ

## VPlant3DでCodexに任せる作業

Codex主導で進める作業:

- 実装タスク分割
- Vite / TypeScript / Three.js構成
- VRM / VRMAライブラリ調査
- Web Audio APIのRMS処理
- OBS向けURL query設計
- Setup Mode / OBS ModeのUI設計
- Style Wall / Image Panelの最小実装
- テスト追加
- README / docs更新
- Gitコミット、必要ならPR作成

ユーザー判断が必要な作業:

- 企画の最終方向性
- 見た目の好み
- 提出時の見せ方
- 使用するVRMモデル・素材の選定と権利確認
- ハッカソン投稿文の最終確認

## 参考リンク

- [Codex公式ページ](https://openai.com/codex/)
- [Codex web / cloud documentation](https://developers.openai.com/codex/cloud)
- [Codex app features](https://developers.openai.com/codex/app/features)
- [Codex Chrome extension](https://developers.openai.com/codex/app/chrome-extension)
- [Codex workflows](https://developers.openai.com/codex/workflows)
- [Codex use case: Follow a goal](https://developers.openai.com/codex/use-cases/follow-goals)
- [Codex CLI slash commands](https://developers.openai.com/codex/cli/slash-commands)
- [AGENTS.md documentation](https://developers.openai.com/codex/guides/agents-md)
- [Codex subagents](https://developers.openai.com/codex/subagents)
- [Codex permissions](https://developers.openai.com/codex/permissions)
- [Codex automations](https://developers.openai.com/codex/app/automations)
