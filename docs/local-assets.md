# Local Assets

最終更新日: 2026-05-20

## 目的

`local-assets/` は、GitHubへ載せないローカル専用素材置き場である。

VRMモデル、VRMAモーション、録画ファイル、参考画像、音声素材、OBS設定メモなど、サイズが大きいものやライセンス上リポジトリへ含めにくいものを置く。

このフォルダは `.gitignore` で除外されている。

## 想定構成

```text
local-assets/
  vrm/      # 参考VRMモデル
  vrma/     # 参考VRMAモーション
  images/   # ロゴ、パネル、参考画像、スクリーンショット素材
  video/    # デモ動画、録画素材
  audio/    # マイクテスト音声、効果音、BGM候補
  obs/      # OBS設定メモ、スクリーンショット、シーン構成メモ
```

## ルール

- `local-assets/` 以下のファイルはGitHubへ載せない
- デモに使うVRMモデルは、ライセンスと作者表記を確認する
- スクリーンショットや動画投稿が許可されている素材だけ使う
- 再配布禁止の素材を `public/` や `src/` に移さない
- 提出時に必要なクレジットはREADMEまたは投稿文に記載する
- Codexが素材の中身を参照する必要がある場合は、ファイルパスと目的を明確にする
- 画像素材は原則としてAI生成または人間が作成したものを使う
- ネット上の画像を権利確認なしに借りて使わない
- 生成画像を使う場合は、生成日、用途、プロンプト概要を記録する

## Codexへの伝え方

ローカル素材を使って確認してほしい場合は、以下のように伝える。

```text
local-assets/vrm/example.vrm を使ってVRM読み込みを確認して
```

または:

```text
local-assets/images/panel-test.png をImage Panelのテスト素材として使って
```

## 注意

Codexはローカルファイルを参照できるが、素材の権利判断は最終的に人間が行う。

使用可否が不明な素材は、ハッカソン提出デモや公開スクリーンショットには使わない。

## Image Asset Policy

VPlant3Dでは、権利リスクを下げるため、画像素材は以下の優先順位で用意する。

1. AI生成画像
2. 人間が作成した画像
3. 明確に利用許諾が確認できる素材

避けるもの:

- 検索で見つけた画像の流用
- 出典不明のロゴ、背景、写真、イラスト
- ライセンス確認できないSNS画像
- 再配布不可の素材をリポジトリへ含めること

生成画像の記録例:

```md
### Generated Image: neon-style-wall-grid-01.png

- Date: 2026-05-20
- Path: `local-assets/images/neon-style-wall-grid-01.png`
- Purpose: Style Wall background candidate
- Prompt summary: dark neutral gray futuristic streaming room wall, neon green and neon blue accents, subtle grid pattern, no text, 16:9
- Notes: Local-only. Do not commit generated bitmap unless final license and distribution policy are decided.
```

## Current Local Inventory

最終確認日: 2026-05-20

### VRM

| Path | Size | Notes |
| --- | ---: | --- |
| `local-assets/vrm/AvatarSample_A.vrm` | 26 MB | README未確認。権利確認が必要 |
| `local-assets/vrm/AvatarSample_B.vrm` | 27 MB | README未確認。権利確認が必要 |
| `local-assets/vrm/AvatarSample_C.vrm` | 19 MB | README未確認。権利確認が必要 |
| `local-assets/vrm/Alicia_VRM/Alicia/VRM/AliciaSolid.vrm` | 7.5 MB | ニコニ立体公式キャラクター「ニコニ立体ちゃん」。readmeあり |
| `local-assets/vrm/Kizuna_AI_KAMATTE_VRM0.x&Motion_v2/Kizuna_AI_KAMATTE_VRM0.x_v2.vrm` | 39 MB | Kizuna AI KAMATTE VRM 0.x。READMEあり |
| `local-assets/vrm/Kizuna_AI_KAMATTE_VRM1.x&Motion_v2/Kizuna_AI_KAMATTE_v2.vrm` | 18 MB | Kizuna AI KAMATTE VRM 1.0。READMEあり |

### VRMA

| Path | Size | Motion |
| --- | ---: | --- |
| `local-assets/vrma/VRMA_MotionPack/vrma/VRMA_01.vrma` | 1.3 MB | 全身を見せる |
| `local-assets/vrma/VRMA_MotionPack/vrma/VRMA_02.vrma` | 834 KB | 挨拶 |
| `local-assets/vrma/VRMA_MotionPack/vrma/VRMA_03.vrma` | 1.3 MB | Vサイン |
| `local-assets/vrma/VRMA_MotionPack/vrma/VRMA_04.vrma` | 1.1 MB | 撃つ |
| `local-assets/vrma/VRMA_MotionPack/vrma/VRMA_05.vrma` | 617 KB | 回る |
| `local-assets/vrma/VRMA_MotionPack/vrma/VRMA_06.vrma` | 506 KB | モデルポーズ |
| `local-assets/vrma/VRMA_MotionPack/vrma/VRMA_07.vrma` | 754 KB | 屈伸運動 |

VRMA MotionPackのREADMEでは、著作権はピクシブ株式会社に帰属し、禁止事項に違反しない限り自由な目的への使用、改変、個人または法人による商用利用が許可されている。商用利用時は、クレジット文言「キャラクターアニメーション: ピクシブ株式会社 VRoidプロジェクト」または `Animation credits to pixiv Inc. 's VRoid Project` の表記が求められている。

### Candidate Assets For Early Development

初期実装では、ファイルサイズが比較的小さくREADMEも確認しやすい以下を優先候補にする。

- VRM: `local-assets/vrm/Alicia_VRM/Alicia/VRM/AliciaSolid.vrm`
- VRMA: `local-assets/vrma/VRMA_MotionPack/vrma/VRMA_02.vrma`

Kizuna AI KAMATTEはVRM 0.xとVRM 1.0の比較確認に使える。VRM 1.0対応確認では以下を使う。

- `local-assets/vrm/Kizuna_AI_KAMATTE_VRM1.x&Motion_v2/Kizuna_AI_KAMATTE_v2.vrm`

### Rights Notes

- ニコニ立体ちゃんはreadme内で正式クレジット、利用規約URL、禁止事項が記載されている。公開デモ利用前に最新の利用規約を確認する。
- Kizuna AI KAMATTEはREADMEに `© Kizuna AI Inc.` と記載がある。公開デモ利用前に配布元の利用条件を確認する。
- AvatarSample_A/B/C は現時点でREADME未確認。公開デモ利用前に配布元・利用条件を確認する。
- VRMA MotionPackはREADME確認済み。必要なクレジット表記を提出文またはREADMEに入れる。
