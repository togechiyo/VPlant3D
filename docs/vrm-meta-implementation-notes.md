# VRM 0.x / 1.0 Meta And License Implementation Notes

調査日: 2026-05-23

## 目的

VPlant3DでVRMを読み込んだときに、モデルの利用条件を確認できるようにするための実装メモ。

VRMは単なる3Dモデル形式ではなく、アバターとして「人格を演じる」利用を想定している。公式ドキュメントでは、モデルデータ自体の改変・再配布規定に加えて、モデルデータを使って人格を演じることについての許諾規定をファイルに設定できる、と説明されている。

## 参照した一次情報

- VRM公式: https://vrm.dev/vrm/meta/license/
- VRM 1.0公式: https://vrm.dev/en/vrm1/
- VRM 0.0仕様: https://github.com/vrm-c/vrm-specification/blob/master/specification/0.0/README.md
- VRM 1.0 meta仕様: https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm-1.0/meta.md
- `@pixiv/three-vrm` migration guide: https://pixiv.github.io/three-vrm/docs/documents/migration-guide-1.0.html
- `@pixiv/three-vrm` Meta型: https://pixiv.github.io/three-vrm/docs/interfaces/types-vrmc-vrm-1.0.Meta.html

## VRM 0.x と VRM 1.0 の大きな違い

### extension path

VRM 0.x:

- glTF JSON上では `extensions.VRM`
- metaは `extensions.VRM.meta`

VRM 1.0:

- glTF JSON上では `extensions.VRMC_vrm`
- metaは `extensions.VRMC_vrm.meta`

`@pixiv/three-vrm` では、ロード後の `vrm.meta.metaVersion` で判別できる。

```ts
if (vrm.meta.metaVersion === '0') {
  // VRM0Meta
} else if (vrm.meta.metaVersion === '1') {
  // VRM1Meta
}
```

### meta構造

VRM 0.x は単数文字列の項目が多く、許諾も `Allow` / `Disallow` や `Everyone` のようなenumで表される。

VRM 1.0 は必須項目やデフォルトが整理され、作者が `authors: string[]` になり、商用利用や改変・再配布がより細かいenum/booleanに分かれている。

## VRM 0.x meta

`@pixiv/three-vrm` の `VRM0Meta` で扱える主な項目:

| 項目 | 意味 | 値 |
| --- | --- | --- |
| `metaVersion` | metaバージョン | `'0'` |
| `title` | モデル名 | string |
| `version` | モデルバージョン | string |
| `author` | 作者 | string |
| `contactInformation` | 連絡先 | string |
| `reference` | 原作/参照情報 | string |
| `texture` | サムネイル | `THREE.Texture` |
| `allowedUserName` | アバターとして演じてよい人 | `OnlyAuthor` / `ExplicitlyLicensedPerson` / `Everyone` |
| `violentUssageName` | 暴力表現 | `Disallow` / `Allow` |
| `sexualUssageName` | 性的表現 | `Disallow` / `Allow` |
| `commercialUssageName` | 商用利用 | `Disallow` / `Allow` |
| `otherPermissionUrl` | その他の人格/利用許諾URL | string |
| `licenseName` | 改変・再配布ライセンス種別 | `Redistribution_Prohibited` / `CC0` / `CC_BY` / `CC_BY_NC` / `CC_BY_SA` / `CC_BY_NC_SA` / `CC_BY_ND` / `CC_BY_NC_ND` / `Other` |
| `otherLicenseUrl` | その他ライセンスURL | string |

注意: 仕様上の綴りは `Ussage` のまま使われている。実装では typo に見えても変更しない。

## VRM 1.0 meta

VRM 1.0仕様で必須:

- `name`
- `authors`
- `licenseUrl`

`@pixiv/three-vrm` の `VRM1Meta` で扱える主な項目:

| 項目 | 意味 | 値 / デフォルト |
| --- | --- | --- |
| `metaVersion` | metaバージョン | `'1'` |
| `name` | モデル名 | string |
| `version` | モデルバージョン | string |
| `authors` | 作者一覧 | string[] |
| `copyrightInformation` | 著作権者情報 | string |
| `contactInformation` | 連絡先 | string |
| `references` | 原作/参照情報 | string[] |
| `thirdPartyLicenses` | 第三者ライセンス | string |
| `thumbnailImage` | サムネイル | `HTMLImageElement` |
| `licenseUrl` | VRM Public License文書URL | required |
| `avatarPermission` | アバターとして演じてよい人 | `onlyAuthor` / `onlySeparatelyLicensedPerson` / `everyone`; default `onlyAuthor` |
| `allowExcessivelyViolentUsage` | 過度な暴力表現 | boolean; default `false` |
| `allowExcessivelySexualUsage` | 過度な性的表現 | boolean; default `false` |
| `commercialUsage` | 商用利用 | `personalNonProfit` / `personalProfit` / `corporation`; default `personalNonProfit` |
| `allowPoliticalOrReligiousUsage` | 政治・宗教用途 | boolean; default `false` |
| `allowAntisocialOrHateUsage` | 反社会的・ヘイト用途 | boolean; default `false` |
| `creditNotation` | クレジット表記 | `required` / `unnecessary`; default `required` |
| `allowRedistribution` | 再配布可否 | boolean; default `false` |
| `modification` | 改変可否 | `prohibited` / `allowModification` / `allowModificationRedistribution`; default `prohibited` |
| `otherLicenseUrl` | その他ライセンスURL | string |

VRM 1.0の `licenseUrl` は `https://vrm.dev/licenses/1.0/` を受け付ける、と仕様に記載されている。

## 正規化方針

アプリUIと警告処理では、0.x / 1.0差分を隠すために共通型へ変換する。

```ts
type NormalizedVrmLicenseMeta = {
  specVersion: '0' | '1';
  modelName: string;
  version?: string;
  authors: string[];
  contactInformation?: string;
  references: string[];
  licenseUrl?: string;
  otherLicenseUrl?: string;
  otherPermissionUrl?: string;
  avatarPermission: 'onlyAuthor' | 'onlySeparatelyLicensedPerson' | 'everyone' | 'unknown';
  commercialUsage: 'personalNonProfit' | 'personalProfit' | 'corporation' | 'allow' | 'disallow' | 'unknown';
  creditNotation: 'required' | 'unnecessary' | 'unknown';
  allowRedistribution: boolean | 'unknown';
  modification: 'prohibited' | 'allowModification' | 'allowModificationRedistribution' | 'unknown';
  allowViolentUsage: boolean | 'unknown';
  allowSexualUsage: boolean | 'unknown';
  allowPoliticalOrReligiousUsage: boolean | 'unknown';
  allowAntisocialOrHateUsage: boolean | 'unknown';
  rawLicenseName?: string;
};
```

### 0.x からのマッピング

| VRM 0.x | 正規化先 |
| --- | --- |
| `title` | `modelName` |
| `author` | `authors: [author]` |
| `reference` | `references: [reference]` |
| `allowedUserName: OnlyAuthor` | `avatarPermission: onlyAuthor` |
| `allowedUserName: ExplicitlyLicensedPerson` | `avatarPermission: onlySeparatelyLicensedPerson` |
| `allowedUserName: Everyone` | `avatarPermission: everyone` |
| `commercialUssageName: Allow` | `commercialUsage: allow` |
| `commercialUssageName: Disallow` | `commercialUsage: disallow` |
| `violentUssageName` | `allowViolentUsage` |
| `sexualUssageName` | `allowSexualUsage` |
| `licenseName` | `rawLicenseName` と `allowRedistribution` / `modification` の参考値 |
| `otherPermissionUrl` | `otherPermissionUrl` |
| `otherLicenseUrl` | `otherLicenseUrl` |

0.xの `licenseName` はCreative Commons系を含むが、1.0の `allowRedistribution` / `modification` とは完全には一致しない。UIでは「0.x licenseName」として原文表示し、強い自動判定は避ける。

### 1.0 からのマッピング

基本的に同名で写せる。未指定項目は仕様上のデフォルトを補う。

| VRM 1.0未指定項目 | 補う値 |
| --- | --- |
| `avatarPermission` | `onlyAuthor` |
| `allowExcessivelyViolentUsage` | `false` |
| `allowExcessivelySexualUsage` | `false` |
| `commercialUsage` | `personalNonProfit` |
| `allowPoliticalOrReligiousUsage` | `false` |
| `allowAntisocialOrHateUsage` | `false` |
| `creditNotation` | `required` |
| `allowRedistribution` | `false` |
| `modification` | `prohibited` |

## VPlant3Dでの実装案

### Phase 1: 表示のみ

VRMロード後に `vrm.meta` を正規化し、Control Pageに「モデル利用条件」カードを表示する。

表示する内容:

- モデル名
- 作者
- VRMバージョン
- アバター利用: 全員 / 明示許諾者のみ / 作者のみ / 不明
- 商用利用: 個人非営利のみ / 個人営利可 / 法人可 / 0.x allow/disallow / 不明
- クレジット表記: 必要 / 不要 / 不明
- 改変: 禁止 / 改変可 / 改変と改変版再配布可 / 不明
- 再配布: 可 / 不可 / 不明
- 注意用途: 暴力 / 性的 / 政治宗教 / 反社会的ヘイト
- ライセンスURL
- その他URL

### Phase 2: 警告バッジ

OBSアプリとして最初に警告したい項目:

- `avatarPermission !== everyone`
  - 配信者本人が作者/購入者であれば問題ない場合もあるので、読み込み禁止ではなく警告。
- `commercialUsage` が `personalNonProfit` / `disallow`
  - 収益化配信では重要。
- `creditNotation === required`
  - 配信画面または概要欄にクレジットが必要な可能性。
- `otherLicenseUrl` / `otherPermissionUrl` がある
  - 追加条件を読む必要がある。

### Phase 3: ユーザー確認

読み込み後、危険度が高い場合だけ「このモデルの利用条件を確認しました」チェックを出す。

ただし、アプリが法的判断を代行するべきではない。文言は「利用条件を確認してください」「収益化配信の場合はライセンスURLを確認してください」に留める。

## 実装上の注意

- `@pixiv/three-vrm` の `VRM.meta` は `VRM0Meta | VRM1Meta`。
- `metaVersion` で型分岐する。
- VRM 0.xはフィールド名に `Ussage` という綴りがある。
- VRM 1.0は未指定時のデフォルトが仕様にある。アプリ内では必ず補完して表示する。
- サムネイルは0.xが `texture?: THREE.Texture`、1.0が `thumbnailImage?: HTMLImageElement`。最初の実装では表示対象から外してよい。
- 0.xのCreative Commons系 `licenseName` は1.0の `allowRedistribution` / `modification` に完全変換しない。原文表示を優先する。
- VRMAやMToonなどの描画機能とは独立した純粋ロジックにできるので、正規化関数はunit test向き。

## 推奨ファイル構成

- `src/vrm/vrm-license-meta.ts`
  - `normalizeVrmLicenseMeta(meta: VRMMeta): NormalizedVrmLicenseMeta`
  - `createVrmLicenseWarnings(meta: NormalizedVrmLicenseMeta): VrmLicenseWarning[]`
- `test/vrm-license-meta.test.ts`
  - 0.x everyone/allowケース
  - 0.x only author/disallowケース
  - 1.0 defaults補完
  - 1.0 corporation/redistribution/modificationケース
- `src/main.ts`
  - VRMロード成功時に正規化結果をstoreへ保存
  - Control PageのVRMカードまたは専用カードに表示

## UI文言案

- 見出し: `モデル利用条件`
- 安全寄り: `アバター利用: 全員に許可`
- 注意: `アバター利用: 作者のみ。利用権を確認してください`
- 注意: `商用利用: 個人非営利のみ。収益化配信ではライセンス確認が必要です`
- 注意: `追加ライセンスがあります`
- 注意: `クレジット表記が必要です`

