# TDD for Codex

最終確認日: 2026-05-20

## 目的

VPlant3D for OBSでは、短期ハッカソン開発をCodex主導で進める。

コーディングエージェントは、明確な期待値、短いフィードバックループ、検証コマンドがあるほど進めやすい。そのため、実装可能な範囲ではテスト駆動開発（TDD）の考え方を採用する。

ただし、3D描画、OBS Browser Source、WebGPU、MediaPipe、マイク・カメラ権限などは、すべてを自動テストに閉じ込めるのが難しい。VPlant3Dでは、純ロジックはTDD、ブラウザ・OBS・人間の目が必要な領域は実機確認、という分担で進める。

## t-wadaさんのTDD理解

t-wadaさんは、日本におけるTDDの第一人者であり、Kent Beck『テスト駆動開発』の訳者でもある。

t-wadaさんのブログで翻訳・解説されているKent BeckのTDD定義では、TDDは単なる「先にテストを書く」作業ではなく、システムを以下の状態へ導くためのワークフローとして説明されている。

- それまで動作していたものは引き続きすべて動作する
- 新しい振る舞いは期待通りに動作する
- システムはさらなる変更の準備ができている
- プログラマと同僚がその状態に自信を持てる

重要なのは、TDDにはRed-Green-Refactorの前に「テストリスト」があること。つまり、いきなりテストコードを書き始めるのではなく、まず期待する振る舞いをリストアップし、その中から「ひとつだけ」選んで自動テストにする。

## TDDの基本サイクル

VPlant3Dでは、TDDを以下の流れとして扱う。

1. テストリストを作る
2. テストリストからひとつだけ選ぶ
3. 失敗するテストを書く
4. テストが失敗することを確認する
5. テストを通す最小限の実装を書く
6. テストが通ることを確認する
7. テストが通ったままコードとテストを整理する
8. 次のテストリスト項目へ進む

一般に Red-Green-Refactor と呼ばれるが、このプロジェクトではより正確に「List-Red-Green-Refactor」として扱う。

## CodexとTDDの相性

CodexにとってTDDが役立つ理由は以下。

- 期待する振る舞いがテストとして明文化される
- Codexが「どこまで実装すればよいか」を判断しやすい
- 変更後に `npm run test` で退行を検出できる
- リファクタリング時に動作を守りやすい
- 長時間作業や `/goal` の停止条件にしやすい
- サブエージェントに「このテストを通して」と渡しやすい

特に、Codexは「曖昧なUIの好み」より「失敗しているテストを通す」作業のほうが得意である。TDDはコーディングエージェントに対して、目的、制約、完了条件を与える役割を持つ。

## VPlant3DでTDD向きの領域

以下は自動テストしやすい。

- URL query parsing
- OBS Mode判定
- transparent mode判定
- 設定値の正規化
- localStorage用config schema
- マイクRMSの計算
- attack / release smoothing
- mouth opennessの0.0-1.0正規化
- Look presetの選択ロジック
- Style Wall presetのデータ変換
- Image Panel配置プリセット
- VRMA再生状態の状態遷移
- エラー分類、ユーザー向けメッセージ生成

これらは `test/` にVitestの単体テストを置き、先にテストを書いてから実装する。

## VPlant3DでTDDだけでは足りない領域

以下は自動テストだけでは不十分。

- Three.js / WebGPUの実描画
- OBS Browser Sourceでの透明背景
- ChromeとOBS内Chromiumの差分
- VRMモデルの見た目
- VRMAリターゲット品質
- マイク権限
- カメラ権限
- MediaPipeの姿勢認識
- UIの視認性や操作感

これらは次の確認を組み合わせる。

- Chrome拡張を使った実ブラウザ確認
- in-app browserでの素早い確認
- OBS本体でのBrowser Source確認
- スクリーンショット確認
- Human Handoff Boardへの人力確認依頼

## テストリストの例

### OBS Mode

- `?obs=1` ならSetup UIを隠す
- `?obs=true` でもOBS Modeとして扱うかを決める
- `?transparent=1` なら背景透過を有効にする
- 不明なqueryは無視する
- OBS Modeではpointer-eventsを無効にする

### Mic Reactive Mouth

- 無音ならmouth valueは0になる
- RMSがしきい値未満なら0になる
- RMSが大きいほどmouth valueが大きくなる
- mouth valueは0.0-1.0にclampされる
- attackは素早く反応する
- releaseはゆっくり下がる
- NaNやInfinityは安全に0へ丸める

### Presets

- 存在するLook preset IDを選べる
- 不明なpreset IDならdefaultへ戻る
- transparent modeでは重いpost effectを無効化する
- Style Wallのgrid/dots/stripes設定をCSS/scene設定へ変換できる

## Codexへの依頼テンプレート

TDDで実装させるときは、以下のように依頼する。

```text
docs/tdd-for-codex.md の方針に従って、[対象機能] をTDDで実装してください。
まずテストリストを短く作り、1つ目の失敗するVitestを書いて、失敗を確認してから最小実装してください。
各サイクルで npm run test を実行し、最後に npm run build も確認してください。
描画や実機確認が必要な項目は docs/human-handoff-board.md に記録してください。
```

`/goal` と組み合わせる場合:

```text
/goal Implement [feature] using List-Red-Green-Refactor. Read AGENTS.md and docs/tdd-for-codex.md first. Stop when the test list items for [feature] pass in Vitest, npm run build succeeds, and any browser/manual checks are documented in docs/human-handoff-board.md.
```

## 運用ルール

- すべてをTDDにしようとしない
- 純ロジックはできるだけTDDにする
- 3D描画やブラウザ権限は実機確認と組み合わせる
- テストは実装詳細より外部から見た振る舞いを確認する
- private関数を直接テストするより、公開された小さな関数やモジュール境界をテストする
- テストが書きにくい場合は、まず責務分離を疑う
- Greenにする段階では最小実装でよい
- Refactorはテストが通っている状態で行う
- テストが信頼を増やさないなら、テストの形を見直す

## VPlant3Dでの結論

Codex主導のVPlant3D開発では、TDDを積極的に使う。

ただし、対象を選ぶ。

- `audio`、`obs`、`config`、`presets`、`state` はTDD向き
- `render`、`vrm`、`vrma` は薄い状態管理やエラー処理をテストし、実描画はブラウザ確認する
- `mediapipe` は純粋な変換ロジックだけテストし、認識品質は人間が確認する

つまり、TDDは「Codexが安心して進むためのレール」として使う。すべてを自動化するためではなく、短いフィードバックで動くものを守りながら育てるために使う。

## 参考リンク

- [t-wadaのブログ: 〖翻訳〗テスト駆動開発の定義](https://t-wada.hatenablog.jp/entry/canon-tdd-by-kent-beck)
- [t-wadaのブログ: 動作するきれいなコード](https://t-wada.hatenablog.jp/entry/clean-code-that-works)
- [Agile Journey: テスト駆動開発のはじめの一歩｜t_wadaさんに聞く](https://agilejourney.uzabase.com/entry/2023/11/30/103000)
- [t-wadaのブログ: 新訳版『テスト駆動開発』が出ます](https://t-wada.hatenablog.jp/entry/tddbook)

