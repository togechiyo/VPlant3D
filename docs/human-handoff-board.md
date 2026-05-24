# Human Handoff Board

最終更新日: 2026-05-24

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

### Todo: 人間のGoogle Chromeで腕IKハンドトラッキングを確認

- Owner: Human
- Needed by: ハンドトラッキングをMVP採用するか決める前
- Why: 手首位置、肘の曲がり、左右ミラー方向は実カメラと人間の動きで確認する必要があるため
- What to check:
  - `npm run dev` で `http://127.0.0.1:5173/?control=1` を開く
  - VRMを読み込む
  - `カメラ開始` を押す
  - `手の骨格` をonにする
  - 左右それぞれの手を上げる、下げる、左右へ動かす
  - 緑の手骨格/青い腕骨格に対して、VRMの手首が前より狙った位置へ近づくか見る
  - 肘が逆に曲がる、腕が反対側へ飛ぶ、左右が逆になる、手首だけ置いていかれる挙動がないか見る
  - `ミラー` on/offで直感に合う方向を確認する
  - `手の骨格` offで腕と指が止まり、変に動き続けないことを確認する
  - OBS Render `http://127.0.0.1:5173/?obs=1&transparent=1&debug=1` でも `armIK` debug行が出て、Control側の動きに追従するか見る

Notes:

- 初回実装は2.5D screen-space寄りの腕IK。奥行きの完全再現ではなく、配信画面上で手首位置が自然に見えることを優先している
- 大きく外れる場合は `arm-ik-target` のscale/gain、肘が裏返る場合はpole方向と左右signを調整する

### Todo: OBS Render debug overlayで表情同期を確認

- Owner: Human
- Needed by: OBS側の表情戻り問題の次修正前
- Why: Controller previewでは表情が正しく見えており、OBS Render側でだけ戻るため、OBS実機上で受信値とモデル挙動を同時に見る必要があるため
- What to check:
  - dev serverを起動する
  - OBS Browser Sourceで `http://127.0.0.1:5173/?obs=1&transparent=1&debug=1` を開く
  - Chrome Controlで `http://127.0.0.1:5173/?control=1` を開く
  - VRMを読み込む
  - 口を開けたままにして、overlayの `mouth aa/ih/ou/ee/oh` とモデルの口が同じように維持されるか見る
  - 目を閉じたままにして、overlayの `blink L/R` とモデルの目が同じように維持されるか見る
  - 口をオフ、まばたきをオフにした時、overlay値とモデルが勝手に動かないか見る
  - `dropped runtime/motion/expression` と `age` が増え続けないか見る

Notes:

- overlay値が安定しているのにモデルだけ戻るなら、次はVRM expression適用経路の一本化が必要
- overlay値そのものが戻っているなら、Control側の表情state解決を分離する

### Todo: 人間のGoogle ChromeでFace / Hand Trackingを確認

- Owner: Human or Codex with Chrome extension
- Needed by: フェイス/ハンド機能のMVP採否判断前
- Why: 顔表情、まばたき、口形状、手の映り方は実カメラ・照明・人間の動きで確認する必要があるため
- What to check:
  - `npm run dev` で `http://127.0.0.1:5173/` を開く
  - VRMを読み込む
  - `Face expressions / lip sync` と `Hand skeleton` がonになっていることを確認する
  - `Start camera` を押す
  - まばたきでVRMの目が閉じる
  - 口を開く、丸める、笑う動きでVRMの口/表情が変わる
  - マイク口パクとFace lip syncが同時に暴れない
  - 手をカメラに映すと緑の手骨格が出る
  - console errorがない

Notes:

- 現時点の手は骨格表示と初期の指カール反映まで実装済み。指の曲がる向きと強さは人間確認が必要
- Face tracking active中は、Mic Reactive Mouthはメーター表示は続けるがVRM `aa` への書き込みを止める

### Todo: 人間のGoogle ChromeでAvatar Framingを確認

- Owner: Human or Codex with Chrome extension
- Needed by: OBS画角調整前
- Why: 配信用の顔位置、体の入り方、角度は人間の見た目判断が必要なため
- What to check:
  - VRMを読み込む
  - `Avatar Framing` の X / Y / Scale / Rotate Y を動かす
  - 顔が中央ちょい上、上半身が見やすい位置に調整できる
  - `Reset framing` で初期値に戻る
  - VRMA再生やMediaPipe中に大きく破綻しない

Notes:

- 現時点ではブラウザlocalStorage保存は未実装。ページリロードで初期値に戻る

### Todo: 人間のGoogle ChromeでMediaPipeのVRM反映を確認

- Owner: Human or Codex with Chrome extension
- Needed by: 上半身モーションキャプチャーをMVP採用するか決める前
- Why: 肩・胴体の微小な動きがVRM上で自然かどうかは人間の目で確認する必要があるため
- What to check:
  - `npm run dev` で `http://127.0.0.1:5173/` を開く
  - VRMを読み込む
  - `MediaPipe Pose Debug` の `Start camera` を押す
  - `Mirror mocap input` がon/offで直感に合う方向を選べる
  - 肩を左右に傾ける、体を左右に少し寄せる
  - VRMの胸または首が控えめに追従する
  - 中央へ戻る補正が強すぎず、小さめの傾きでも反映される
  - 追従が強すぎない、弱すぎない、ガタガタしすぎない
  - VRMロード後の画角で顔が中央ちょい上に来る
  - `Stop camera` で姿勢が戻る
  - VRMA再生だけを使う時にMediaPipe停止状態で動きが壊れない

Notes:

- 現在は胸/upperChestと首のyaw/rollのみ。腕や頭位置の本格トラッキングは未実装
- 反応が弱い場合はgainをさらに上げる。強い場合はmax rotationとsmoothingを下げる

### Done: 人間のGoogle ChromeでMediaPipe Pose Debugを確認

- Owner: Human or Codex with Chrome extension
- Completed: 2026-05-21
- Needed by: 上半身モーションキャプチャーの採否判断前
- Why: カメラ権限、照明、実際の肩・胴体の動き、モデルダウンロード可否は人間の実操作が必要なため
- What was checked:
  - `npm run dev` で `http://127.0.0.1:5173/` を開く
  - `MediaPipe Pose Debug` の `Start camera` を押してカメラ権限を許可する
  - 鼻、肩、肘、手首、腰の点と線が大きく破綻せず追従する
  - `Upper body visibility` が体の映り方に応じて変わる
  - 肩を傾ける、左右に少し動く、前後に寄る動きでsummaryが更新される
  - console errorがない

Notes:

- カメラ画像が表示されるのはVTuber用途では顔バレリスクがあるため、骨組みだけ表示するUIへ変更する
- 現時点ではVRM骨への反映は未実装。あくまでカメラ許可とランドマーク品質確認用
- 初回はMediaPipeのWASM/modelをネットワークから取得するため、通信できない環境では失敗する可能性がある

### Done: 人間のGoogle ChromeでMic Reactive Mouthを確認

- Owner: Human or Codex with Chrome extension
- Completed: 2026-05-21
- Needed by: 口パクデモ調整前
- Why: マイク権限と実声入力はブラウザのユーザー操作と人間の発話が必要なため
- What was checked:
  - `npm run dev` で `http://127.0.0.1:5173/` を開く
  - Alicia VRMなどのVRMを読み込む
  - `Start mic` を押してマイク権限を許可する
  - 声を出すとLevel / Mouthメーターが動く
  - VRMの口が `aa` Expressionで開閉する
  - `Stop mic` でマイク使用が止まる
  - console errorがない

Notes:

- 現在はRMS音量ベースであり、音素解析ではない
- Chromeの権限表示とmacOS/OS側のマイク許可も確認する

### Todo: OBS Browser SourceでMic Reactive Mouthを確認

- Owner: Human
- Needed by: MVP提出前
- Why: OBS Browser Source内Chromiumでマイク権限、音声デバイス、透明背景、VRM表示が同時に動くか確認する必要があるため
- What to check:
  - `http://127.0.0.1:5173/` でVRMを読み込み、Start micできるか
  - `http://127.0.0.1:5173/?obs=1&transparent=1` で最終表示が崩れないか
  - OBS側の音声設定やBrowser Source権限で詰まらないか

Notes:

- OBSでSetup Modeから権限許可しづらい場合、Chromeで事前設定してOBS Modeへ移る運用を検討する

### Done: Playwright ChromiumでVRMAファイル選択とPlay/Stopを確認

- Owner: Codex
- Completed: 2026-05-20
- Why: `@pixiv/three-vrm-animation` とPlaywright Chromiumで、ローカルVRM + ローカルVRMAの最小再生操作が自動確認できるようになったため
- What was checked:
  - `local-assets/vrm/Alicia_VRM/Alicia/VRM/AliciaSolid.vrm` を読み込む
  - `local-assets/vrma/VRMA_MotionPack/vrma/VRMA_02.vrma` を読み込む
  - VRMAが `VRMA loaded.` になる
  - Playボタンで `VRMA playing.` になる
  - Stopボタンで `VRMA loaded.` に戻る
  - `?obs=1&transparent=1` ではSetup UIが非表示のまま

Notes:

- 自動確認は状態表示とブラウザエラー有無の確認であり、モーション品質の目視確認は別途必要

### Done: 人間のGoogle ChromeでVRMA再生品質を目視確認

- Owner: Human or Codex with Chrome extension
- Completed: 2026-05-21
- Needed by: VRMAデモ調整前
- Why: Playwright ChromiumではVRMAのロードと再生状態は確認できるが、動きの自然さ、手足の破綻、モデルサイズとの相性は人間の目で確認する必要があるため
- What was checked:
  - `npm run dev` で `http://127.0.0.1:5173/` を開く
  - Alicia VRMを読み込む
  - VRMA_02を読み込んでPlayする
  - 挨拶モーションとして見せられる品質か
  - Loop on/off時の見え方がデモとして違和感ないか
  - console errorがない

Notes:

- 公開デモに使う場合はVRMA MotionPackのクレジット表記確認も行う

### Done: Playwright ChromiumでVRMファイル選択と表示を確認

- Owner: Codex
- Completed: 2026-05-20
- Why: `@playwright/test` を導入し、Chromiumで実際にfile inputへローカルVRMを渡せるようになったため
- What to check:
  - `npm run test:e2e`
  - Setup Modeにcanvasと `Load local VRM` が出る
  - `?obs=1&transparent=1` ではSetup UIが出ずcanvasが残る
  - `local-assets/vrm/Alicia_VRM/Alicia/VRM/AliciaSolid.vrm` をfile inputに渡すと `VRM loaded.` になる

Notes:

- Node上でもAlicia VRMが `@pixiv/three-vrm` の `VRMLoaderPlugin` でパースできることを確認済み
- Playwright ChromiumでE2E確認済み
- ローカル確認用であり、Aliciaモデルの公開デモ利用は別途権利確認する

### Done: 人間のGoogle ChromeでVRM表示を目視確認

- Owner: Human or Codex with Chrome extension
- Completed: 2026-05-21
- Needed by: デモ調整前
- Why: Playwright Chromiumでは機械的な成功確認はできたが、人間が見る画角・ライティング・モデルサイズの印象確認は別途必要なため
- What was checked:
  - `npm run dev` で `http://127.0.0.1:5173/` を開く
  - Setup Modeの `Load local VRM` から `local-assets/vrm/Alicia_VRM/Alicia/VRM/AliciaSolid.vrm` を選ぶ
  - モデルの大きさ、位置、向き、ライティングが1920x1080想定で破綻していない
  - console errorがない

### Todo: VRM loader後のOBS Browser Source確認

- Owner: Human
- Needed by: MVP実装後
- Why: OBS Browser Source内Chromiumでローカルファイル入力、WebGL、透明背景、VRM描画がChromeと一致するか確認が必要なため
- What to check:
  - `http://127.0.0.1:5173/` でSetup ModeからVRMを選べるか
  - `http://127.0.0.1:5173/?obs=1&transparent=1` でUI非表示・背景透過が維持されるか
  - 1920x1080 Browser Source上でモデルの大きさと位置が破綻しないか

Notes:

- OBSでファイル入力を直接使いにくい場合は、localStorage設定またはURL指定ではなくSetup Modeで設定を保存してOBS Modeへ移る設計を検討する

### Todo: ChromeでVite foundationの表示確認

- Owner: Human or Codex with Chrome extension
- Needed by: foundation merge前または次作業前
- Why: このターンではCodex Chrome拡張の直接操作ツールが露出しておらず、実Chromeでの視認確認が未実施のため
- What to check:
  - `http://127.0.0.1:5173/`
  - `http://127.0.0.1:5173/?obs=1`
  - `http://127.0.0.1:5173/?obs=1&transparent=1`
  - Three.jsのキューブとグリッドが表示される
  - Setup ModeのダークUIが表示される
  - OBS ModeではSetup UIが消える
  - transparent modeで背景が透明になるか、少なくとも通常背景が消える
  - console errorがない

Notes:

- `npm run dev` でVite dev serverを起動する
- curlでHTTP 200は確認済み

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

### Todo: Control / Render分離後のOBS実機確認

- Owner: Human
- Needed by: Relay実装後
- Why: Playwright ChromiumではControl PageからOBS Render Page相当へのVRM relayは確認済みだが、OBS Browser Source内CEFでWebSocketと `/relay/assets` 取得が通るかは実機確認が必要なため
- What to check:
  - `npm run dev` を起動する
  - Chromeで `http://127.0.0.1:5173/?control=1` を開く
  - OBS Browser Sourceで `http://127.0.0.1:5173/?obs=1&transparent=1` を開く
  - Chrome側でVRMを読み込むとOBS側にも同じVRMが表示される
  - Chrome側の位置調整、表情、マイク口パク、カメラモーキャプがOBS側へ反映される
  - 背景が透明のままになる

Notes:

- OBS側ではカメラ/マイクを取らない設計に変更済み
- まずはVRM表示と位置調整の同期だけ通れば良い

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
