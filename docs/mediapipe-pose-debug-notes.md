# MediaPipe Pose Debug Notes

Last updated: 2026-05-20

## Purpose

This note records the first MediaPipe upper-body motion-capture spike for VPlant3D.

The MVP goal is not full retargeting yet. The current goal is to let a human verify:

- Chrome camera permission
- MediaPipe model loading
- landmark detection from a live camera
- whether shoulders, hips, and torso landmarks are plausible enough for later neck/chest/shoulder tracking

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
6. Draw upper-body landmark debug lines over the camera preview.

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

- camera preview
- landmark overlay for nose, shoulders, elbows, wrists, hips, and torso links
- status text for permission/model/loading errors
- upper-body visibility meter
- summary text with landmark count, visible upper-body landmark count, shoulder span, and torso lean

OBS Mode still hides the Setup UI.

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

- No VRM bone retargeting yet.
- Camera permission and real human movement still require manual confirmation.
- `detectForVideo()` runs synchronously on the main thread. Official docs note this can block UI; a Web Worker may be needed later.
- CPU delegate is safer for the spike but may be slower than GPU.
- The debug overlay is mirrored for user-facing camera intuition; retargeting math must be explicit about mirrored/non-mirrored coordinates later.

## Next Steps

- Human verifies camera permission and landmark stability in Chrome.
- Human checks whether shoulder/torso values are usable for a subtle avatar sway.
- If stable, implement a conservative retargeting path:
  - chest yaw/roll from shoulder line and torso lean
  - neck/head micro-follow from nose and shoulder center
  - smoothing and dead zones before touching VRM bones
- Add a toggle so motion capture can be enabled independently from the debug preview.
