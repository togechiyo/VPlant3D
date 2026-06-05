# Submission Checklist

最終更新日: 2026-06-05

## 目的

このドキュメントは、`#MadeWithVRM` 第1回オンラインハッカソンおよびVRMアワードに向けて、VPlant3D for OBSの提出物を確認するためのチェックリストである。

締切直前に慌てないよう、実装・デモ・ドキュメント・権利確認をここに集約する。

提出作業、投稿作業、デモ動画の最終収録は人間が担当する。Codexはアプリ作成、動作確認、実装上必要なドキュメント更新、人力確認事項の記録に集中する。

## 基本情報

- Project name: VPlant3D for OBS
- Short name: VPlant3D
- Tagline: `VRM in OBS. Render only. OBS does the broadcast.`
- Event: `#MadeWithVRM` 第1回オンラインハッカソン
- Period: 2026-05-20 to 2026-06-07
- Target award categories:
  - ツール部門
  - エクスペリエンス部門
- Target canvas size: 1920x1080
- Visual direction: dark neutral gray with light neon green accents

## MVP Feature Checklist

### Must Have

- [x] Vite + TypeScript appとして起動できる
- [x] OBS Browser SourceでURLを読み込める
- [x] `?obs=1` で配信用表示になる
- [x] `?transparent=1` で背景透過できる
- [x] VRMモデルを読み込んで表示できる
- [x] カメラ位置を最低限調整できる
- [x] マイク音量に応じて口が動く
- [x] READMEに起動方法とOBS設定方法がある
- [ ] 1分程度のデモ動画を撮れる状態になっている

### Should Have

- [ ] Look / Shaderプリセットが最低3種類ある
- [x] VRMAファイルを読み込んで再生できる
- [x] VRMAのloop / stopができる
- [ ] Style Wallで簡易背景を作れる
- [ ] Image Panelで画像を3D空間に貼れる
- [x] localStorageに最低限の設定を保存できる
- [x] Tauri Controller shellのscaffoldがある
- [x] Tauri Controllerを開発起動できる

### Could Have

- [ ] MediaPipeで首・胸・肩の簡易追従ができる
- [ ] Text Panelがある
- [x] OBS Mode URLをUIから生成できる
- [x] WebGL fallbackがある
- [ ] サンプル設定プリセットがある

### Explicitly Out Of Scope

- [ ] Electron化しない
- [ ] 動画書き出しを実装しない
- [ ] 音声ミキシングを実装しない
- [ ] コメント取得を実装しない
- [ ] OBSシーン制御を実装しない
- [ ] 高精度フルトラッキングを狙わない
- [ ] VRM / VRMA編集ツール化しない

## Quality Checklist

- [x] `npm run test` が通る
- [x] `npm run build` が通る
- [x] lint導入後は `npm run lint` が通る
- [ ] Chromeで表示確認済み
- [ ] Chromeでconsole errorがない、または既知の制限として記録済み
- [ ] OBS Browser Sourceで表示確認済み
- [ ] 透明背景をOBSで確認済み
- [x] マイク権限と口パク動作を確認済み
- [x] VRM読み込み失敗時のユーザー向け表示がある
- [ ] 主要な制限事項がREADMEまたはdocsに書かれている

## Documentation Checklist

- [x] READMEに概要がある
- [x] READMEに起動方法がある
- [x] READMEにOBS Browser Source設定方法がある
- [x] READMEに対応機能と非対応機能がある
- [ ] READMEにデモ動画またはスクリーンショットへの導線がある
- [ ] READMEに使用ライブラリ概要がある
- [ ] `docs/third-party-libraries.md` が更新されている
- [x] `docs/human-handoff-board.md` の未対応項目を確認した
- [x] `docs/work-log.md` が提出直前の状態に更新されている
- [x] Tauri版の開発起動手順をREADMEに追記した

## Rights / Assets Checklist

- [ ] デモに使うVRMモデルのライセンスを確認した
- [ ] VRMモデル作者名を記録した
- [ ] スクリーンショット・動画投稿可否を確認した
- [ ] 使用画像のライセンスを確認した
- [ ] サンプル音声やBGMを使う場合はライセンスを確認した
- [ ] READMEまたは投稿文に必要なクレジットを記載した
- [ ] 再配布できない素材をリポジトリに含めていない

## Demo Checklist

1分デモで伝える内容:

- [ ] OBS Browser Sourceとして読み込む
- [ ] VRMが表示される
- [ ] 背景透過で配信画面に重ねられる
- [ ] マイクに反応して口が動く
- [ ] Lookプリセットで見た目が変わる
- [ ] Style Wall / Image Panelで配信部屋風になる
- [ ] VRMAで短いモーションを再生する
- [ ] 「配信・録画・音声はOBSに任せる」と説明する

デモ収録前:

- [ ] Chromeで動作確認済み
- [ ] OBSで動作確認済み
- [x] Tauri Controllerで起動確認済み
- [ ] 画面サイズを決めた
- [ ] 背景透過または合成先を決めた
- [ ] 見せる順番を決めた
- [ ] 音声・マイク入力を確認した
- [ ] 使用モデル・画像の権利確認済み

## #MadeWithVRM Submission Checklist

- [ ] `#MadeWithVRM` 特設サイトへ登録するURLを決めた
- [ ] GitHub URLを用意した
- [ ] デモ動画URLを用意した
- [ ] スクリーンショットを用意した
- [ ] 投稿文を用意した
- [ ] 使用素材のクレジットを用意した
- [ ] ハッシュタグ `#MadeWithVRM` を入れた
- [ ] ツール部門向けの説明がある
- [ ] エクスペリエンス部門向けの説明がある

## Draft Submission Text

```text
VPlant3D for OBS is a lightweight VRM / VRMA 3D avatar layer for OBS Browser Source.

It lets streamers place a VRM avatar directly inside OBS with transparent background support, microphone-reactive mouth movement, quick visual presets, and simple streaming-room elements.

The concept is simple:
VRM in OBS. Render only. OBS does the broadcast.

#MadeWithVRM
```

日本語版:

```text
VPlant3D for OBSは、OBS Browser Sourceに直接読み込める軽量VRM / VRMA 3Dアバターレイヤーです。

配信・録画・音声ミキシングはOBSに任せ、VPlant3DはVRMアバターの3D表示、背景透過、マイク音量連動くちパク、Lookプリセット、簡易配信部屋づくりに集中します。

VRM in OBS. Render only. OBS does the broadcast.

#MadeWithVRM
```

## Freeze Plan

- 2026-06-04: 新しい大機能の追加を原則停止
- 2026-06-05: バグ修正、README、提出文、デモ動画、スクリーンショットに集中
- 2026-06-06: 最終確認、権利表記、投稿準備
- 2026-06-07: 提出作業、最終動作確認のみ
