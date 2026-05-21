# MediaPipe Pose Debug Notes

Last updated: 2026-05-20

## Purpose

This note records the first MediaPipe upper-body motion-capture spike for VPlant3D.

The MVP goal is not full retargeting yet. The current goal is to let a human verify:

- Chrome camera permission
- MediaPipe model loading
- landmark detection from a live camera
- whether shoulders, hips, and torso landmarks are plausible enough for subtle neck/chest/shoulder tracking

## Adopted API

Official reference:

- MediaPipe Pose Landmarker for Web: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js
- Installed package: `@mediapipe/tasks-vision` `0.10.35`

Implemented wrapper:

- `src/mocap/mediapipe-pose-debug.ts`

Runtime flow:

1. Request camera with `navigator.mediaDevices.getUserMedia({ video, audio: false })`.
2. Create MediaPipe vision fileset with `FilesetResolver.forVisionTasks()`.
3. Create `PoseLandmarker` with `PoseLandmarker.createFromOptions()`.
4. Use `runningMode: 'VIDEO'`.
5. On animation frames, call `poseLandmarker.detectForVideo(video, timestampMs)`.
6. Draw upper-body landmark debug lines over a skeleton-only panel.

The first spike uses CPU delegate to avoid fighting the existing Three.js WebGL context.

## Runtime Assets

For the spike, the MediaPipe WASM files and pose model are loaded from public URLs:

- WASM: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm`
- Model: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`

This is acceptable for development verification, but not ideal for an OBS demo that should keep working offline or under network trouble.

Production follow-up:

- decide whether to vendor the `.wasm` and `.task` files into a non-GitHub local/public asset flow
- or document that the demo requires network access

## Current UI

Setup Mode now includes `MediaPipe Pose Debug`:

- skeleton-only preview. The raw camera image is intentionally hidden because face leaks are unacceptable for VTuber workflows
- landmark overlay for nose, shoulders, elbows, wrists, hips, and torso links
- status text for permission/model/loading errors
- upper-body visibility meter
- summary text with landmark count, visible upper-body landmark count, shoulder span, and torso lean

OBS Mode still hides the Setup UI.

## VRM Retargeting Spike

The current implementation applies a conservative retargeting pass while MediaPipe Pose Debug is active and a VRM is loaded.

Implemented behavior:

- chest or upperChest yaw from shoulder-vs-hip horizontal lean
- chest or upperChest roll from shoulder tilt
- neck yaw/roll as a smaller follow-through
- smoothing to reduce jitter
- automatic reset when Pose Debug stops or landmark visibility drops

This is intentionally small. It is meant to prove that the pipeline can move the avatar from camera landmarks without making the model look broken.

## Pure Logic

`src/mocap/pose-landmarks.ts` summarizes MediaPipe landmarks without browser dependencies.

It extracts:

- landmark count
- visible upper-body landmark count
- average upper-body visibility
- shoulder center
- hip center
- torso center
- shoulder span
- shoulder tilt
- torso lean

Tests live in `test/pose-landmarks.test.ts`.

## Known Limitations

- Retargeting is limited to subtle chest/upperChest and neck yaw/roll.
- Camera permission and real human movement still require manual confirmation.
- The hidden `<video>` element remains in the DOM as the MediaPipe input source, but it is rendered transparent; only canvas-drawn landmarks should be visible to the user.
- `detectForVideo()` runs synchronously on the main thread. Official docs note this can block UI; a Web Worker may be needed later.
- CPU delegate is safer for the spike but may be slower than GPU.
- The debug overlay is mirrored for user-facing camera intuition; retargeting math must be explicit about mirrored/non-mirrored coordinates later.

## Next Steps

- Human verifies camera permission and landmark stability in Chrome.
- Human checks whether the subtle avatar sway feels useful or needs stronger/weaker gain.
- If stable, add user-facing sensitivity controls and an on/off toggle separate from the debug panel.
- Add a toggle so motion capture can be enabled independently from the debug preview.
