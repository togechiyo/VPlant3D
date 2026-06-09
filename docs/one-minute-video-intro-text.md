# VPlant3D for OBS 1分紹介動画テキスト案

作成日: 2026-06-09

用途: VRMアワード / `#MadeWithVRM` 向けの1分紹介動画、PowerPoint流し込み用。

前提: 音声なし。画面上のテキストだけで伝える。

## 全体構成

- 0:00-0:07 タイトル
- 0:07-0:15 概要
- 0:15-0:27 使い方
- 0:27-0:40 機能
- 0:40-0:50 技術
- 0:50-0:57 開発方式
- 0:57-1:00 締め

## 1. タイトル

### 画面テキスト

VPlant3D for OBS

OBSに直接のせるための

軽量VRMアバターレイヤー

配信画面にVRMアバターを重ね、

操作は別ウィンドウから行います。

`#MadeWithVRM`

## 2. 概要

### 画面テキスト

VRMアバターを

OBS Browser Sourceに表示するアプリです

配信、録画、音声ミキシング、

コメント表示、シーン切り替えはOBSへ。

VPlant3Dはアバター表示と操作に集中

OBSのワークフローを置き換えず、

今ある配信環境にVRMレイヤーを追加します。

## 3. 使い方

### 画面テキスト

使い方は4ステップ

1. VPlant3Dを起動
2. VRMを読み込む
3. OBS Render URLをコピー
4. OBSのBrowser Sourceに貼る

操作画面と配信画面は分離

OBSにはアバターだけを表示

Controller側でVRM、表情、口パク、

位置調整、モーションを操作します。

OBS側はRender専用なので、

配信画面に操作UIは映りません。

## 4. 機能

### 画面テキスト

配信向けの基本機能

- 透明背景でOBSに合成
- マイク音量で口パク
- 自動まばたき
- 表情プリセット
- マウス手動操作
- VRMA再生
- カメラ簡易モーキャプ

カメラを使わない配信にも対応しつつ、

必要ならカメラ入力で顔や上半身も動かせます。

VRMAは短いモーション演出や、

VRMアワード向けのデモ要素として使えます。

## 5. 2つの操作モード

### 画面テキスト

マイク&手動モード

- カメラなしで使える
- 口パク、表情、マウス操作
- 自動まばたきと少しの揺らぎ

カメラモード

- 顔と上半身の簡易トラッキング
- カメラ画像は表示しない

顔出しを避けたい配信者でも使えるよう、

カメラプレビューは表示せず、

必要なトラッキング情報だけを使います。

うまく動かない実験機能は隠し、

デモで安定する操作を優先しました。

## 6. 技術紹介

### 画面テキスト

Web技術でOBSへ接続

- TypeScript
- Three.js
- @pixiv/three-vrm
- @pixiv/three-vrm-animation
- MediaPipe
- Tauri
- Rust Local Relay

ControllerとOBS Renderを

ローカル通信で接続

VRM表示はThree.jsとthree-vrm、

VRMA再生はthree-vrm-animationを利用。

Tauri版ではRust製Local Relayを同梱し、

手動でサーバーを立てずに使える形を目指しました。

## 7. 開発方式

### 画面テキスト

Codex主導で短期開発

- 小さく実装
- テストで確認
- OBS実機で確認
- 試行錯誤をdocsに記録
- Web版fallbackを維持

ハッカソン向けに

デモ安定性を優先

うまくいかなかった実装もdocsに残し、

後から判断を追えるようにしました。

特にOBS Browser Sourceとの接続、

表情同期、Tauri配布まわりは

試行錯誤しながら安定化しました。

## 8. その他 / こだわり

### 画面テキスト

OBSを置き換えない

OBSの配信ワークフローに

VRMレイヤーを追加するための道具

Windows portable版も用意

ローカルVRMをその場で読み込み

配布物は軽量なportable zipを用意。

VRMファイルはユーザーの手元で読み込み、

アプリ内部のローカル通信でOBS表示へ渡します。

「VRMをOBSに載せる」までの手数を

できるだけ少なくすることを目指しました。

## 9. 締め

### 画面テキスト

VPlant3D for OBS

VRMを、もっと気軽にOBSへ

配信はOBSに任せる。

VPlant3DはVRMを表示する。

VRM in OBS.

Render only.

OBS does the broadcast.

`#MadeWithVRM`

## さらに短い版

### 画面テキスト

VPlant3D for OBS

OBS Browser Sourceで使える

軽量VRMアバターレイヤー

VRMを読み込む

OBS URLを貼る

マイク口パク、表情、VRMA、簡易モーキャプ

Tauri + Rust Local Relayで

デスクトップアプリ化

VRMを、もっと気軽にOBSへ

`#MadeWithVRM`
