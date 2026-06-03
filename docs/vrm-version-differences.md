# VRM 0.x / 1.0 仕様差分メモ

調査日: 2026-06-03

## 目的

VPlant3DでVRM 0.xとVRM 1.0を同じUIから扱うときに、座標、Humanoid、表情、メタ情報の差分をどこで吸収するべきかを整理する。

特に、VRM 1.0モデルで以下の問題が起きたため、実装判断の基準として残す。

- 読み込み時に腕がTポーズ / バンザイ寄りになる
- 顔の上下回転がVRM 0.xとVRM 1.0で逆に見える
- ミラーON/OFFの結果が、顔、体幹、腕で一致しない
- 表情プリセット名がVRM 0.xとVRM 1.0で違う

## 参照した一次情報

- VRM公式: 座標系の変換: https://vrm.dev/api/coordinate/
- VRM公式: VRM 1.0概要: https://vrm.dev/en/vrm1/
- VRM公式: VRM 1.0 Expression: https://vrm.dev/en/vrm1/expression/
- VRM仕様: VRM 0.0 README: https://github.com/vrm-c/vrm-specification/blob/master/specification/0.0/README.md
- VRM仕様: VRM 1.0 README: https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm-1.0/README.md
- VRM仕様: VRM 1.0 humanoid: https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm-1.0/humanoid.md
- VRM仕様: VRM 1.0 expressions: https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm-1.0/expressions.md
- VRM仕様: VRM 1.0 meta: https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm-1.0/meta.md
- `@pixiv/three-vrm` migration guide: https://pixiv.github.io/three-vrm/docs/documents/migration-guide-1.0.html

## ざっくり結論

VPlant3Dでは、VRM 0.xとVRM 1.0を「同じモデル形式のバージョン違い」として雑に扱わない方がよい。

仕様上も実装上も、少なくとも以下は互換レイヤーで分ける。

- モデル正面方向
- Unity / glTF / VRM間の軸反転
- Humanoid boneの正規化済みノードとraw node
- 表情プリセット名
- meta / license項目

特にモーション流し込みでは、UI上の「ミラー」は1つのチェックに見えても、内部では以下に分離する必要がある。

- 顔 / 頭のyaw, pitch, roll
- 体幹のyaw, pitch, roll
- 腕 / 手首
- 画面上のMediaPipe debug表示

顔だけ正しい、体だけ正しい、腕だけ逆という状態が起きるため、単一の `mirrorInput` をすべてのボーンに流すのは危険。

## extension path

VRM 0.x:

- glTF JSON上では `extensions.VRM`
- metaは `extensions.VRM.meta`
- BlendShape、FirstPerson、Humanoid、SecondaryAnimationなども `VRM` extension配下にまとまる

VRM 1.0:

- glTF JSON上では `extensions.VRMC_vrm`
- metaは `extensions.VRMC_vrm.meta`
- MToon、SpringBone、NodeConstraintなどは `VRMC_*` 系の拡張として整理される

`@pixiv/three-vrm` では、ロード後の `vrm.meta.metaVersion` で判別できる。

```ts
if (vrm.meta.metaVersion === '0') {
  // VRM 0.x
} else if (vrm.meta.metaVersion === '1') {
  // VRM 1.0
}
```

## 座標系とモデル正面方向

公式の座標系メモでは、VRM 0とVRM 1で「前」の向きが異なる。

| 形式 | 右 | 上 | 前 | 掌性 |
| --- | --- | --- | --- | --- |
| VRM 0 | +X | +Y | -Z | 右手 |
| VRM 1 | -X | +Y | +Z | 右手 |

また、UniVRMのUnity変換では以下の差がある。

- Unity ↔ VRM 0: Z軸を反転
- Unity ↔ VRM 1: X軸を反転

`@pixiv/three-vrm` migration guideでも、VRM 1.0ではモデル正面が `Z-` から `Z+` に変更されたため、VRM 0.0モデルには `VRMUtils.rotateVRM0(vrm)` を使って互換化する、と説明されている。

VPlant3Dでの判断:

- 表示正面の互換化には、引き続き `VRMUtils.rotateVRM0(vrm)` を使う
- ただし、表示正面を揃えても、各Humanoid boneのローカル回転軸まで完全に同じになるとは限らない
- モーション流し込みでは、VRM 0.x / 1.0ごとの補正テーブルを持つ

## 初期姿勢 / Tポーズ / 腕下げ

VRM 0.x仕様では、モデル階層はTポーズであることが前提として扱われる。

VRM 1.0でもHumanoidとしての基準姿勢は重要だが、`@pixiv/three-vrm` v1系では normalized human bones の考え方が導入されている。migration guideでは、VRM 1.0では各human boneが非正規化のorientationを持てるため、モデル差を吸収するために normalized human bones が導入された、と説明されている。

VPlant3Dでの判断:

- 「読み込み直後に腕を下げる」処理は、VRM 0.xとVRM 1.0で同じ回転符号を使わない
- 現在の `src/vrm/idle-arm-pose.ts` では、VRM 1.0の上腕Z回転をVRM 0.xと逆符号にしている
- 今後も腕下げや待機ポーズは、`metaVersion` ごとの互換関数に閉じ込める
- `VRMUtils.rotateVRM0` 後の見た目が揃っていても、上腕・前腕・手首のローカル軸は別途確認する

現状のVPlant3D補正:

| 対象 | VRM 0.x | VRM 1.0 |
| --- | --- | --- |
| leftUpperArm idle Z | `+1.12` | `-1.12` |
| rightUpperArm idle Z | `-1.12` | `+1.12` |

この値は実機確認ベースの暫定値。複数VRM 1.0モデルで確認して、必要ならモデルごとの調整UIまたはプリセット化を検討する。

## Humanoid bone

VRM 1.0のhumanoid仕様では、`extensions.VRMC_vrm.humanoid.humanBones` に humanoid bone とglTF nodeの対応が定義される。

仕様上の重要点:

- humanoid boneはVRM内で一意
- scaleは正の値でなければならない
- rootからhips、spine、chest、neck、head、arms、legsへ親子関係が定義される
- VRM 1.0では `chest` や `neck` がVRM 0.xの必須扱いから変わっている
- leftUpperArm -> leftLowerArm -> leftHand、rightUpperArm -> rightLowerArm -> rightHand の親子関係は明確に定義される

`@pixiv/three-vrm` v1では、raw bone nodeとnormalized bone nodeを区別して扱える。

VPlant3Dでの判断:

- モーション流し込みは、原則として `vrm.humanoid.getNormalizedBoneNode()` 側を使う
- raw bone nodeへ直接回転を入れる場合は、VRM 0.x / 1.0 / モデル固有軸の差分が出やすいので避ける
- `VRM.update()` または `VRMHumanoid.update()` の同期タイミングを前提にする
- 体幹、頭、腕は別々の互換補正を持つ

## ミラーと回転符号

VRM 1.0では、座標系変換の段階でVRM 0.xと違う軸反転が入る。さらにVPlant3DではMediaPipeの画面座標、Three.jsのワールド座標、VRM humanoid boneのローカル座標が重なる。

そのため、以下のような症状が起きる。

- ミラーONだと顔のyawは自然だが、体のrollが逆
- ミラーOFFだと体のrollは自然だが、顔のyawが逆
- 手動ドラッグの上下だけVRM 1.0で逆
- 上腕の左右開きと前腕曲げの符号がVRM 0.xとVRM 1.0でずれる

VPlant3Dでの判断:

- UIの `mirrorInput` は「ユーザーから見た直感」に留める
- 内部では `faceMirrorInput`、`bodyMirrorInput`、`armMirrorInput` のように分離する
- `metaVersion === '1'` の場合、顔pitch、体roll、腕軸を個別に補正する
- 1つのif文で全ボーンに同じ符号反転を入れない

現状のVPlant3D補正:

- `src/mocap/head-vrm-compat.ts`
  - `adaptHeadRetargetPoseForVrm()` でVRM 1.0のhead pitchを反転
  - 2026-06-03時点では、VRM 1.0でも体側mirror解釈はUI mirrorと同じに戻した
- 手動マウス操作でもVRM 1.0の顔上下が逆にならないよう、同じ互換処理を使う方針

今後の注意:

- 頭と体の補正は、同じ `mirrorInput` から派生しても内部で別扱いにする
- 腕はさらに別枠。腕はローカル軸とモデル衣装の見え方に影響されやすい

## 表情: BlendShapeからExpressionへ

VRM 0.xでは BlendShape / BlendShapeProxy と呼ばれていたものが、VRM 1.0では Expression に整理された。

公式のVRM 1.0 Expression解説では、プリセット名も見直されている。

| 用途 | VRM 0.x | VRM 1.0 |
| --- | --- | --- |
| 喜 | `joy` | `happy` |
| 怒 | `angry` | `angry` |
| 哀 | `sorrow` | `sad` |
| 楽 | `fun` | `relaxed` |
| 驚 | なし | `surprised` |
| あ | `a` | `aa` |
| い | `i` | `ih` |
| う | `u` | `ou` |
| え | `e` | `ee` |
| お | `o` | `oh` |
| まばたき | `blink` | `blink` |
| 左まばたき | `blink_l` / `Blink_L` | `blinkLeft` |
| 右まばたき | `blink_r` / `Blink_R` | `blinkRight` |
| 視線上 | `lookup` / `LookUp` | `lookUp` |
| 視線下 | `lookdown` / `LookDown` | `lookDown` |
| 視線左 | `lookleft` / `LookLeft` | `lookLeft` |
| 視線右 | `lookright` / `LookRight` | `lookRight` |
| 標準 | `neutral` | `neutral` |

VRM 1.0では `surprised` が追加され、`neutral` は後方互換として残されている。

またVRM 1.0のExpressionには、proceduralな表情を上書きするための設定がある。

- `overrideMouth`: `aa` / `ih` / `ou` / `ee` / `oh`
- `overrideBlink`: `blink` / `blinkLeft` / `blinkRight`
- `overrideLookAt`: `lookUp` / `lookDown` / `lookLeft` / `lookRight`

VPlant3Dでの判断:

- UIは日本語で `自然` / `喜` / `怒` / `哀` / `楽` / `驚` と表示する
- 内部ではVRM 1.0名を正規名として扱い、VRM 0.xにはfallback mappingを持つ
- 表情ボタンは「存在しない表情」を押しても壊れないよう、実際にExpressionManagerで使える名前を確認してから適用する
- `自然` は「表情プリセットneutralがあるならそれを使う」ボタン
- 「全表情をゼロへ戻す」は `なし` / `リセット` として別扱いにする
- マイク口パク、モーキャプまばたき、表情プリセットは同時に干渉しやすい。VRM 1.0のoverride設定がある場合は尊重する

## meta / license

metaとlicenseの差分は [docs/vrm-meta-implementation-notes.md](./vrm-meta-implementation-notes.md) に詳しくまとめ済み。

ここでは実装上の要点だけ再掲する。

VRM 0.x:

- `extensions.VRM.meta`
- `title`
- `author`
- `allowedUserName`
- `violentUssageName`
- `sexualUssageName`
- `commercialUssageName`
- `licenseName`
- `otherPermissionUrl`
- `otherLicenseUrl`

VRM 1.0:

- `extensions.VRMC_vrm.meta`
- `name`
- `authors`
- `licenseUrl`
- `avatarPermission`
- `commercialUsage`
- `creditNotation`
- `allowRedistribution`
- `modification`
- `allowPoliticalOrReligiousUsage`
- `allowAntisocialOrHateUsage`

VPlant3Dでの判断:

- 外向けUIでは0.x / 1.0差分を正規化して表示する
- ただし法的判断はアプリが代行しない
- `licenseUrl`、`otherLicenseUrl`、`otherPermissionUrl` はユーザーが確認できるようにする
- typoに見える `Ussage` はVRM 0.x仕様上の名前なので変更しない

## LookAt / FirstPerson

`@pixiv/three-vrm` migration guideでは、VRM 1.0でFirstPersonBoneが削除され、Humanoidのheadを使うべきとされている。

またBlendShapeProxyからExpressionへ移行したため、視線を表情で制御する場合の名前もVRM 0.x / 1.0で差が出る。

VPlant3Dでの判断:

- 現状は目線をカメラ向き固定に寄せているため、LookAtはMVPの中心ではない
- ただし将来、視線操作をExpressionで行う場合は `lookUp` / `lookDown` / `lookLeft` / `lookRight` とVRM 0.x名の互換が必要
- FirstPerson用途はOBSアバターレイヤーでは優先度低

## SpringBone / secondaryAnimation

VRM 0.xでは揺れものは `secondaryAnimation` として扱われる。

VRM 1.0では `VRMC_springBone` 系の拡張として整理される。

VPlant3Dでの判断:

- 現状は `@pixiv/three-vrm` に任せる
- 揺れもの設定をUIで編集するのはMVP範囲外
- VRM 1.0で揺れ方が違う場合、VPlant3D側で独自補正しない

## MToon / Material

`@pixiv/three-vrm` migration guideでは、VRM 1.0のMToonはVRM 0.0のMToonから大きく作り直されており、基本的に別物として考えるべきと説明されている。

VPlant3Dでの判断:

- 既存MToonの設定はなるべく尊重する
- Look / Shader / Light系の操作は、モデルのmaterial設定を破壊しない範囲に留める
- ライト・リムライト・背景色・透明背景など、アプリ側の演出で差別化する
- VRM 0.x / 1.0のMToon内部パラメータを同じUIから直接細かく編集するのは後回し

## VPlant3D互換レイヤー方針

今後、VRM 0.x / 1.0差分は以下のように分離する。

### 1. version detection

ロード直後に `vrm.meta.metaVersion` を取得する。

```ts
type VrmVersion = '0' | '1' | 'unknown';
```

### 2. display normalization

- VRM 0.xには `VRMUtils.rotateVRM0(vrm)` を適用する
- VRM 1.0には適用しない

### 3. idle pose compatibility

- 腕下げ、手首の軽い初期補正は `createIdleArmPoseAdjustments(metaVersion)` に閉じ込める
- 今後、肩や肘も必要ならここではなく `vrm-pose-compat` のような専用moduleへ分ける

### 4. retarget compatibility

顔:

- VRM 1.0ではpitch符号を個別に補正
- yaw / rollもモデル差が出る場合は顔専用補正に追加

体:

- 顔とは別の `bodyMirrorInput` を持つ
- 2026-06-03の実機確認では、VRM 1.0のカメラ胴体連動はUI mirrorと同じ向きの方が自然だったため、現状は `bodyMirrorInput = uiMirrorInput` とする

腕:

- 顔・体のmirrorを流用しない
- VRM 0.x / 1.0で上腕roll、前腕bend、手首rollの符号を別テーブル化する
- 手首位置一致より、破綻しない腕上げ・肘曲げを優先する

### 5. expression compatibility

UIの表情ボタンは共通名で持つ。

```ts
type UiExpressionPreset =
  | 'neutral'
  | 'happy'
  | 'angry'
  | 'sad'
  | 'relaxed'
  | 'surprised';
```

VRM 0.x向けfallback:

```ts
const vrm0ExpressionFallbacks = {
  happy: ['happy', 'joy'],
  angry: ['angry'],
  sad: ['sad', 'sorrow'],
  relaxed: ['relaxed', 'fun'],
  surprised: ['surprised'],
  neutral: ['neutral'],
};
```

Lip sync fallback:

```ts
const mouthFallbacks = {
  aa: ['aa', 'a'],
  ih: ['ih', 'i'],
  ou: ['ou', 'u'],
  ee: ['ee', 'e'],
  oh: ['oh', 'o'],
};
```

Blink fallback:

```ts
const blinkFallbacks = {
  blinkLeft: ['blinkLeft', 'blink_l', 'Blink_L'],
  blinkRight: ['blinkRight', 'blink_r', 'Blink_R'],
};
```

## テスト方針

純ロジックとして切り出せるものはテストする。

- `metaVersion` から互換設定を返す
- VRM 0.x / 1.0のidle arm pose符号が違う
- VRM 1.0のhead pitchだけ反転する
- VRM 1.0のbody mirror解釈がUI mirrorと同じである
- 表情プリセットfallbackでVRM 0.x名 / VRM 1.0名の両方を解決できる
- 存在しない表情名は無視する

ブラウザ / OBS / 実モデル確認が必要なもの:

- VRM 1.0で顔上下が自然か
- VRM 1.0で体の傾きがミラーON時に直感と一致するか
- VRM 1.0で腕下げがTポーズから自然に下がるか
- VRM 0.xで既存挙動が壊れていないか

## 現在の未解決事項

- VRM 1.0の腕トラックは、まだモデルごとに軸差が出やすい
- 手動操作、MediaPipe顔、MediaPipe体、腕トラックで同じ互換関数を使い切れているか確認が必要
- VRM 1.0の表情presetはモデル側に未設定のものがあり得る。UIは「ボタンがある=必ず動く」と見せすぎない方がよい
- VRM 0.x / 1.0それぞれ複数モデルでの実機確認が必要

## 次の実装候補

1. `src/vrm/vrm-version-compat.ts` のような小さな互換moduleを作る
2. head/body/arm/expressionの互換処理をそこへ寄せる
3. UI mirrorから内部mirrorを派生する関数をテストする
4. 表情preset fallbackをテスト付きで整理する
5. VRM 1.0モデル読み込み時の腕下げ処理を複数サンプルで確認する
