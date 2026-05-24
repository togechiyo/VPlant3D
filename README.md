# VPlant3D

VPlant3D for OBS is a lightweight VRM / VRMA 3D avatar layer for OBS Browser Source.

> VRM in OBS. Render only. OBS does the broadcast.

## Overview

VPlant3D is not an all-in-one VTuber streaming app. It is a focused 3D rendering layer that can be added to an existing OBS setup.

OBS handles streaming, recording, audio mixing, captions, comments, scene switching, and layout composition. VPlant3D focuses on showing a VRM avatar in 3D, playing simple motions, reacting to microphone volume, and creating a lightweight streaming-room look that can be placed directly inside OBS.

The project is designed for the VRM Awards / `#MadeWithVRM` online hackathon. It aims to fit both the Tool category, as an OBS-friendly VRM presentation tool, and the Experience category, as a small interactive avatar space for livestreams.

## Core Idea

- Load a VRM avatar in a browser-based 3D scene
- Use the app directly as an OBS Browser Source
- Support transparent background mode for overlay use
- React to microphone volume with simple mouth movement
- Load and play VRMA motion files
- Add camera-free idle life with auto blink, subtle sway, and one-button VRM expression presets
- Offer look / shader presets for quick visual direction
- Add Style Wall and Image Panel features for a simple streaming-room scene

## Scope

VPlant3D intentionally leaves broadcast features to OBS.

In scope:

- VRM avatar display
- VRMA motion playback
- transparent OBS overlay mode
- microphone-volume-based mouth movement
- camera-free auto blink / idle sway / expression preset controls
- simple camera and visual presets
- lightweight 3D room styling

Out of scope for the MVP:

- video export
- audio mixing
- comment fetching
- subtitle generation
- OBS scene control
- full-body tracking
- VRM editing or export
- complex timeline editing

## Planned Stack

- TypeScript
- Vite
- Tailwind CSS
- Zustand
- Three.js
- Three.js WebGPU Renderer
- `@pixiv/three-vrm`
- `@pixiv/three-vrm-animation`
- MediaPipe Tasks Vision
- Web Audio API
- OBS Browser Source

## Development

```bash
npm install
npm run dev
```

Local development server:

```text
http://127.0.0.1:5173/
```

`npm run dev` starts the VPlant3D local relay server. It wraps Vite and adds:

- `ws://127.0.0.1:5173/relay/ws` for Control-to-Render state sync
- `/relay/assets` for temporary local VRM / VRMA asset handoff

Useful checks:

```bash
npm run test
npm run test:e2e
npm run build
npm run lint
```

OBS-style URL examples:

```text
http://127.0.0.1:5173/?obs=1
http://127.0.0.1:5173/?obs=1&transparent=1
http://127.0.0.1:5173/?control=1
```

Setup Mode includes local `.vrm` and `.vrma` file inputs. Local model and motion files are loaded from the user's machine and are not committed to this repository. Multiple `.vrma` files can be loaded into motion slots, then replayed with one button from the Setup Dock.

OBS Browser Source is treated as the render-only output target. Camera, microphone, MediaPipe, and setup controls live on the Control / Capture page in Chrome, with the local relay sending avatar state and selected local assets to the OBS Render page.

Mic Reactive Mouth can request microphone access in Setup Mode and drive the loaded VRM's `aa` expression from microphone volume. It is simple RMS-based mouth movement, not phoneme lip sync.
For users who do not want camera-based mocap, Setup Mode also provides camera-free Auto Blink, Idle Sway, and one-button VRM expression presets.

MediaPipe Pose Debug can request camera access in Setup Mode and show upper-body pose landmarks as a skeleton-only overlay. The raw camera image is hidden to avoid face leaks. It is a verification spike for future neck/chest/shoulder tracking, not production VRM retargeting yet.
Mocap input can be mirrored in Setup Mode so the avatar response can match the user's camera intuition.
Face tracking can drive VRM blink, mouth, and simple emotion expressions from MediaPipe face blendshapes. Hand tracking currently draws a skeleton overlay for verification.
When a VRM is loaded, the default camera frames the avatar around the upper body for OBS-friendly VTuber use.
Setup Mode also includes Avatar Framing sliders for X/Y position, scale, and Y-axis rotation.

## Documentation

- [VRM Awards / #MadeWithVRM notes](./docs/vrm-award.md)
- [VPlant3D for OBS concept](./docs/vplant3d-for-obs.md)
- [OBS architecture redesign](./docs/obs-architecture-redesign.md)
- [OBS Relay ピクつき調査まとめ](./docs/obs-relay-debugging-retrospective.md)
- [Future desktop app and MCP considerations](./docs/future-desktop-and-mcp-considerations.md)
- [Third-party libraries](./docs/third-party-libraries.md)
- [VRMA implementation notes](./docs/vrma-implementation-notes.md)
- [Mic Reactive Mouth notes](./docs/mic-reactive-mouth-notes.md)
- [MediaPipe Pose Debug notes](./docs/mediapipe-pose-debug-notes.md)
- [Face and Hand Tracking notes](./docs/face-hand-tracking-notes.md)
- [Hand Retargeting Research](./docs/hand-retargeting-research.md)
- [MMD_modoki reference notes](./docs/mmd-modoki-reference.md)
- [Codex usage notes](./docs/codex-usage-2026-05-20.md)
- [Human handoff board](./docs/human-handoff-board.md)
- [TDD for Codex](./docs/tdd-for-codex.md)
- [Work log](./docs/work-log.md)
- [Submission checklist](./docs/submission-checklist.md)
- [Local assets](./docs/local-assets.md)
