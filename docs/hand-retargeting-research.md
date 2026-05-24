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

## Implementation Plan

### Goal

Replace the current roll-based arm retarget with a first wrist-targeted arm IK path that is good enough for human verification.

The first success condition is not perfect finger animation. It is:

- when the user raises, lowers, or moves a tracked hand sideways, the avatar wrist moves toward the intended screen-space position
- elbow bend follows the MediaPipe elbow direction instead of staying in a fixed decorative pose
- hand tracking off stops arm/hand tracking cleanly
- OBS Render receives the same arm target state as Control preview

### Non-Goals For The First Pass

- full 3D body reconstruction
- perfect depth placement from a single webcam
- physically exact shoulder/clavicle solving
- per-model hand calibration UI
- gesture recognition
- replacing Face/Pose/Hand tasks with Holistic immediately

### File-Level Plan

Add pure logic modules:

- `src/mocap/arm-ik-target.ts`
  - convert MediaPipe pose landmarks into side-specific arm targets
  - handle mirror input
  - calculate shoulder-centered 2.5D coordinates
  - calculate confidence from shoulder/elbow/wrist visibility
  - avoid creating a target when wrist visibility is too low

- `src/mocap/two-bone-arm-ik.ts`
  - clamp wrist target to reachable arm length
  - solve elbow position from target wrist and pole direction
  - expose small math helpers that are easy to unit test

- `src/vrm/apply-arm-ik.ts` or a local `src/main.ts` section at first
  - read VRM normalized bone rest/world positions
  - apply upper/lower arm quaternions from solved target
  - keep the first implementation close to existing rest quaternion handling

Extend existing modules:

- `src/mocap/pose-landmarks.ts`
  - expose raw arm landmark triplets or a `createArmLandmarkSummary` helper
  - include per-side visibility so IK can gate left/right independently

- `src/mocap/hand-landmarks.ts`
  - keep finger curl
  - keep wrist/palm orientation, but stop treating hand-only output as an arm position source

- `src/relay/messages.ts`
  - add an optional arm IK target payload only after the Control preview path works
  - keep backward compatibility with the current `upperBody` and `hands` payloads

- `src/relay/runtime-state.ts`
  - include the new arm target in `runtimeState` once the local path is stable

- `src/main.ts`
  - replace `trackArms: nextState.handTrackingEnabled` roll application with the new arm IK path
  - when hand tracking is off, call a single reset path for arm IK and finger tracking
  - display debug values in the hand/pose panel

### Data Shape

First pass target shape:

```ts
interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

interface ArmIkSideTarget {
  enabled: boolean;
  side: 'left' | 'right';
  shoulder: Vector3Like;
  elbow: Vector3Like;
  wrist: Vector3Like;
  pole: Vector3Like;
  confidence: number;
}

interface ArmIkRetargetPose {
  left: ArmIkSideTarget | null;
  right: ArmIkSideTarget | null;
}
```

Relay payload can later use a rounded version:

```ts
interface RelayArmIkTarget {
  wrist: Vector3Like;
  pole: Vector3Like;
  confidence: number;
}
```

Do not send raw 21-point hand landmarks through relay. Send only the retarget result needed by OBS Render.

### Coordinate Mapping Plan

Use Pose Landmarker normalized landmarks first. They are less physically exact than world landmarks, but they are visually predictable for OBS upper-body framing.

Mapping:

- origin: shoulder center
- scale: inverse shoulder span, clamped to avoid huge jumps
- x: landmark.x relative to shoulder center
- y: landmark.y relative to shoulder center, inverted for avatar space
- z: landmark.z relative to shoulder center, clamped to a shallow range
- mirror: swap left/right inputs and invert x in one explicit step

Suggested first values:

- min visibility: `0.35`
- min shoulder span: `0.08`
- max wrist reach scale: `1.0`
- z gain: `0.35`
- z clamp: `-0.25..0.25`
- target smoothing: `0.35`
- lost target hold: `120ms`

These should be constants in the pure module so tests can lock the behavior.

### IK Application Plan

For the first implementation, prefer a simple and stable solver over a beautiful one.

1. Capture rest world positions for:
   - shoulder: upperArm bone world position
   - elbow: lowerArm bone world position
   - wrist: hand bone world position

2. Compute rest lengths:
   - upper length: shoulder to elbow
   - lower length: elbow to wrist

3. Convert MediaPipe target into a local offset from the VRM shoulder.

4. Clamp target wrist distance:
   - max distance: `(upper + lower) * 0.98`
   - min distance: `abs(upper - lower) + small epsilon`

5. Use MediaPipe elbow as pole direction when confidence is good.

6. Solve a two-bone plane:
   - target direction from shoulder to wrist
   - pole projected onto plane perpendicular to target direction
   - elbow bend distance from law of cosines
   - solved elbow position

7. Apply rotations:
   - upper arm rotates from rest shoulder-to-elbow direction to solved shoulder-to-elbow direction
   - lower arm rotates from rest elbow-to-wrist direction to solved elbow-to-wrist direction
   - multiply each delta by the saved rest quaternion

8. Apply hand wrist orientation after arm IK.

If this first version has axis issues, keep the pure target solver and add a temporary debug mode that draws target wrist/solved wrist before applying bone rotations.

### UI Plan

Keep the user-facing control simple:

- default: `手の骨格` off
- when `手の骨格` is on:
  - enable arm IK
  - enable finger retarget
  - show skeleton overlay

Add compact debug/status text:

- `左手: 追跡中 0.72`
- `右手: 未検出`
- `手首IK: on`

Avoid adding more explanatory text to the main panel. Detailed instructions belong in docs or debug overlay.

### Test Plan

Add unit tests before wiring to VRM:

- `test/arm-ik-target.test.ts`
  - creates no target when wrist visibility is low
  - mirrors left/right consistently
  - normalizes around shoulder center
  - clamps shoulder span
  - produces stable z within configured clamp

- `test/two-bone-arm-ik.test.ts`
  - clamps unreachable wrist target
  - keeps solved wrist close to target after clamp
  - places elbow on the pole side
  - handles too-close wrist target without NaN
  - handles zero-length defensive inputs

Existing tests to keep green:

- `test/hand-landmarks.test.ts`
- `test/pose-landmarks.test.ts`
- `test/relay-runtime-state.test.ts`
- `test/relay-motion-interpolation.test.ts`

Run after implementation:

```bash
npm run test
npm run lint
npm run build
npm run test:e2e
```

### Browser Verification Plan

Automated tests cannot fully verify camera tracking quality. Use browser/OBS checks for the human-facing behavior.

Chrome Control page:

- open `http://127.0.0.1:5173/?control=1`
- load local VRM
- enable camera
- enable `手の骨格`
- raise left and right hand separately
- confirm avatar wrist follows the visible skeleton wrist better than the old roll-based behavior
- turn `手の骨格` off and confirm arms stop moving

OBS Render page:

- open `http://127.0.0.1:5173/?obs=1&transparent=1&debug=1`
- confirm runtime sequence advances
- confirm arm IK target state is present when enabled
- confirm target state disappears or becomes disabled when `手の骨格` is off

### Rollout Steps

1. Add pure arm target extraction and tests.
2. Add pure two-bone IK math and tests.
3. Wire Control preview only, behind the existing `手の骨格` toggle.
4. Add debug drawing/status for target wrist and solved wrist.
5. Replace OBS runtime payload for arms after Control behavior is plausible.
6. Run full checks.
7. Ask for human camera verification.

### Risk Notes

- VRM arm bone local axes vary enough that quaternion application may need per-side sign correction.
- Single-camera depth is inherently weak; first pass should optimize for screen-space wrist position.
- Hand and Pose tasks can disagree on wrist location. Use Pose wrist for arm position, Hand wrist only for palm orientation.
- If performance drops, evaluate Holistic Landmarker or reduce hand detection frequency.
- If arms flip when crossing the torso, add pole hysteresis and side-specific elbow constraints.
