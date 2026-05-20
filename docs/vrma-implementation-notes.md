# VRMA Implementation Notes

最終更新日: 2026-05-20

## 採用API

VPlant3Dの最小VRMA再生では、`@pixiv/three-vrm-animation` `3.5.3` を使う。

参照した一次情報:

- `@pixiv/three-vrm-animation` API Reference: https://pixiv.github.io/three-vrm/docs/modules/three-vrm-animation
- `VRMAnimationLoaderPlugin`: https://pixiv.github.io/three-vrm/docs/classes/three-vrm-animation.VRMAnimationLoaderPlugin.html
- `createVRMAnimationClip`: https://pixiv.github.io/three-vrm/docs/functions/three-vrm-animation.createVRMAnimationClip.html
- installed package types: `node_modules/@pixiv/three-vrm-animation/types`

実装方針:

1. `GLTFLoader` に `VRMAnimationLoaderPlugin` をregisterする
2. `.vrma` を `GLTFLoader.parseAsync(arrayBuffer, '')` で読み込む
3. `gltf.userData.vrmAnimations[0]` を最初のモーションとして採用する
4. VRMモデルが読み込まれた状態で `createVRMAnimationClip(vrmAnimation, vrm)` を呼び、Three.js `AnimationClip` に変換する
5. `THREE.AnimationMixer(vrm.scene)` と `clipAction` で再生する
6. loop on/offは `AnimationAction.setLoop(THREE.LoopRepeat | THREE.LoopOnce, Infinity)` で切り替える

`createVRMAnimationClip` はVRMごとにclipを作るため、VRMを差し替えた場合は同じ `VRMAnimation` から新しいclipとmixerを作り直す。

## 現在の実装範囲

- Setup Modeでローカル `.vrma` ファイルを選べる
- `.vrma` 拡張子、空ファイル、サイズ上限、エラー文言を純ロジックとしてテストする
- VRMが読み込まれていない場合、VRMAのPlayボタンを無効化し、UIに「Load a VRM before playing VRMA.」を表示する
- Play / Stop / Loop on/offを提供する
- Playwright Chromiumで、Alicia VRM + VRMA_02を読み込み、Play/Stop状態まで確認する

## 制限

- 現時点では1つ目の `VRMAnimation` だけを使う
- タイムライン、seek、再生速度、複数モーションの切り替え、ブレンドは未実装
- 再生終了イベントをUI状態へ反映していない。Loop offで自然終了しても、UIはStopを押すまでplaying表示のままになる可能性がある
- モーション品質、足接地、手の破綻、表情の見え方は自動テストでは判定していない
- OBS Browser Source内でのVRMA再生品質は未確認

## 次の改善候補

- `AnimationMixer` の `finished` eventを拾い、Loop off時にUIをstoppedへ戻す
- 再生速度、restart、seek barを追加する
- VRMA候補リストまたは最近使ったファイルをlocalStorageに保存する
- モーション品質の目視確認結果を `docs/human-handoff-board.md` から反映する
- VRMA MotionPackを公開デモに使う場合、クレジット表記をREADMEまたは提出文へ入れる
