# OBS Relay ピクつき調査まとめ

2026-05-23から2026-05-24にかけて調査した、OBS Renderだけで瞬き・口・頭・体が0へ戻るように見える問題のまとめです。

## 背景

Control側のプレビューでは表情や姿勢が自然に見えるのに、OBS Render側だけで次のような症状が出ていました。

- 目を閉じたまま、口を開けたままが維持できず、毎フレーム0へ戻るように見える
- 頭や体の角度も、少しずつではなく小刻みに戻るように見える
- 照明やモデル位置もチカチカ、ブルブルして見える
- OBS側の動画書き出しでも症状が再現する

最初は「OBS Browser Sourceのフレームレート」「WebSocket 30FPS送信」「VRM expressionManagerの適用順」「補間や復帰補正」が疑わしく見えていました。

## 最終的にわかったこと

現時点で一番有力だった原因は、Relayがactive controlを誤認していたことです。

Relayは当初、最後に `hello: control` を送ったWebSocketをactive controlとして扱っていました。しかし実際には、そのControl socketがリアルタイム値を送っていないことがありました。その状態で、本当にruntimeStateを送っているControl socketが「古いControl」と判定され、`stale-control` として破棄されることがありました。

その結果、OBS Render側では最新のruntimeStateが届かず、古い値や0っぽい状態が混ざって見えていました。

現在は、active controlがリアルタイム送信者へ追従するように変更済みです。

- realtime stateを採用したControl socketをactive controlにする
- 既存active controlが直近1秒以内にrealtimeを送っている場合だけ、別Controlのrealtimeを破棄する
- active controlのhelloだけではなく、実際に送信しているsocketを優先する

ユーザー確認では、この修正後に「いいかんじに動く」状態まで改善しました。

## 効いたこと

### OBS Debug Overlay

`?obs=1&transparent=1&debug=1` でOBS Render上にdebug overlayを表示するようにしました。

表示対象は次の通りです。

- runtime / motion / expression sequence
- frame age
- dropped stale frame count
- `rx blink/aa`
- `target blink/aa`
- `set blink/aa`
- `after update blink/aa`
- head yaw / pitch / roll
- upper body summary
- hand summary
- WebSocket bufferedAmount

このoverlayにより、OBS Render内のどの段階で値が0になるかを見られるようになりました。

### Expression Pipeline Telemetry

表情値を4段階で比較しました。

- `rx`: OBSがruntimeStateとして受け取った値
- `target`: Render側のtarget stateへ採用した値
- `set`: VRM expressionManagerへsetした直後の値
- `after update`: `currentVrm.update()` 後の値

OBS動画では `rx = target = set = after update` が一致している場面がありました。これは、VRM update後に勝手に戻されているというより、OBSが受け取った時点で値が問題を含んでいる可能性が高い、という判断につながりました。

### Relay Debug Log

`/relay/debug-log` を追加し、Relay上の接続・採用・破棄・OBS sampleを後からJSONで確認できるようにしました。

記録対象は次の通りです。

- WebSocket connection / close
- `hello`
- realtime state accepted / rejected
- rejected reason
- socketId
- activeControlId
- sequence
- expression snapshot
- renderSample

これにより、OBS動画だけでは見えない「どのControl socketから来た値が採用されたか」を追えるようになりました。

### Active Control Follows Realtime Sender

最終的に効いた対処は、active controlをhello順ではなくrealtime送信実績で決めることでした。

関連コミット:

- `c7550d6 Add OBS expression pipeline telemetry`
- `e0f2195 Add relay debug log capture`
- `005b5cf Ignore realtime state from stale control clients`
- `a9146db Let active relay control follow realtime sender`

## 効かなかったこと

### OBS-Side Raw Zero Hold

OBS Render側で、0へ急に落ちる値を短時間保持する実験をしました。

狙いは「欠測0だけを隠す」ことでしたが、実際には追従性が悪化し、数秒止まるような挙動が出ました。原因のある場所が特定できていない段階でRender側に保持補正を重ねると、正常値まで遅延・固定してしまう危険があります。

この実験はrevert済みです。

関連:

- `f3aaf5e Document rollback of OBS runtime hold experiment`

### Smoothing Before Source Identification

表情や姿勢のピクつきに対して先にsmoothingを強めると、見た目は一瞬やわらぐ場合があります。ただし今回のように「そもそも別socketの値が混ざる」「正しいruntimeが破棄される」問題では、根本原因を隠してしまいます。

今後も、OBSだけで異常が出た場合は先にログを取り、どの段階で値が壊れているかを確認してから補正を入れる方針にします。

## 現在の確認手順

OBS側で同じような症状が再発した場合は、まず次の順で確認します。

1. relay serverつきで起動する

```bash
npm run dev
```

2. debug-logがJSONを返すことを確認する

```bash
curl -s http://127.0.0.1:5173/relay/debug-log | head
```

HTMLが返る場合は、Viteだけの古いサーバーか、古いプロセスに当たっている可能性があります。サーバーを止めて `npm run dev` を起動し直します。

3. ログを消す

```bash
curl -X DELETE http://127.0.0.1:5173/relay/debug-log
```

4. ControlとOBS Renderを開く

```text
http://127.0.0.1:5173/?control=1
http://127.0.0.1:5173/?obs=1&transparent=1&debug=1
```

5. 数秒再現してログを保存する

```bash
curl -s http://127.0.0.1:5173/relay/debug-log > /tmp/vplant-relay-debug-log.json
```

## ログの読み方

- `accepted: false` / `reason: "stale-control"` が多く、採用されるruntimeが進まない  
  active control判定を疑う。

- accepted runtimeのexpressionやposeがすでに0  
  Control側、MediaPipe入力、またはControl送信直前のruntime生成を疑う。

- `renderSample.rx` は正常で、`set` や `afterUpdate` だけ0  
  OBS Render側のVRM適用順、VRMA mixer、expressionManagerの上書きを疑う。

- `renderSample.runtimeSequence` が止まる  
  RelayからOBS RenderへruntimeStateが届いていない、または採用されていない。

- `/relay/debug-log` がHTMLを返す  
  relay serverではなくViteだけのサーバー、または古いプロセスを見ている可能性が高い。

## 設計上の学び

- OBS Renderは「受け取ったruntimeStateを描画するだけ」に寄せる
- Control側のプレビューとOBS Renderで、できるだけ同じruntimeStateを使う
- 互換用の `motionState` / `expressionState` は残すが、runtimeState受信後は後勝ちで上書きさせない
- realtime通信の問題は、見た目の補正より先にsequenceとsocketIdで追う
- 保持・補間・smoothingは、欠測の場所を特定した後に最小限だけ入れる
- OBS確認で問題が出たら、まずdebug overlayと `/relay/debug-log` をセットで取る

## 現在の安定点

2026-05-24時点では、relay serverつきの `npm run dev` で動かした状態で、OBS Renderのピクつきはユーザー確認上おおむね改善しています。

今後また同じ症状が出た場合は、先にログを保存してから修正します。昨日のように補正を重ねると悪化する可能性があるため、まずは「どこで0が入ったか」を確定させるのが最短です。
