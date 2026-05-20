# VPlant3D for OBS

## 概要

VPlant3D for OBS は、OBS Browser Source に直接読み込める、VTuber 向けの軽量 VRM / VRMA 3D アバターレイヤーである。

録画、配信、音声ミキシング、字幕、コメント表示、画面レイアウトは OBS 側に任せ、本ツールは VRM アバターの 3D 表示、簡易モーション、くちパク、見た目づくり、配信部屋風の演出に集中する。

キャッチコピー:

`VRM in OBS. Render only. OBS does the broadcast.`

## 位置づけ

VPlant3D for OBS は、全部入りの VTuber 配信ソフトではない。

既存の OBS 配信環境に追加するための、HTML / WebGPU / Three.js ベースの軽量 3D 表現レイヤーである。

配信者は OBS の Browser Source に VPlant3D for OBS を読み込むことで、VRM アバターを背景透過のまま配信画面へ重ねたり、簡易 3D 部屋の中に配置したりできる。

## 背景

VRM コンソーシアム公式ハッカソン向けの作品として構想した。

初回公式ハッカソンであるため、単なる VRM 表示デモではなく、VRM / VRMA を実際の配信ワークフローに接続する実用的な提案を目指す。

競合として既存の VTuber 配信ツールや BOOTH 配布ツールが想定されるため、正面から全部入りアプリを作るのではなく、OBS Browser Source に特化した「差し込める 3D アバターレイヤー」として差別化する。

## 基本思想

### 1. OBS に任せるものは OBS に任せる

VPlant3D for OBS は動画書き出し機能を持たない。

録画、配信、音声ミキシング、BGM、字幕、コメント、配信レイアウト、シーン切替、エンコードは OBS 側に任せる。

MMD_modoki では PNG / WebM 出力や MediaBunny による動画書き出しを扱っていたが、VPlant3D for OBS では不要とする。MMD_modoki は Electron 製のローカル編集ツールとして、PMX / PMD、VMD、音声、背景、LUT、WebM 出力などを扱う構成だった。 

### 2. 3D 表現だけに集中する

担当する範囲は以下に限定する。

- VRM アバター表示
- VRMA モーション読み込み・再生
- マイク音量連動くちパク
- MediaPipe による簡易上半身トラッキング
- 背景透過表示
- 簡易 3D 配信部屋
- Style Wall
- Image Panel
- Look / Shader プリセット

### 3. 背景透過を重視する

OBS Browser Source に背景透過のまま表示できれば、グリーンバックやクロマキー処理が不要になる。

そのため、VPlant3D for OBS では「3D のまま透過で OBS に乗せる」ことを重要な価値とする。

透過モードでは、ポストエフェクトよりもシェーダー / ライティング / マテリアル設定による絵作りを優先する。

## 開発スタック

MMD_modoki から Electron と Babylon.js と動画書き出し系を抜き、Three.js / VRM 向けの Web 構成に寄せる。

想定スタック:

- TypeScript
- Vite
- Vitest
- Three.js
- Three.js WebGPU Renderer
- @pixiv/three-vrm
- @pixiv/three-vrm-animation
- MediaPipe Tasks Vision
- Web Audio API
- OBS Browser Source
- localStorage / JSON config

## 主要機能

### 1. VRM 読み込み

VRM モデルを読み込み、OBS Browser Source 内で表示する。

必須機能:

- VRM ファイル読み込み
- アバター表示
- カメラ位置調整
- OBS モードで UI 非表示
- 背景透過表示

### 2. 背景透過表示

背景なしで VRM のみを表示できるモード。

用途:

- ゲーム画面の上にアバターを重ねる
- 作業画面の隅にアバターを配置する
- 配信レイアウトは OBS 側で組む
- グリーンバックやクロマキーを不要にする

モード例:

`?obs=1&transparent=1`

### 3. マイク音量連動くちパク

本格的な音素解析リップシンクは MVP では行わない。

代わりに、Web Audio API でマイク音量の RMS を取得し、VRM の口開き Expression に反映する。

処理イメージ:

1. マイク入力を取得
2. RMS 音量を計算
3. しきい値と感度で 0.0-1.0 に正規化
4. attack / release でなめらかにする
5. VRM の `aa` などの Expression に反映

名称案:

`Mic Reactive Mouth`

README 表記:

`マイク音量ベースの簡易口パクに対応。音素解析による本格的なリップシンクではありません。`

### 4. VRMA 読み込み・再生

独自ポーズプリセットは MVP から外し、VRM コンソーシアム主催ハッカソンに合わせて VRMA 対応を優先する。

方針:

- `.vrma` ファイルを読み込む
- 単発モーション再生
- ループ再生
- 停止
- VRM モデルを差し替えても同じ VRMA を適用できることを示す

対象用途:

- 待機モーション
- お辞儀
- 手振り
- 短いリアクション
- 配信開始 / 終了演出

非対応:

- VRMA 書き出し
- 複数 VRMA ブレンド
- タイムライン編集
- トラッキング結果の完全な VRMA 録画

余力機能:

`Experimental: Record to VRMA`

MediaPipe の上半身トラッキング結果を短時間記録し、VRMA として書き出す実験機能。MVP では必須にしない。

### 5. MediaPipe 上半身トラッキング

MediaPipe による簡易上半身トラッキングを行う。

MVP では高精度フルトラッキングを狙わない。

優先対象:

- 首
- 胸
- 肩
- 上腕
- 前腕

ただし、腕のリターゲットは沼りやすいため、最初は首・胸・肩程度でもよい。

モード:

- Live Mode
MediaPipe で上半身を追従し、マイク音量で口パクする。
- Motion Mode
VRMA 再生を優先し、MediaPipe の干渉を止める。口パクだけ維持してもよい。
- Transparent Mode
背景透過を優先し、ポストエフェクトを控えめにする。

### 6. Style Wall

背面壁を CSS 風の設定でカスタムできる機能。

3D モデルを用意しなくても、色、グラデーション、パターン、画像を使って配信部屋の雰囲気を作る。

用途:

- 雑談配信用背景
- 作業配信用背景
- 歌枠風背景
- 告知画面
- 待機画面
- ブランドカラー背景

想定項目:

- Background Color
- Gradient
- Pattern
    - none
    - grid
    - dots
    - stripes
- Accent Color
- Title Text
- Background Image

任意 CSS 全対応は MVP では行わない。CSS 風プリセット / パラメータ方式にする。

### 7. Image Panel

画像を 3D 空間上の Plane に貼る機能。

用途:

- 配信ロゴ
- 告知画像
- コメント欄風画像
- ポスター
- ファンアート展示
- 待機カード
- 名前札

最初は自由配置ではなく、プリセット位置でよい。

プリセット位置:

- Back Wall Center
- Left Wall
- Right Wall
- Desk Front

OBJ 読み込みより優先度は高い。少ない実装量で画面の完成度を上げられるため。

### 8. Floating Web Panel / HTML-in-Canvas

既存の YouTube コメント表示 HTML プラグインなどを 3D 空間風に配置する構想。

ただし、外部 HTML をそのまま Canvas / WebGPU テクスチャに焼くのは難しいため、MVP では必須にしない。

方針:

- 標準機能は Image Panel
- Experimental として HTML-in-Canvas / DOM Overlay を検討
- 未対応環境では無効

用途:

- 既存コメントウィジェットを 3D 部屋内のパネルとして見せる
- 告知カードや配信ステータスを Web パネル化する
- 将来的に HTML / CSS の配信 UI を 3D 空間へ統合する

## Look / Shader プリセット

背景透過を重視するため、画面全体へのポストエフェクトよりも、シェーダー / ライティング / マテリアル設定で絵作りする。

ポストエフェクトは補助扱い。

### 1. Standard VRM

VRM 標準寄せの見た目。

- MToon ベース
- 正面ライト
- 弱い環境光
- ポストエフェクト最小
- 透過表示向け基準ルック

### 2. Studio 3-Point

3点照明風の見た目。

- Key Light
- Fill Light
- Rim Light
- 顔が見やすい
- 雑談・作業配信向け

### 3. Backlight Drama

逆光風の見た目。

- 背面リムライト強め
- 正面は控えめ
- 輪郭を強調
- Bloom は使っても薄め
- 歌枠・雰囲気配信・告知向け

## モード設計

### Setup Mode

設定用モード。

表示するもの:

- VRM 読み込み
- VRMA 読み込み
- マイク設定
- カメラ / MediaPipe 設定
- Look 選択
- Style Wall 設定
- Image Panel 設定
- OBS Mode URL 表示

### OBS Mode

配信用モード。

特徴:

- UI 非表示
- 背景透過可能
- OBS Browser Source にそのまま読み込む
- pointer-events 無効化
- 表示専用

例:

`http://127.0.0.1:5173/?obs=1`

`http://127.0.0.1:5173/?obs=1&transparent=1`

## MVP スコープ

### 必須

- VRM 読み込み
- OBS Browser Source 表示
- WebGPU 描画
- 背景透過モード
- マイク音量連動くちパク
- Look / Shader プリセット 3 種
- README
- 1分デモ動画

### 高優先

- VRMA 読み込み・再生
- Style Wall
- Image Panel

### できれば

- MediaPipe 上半身トラッキング
- Text Panel
- OBS モード URL 生成
- 設定 localStorage 保存

### Experimental / 余力

- HTML-in-Canvas
- Floating Web Panel
- OBJ 読み込み
- VRMA 撮影・書き出し
- 手トラッキング
- 高度なポストエフェクト

## 非スコープ

以下は MVP では行わない。

- Electron 化
- 動画書き出し
- MediaBunny 利用
- ffmpeg 利用
- 音声ミキシング
- コメント取得
- 字幕表示
- OBS シーン制御
- 本格的な音素リップシンク
- 高精度フルトラッキング
- VRM 編集
- VRM 書き出し
- VRMA 完全編集
- MMD / VMD 互換
- 複雑なタイムライン編集

## **実装順**

1. Vite + TypeScript + Three.js の最小構成
2. WebGPU Renderer でキューブ表示
3. VRM 読み込み
4. OBS モード
5. 背景透過表示
6. マイク音量 RMS 取得
7. VRM の口 Expression に音量を反映
8. Look / Shader プリセット 3 種
9. Style Wall
10. Image Panel
11. VRMA 読み込み・再生
12. MediaPipe 上半身トラッキング
13. README / デモ動画 / 提出文整備

## **Codex / コーディングエージェント運用**

大きな実装を一括で任せない。

1タスク1目的で短く切る。

例:

- TASK-001: Vite + TypeScript + Three.js の最小構成
- TASK-002: WebGPU Renderer 表示
- TASK-003: VRM 読み込み
- TASK-004: OBS モード
- TASK-005: マイク音量メーター
- TASK-006: 音量連動くちパク
- TASK-007: Look プリセット
- TASK-008: Style Wall
- TASK-009: Image Panel
- TASK-010: VRMA 再生
- TASK-011: MediaPipe デバッグ表示
- TASK-012: 首・胸だけ VRM へ反映

運用ルール:

- main ブランチには常に動く版を残す
- 壊れた実験は捨てる
- 毎日ひとつ提出可能状態に近づける
- 新機能追加よりデモ安定性を優先する
- README と動作確認手順を毎回更新する

DoggyCoding の思想では、AI に自律させすぎず、最小権限・ローカル完結・可視化と記録・人間レビュー前提で運用することが重要とされている。

## **デモ方針**

1分デモで伝える内容:

1. OBS に Browser Source として読み込む
2. VRM が背景透過で表示される
3. マイクに反応して口が動く
4. Look プリセットを切り替える
5. Style Wall / Image Panel で配信部屋風になる
6. VRMA を読み込んで短いモーションを再生する
7. 「録画・配信・音声は OBS 側に任せる」と説明する

伝えるべき一文:

`VPlant3D for OBS は、OBS の中に置ける軽量 VRM / VRMA 3D アバターレイヤーです。`

## **強み**

- OBS Browser Source に直接読み込める
- 背景透過のまま 3D アバターを重ねられる
- グリーンバック不要
- VRM / VRMA の活用を前面に出せる
- 既存の OBS 配信環境を壊さない
- 動画書き出しや音声ミキシングを持たないため軽量
- Style Wall / Image Panel により短時間で見栄えを作れる
- 既存 VTuber ソフトと正面衝突せず、OBS 用 3D レイヤーとして差別化できる

## **リスク**

### **WebGPU 対応**

WebGPU 必須にすると環境依存が出る。OBS Browser Source 内の Chromium で期待通り動作するか確認が必要。

### **VRMA 実装**

VRMA 読み込み・再生は主催文脈に合うが、実装が詰まる可能性がある。詰まった場合は Experimental 扱いにする。

### **MediaPipe リターゲット**

上半身トラッキングから VRM ボーンへの変換は沼りやすい。首・胸・肩までで止める判断もあり。

### **透過とポストエフェクト**

Bloom / DOF / フォグ / 色収差などは背景透過と相性が悪い場合がある。透過モードではシェーダー / ライティング中心にする。

### **競合**

既存の BOOTH / VRM / VTuber 配信ツールが過去作として出てくる可能性がある。正面衝突を避け、OBS Browser Source 用の軽量 3D レイヤーとして立ち位置を明確にする。

## **名前**

正式名:

`VPlant3D for OBS`

短縮名:

`VPlant3D`

キャッチコピー:

`VRM in OBS. Render only. OBS does the broadcast.`

意味づけ:

`V` は Virtual / VTuber / VRM の気配を持つ。`Plant3D` は OBS 内に置く小さな 3D 描画プラントを表す。`for OBS` によって、用途を OBS Browser Source 向けに明確化する。

## **まとめ**

VPlant3D for OBS は、OBS の配信機能を置き換えるものではない。

OBS の中に差し込める、軽量な VRM / VRMA 3D 表現レイヤーである。

背景透過、音量連動くちパク、VRMA 再生、Style Wall、Image Panel を組み合わせ、VTuber が自分の OBS 配信環境に小さな 3D アバター空間を追加できることを目指す。

