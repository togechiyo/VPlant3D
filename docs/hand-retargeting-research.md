# Hand Retargeting Research

Last updated: 2026-05-24

## Purpose

VPlant3Dの現在のハンドトラッキングは、MediaPipe Hand Landmarkerの手指ランドマークから指カールと手首回転を作り、MediaPipe Pose Landmarkerの肩・肘・手首から腕のroll量を作っています。

しかし、この方式では「画面上の手首位置にVRMの手首を持っていく」ことはできません。ユーザー確認でも、意図した位置へ手首が来ない、肘や手首が不自然に残る、という問題が出ています。

この文書では、MediaPipeからVRMモデルへ腕・手のモーションを流し込む一般的な実装方針を整理します。

## References

Primary references:

- MediaPipe Hand Landmarker for Web: https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js
- MediaPipe Pose Landmarker for Web: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js
- MediaPipe Holistic Landmarker: https://ai.google.dev/edge/mediapipe/solutions/vision/holistic_landmarker
- MediaPipe HolisticLandmarkerResult: https://ai.google.dev/edge/mediapipe/api/solutions/js/tasks-vision.holisticlandmarkerresult
- VRM 1.0 humanoid specification: https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm-1.0/humanoid.md
- three-vrm `VRMHumanoid` type definitions: `node_modules/@pixiv/three-vrm-core/types/humanoid/VRMHumanoid.d.ts`

## MediaPipe Output Notes

### Hand Landmarker

Hand Landmarker returns:

- `landmarks`: 21 hand landmarks in normalized image coordinates
- `worldLandmarks`: 21 hand landmarks in world coordinates
- `handedness`: left/right classification

The normalized hand landmarks use image-space `x` and `y` in `0..1`. Their `z` depth is relative to the wrist origin and roughly scaled like `x`. The hand world landmarks are in meters, but their origin is the hand's geometric center.

This matters because hand world landmarks are excellent for local hand shape and palm orientation, but they are not enough by themselves to place the whole arm in avatar space. The origin is hand-local, not body-global.

### Pose Landmarker

Pose Landmarker returns:

- `landmarks`: 33 pose landmarks in normalized image coordinates
- `worldLandmarks`: 33 pose landmarks in world coordinates

The pose normalized `z` is relative to the midpoint of the hips. Pose world landmarks are better suited for shoulder, elbow, wrist, and torso relations than Hand Landmarker output.

### Holistic Landmarker

Holistic Landmarker combines pose, face, and hand tracking. Its result includes pose landmarks, pose world landmarks, left/right hand landmarks, and left/right hand world landmarks.

For VPlant3D, Holistic is worth considering later because it can provide synchronized body/hand/face output from one task. The current implementation uses separate Pose, Face, and Hand landmarker tasks, which makes timestamp alignment and cross-task coordinate interpretation more fragile.

## VRM Side Notes

VRM humanoid arms are defined as:

- `leftUpperArm` / `rightUpperArm`: base of upper arm
- `leftLowerArm` / `rightLowerArm`: elbow
- `leftHand` / `rightHand`: wrist

Finger bones are optional but available by name, for example:

- `leftThumbMetacarpal`
- `leftThumbProximal`
- `leftIndexProximal`
- `leftIndexIntermediate`
- `leftIndexDistal`

three-vrm exposes normalized humanoid bones via `currentVrm.humanoid.getNormalizedBoneNode(name)`. Its `update()` transfers normalized humanoid pose to the raw bones when `autoUpdateHumanBones` is enabled.

The important design point: arm placement should be solved on `UpperArm -> LowerArm -> Hand`. Finger curl should be solved separately on finger bones.

## Why The Current VPlant3D Method Fails

Current rough behavior:

- `src/mocap/pose-landmarks.ts` extracts shoulder, elbow, wrist summaries
- `src/mocap/upper-body-retarget.ts` turns those summaries into upper/lower arm roll values
- `src/mocap/hand-landmarks.ts` turns hand landmarks into finger curl and wrist pitch/yaw/roll
- `src/main.ts` applies arm roll to `LeftUpperArm`, `RightUpperArm`, `LeftLowerArm`, `RightLowerArm`
- `src/main.ts` applies wrist rotation to `LeftHand`, `RightHand`

This is not an IK solve. It does not ask, "where should the wrist be?" It only asks, "how much should the arm roll or bend?" As a result:

- hand position cannot be guaranteed
- elbow direction is only approximate
- hand-only landmarks cannot correct shoulder/elbow placement
- wrist rotation can look active while the actual avatar wrist is in the wrong place
- 2D normalized coordinates make depth and camera angle ambiguous

This is why the current方式 is fundamentally weak for visible hand placement.

## General Retargeting Pattern

For webcam-to-humanoid arm tracking, a practical pattern is:

1. Use body pose landmarks for arm endpoints
   - shoulder
   - elbow
   - wrist

2. Convert landmarks into a stable avatar-space target
   - normalize around torso center or shoulder center
   - scale by shoulder width
   - mirror explicitly when user-facing camera mode is enabled
   - keep camera depth small or heavily damped unless confidence is high

3. Solve arm with two-bone IK
   - upper arm length from VRM rest pose
   - lower arm length from VRM rest pose
   - target wrist position from MediaPipe pose wrist
   - elbow pole direction from MediaPipe elbow or a stable default pole
   - output rotations for upperArm and lowerArm

4. Apply wrist orientation separately
   - use Hand Landmarker palm basis
   - derive local palm normal and finger direction
   - blend with arm endpoint orientation
   - clamp heavily to avoid broken wrists

5. Apply finger curl separately
   - use hand-local landmarks
   - calculate finger joint angles or fingertip distances
   - map to VRM finger bones
   - do not use finger data to move the whole arm

6. Smooth and gate by confidence
   - smooth target wrist position, elbow pole, and finger curl separately
   - hold briefly on landmark loss
   - fade out only when hand/pose is lost for long enough
   - avoid resetting to neutral every missing frame

## Recommended Direction For VPlant3D

### Phase 1: Pose Wrist IK For Arms

Keep Hand Landmarker for fingers, but stop using hand landmarks to decide arm placement.

Use Pose Landmarker landmarks or world landmarks:

- shoulder: 11/12
- elbow: 13/14
- wrist: 15/16

Create a pure module, for example:

- `src/mocap/arm-ik-retarget.ts`

Suggested output:

```ts
interface ArmIkTarget {
  enabled: boolean;
  side: 'left' | 'right';
  shoulder: Vector3Like;
  elbow: Vector3Like;
  wrist: Vector3Like;
  pole: Vector3Like;
  confidence: number;
}
```

Then solve:

- rest upper arm length from VRM bone world positions
- rest lower arm length from VRM bone world positions
- target wrist position in avatar-local space
- upper/lower arm quaternion deltas

This should replace the current "arm lift to roll" mapping for arm tracking.

### Phase 2: Palm Orientation For Wrist

Use Hand Landmarker world landmarks for local orientation:

- wrist: 0
- index MCP: 5
- middle MCP: 9
- little MCP: 17

Build a palm basis:

- finger direction: wrist to middle MCP
- palm width direction: index MCP to little MCP
- palm normal: cross product of those two vectors

Map that basis to the VRM hand bone with strong clamps. The wrist should rotate after the arm IK has placed the hand.

### Phase 3: Finger Curl Refinement

Keep the existing finger curl idea, but make it more model-safe:

- calculate each finger curl from joint angles in hand-local coordinates
- apply small per-finger deadband
- smooth per finger
- optionally add "open / relaxed / fist" calibration presets later

### Phase 4: Holistic Landmarker Evaluation

If separate Pose + Hand tasks continue to create alignment issues, evaluate Holistic Landmarker.

Potential benefits:

- synchronized pose/face/hand inference result
- less cross-task timing mismatch
- one API shape for 33 pose + 468 face + 21 hand landmarks per hand

Risks:

- heavier runtime load
- model initialization changes
- may require retesting face and hand controls

## Implementation Sketch

### Coordinate Strategy

For the next implementation pass, use a 2.5D avatar-space approximation first. It is simpler and likely good enough for an OBS upper-body avatar.

Suggested conversion:

- origin: shoulder center
- scale: VRM shoulder width / MediaPipe shoulder width
- x: mirrored image x, centered around shoulder center
- y: inverted image y, centered around shoulder center
- z: pose world z or normalized z, clamped to a shallow range

This avoids trying to recover full 3D from a single webcam. For OBS, believable screen-space hand placement matters more than exact depth.

### Two-Bone IK Solver

The solver should:

- accept rest pose joint positions
- accept target wrist position
- accept pole direction
- clamp target distance to reachable arm length
- compute elbow bend using the law of cosines
- rotate upperArm toward the solved elbow
- rotate lowerArm toward the solved wrist

If full quaternion IK takes too long, a first version can use Three.js `Object3D.lookAt`-style direction quaternions against normalized bones, but it should still solve toward a target wrist position instead of roll-only mapping.

### Gating

Hand/arm tracking should be explicit:

- if `手の骨格` is off, do not apply hand or arm IK
- if pose wrist confidence is low, hold briefly then fade
- if hand landmarks are absent but pose wrist exists, keep arm IK and relax fingers
- if pose wrist is absent but hand exists, do not teleport arm from hand-local coordinates

## Proposed Tests

Pure tests should cover:

- mirrored left/right wrist target mapping
- wrist target clamped to reachable arm length
- elbow pole remains stable when wrist crosses the shoulder line
- missing hand landmarks do not move the arm
- missing pose wrist does not create fake wrist targets from hand-local coordinates
- finger curl remains independent from arm IK

## Open Questions

- Does MediaPipe Pose world landmark depth feel stable enough on the user's camera, or should VPlant3D use mostly 2D screen-space for arms?
- Should arm IK be enabled under the current `手の骨格` toggle, or should it become a separate `腕IK` toggle?
- Is Holistic Landmarker fast enough on the target machine with OBS and Chrome running together?
- Should the default be camera-free, with hand tracking opt-in only? Current UX says yes.

## Recommendation

Do not keep tuning the current roll-based arm retarget. It can make arms wiggle, but it cannot reliably place the wrist.

The next implementation should be a small arm IK spike:

1. Pose wrist target drives `upperArm` and `lowerArm`
2. Hand landmarks drive only wrist orientation and fingers
3. Hand tracking off disables both arm IK and finger retarget
4. Add debug overlay values for target wrist, solved wrist, and confidence

This gives us a much clearer path to "手首が意図した位置へ来る" behavior.
