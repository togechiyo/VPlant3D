# ルック調整機能 実装案

作成日: 2026-05-22
更新日: 2026-05-22

## 目的

VPlant3Dの次の見栄え強化として、モデル表示の印象をOBS向けに調整できる機能群を検討する。今すぐ実装はしないが、後で着手しやすいように実装方針を控えておく。

対象は以下。

- ライト
- リムライト
- VRM内蔵アウトライン
- 追加アウトライン
- エッジ/輪郭強調

## 結論

最初に実装するなら、以下の順がよい。

1. ライトプリセット
2. リムライト調整
3. VRM内蔵アウトライン倍率
4. 追加アウトラインの検証
5. 2段アウトライン、黒縁+白ふち/ネオンふち

ライトとリムライトは既存のThree.jsライトを調整UI化するだけで始められる。今後はKey / Fill / Rimの3灯をすべて `DirectionalLight` に統一する。VRM内蔵アウトラインは、モデル作者の意図を活かしたまま全体倍率だけ触る。追加アウトラインは映えるが、透明背景、OBS Browser Source、VRMスキニングとの相性確認が必要なので別フェーズにする。

2026-05-22時点で、Phase 1の3灯ライトUIは実装済み。Control Pageからプリセット、Key倍率、Fill倍率、Rim強度/色/方向を操作でき、OBS Render Pageへrelay同期される。

## 現状

現在のシーンには以下のライトがある。

```ts
const keyLight = new THREE.DirectionalLight(0xf4fbff, 1.75);
keyLight.position.set(0.35, 3.4, 4.2);

const rimLight = new THREE.DirectionalLight(0x38d5ff, 0.65);
rimLight.position.set(-3, 2, -2);

const fillLight = new THREE.HemisphereLight(0xf2f7ff, 0x101314, 0.54);
```

このため、リムライトはすでに弱く入っている。まずは追加実装ではなく、既存ライトの強度、色、方向を操作できるUIへするのが安全。

ただし、`fillLight` は現状 `HemisphereLight` なので、ルック操作実装時に `DirectionalLight` へ置き換える。3灯すべてを方向ライトにそろえることで、配信者にも馴染みのある「Key / Fill / Rim」構成として説明しやすく、UIも統一できる。

## UI案

Control Pageに「ルック」カードを追加する。

並びは、VRM/手動操作/顔口/体/手/VRMA/位置調整の後ろか、位置調整の直前がよい。

### 最小UI

- ライトプリセット
  - 標準
  - 明るめ
  - 正面上
  - ネオン
  - クロマキー向け
- リムライト
  - OFF
  - 弱
  - 中
  - 強
- リム色
  - 白
  - 青
  - 緑
- リム方向
  - 左後ろ
  - 右後ろ
- モデル線
  - 内蔵線: OFF / 細 / 標準 / 太
  - 追加黒縁: OFF / 細 / 中 / 太
  - 外ふち: OFF / 白 / 青 / 緑

UIテキストは「シェーダー」より「ルック」「モデル線」「輪郭」の方がユーザーに伝わりやすい。

### 3灯UI案

最初の実装では、個別スライダーを増やしすぎない。プリセットとリムの調整だけで、触れる量を抑える。

```text
ルック
  プリセット: 標準 / 明るめ / 正面上 / ネオン / 輪郭強調

3灯
  Key:  0%  100%  200%
  Fill: 0%  100%  200%
  Rim:  OFF 弱 中 強

リム
  色: 白 / 青 / 緑
  方向: 左後ろ / 右後ろ / 上後ろ
```

詳細設定を入れるなら後からでよい。

- Key色
- Fill色
- Key方向
- Fill方向
- exposure

MVPでは「プリセット選択 + Rim強度/色/方向」だけでも十分。

## ライト

### 実装方針

`keyLight`、`fillLight`、`rimLight` をすべて `DirectionalLight` としてモジュール化し、プリセット適用関数を作る。

```ts
type LookPresetId = "standard" | "bright" | "front-top" | "neon" | "edge";
type RimLightStrength = "off" | "soft" | "medium" | "strong";
type RimLightColor = "white" | "blue" | "green";
type RimLightDirection = "left-back" | "right-back" | "top-back";

type LookLightPreset = {
  id: LookPresetId;
  label: string;
  keyColor: number;
  keyIntensity: number;
  keyPosition: [number, number, number];
  fillColor: number;
  fillIntensity: number;
  fillPosition: [number, number, number];
  rimColor: number;
  rimIntensity: number;
  rimPosition: [number, number, number];
  exposure: number;
};

type LookSettings = {
  preset: LookPresetId;
  keyIntensityScale: number;
  fillIntensityScale: number;
  rimStrength: RimLightStrength;
  rimColor: RimLightColor;
  rimDirection: RimLightDirection;
};
```

候補ファイル:

```text
src/look/look-presets.ts
test/look-presets.test.ts
```

### 初期プリセット

| プリセット | 目的 |
| --- | --- |
| 標準 | 現在の見た目を維持 |
| 明るめ | 暗いVRM向け |
| 正面上 | 顔が見やすいOBS向け |
| ネオン | 青/緑アクセントを強くする |
| 輪郭強調 | key/fill控えめ、rim強めで輪郭を出す |

露出は `renderer.toneMappingExposure` を使う。ただしモデルごとの白飛びが出やすいので、プリセットだけで始め、スライダーは必要になってから追加する。

### 3灯の初期配置

| ライト | position | 役割 |
| --- | --- | --- |
| Key | `[0.35, 3.4, 4.2]` | 正面やや上から顔と体を照らす |
| Fill | `[-2.6, 2.1, 3.0]` | 影側を弱く起こす |
| Rim | `[3.0, 2.4, -2.2]` | 背面斜め上から輪郭を出す |

Fillも `DirectionalLight` にする。暗部が硬くなりすぎる場合はFillを正面寄りにし、強度を弱めにする。

## リムライト

### 方向ライト方式を採用

初期実装は、単純な `DirectionalLight` をリムライトとして使う。Key / Fill / Rimの3灯すべてをDirectionalLightに統一する。

理由:

- 既に実装済みの構成を調整するだけで済む
- VRM/MToonマテリアルを直接いじらない
- OBS Browser Sourceで壊れにくい
- モデル差が比較的小さい

厳密なシェーダーリムではないが、配信画面上では輪郭を浮かせる効果がある。シェーダーでリムを入れるのは、MToonやVRMマテリアル差の扱いが重いため後回し。

### 初期値

| 強さ | intensity |
| --- | ---: |
| OFF | 0 |
| 弱 | 0.5 |
| 中 | 1.0 |
| 強 | 1.8 |

| 色 | color |
| --- | --- |
| 白 | `0xf4fbff` |
| 青 | `0x38d5ff` |
| 緑 | `0x6dff9a` |

| 方向 | position |
| --- | --- |
| 左後ろ | `[-3, 2.4, -2.2]` |
| 右後ろ | `[3, 2.4, -2.2]` |
| 上後ろ | `[0, 3.2, -2.4]` |

## VRM内蔵アウトライン

VRM/MToon系モデルは、モデル側にアウトライン設定を持っていることが多い。ここはモデル作者の意図を壊さず、全体倍率だけ触るのが安全。

### 実装方針

VRM読み込み時に、対象マテリアルの内蔵アウトライン幅を収集して保存する。

```ts
type VrmOutlineSnapshot = {
  materialUuid: string;
  baseOutlineWidth: number;
};
```

UIでは以下だけを提供する。

| 表示 | 倍率 |
| --- | ---: |
| OFF | 0 |
| 細 | 0.5 |
| 標準 | 1.0 |
| 太 | 1.5 |
| 太め | 2.0 |

### 注意

`@pixiv/three-vrm` と Three.js r184 のMToonマテリアルで、実際にどのプロパティを触るべきかは実装前に確認する。内部APIへ強く依存しすぎると壊れやすい。

そのため、最初は「該当プロパティがあれば触る」「なければ何もしない」実装にする。

## 追加アウトライン

追加アウトラインは別機能として扱う。リムライトやVRM内蔵線とは責務を分ける。

### 欲しい見た目

- 太め黒縁
- 黒縁の外側に白ふち
- 黒縁の外側に青/緑ネオンふち
- OBSの背景やクロマキー上でもモデルが埋もれない

### 候補方式

| 方式 | 長所 | 短所 |
| --- | --- | --- |
| モデル複製/裏面拡大 | 2段アウトラインを作りやすい。黒縁+外ふちが直感的 | VRMスキニング、表情、揺れ物追従、負荷が重い |
| ポストプロセスOutlinePass系 | スキニング追従を考えなくてよい。画面外周線として扱える | renderer構成が変わる。透明背景/OBSとの検証が必要 |
| 深度/法線ベース自作postprocess | 見た目の自由度が高い | MVPには重い。保守コストが高い |

最初に試すならポストプロセス方式がよい。モデル複製方式は二段アウトラインに向くが、VRMのボーン追従と負荷が不安。

### 2段アウトライン案

UI:

- 黒縁: OFF / 細 / 中 / 太
- 外ふち: OFF / 白 / 青 / 緑
- 外ふち強さ: 弱 / 中

描画方針:

1. 黒縁を内側の主アウトラインとして出す
2. 外側に白/青/緑を薄く出す
3. 透明背景のアルファが壊れないかOBSで確認する

### 実装前の検証項目

- OBS Browser Sourceで透明背景が維持されるか
- Control PageとOBS Render Pageの両方で負荷が許容範囲か
- ローカルAlicia、暗色モデル、髪や袖が大きいモデルで破綻しないか
- VRMA再生や手動操作中に線が遅れないか
- クロマキー背景で線が抜けないか

## エッジ/輪郭強調

「エッジ」はユーザー向けには曖昧なので、UIでは「輪郭」または「くっきり」に寄せる。

初期実装では独立したシェーダー機能にせず、以下で表現する。

- ライトプリセットで陰影を締める
- リムライトで輪郭を浮かせる
- VRM内蔵アウトライン倍率を上げる
- 必要なら追加アウトラインをONにする

本格的なエッジ検出postprocessは後回し。

## 実装ステップ

### Phase 1: ライト/リムライトUI

Status: 実装済み。

- `src/look/look-presets.ts`
- `LookSettings` をstoreに追加
- `fillLight` を `HemisphereLight` から `DirectionalLight` に変更
- key/fill/rim lightを設定から更新
- Control Pageに「ルック」カード追加
- relayにlook settingsを追加してOBS Render Pageへ同期
- E2EでControlにUIがあり、OBSにUIがないことを確認

実装の最小単位:

1. `src/look/look-presets.ts` にプリセットと正規化関数を作る
2. `RelayRenderState` に `look` を追加する
3. storeに `lookPreset`、`keyIntensityScale`、`fillIntensityScale`、`rimStrength`、`rimColor`、`rimDirection` を追加する
4. `applyLookSettings()` を作り、Control/Render両方でライトに反映する
5. Control Pageに「ルック」カードを追加する

E2Eは、ControlにルックUIが表示されること、OBS Render PageにはUIがないこと、select操作で状態が変わることを確認する。実際の見た目はChrome/OBSで人間確認する。

### Phase 2: VRM内蔵アウトライン倍率

- VRM読み込み後にマテリアルを走査
- 触れるアウトライン幅があればbase値を保存
- 倍率UIを追加
- 対応していないモデルでは無効表示または何もしない

### Phase 3: 追加アウトライン検証

- postprocess方式を小さく試す
- transparent renderとOBSで確認
- 1段黒縁だけで実用になるか判断

### Phase 4: 2段アウトライン

- 黒縁+白ふち
- 黒縁+青/緑ふち
- 負荷と見た目次第で採用判断

## MVP判断

ハッカソンまでの優先順位としては、Phase 1だけでも十分価値がある。リムライト強度、色、方向が触れるだけで配信画面の印象が変わる。

Phase 2は比較的安全だが、MToonプロパティ確認が必要。Phase 3以降は見栄えの差が大きい一方で、OBS透明背景や負荷リスクがあるため、時間がある時の検証タスクにする。
