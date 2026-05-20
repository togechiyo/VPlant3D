# MMD_modoki Reference Notes

Last checked: 2026-05-20

## Source

- GitHub: https://github.com/togechiyo/MMD_modoki
- Current v0.2.0 work branch observed on GitHub: `work/v0.2-dependency-upgrade`

## What MMD_modoki Is

MMD_modoki is a local editing tool inspired by MMD, built with Electron, Babylon.js, and `babylon-mmd`.

The public README describes the app as supporting:

- PMX / PMD model loading
- `.x` accessory loading
- VMD motion and camera VMD loading
- audio loading
- timeline editing for bones, morphs, camera, lighting, post effects, and accessories
- LUT import
- still image, PNG sequence, and WebM export
- multi-language UI

The v0.2.0 work branch currently appears focused on dependency upgrades, including Vite, Vitest, Babylon.js, and `babylon-mmd`.

## Useful Ideas For VPlant3D

VPlant3D should not copy MMD_modoki directly, but MMD_modoki is useful as a proven reference for a rich browser-rendered 3D authoring surface.

Useful areas to study:

- project structure for a TypeScript 3D app
- renderer initialization and render-loop ownership
- separation between scene state, UI controls, and file loaders
- asset loading error handling
- local editor/debug UI patterns
- effect / look preset organization
- LUT and visual preset thinking
- smoke-test and unit-test scripts
- third-party notice maintenance
- multilingual UI structure, if VPlant3D later needs localization

## What To Avoid Bringing Over

VPlant3D is intentionally not MMD_modoki for VRM.

The following MMD_modoki features should stay out of the MVP:

- Electron packaging
- desktop app lifecycle
- video export
- MediaBunny integration
- PNG sequence export
- PMX / PMD / VMD compatibility
- MMD timeline editing
- complex accessory editing
- audio track editing
- full local project editor behavior

OBS already handles streaming, recording, audio, layout, and scene switching. VPlant3D should stay focused on being a lightweight OBS Browser Source layer.

## Architectural Translation

| MMD_modoki Area | VPlant3D Interpretation |
| --- | --- |
| Electron desktop app | Plain Vite web app for OBS Browser Source |
| Babylon.js renderer | Three.js / WebGPU renderer |
| `babylon-mmd` MMD runtime | `@pixiv/three-vrm` and `@pixiv/three-vrm-animation` |
| PMX / PMD model loading | VRM model loading |
| VMD motion loading | VRMA motion loading |
| Timeline editor | Simple setup controls only |
| WebM / PNG export | OBS recording and streaming |
| LUT / post effects | Look / shader presets, kept transparent-friendly |
| Local editor UI | Setup Mode |
| Presentation / playback surface | OBS Mode |

## Branch Notes

The latest public `main` branch reports MMD_modoki `0.1.8`.

The observed v0.2.0 work branch is:

```text
work/v0.2-dependency-upgrade
```

Notable dependency direction in that branch:

- Vite upgraded from `^5.4.21` to `^7.3.3`
- Vitest upgraded from `^2.1.9` to `^4.1.6`
- Babylon.js packages upgraded from `8.45.3` to `9.2.0`
- `babylon-mmd` upgraded from `^1.1.0` to `^1.2.0`

These upgrades are useful context, but VPlant3D should choose dependencies based on OBS Browser Source compatibility rather than matching MMD_modoki.

## Practical Takeaway

MMD_modoki is the reference for how to organize a serious TypeScript 3D tool.

VPlant3D should borrow the discipline, not the scope:

- keep rendering state explicit
- keep loaders isolated
- keep UI controls separate from scene logic
- write small tests for pure modules
- maintain third-party notices
- avoid export/editor features unless they directly improve the OBS demo

