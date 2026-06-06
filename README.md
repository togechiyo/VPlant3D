# VPlant3D for OBS

VPlant3D for OBS は、OBS Browser Source に読み込んで使う軽量な VRM / VRMA アバターレイヤーです。

> VRM in OBS. Render only. OBS does the broadcast.

OBSが配信、録画、音声ミキシング、コメント表示、シーン切り替えを担当し、VPlant3Dは「OBSに映す3Dアバター」と「その操作」に集中します。

## 概要

VPlant3Dは、VRMアバターをOBSの画面に重ねるための小さなデスクトップ/ブラウザアプリです。

主な機能:

- ローカルの `.vrm` ファイルを読み込んで表示
- OBS向けの透明背景Render URLを生成
- マイク音量に連動した簡易口パク
- 自動まばたき、ゆらぎ、手動マウス操作
- VRM表情プリセットのワンタップ反映
- `.vrma` モーションの読み込みと再生
- カメラ入力による簡易モーキャプ
- マイク / カメラの入力デバイス選択
- Tauri版ControllerとRust製Local Relayの試作

このプロジェクトは、VRMアワード / `#MadeWithVRM` オンラインハッカソン向けの試作です。

## 使い方

詳しい手順は [How to Use](./docs/how-to-use.md) を見てください。

最短の流れ:

1. VPlant3D Controllerを起動する
2. ControllerでVRMを読み込む
3. Controllerに表示されたOBS Render URLをコピーする
4. OBSのBrowser Sourceへ貼る
5. Controllerから表情、口パク、モーション、見た目を操作する

OBSへ貼るURLの例:

```text
http://127.0.0.1:5173/?obs=1&transparent=1
```

## 起動方法

### Web版

```bash
npm install
npm run dev
```

起動後、ブラウザで開きます。

```text
http://127.0.0.1:5173/?control=1
```

`npm run dev` はViteだけでなく、ControllerとOBS RenderをつなぐLocal Relayも起動します。

### Tauri版

```bash
npm run tauri:dev
```

Tauri版はアプリ内でRust製Local Relayを起動し、Controller UIを開きます。OBSにはControllerに表示されたRender URLを貼ってください。

Rust / Cargo がPATHにない場合は、次のようにしてから実行してください。

```bash
export PATH="$HOME/.cargo/bin:$PATH"
npm run tauri:dev
```

配布ビルド:

```bash
npm run tauri:build
```

現状ではGitHub ActionsでmacOS / WindowsのTauri bundle生成まで確認しています。
macOS版は署名 / notarization未対応のため、GitHubからダウンロードしたアプリはGatekeeperで「壊れているため開けません」と表示される場合があります。開発中の確認では次のようにquarantine属性を外してから起動します。

```bash
xattr -dr com.apple.quarantine "/path/to/VPlant3D for OBS.app"
```

正式配布ではApple Developer IDによる署名とnotarizationを別途行う必要があります。

## OBSでの使い方

OBSでBrowser Sourceを追加し、Controllerに表示された推奨URLを貼ります。

推奨:

```text
http://127.0.0.1:<port>/?obs=1&transparent=1
```

OBS側はRender専用です。操作パネル、マイク、カメラ、ファイル選択はController側で行います。

## 開発用コマンド

```bash
npm run test
npm run lint
npm run build
npm run test:e2e
```

Rust / Tauri側:

```bash
cd src-tauri
cargo fmt --check
cargo test
```

## 現在の状態

- Web版Controller / OBS Renderは継続利用可能
- Node版Local RelayはWeb fallbackとして維持
- Tauri版ControllerはRust製Local Relayを起動する試作段階
- macOS / Windows bundleはGitHub Actionsで生成可能
- macOS署名 / notarization、Windows code signing、OBS実機での最終確認は未完了

## ドキュメント

- [How to Use](./docs/how-to-use.md)
- [VPlant3D for OBS concept](./docs/vplant3d-for-obs.md)
- [OBS architecture redesign](./docs/obs-architecture-redesign.md)
- [Tauri Controller technical plan](./docs/tauri-controller-technical-plan.md)
- [Tauri Rust Relay Migration Plan](./docs/tauri-rust-relay-migration-plan.md)
- [Tauri配布ビルド前タスクリスト](./docs/tauri-distribution-readiness-task-list.md)
- [Release Preparation Task List](./docs/release-preparation-task-list.md)
- [Third-party libraries](./docs/third-party-libraries.md)
- [Submission checklist](./docs/submission-checklist.md)
- [Human handoff board](./docs/human-handoff-board.md)
- [Work log](./docs/work-log.md)

## ライセンス

MIT
