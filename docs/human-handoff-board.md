# Human Handoff Board

最終更新日: 2026-05-20

## 目的

このドキュメントは、Codexだけでは完了しにくい作業、人間の判断・操作・確認が必要な作業を残すための伝言板である。

VPlant3D for OBSは短期ハッカソン向けプロジェクトなので、Codexが止まってユーザー確認を待つより、必要な人力作業をここに記録し、実装可能な範囲を先に進める。

## 運用ルール

- Codexは人間の判断や実機操作が必要になったら、このファイルに短く記録する
- 記録するときは、何を確認してほしいか、なぜ必要か、いつまでに必要かを書く
- ユーザーが対応したら、結果を追記するか、状態を `Done` にする
- ハッカソン提出に直結するものを上に置く
- 古い項目は削除せず、必要なら `Done` / `Dropped` として残す

## Status

| Status | Meaning |
| --- | --- |
| Todo | まだ人間の対応が必要 |
| Doing | ユーザーが対応中 |
| Done | 対応済み |
| Blocked | 外部要因で進められない |
| Dropped | 今回はやらない |

## Human Tasks

### Todo: OBS Browser Sourceでの実機確認

- Owner: Human
- Needed by: MVP実装後
- Why: OBS Browser SourceはChromium系だが、通常のGoogle Chromeと完全に同じとは限らないため
- What to check:
  - `http://127.0.0.1:5173/?obs=1`
  - `http://127.0.0.1:5173/?obs=1&transparent=1`
  - 背景透過
  - canvas表示
  - WebGPU / WebGL fallback
  - 音声・マイク権限

Notes:

- 開発中の通常確認はGoogle Chromeを優先する
- 最終提出前にOBS本体で必ず確認する

### Todo: MediaPipeモーションキャプチャーの人力確認

- Owner: Human
- Needed by: MediaPipe実装後
- Why: カメラ入力、姿勢、照明、顔・上半身の映り方はCodexだけでは確認できないため
- What to check:
  - Chromeでカメラ権限が取れるか
  - 上半身ランドマークが安定するか
  - 首・胸・肩の追従が破綻しないか
  - OBS Browser Sourceでも同じように動くか

Notes:

- MVPではMediaPipeは必須ではない
- 詰まる場合は首・胸・肩まで、またはデバッグ表示だけで止める

### Todo: 使用するVRMモデルの選定と権利確認

- Owner: Human
- Needed by: VRM読み込みデモ前
- Why: VRMモデルはライセンス、作者表記、再配布可否、商用利用可否、第三者利用可否を確認する必要があるため
- What to prepare:
  - デモに使うVRMモデル
  - 作者名
  - ライセンスURLまたは利用条件
  - スクリーンショット・動画投稿可否

Notes:

- 不明なモデルは提出デモに使わない
- Codexはサンプルモデルの候補調査はできるが、最終判断は人間が行う
- 現在 `local-assets/vrm/` には Alicia、Kizuna AI KAMATTE VRM 0.x / 1.0、AvatarSample_A/B/C がある
- 初期開発候補は `local-assets/vrm/Alicia_VRM/Alicia/VRM/AliciaSolid.vrm`
- Kizuna AI KAMATTEとAvatarSample_A/B/Cは、公開デモ利用前に配布元と利用条件を再確認する

### Todo: VRMA MotionPackのクレジット表記確認

- Owner: Human
- Needed by: VRMAデモ公開前
- Why: VRMA MotionPackのREADMEに商用利用時のクレジット表記条件があるため
- What to check:
  - READMEまたは投稿文に「キャラクターアニメーション: ピクシブ株式会社 VRoidプロジェクト」を入れるか
  - 英語表記にする場合は `Animation credits to pixiv Inc. 's VRoid Project` を使うか

Notes:

- ローカル確認用として `local-assets/vrma/VRMA_MotionPack/vrma/VRMA_02.vrma` を初期候補にする

### Todo: デモ動画の収録

- Owner: Human + Codex support
- Needed by: 提出前
- Why: 画面収録、音声、OBSレイアウト、見せ方は人間の操作が必要になる可能性が高いため
- What to capture:
  - OBS Browser Sourceとして読み込む
  - VRMが表示される
  - 背景透過で重ねられる
  - マイク音量で口が動く
  - Lookプリセットを切り替える
  - Style Wall / Image Panelで配信部屋風になる
  - VRMAを再生する

Notes:

- 1分以内で伝わる構成を優先する
- デモ動画の最終収録と提出作業は人間が担当する
- Codexはアプリ作成、必要な台本・チェックリスト・README文面の補助に留める

### Todo: #MadeWithVRM 投稿内容の最終確認

- Owner: Human
- Needed by: 投稿前
- Why: 作品説明、スクリーンショット、動画、ハッシュタグ、権利表記は最終確認が必要なため
- What to check:
  - プロジェクト名
  - 説明文
  - GitHub URL
  - デモ動画URL
  - 使用素材の表記
  - `#MadeWithVRM`

Notes:

- Codexは投稿文の下書きを作れる
- 最終投稿は人間が確認して行う
