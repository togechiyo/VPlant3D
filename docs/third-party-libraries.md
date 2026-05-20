# Third-Party Libraries

This document lists the planned third-party libraries and platform APIs for VPlant3D for OBS.

The project is still in the planning stage, so this is a candidate list. Exact versions and licenses should be verified when `package.json` is created and dependencies are installed.

## Runtime / Build

| Library / API | Role |
| --- | --- |
| TypeScript | Main implementation language. Used to keep rendering, VRM integration, and UI logic typed and maintainable. |
| Vite | Development server and frontend build tool. Used for fast local iteration and browser-based delivery. |
| Vitest | Unit test runner for TypeScript modules. |

## 3D Rendering

| Library / API | Role |
| --- | --- |
| Three.js | Core 3D rendering library. Used for scene, camera, lights, meshes, materials, and animation loop. |
| Three.js WebGPU Renderer | Planned renderer for modern browser rendering. Needs compatibility checks inside OBS Browser Source. |
| WebGL Renderer | Possible fallback if WebGPU is not stable in OBS Browser Source. |

## VRM / VRMA

| Library / API | Role |
| --- | --- |
| `@pixiv/three-vrm` | VRM model loading and runtime control for Three.js. Used for avatar display, expressions, humanoid bones, and VRM-specific behavior. |
| `@pixiv/three-vrm-animation` | VRMA loading and playback support for Three.js / VRM avatars. Used for idle motions, short reactions, and demo animations. |

## Input / Tracking

| Library / API | Role |
| --- | --- |
| MediaPipe Tasks Vision | Planned camera-based upper-body tracking. MVP can start with debug display or limited neck / chest / shoulder retargeting. |
| Web Audio API | Microphone input and RMS volume analysis for simple mouth movement. |
| MediaDevices API | Browser access to microphone and camera devices. |

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

- Create `package.json`.
- Install initial dependencies.
- Confirm licenses for all runtime dependencies.
- Test WebGPU support in OBS Browser Source.
- Decide whether WebGL fallback is required for the first public demo.

