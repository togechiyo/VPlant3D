# Third-Party Libraries

This document lists the third-party libraries and platform APIs for VPlant3D for OBS.

Last updated: 2026-05-20

Versions and licenses below were verified from installed package metadata in `node_modules`.

## Runtime / Build

| Package | Version | License | Role |
| --- | ---: | --- | --- |
| `typescript` | `6.0.3` | Apache-2.0 | Main implementation language. Used to keep rendering, VRM integration, and UI logic typed and maintainable. |
| `vite` | `8.0.13` | MIT | Development server and frontend build tool. Used for fast local iteration and browser-based delivery. |
| `vitest` | `4.1.7` | MIT | Unit test runner for TypeScript modules. |
| `eslint` | `10.4.0` | MIT | Linting. |
| `typescript-eslint` | `8.59.4` | MIT | TypeScript-aware ESLint rules. |
| `@eslint/js` | `10.0.1` | MIT | ESLint JavaScript recommended config. |
| `@types/node` | `25.9.1` | MIT | Node.js type declarations for tooling config. |
| `tailwindcss` | `4.3.0` | MIT | Utility-first CSS framework for Setup Mode UI. |
| `@tailwindcss/vite` | `4.3.0` | MIT | Tailwind CSS v4 Vite plugin. |
| `zustand` | `5.0.13` | MIT | Lightweight state store. Used through `zustand/vanilla` so the app can stay framework-free. |

## 3D Rendering

| Package / API | Version | License | Role |
| --- | ---: | --- | --- |
| `three` | `0.184.0` | MIT | Core 3D rendering library. Used for scene, camera, lights, meshes, materials, and animation loop. |
| `@types/three` | `0.184.1` | MIT | Type declarations for Three.js. |
| Three.js WebGPU Renderer | n/a | n/a | Planned renderer for modern browser rendering. Needs compatibility checks inside OBS Browser Source. |
| WebGL Renderer | n/a | n/a | Current foundation renderer and possible fallback if WebGPU is not stable in OBS Browser Source. |

## VRM / VRMA

| Package | Version | License | Role |
| --- | ---: | --- | --- |
| `@pixiv/three-vrm` | `3.5.3` | MIT | VRM model loading and runtime control for Three.js. Used for avatar display, expressions, humanoid bones, and VRM-specific behavior. |
| `@pixiv/three-vrm-animation` | `3.5.3` | MIT | VRMA loading and playback support for Three.js / VRM avatars. Used for idle motions, short reactions, and demo animations. |

## Input / Tracking

| Package / API | Version | License | Role |
| --- | ---: | --- | --- |
| `@mediapipe/tasks-vision` | `0.10.35` | Apache-2.0 | Planned camera-based upper-body tracking. MVP can start with debug display or limited neck / chest / shoulder retargeting. |
| Web Audio API | n/a | n/a | Browser API for microphone input and RMS volume analysis for simple mouth movement. |
| MediaDevices API | n/a | n/a | Browser API for microphone and camera devices. |

## OBS Integration

| Platform | Role |
| --- | --- |
| OBS Browser Source | Target runtime surface. VPlant3D should run as a browser source with transparent background support. |
| URL query parameters | Planned control surface for OBS mode, transparent mode, and preset selection. Example: `?obs=1&transparent=1`. |
| localStorage | Lightweight local configuration persistence for MVP. |
| JSON config | Future portable configuration format for sharing presets and setups. |

## Assets / Panels

| Feature | Role |
| --- | --- |
| Style Wall | CSS-like background wall presets for simple streaming-room composition. |
| Image Panel | Image-on-plane feature for logos, posters, announcements, and simple 3D scene dressing. |

## Not Planned For MVP

The following libraries or capabilities are intentionally out of scope for the MVP.

| Library / Capability | Reason |
| --- | --- |
| Electron | The app should first run as a plain browser app for OBS Browser Source. |
| MediaBunny | Video export is not part of the MVP. OBS handles recording and streaming. |
| ffmpeg | Video/audio processing is left to OBS. |
| Comment client SDKs | Comment fetching is outside the MVP. Existing OBS widgets can handle comments. |
| Timeline editors | VPlant3D is a render layer, not a full animation editor. |

## Follow-Up Tasks

- Keep this file updated when dependencies are added, removed, or upgraded.
- Test WebGPU support in OBS Browser Source.
- Decide whether WebGL fallback is required for the first public demo.
