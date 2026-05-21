# Face and Hand Tracking Notes

Last updated: 2026-05-21

## Purpose

This note records the first VPlant3D face/lip/hand tracking spike.

The goal is to add expressive input while preserving VTuber privacy:

- no raw camera image is shown
- face tracking drives VRM expressions
- hand tracking is displayed as a skeleton overlay first
- hand-to-VRM finger retargeting is deferred until the tracking quality is confirmed

## References

Primary references:

- VRM 1.0 expression specification: https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm-1.0/expressions.md
- VRM expression overview: https://vrm.dev/en/vrm1/expression/
- MediaPipe Face Landmarker for Web: https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js
- MediaPipe Hand Landmarker for Web: https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js

## Runtime APIs

Implemented wrapper:

- `src/mocap/mediapipe-face-hand.ts`

Runtime assets:

- Face model: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`
- Hand model: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`

Like the pose model, these are currently loaded from network URLs for development speed.

## Face Expression Mapping

Implemented pure logic:

- `src/mocap/face-expression-retarget.ts`

MediaPipe Face Landmarker can output blendshape categories. The first mapping uses a conservative subset:

- `eyeBlinkLeft` -> VRM `blinkLeft`
- `eyeBlinkRight` -> VRM `blinkRight`
- `jawOpen` -> VRM `aa`
- `mouthFunnel` / `mouthPucker` -> VRM `ou` and `oh`
- `mouthStretchLeft` / `mouthStretchRight` -> VRM `ih`
- `mouthSmileLeft` / `mouthSmileRight` -> VRM `happy` and a small `ee`
- `browInnerUp` / `browOuterUp*` -> VRM `surprised`

When Face expressions are active, Mic Reactive Mouth no longer writes the VRM `aa` expression so the two mouth drivers do not fight each other.

## Hand Tracking

Implemented pure logic:

- `src/mocap/hand-landmarks.ts`

Current behavior:

- detect up to two hands
- draw a green hand skeleton over the black debug panel
- show detected handedness labels in Setup Mode

Not implemented yet:

- VRM finger bone retargeting
- hand gestures mapped to avatar reactions
- wrist/arm IK

## UI

Inside `MediaPipe Pose Debug`:

- `Face expressions / lip sync`
- `Hand skeleton`
- `Mirror mocap input`

Face and hand options are chosen before `Start camera`. They are disabled while the camera pipeline is active so model startup/teardown remains predictable.

## Known Limitations

- The face and hand models add more CPU work. If frame rate drops, add separate start/stop controls or lower detection frequency.
- Face expression quality depends heavily on lighting, camera angle, and whether the user's face is visible enough to MediaPipe.
- Hand skeleton display is useful for confirmation, but hand-to-VRM retargeting needs more care to avoid uncanny finger motion.

## Next Steps

- Human verifies face expression/lip sync behavior in Chrome.
- Human verifies hand skeleton detection in Chrome.
- Tune face expression gains if blink or mouth is too strong/weak.
- Add hand gesture reactions before full finger retargeting if time is tight.
