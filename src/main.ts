import * as THREE from 'three';
import { VRMHumanBoneName, VRMUtils } from '@pixiv/three-vrm';
import type { VRM } from '@pixiv/three-vrm';
import { createVRMAnimationClip, VRMLookAtQuaternionProxy } from '@pixiv/three-vrm-animation';
import type { VRMAnimation } from '@pixiv/three-vrm-animation';

import { parseObsQuery } from './obs/query';
import type { AppState } from './state/app-store';
import { createAppStore } from './state/app-store';
import { MicReactiveMouth } from './audio/mic-reactive-mouth';
import {
  createAutoBlinkState,
  sampleAutoBlink,
  type AutoBlinkState,
} from './idle/auto-blink';
import { sampleIdleSway } from './idle/idle-sway';
import {
  createNeutralFaceExpressionWeights,
  createVrmFaceExpressionWeights,
  smoothFaceExpressionWeights,
} from './mocap/face-expression-retarget';
import { summarizeHandTracking } from './mocap/hand-landmarks';
import {
  createHeadRetargetPose,
  createNeutralHeadRetargetPose,
  smoothHeadRetargetPose,
} from './mocap/head-retarget';
import { summarizeUpperBodyPose } from './mocap/pose-landmarks';
import {
  createNeutralRetargetPose,
  createUpperBodyRetargetPose,
  defaultUpperBodyRetargetOptions,
  smoothUpperBodyRetargetPose,
} from './mocap/upper-body-retarget';
import type { MediaPipePoseDebug } from './mocap/mediapipe-pose-debug';
import type { MediaPipeFaceTracker, MediaPipeHandTracker } from './mocap/mediapipe-face-hand';
import type { VrmFaceExpressionWeights } from './mocap/face-expression-retarget';
import type { HeadRetargetPose } from './mocap/head-retarget';
import type { UpperBodyPoseSummary } from './mocap/pose-landmarks';
import type { UpperBodyRetargetPose } from './mocap/upper-body-retarget';
import { loadVrmFromFile, VrmLoadError } from './vrm/load-vrm';
import {
  vrmExpressionPresets,
  type VrmExpressionPresetId,
} from './vrm/expression-presets';
import {
  getUnknownVrmLoadErrorMessage,
  getVrmFileValidationMessage,
  validateVrmFile,
} from './vrm/vrm-file';
import { loadVrmaFromFile, VrmaLoadError } from './vrma/load-vrma';
import {
  getUnknownVrmaLoadErrorMessage,
  getVrmaFileValidationMessage,
  validateVrmaFile,
} from './vrma/vrma-file';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing #app root element');
}

const options = parseObsQuery(window.location.search);
const appStore = createAppStore(options);
const state = appStore.getState();

const viewport = document.createElement('section');
viewport.className = state.transparent
  ? 'viewport viewport--transparent'
  : 'viewport';

const renderer = new THREE.WebGLRenderer({
  alpha: state.transparent,
  antialias: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x101314, state.transparent ? 0 : 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.86;
renderer.domElement.className = 'scene-canvas';
viewport.append(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  35,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(0, 1.35, 4.2);
camera.lookAt(0, 1.25, 0);

const keyLight = new THREE.DirectionalLight(0xf4fbff, 1.75);
keyLight.position.set(0.35, 3.4, 4.2);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x38d5ff, 0.65);
rimLight.position.set(-3, 2, -2);
scene.add(rimLight);

const fillLight = new THREE.HemisphereLight(0xf2f7ff, 0x101314, 0.54);
scene.add(fillLight);
const lookAtCameraTarget = new THREE.Object3D();
lookAtCameraTarget.name = 'VPlant3DLookAtCameraTarget';
scene.add(lookAtCameraTarget);

const geometry = new THREE.BoxGeometry(1.4, 1.4, 1.4);
const material = new THREE.MeshStandardMaterial({
  color: 0x1c2224,
  emissive: 0x10251b,
  metalness: 0.4,
  roughness: 0.32,
});
const cube = new THREE.Mesh(geometry, material);
cube.position.set(0, 1, 0);
scene.add(cube);

const grid = new THREE.GridHelper(8, 16, 0x38d5ff, 0x263436);
grid.position.y = -0.2;
scene.add(grid);

let currentVrm: VRM | null = null;
let currentVrma: VRMAnimation | null = null;
let currentVrmaMixer: THREE.AnimationMixer | null = null;
let currentVrmaAction: THREE.AnimationAction | null = null;
const vrmaSlots: Array<{ name: string; duration: number; animation: VRMAnimation }> = [];
let selectedVrmaSlotIndex = -1;
let placeholderVisible = true;
let vrmStatusText: HTMLElement | null = null;
let vrmFileText: HTMLElement | null = null;
let avatarOffsetXInput: HTMLInputElement | null = null;
let avatarOffsetYInput: HTMLInputElement | null = null;
let avatarScaleInput: HTMLInputElement | null = null;
let avatarRotationYInput: HTMLInputElement | null = null;
let avatarOffsetXText: HTMLElement | null = null;
let avatarOffsetYText: HTMLElement | null = null;
let avatarScaleText: HTMLElement | null = null;
let avatarRotationYText: HTMLElement | null = null;
let vrmaStatusText: HTMLElement | null = null;
let vrmaFileText: HTMLElement | null = null;
let vrmaRequirementText: HTMLElement | null = null;
let vrmaPlayButton: HTMLButtonElement | null = null;
let vrmaStopButton: HTMLButtonElement | null = null;
let vrmaLoopInput: HTMLInputElement | null = null;
let vrmaSlotList: HTMLElement | null = null;
let micController: MicReactiveMouth | null = null;
let micStatusText: HTMLElement | null = null;
let micRequirementText: HTMLElement | null = null;
let micLevelBar: HTMLElement | null = null;
let micMouthBar: HTMLElement | null = null;
let micStartButton: HTMLButtonElement | null = null;
let micStopButton: HTMLButtonElement | null = null;
let poseController: MediaPipePoseDebug | null = null;
let poseStream: MediaStream | null = null;
let poseVideoElement: HTMLVideoElement | null = null;
let poseCanvasElement: HTMLCanvasElement | null = null;
let poseStatusText: HTMLElement | null = null;
let poseRequirementText: HTMLElement | null = null;
let poseSummaryText: HTMLElement | null = null;
let poseVisibilityBar: HTMLElement | null = null;
let poseStartButton: HTMLButtonElement | null = null;
let poseStopButton: HTMLButtonElement | null = null;
let poseMirrorInput: HTMLInputElement | null = null;
let faceTrackingInput: HTMLInputElement | null = null;
let handTrackingInput: HTMLInputElement | null = null;
let autoBlinkInput: HTMLInputElement | null = null;
let idleSwayInput: HTMLInputElement | null = null;
let expressionPresetText: HTMLElement | null = null;
let faceTrackingText: HTMLElement | null = null;
let handTrackingText: HTMLElement | null = null;
let poseAnimationFrameId: number | null = null;
let lastPoseVideoTime = -1;
let upperBodyRetargetPose = createNeutralRetargetPose(false);
let faceExpressionWeights = createNeutralFaceExpressionWeights();
let headRetargetPose: HeadRetargetPose = createNeutralHeadRetargetPose(false);
let autoBlinkState: AutoBlinkState = createAutoBlinkState(performance.now() / 1000);
let selectedExpressionPreset: VrmExpressionPresetId = 'neutral';
let autoBlinkEnabled = true;
let idleSwayEnabled = true;
let faceTracker: MediaPipeFaceTracker | null = null;
let handTracker: MediaPipeHandTracker | null = null;
const restBoneQuaternions = new Map<string, THREE.Quaternion>();
const avatarBasePosition = new THREE.Vector3();
const avatarBaseScale = new THREE.Vector3(1, 1, 1);
let avatarBaseRotationY = 0;
const idleArmBoneNames = [
  VRMHumanBoneName.LeftUpperArm,
  VRMHumanBoneName.RightUpperArm,
  VRMHumanBoneName.LeftLowerArm,
  VRMHumanBoneName.RightLowerArm,
  VRMHumanBoneName.LeftHand,
  VRMHumanBoneName.RightHand,
];

if (!state.obsMode) {
  const panel = document.createElement('aside');
  panel.className =
    'absolute inset-x-6 bottom-6 grid max-h-[34vh] gap-3 overflow-hidden rounded-lg border border-[rgba(113,255,191,0.22)] bg-[rgba(20,24,26,0.9)] p-3 text-[#eef4f2] shadow-[0_0_32px_rgba(56,213,255,0.08)] backdrop-blur-md';
  panel.innerHTML = `
    <div class="flex min-h-12 items-center gap-2 overflow-x-auto rounded-md border border-white/10 bg-black/25 p-2">
      <label class="inline-flex shrink-0 items-center gap-2 rounded-md border border-[#6dff9a]/30 bg-white/[0.03] px-3 py-2 text-sm font-bold text-[#9fa9aa]">
        <input id="face-tracking-input" class="h-4 w-4 accent-[#6dff9a]" type="checkbox" checked />
        Face expressions / lip sync
      </label>
      <label class="inline-flex shrink-0 items-center gap-2 rounded-md border border-[#6dff9a]/30 bg-white/[0.03] px-3 py-2 text-sm font-bold text-[#9fa9aa]">
        <input id="auto-blink-input" class="h-4 w-4 accent-[#6dff9a]" type="checkbox" checked />
        Auto blink
      </label>
      <label class="inline-flex shrink-0 items-center gap-2 rounded-md border border-[#38d5ff]/30 bg-white/[0.03] px-3 py-2 text-sm font-bold text-[#9fa9aa]">
        <input id="idle-sway-input" class="h-4 w-4 accent-[#38d5ff]" type="checkbox" checked />
        Idle sway
      </label>
      <button id="mic-start-button" class="shrink-0 rounded-md border border-[#6dff9a]/70 bg-transparent px-3 py-2 text-sm font-bold text-[#dfffee] transition enabled:hover:border-[#38d5ff] enabled:hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40" type="button">Start mic</button>
      <button id="mic-stop-button" class="shrink-0 rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-bold text-[#eef4f2] transition enabled:hover:border-[#38d5ff] disabled:cursor-not-allowed disabled:opacity-40" type="button">Stop mic</button>
      <button id="pose-start-button" class="shrink-0 rounded-md border border-[#38d5ff]/55 bg-[#38d5ff]/10 px-3 py-2 text-sm font-bold text-[#dff8ff] transition enabled:hover:border-[#6dff9a] enabled:hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40" type="button">Start camera</button>
      <button id="pose-stop-button" class="shrink-0 rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-bold text-[#eef4f2] transition enabled:hover:border-[#38d5ff] disabled:cursor-not-allowed disabled:opacity-40" type="button">Stop camera</button>
      <label class="inline-flex shrink-0 items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-bold text-[#9fa9aa]">
        <input id="pose-mirror-input" class="h-4 w-4 accent-[#38d5ff]" type="checkbox" checked />
        Mirror mocap input
      </label>
      <label class="inline-flex shrink-0 items-center gap-2 rounded-md border border-[#38d5ff]/30 bg-white/[0.03] px-3 py-2 text-sm font-bold text-[#9fa9aa]">
        <input id="hand-tracking-input" class="h-4 w-4 accent-[#38d5ff]" type="checkbox" checked />
        Hand skeleton
      </label>
      <span class="h-7 w-px shrink-0 bg-white/10"></span>
      <label class="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-[#6dff9a]/70 bg-transparent px-3 py-2 text-sm font-bold text-[#dfffee] transition hover:border-[#38d5ff] hover:bg-white/[0.04]">
        <input id="vrm-file-input" class="sr-only" type="file" accept=".vrm" />
        Load local VRM
      </label>
      <label class="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-[#38d5ff]/55 bg-[#38d5ff]/10 px-3 py-2 text-sm font-bold text-[#dff8ff] transition hover:border-[#6dff9a] hover:bg-white/[0.04]">
        <input id="vrma-file-input" class="sr-only" type="file" accept=".vrma" multiple />
        Load local VRMA
      </label>
      <button id="vrma-play-button" class="shrink-0 rounded-md border border-[#6dff9a]/70 bg-transparent px-3 py-2 text-sm font-bold text-[#dfffee] transition enabled:hover:border-[#38d5ff] enabled:hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40" type="button">Play</button>
      <button id="vrma-stop-button" class="shrink-0 rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-bold text-[#eef4f2] transition enabled:hover:border-[#38d5ff] disabled:cursor-not-allowed disabled:opacity-40" type="button">Stop</button>
      <label class="inline-flex shrink-0 items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-bold text-[#9fa9aa]">
        <input id="vrma-loop-input" class="h-4 w-4 accent-[#6dff9a]" type="checkbox" checked />
        Loop
      </label>
    </div>
    <div class="grid grid-flow-col auto-cols-[minmax(260px,340px)] items-start gap-3 overflow-x-auto overflow-y-hidden pb-1 [&>*]:max-h-[calc(34vh-88px)] [&>*]:overflow-y-auto">
    <div class="grid gap-3 rounded-md border border-[#6dff9a]/25 bg-black/20 p-3">
      <div class="grid gap-1">
        <span class="text-xs font-bold uppercase tracking-normal text-[#6dff9a]">Head / Face</span>
        <span class="text-[11px] font-bold uppercase tracking-normal text-[#9fa9aa]">Mic Reactive Mouth</span>
        <strong id="mic-status-text" class="text-sm font-bold text-[#eef4f2]">Microphone idle.</strong>
        <span id="mic-requirement-text" class="min-h-5 text-sm text-[#9fa9aa]">Load a VRM before testing mouth movement.</span>
      </div>
      <span id="face-tracking-text" class="text-xs font-bold text-[#9fa9aa]">Face tracking idle.</span>
      <div class="grid gap-2 rounded-md border border-white/10 bg-white/[0.03] p-2">
        <div class="flex items-center justify-between gap-3">
          <span class="text-xs font-bold uppercase tracking-normal text-[#6dff9a]">Expression preset</span>
          <span id="expression-preset-text" class="text-xs font-bold text-[#9fa9aa]">Neutral</span>
        </div>
        <div class="grid grid-cols-4 gap-2">
          <button class="expression-preset-button rounded-md border border-white/15 bg-white/[0.04] px-2 py-1.5 text-xs font-bold text-[#eef4f2] transition hover:border-[#38d5ff]" type="button" data-expression-preset="neutral">Neutral</button>
          <button class="expression-preset-button rounded-md border border-[#6dff9a]/55 bg-transparent px-2 py-1.5 text-xs font-bold text-[#dfffee] transition hover:border-[#38d5ff]" type="button" data-expression-preset="happy">Happy</button>
          <button class="expression-preset-button rounded-md border border-[#38d5ff]/55 bg-transparent px-2 py-1.5 text-xs font-bold text-[#dff8ff] transition hover:border-[#6dff9a]" type="button" data-expression-preset="surprised">Surprise</button>
          <button class="expression-preset-button rounded-md border border-white/15 bg-white/[0.04] px-2 py-1.5 text-xs font-bold text-[#eef4f2] transition hover:border-[#6dff9a]" type="button" data-expression-preset="relaxed">Relax</button>
        </div>
      </div>
      <div class="grid gap-2">
        <div class="grid gap-1">
          <div class="flex items-center justify-between text-xs font-bold text-[#9fa9aa]"><span>Level</span><span>RMS</span></div>
          <div class="h-2 overflow-hidden rounded-full bg-white/10"><div id="mic-level-bar" class="h-full w-0 rounded-full bg-[#38d5ff] transition-[width] duration-75"></div></div>
        </div>
        <div class="grid gap-1">
          <div class="flex items-center justify-between text-xs font-bold text-[#9fa9aa]"><span>Mouth</span><span>aa</span></div>
          <div class="h-2 overflow-hidden rounded-full bg-white/10"><div id="mic-mouth-bar" class="h-full w-0 rounded-full bg-[#6dff9a] transition-[width] duration-75"></div></div>
        </div>
      </div>
    </div>
    <div class="grid gap-3 rounded-md border border-[#38d5ff]/25 bg-black/20 p-3">
      <div class="grid gap-1">
        <span class="text-xs font-bold uppercase tracking-normal text-[#38d5ff]">Body Track</span>
        <span class="text-[11px] font-bold uppercase tracking-normal text-[#9fa9aa]">MediaPipe Pose Debug</span>
        <strong id="pose-status-text" class="text-sm font-bold text-[#eef4f2]">Camera idle.</strong>
        <span id="pose-requirement-text" class="min-h-5 text-sm text-[#9fa9aa]">Start camera to inspect upper-body landmarks.</span>
      </div>
      <div class="relative aspect-video overflow-hidden rounded-md border border-white/10 bg-[#0b0f10]">
        <video id="pose-video" class="h-full w-full scale-x-[-1] object-cover opacity-0" autoplay muted playsinline></video>
        <canvas id="pose-canvas" class="pointer-events-none absolute inset-0 h-full w-full scale-x-[-1]"></canvas>
        <div class="pointer-events-none absolute inset-x-0 bottom-0 bg-black/45 px-2 py-1 text-[11px] font-bold text-[#9fa9aa]">Camera image hidden. Skeleton only.</div>
      </div>
      <div class="grid gap-2">
        <div class="flex items-center justify-between gap-3 text-xs font-bold text-[#9fa9aa]">
          <span>Upper body visibility</span>
          <span id="pose-summary-text">Camera idle.</span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-white/10"><div id="pose-visibility-bar" class="h-full w-0 rounded-full bg-[#38d5ff] transition-[width] duration-75"></div></div>
      </div>
      <div class="grid gap-2 rounded-md border border-white/10 bg-white/[0.03] p-2">
        <span class="text-xs font-bold uppercase tracking-normal text-[#38d5ff]">Torso / upper arm retarget</span>
        <span class="text-xs font-bold text-[#9fa9aa]">Mirror and camera controls are in the toolbar.</span>
      </div>
    </div>
    <div class="grid content-start gap-3 rounded-md border border-[#38d5ff]/25 bg-black/20 p-3">
      <div class="grid gap-1">
        <span class="text-xs font-bold uppercase tracking-normal text-[#38d5ff]">Hand Track</span>
        <strong class="text-sm font-bold text-[#eef4f2]">Hand tracking status</strong>
        <span id="hand-tracking-text" class="text-xs font-bold text-[#9fa9aa]">Hand tracking idle.</span>
      </div>
    </div>
    <div class="grid gap-3 rounded-md border border-[#38d5ff]/25 bg-black/20 p-3">
      <div class="grid gap-1">
        <span class="text-xs font-bold uppercase tracking-normal text-[#6dff9a]">VRM Model</span>
        <strong id="vrm-status-text" class="text-sm font-bold text-[#eef4f2]">Choose a local .vrm file.</strong>
        <span id="vrm-file-text" class="min-h-5 text-sm text-[#9fa9aa]">No file selected.</span>
      </div>
    </div>
    <div class="grid gap-3 rounded-md border border-[#6dff9a]/25 bg-black/20 p-3">
      <div class="grid gap-1">
        <span class="text-xs font-bold uppercase tracking-normal text-[#6dff9a]">Avatar Framing</span>
      </div>
      <label class="grid gap-1 text-xs font-bold text-[#9fa9aa]">
        <span class="flex justify-between"><span>X</span><span id="avatar-offset-x-text">0.00</span></span>
        <input id="avatar-offset-x-input" class="accent-[#6dff9a]" type="range" min="-1" max="1" step="0.01" value="0" />
      </label>
      <label class="grid gap-1 text-xs font-bold text-[#9fa9aa]">
        <span class="flex justify-between"><span>Y</span><span id="avatar-offset-y-text">0.00</span></span>
        <input id="avatar-offset-y-input" class="accent-[#6dff9a]" type="range" min="-0.8" max="0.8" step="0.01" value="0" />
      </label>
      <label class="grid gap-1 text-xs font-bold text-[#9fa9aa]">
        <span class="flex justify-between"><span>Scale</span><span id="avatar-scale-text">1.00x</span></span>
        <input id="avatar-scale-input" class="accent-[#38d5ff]" type="range" min="0.7" max="1.7" step="0.01" value="1" />
      </label>
      <label class="grid gap-1 text-xs font-bold text-[#9fa9aa]">
        <span class="flex justify-between"><span>Rotate Y</span><span id="avatar-rotation-y-text">0°</span></span>
        <input id="avatar-rotation-y-input" class="accent-[#38d5ff]" type="range" min="-180" max="180" step="1" value="0" />
      </label>
      <button id="avatar-reset-button" class="rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-bold text-[#eef4f2] transition hover:border-[#38d5ff]" type="button">Reset framing</button>
    </div>
    <div class="grid gap-3 rounded-md border border-[#38d5ff]/25 bg-black/20 p-3">
      <div class="grid gap-1">
        <span class="text-xs font-bold uppercase tracking-normal text-[#38d5ff]">VRMA Motion</span>
        <strong id="vrma-status-text" class="text-sm font-bold text-[#eef4f2]">Choose a local .vrma file.</strong>
        <span id="vrma-file-text" class="min-h-5 text-sm text-[#9fa9aa]">No motion selected.</span>
        <span id="vrma-requirement-text" class="min-h-5 text-sm text-[#9fa9aa]">Load a VRM before playing VRMA.</span>
      </div>
      <div id="vrma-slot-list" class="grid gap-2"></div>
    </div>
    <ul class="m-0 grid list-none content-start gap-2 rounded-md border border-white/10 bg-black/20 p-3">
      <li class="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#9fa9aa]"><span>Setup Mode</span><strong class="font-bold text-[#6dff9a]">Active</strong></li>
      <li class="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#9fa9aa]"><span>OBS Mode</span><strong class="font-bold text-[#6dff9a]">${state.obsMode ? 'On' : 'Off'}</strong></li>
      <li class="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#9fa9aa]"><span>Transparent</span><strong class="font-bold text-[#6dff9a]">${state.transparent ? 'On' : 'Off'}</strong></li>
      <li class="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#9fa9aa]"><span>Render</span><strong class="font-bold text-[#6dff9a]">${state.rendererName}</strong></li>
    </ul>
    </div>
  `;

  const vrmFileInput = panel.querySelector<HTMLInputElement>('#vrm-file-input');
  const vrmaFileInput = panel.querySelector<HTMLInputElement>('#vrma-file-input');
  vrmStatusText = panel.querySelector<HTMLElement>('#vrm-status-text');
  vrmFileText = panel.querySelector<HTMLElement>('#vrm-file-text');
  avatarOffsetXInput = panel.querySelector<HTMLInputElement>('#avatar-offset-x-input');
  avatarOffsetYInput = panel.querySelector<HTMLInputElement>('#avatar-offset-y-input');
  avatarScaleInput = panel.querySelector<HTMLInputElement>('#avatar-scale-input');
  avatarRotationYInput = panel.querySelector<HTMLInputElement>('#avatar-rotation-y-input');
  avatarOffsetXText = panel.querySelector<HTMLElement>('#avatar-offset-x-text');
  avatarOffsetYText = panel.querySelector<HTMLElement>('#avatar-offset-y-text');
  avatarScaleText = panel.querySelector<HTMLElement>('#avatar-scale-text');
  avatarRotationYText = panel.querySelector<HTMLElement>('#avatar-rotation-y-text');
  const avatarResetButton = panel.querySelector<HTMLButtonElement>('#avatar-reset-button');
  vrmaStatusText = panel.querySelector<HTMLElement>('#vrma-status-text');
  vrmaFileText = panel.querySelector<HTMLElement>('#vrma-file-text');
  vrmaRequirementText = panel.querySelector<HTMLElement>('#vrma-requirement-text');
  vrmaPlayButton = panel.querySelector<HTMLButtonElement>('#vrma-play-button');
  vrmaStopButton = panel.querySelector<HTMLButtonElement>('#vrma-stop-button');
  vrmaLoopInput = panel.querySelector<HTMLInputElement>('#vrma-loop-input');
  vrmaSlotList = panel.querySelector<HTMLElement>('#vrma-slot-list');
  micStatusText = panel.querySelector<HTMLElement>('#mic-status-text');
  micRequirementText = panel.querySelector<HTMLElement>('#mic-requirement-text');
  micLevelBar = panel.querySelector<HTMLElement>('#mic-level-bar');
  micMouthBar = panel.querySelector<HTMLElement>('#mic-mouth-bar');
  micStartButton = panel.querySelector<HTMLButtonElement>('#mic-start-button');
  micStopButton = panel.querySelector<HTMLButtonElement>('#mic-stop-button');
  poseVideoElement = panel.querySelector<HTMLVideoElement>('#pose-video');
  poseCanvasElement = panel.querySelector<HTMLCanvasElement>('#pose-canvas');
  poseStatusText = panel.querySelector<HTMLElement>('#pose-status-text');
  poseRequirementText = panel.querySelector<HTMLElement>('#pose-requirement-text');
  poseSummaryText = panel.querySelector<HTMLElement>('#pose-summary-text');
  poseVisibilityBar = panel.querySelector<HTMLElement>('#pose-visibility-bar');
  poseStartButton = panel.querySelector<HTMLButtonElement>('#pose-start-button');
  poseStopButton = panel.querySelector<HTMLButtonElement>('#pose-stop-button');
  poseMirrorInput = panel.querySelector<HTMLInputElement>('#pose-mirror-input');
  faceTrackingInput = panel.querySelector<HTMLInputElement>('#face-tracking-input');
  handTrackingInput = panel.querySelector<HTMLInputElement>('#hand-tracking-input');
  autoBlinkInput = panel.querySelector<HTMLInputElement>('#auto-blink-input');
  idleSwayInput = panel.querySelector<HTMLInputElement>('#idle-sway-input');
  expressionPresetText = panel.querySelector<HTMLElement>('#expression-preset-text');
  faceTrackingText = panel.querySelector<HTMLElement>('#face-tracking-text');
  handTrackingText = panel.querySelector<HTMLElement>('#hand-tracking-text');

  vrmFileInput?.addEventListener('change', () => {
    const file = vrmFileInput.files?.[0] ?? null;
    void handleVrmFileSelection(file);
  });

  vrmaFileInput?.addEventListener('change', () => {
    const files = Array.from(vrmaFileInput.files ?? []);
    void handleVrmaFileSelection(files);
  });
  avatarOffsetXInput?.addEventListener('input', () => {
    appStore.getState().setAvatarOffsetX(Number(avatarOffsetXInput?.value ?? 0));
    applyAvatarTransform();
  });
  avatarOffsetYInput?.addEventListener('input', () => {
    appStore.getState().setAvatarOffsetY(Number(avatarOffsetYInput?.value ?? 0));
    applyAvatarTransform();
  });
  avatarScaleInput?.addEventListener('input', () => {
    appStore.getState().setAvatarScale(Number(avatarScaleInput?.value ?? 1));
    applyAvatarTransform();
  });
  avatarRotationYInput?.addEventListener('input', () => {
    appStore.getState().setAvatarRotationY(Number(avatarRotationYInput?.value ?? 0));
    applyAvatarTransform();
  });
  avatarResetButton?.addEventListener('click', () => {
    appStore.getState().resetAvatarTransform();
    applyAvatarTransform();
  });
  vrmaPlayButton?.addEventListener('click', startVrmaPlayback);
  vrmaStopButton?.addEventListener('click', stopVrmaPlayback);
  vrmaLoopInput?.addEventListener('change', () => {
    const loop = vrmaLoopInput?.checked ?? true;
    appStore.getState().setVrmaLoop(loop);
    syncVrmaLoopMode(loop);
  });
  micStartButton?.addEventListener('click', () => {
    void startMicReactiveMouth();
  });
  micStopButton?.addEventListener('click', stopMicReactiveMouth);
  poseStartButton?.addEventListener('click', () => {
    void startPoseDebug();
  });
  poseStopButton?.addEventListener('click', stopPoseDebug);
  poseMirrorInput?.addEventListener('change', () => {
    appStore.getState().setPoseMirrorInput(poseMirrorInput?.checked ?? true);
  });
  faceTrackingInput?.addEventListener('change', () => {
    appStore.getState().setFaceTrackingEnabled(faceTrackingInput?.checked ?? true);
  });
  handTrackingInput?.addEventListener('change', () => {
    appStore.getState().setHandTrackingEnabled(handTrackingInput?.checked ?? true);
  });
  autoBlinkInput?.addEventListener('change', () => {
    autoBlinkEnabled = autoBlinkInput?.checked ?? true;
    autoBlinkState = createAutoBlinkState(performance.now() / 1000);
    if (!autoBlinkEnabled) {
      applyBlinkOpen();
    }
  });
  idleSwayInput?.addEventListener('change', () => {
    idleSwayEnabled = idleSwayInput?.checked ?? true;
    if (!idleSwayEnabled) {
      restoreIdleSwayBones();
    }
  });
  panel.querySelectorAll<HTMLButtonElement>('.expression-preset-button').forEach((button) => {
    button.addEventListener('click', () => {
      const preset = button.dataset.expressionPreset;
      if (isExpressionPresetId(preset)) {
        selectedExpressionPreset = preset;
        applyExpressionPreset();
        updateExpressionPresetUi();
      }
    });
  });
  renderVrmaSlotList();
  updateExpressionPresetUi();

  viewport.append(panel);
} else {
  viewport.style.pointerEvents = 'none';
}

app.append(viewport);

appStore.subscribe(updateVrmStatusUi);
updateVrmStatusUi(appStore.getState());

function resize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', resize);

let previousFrameTime = performance.now();

function animate(frameTime = performance.now()): void {
  const delta = Math.min((frameTime - previousFrameTime) / 1000, 0.1);
  const elapsed = frameTime / 1000;
  previousFrameTime = frameTime;

  cube.rotation.x = elapsed * 0.32;
  cube.rotation.y = elapsed * 0.52;
  currentVrmaMixer?.update(delta);
  applyUpperBodyRetarget();
  applyCameraLessIdle(elapsed);
  updateLookAtCameraTarget();
  sampleCameraLessExpressions(elapsed);
  sampleMicReactiveMouth();
  currentVrm?.update(delta);
  renderer.render(scene, camera);
  window.requestAnimationFrame(animate);
}

animate();

async function handleVrmFileSelection(file: File | null): Promise<void> {
  const validation = validateVrmFile(file);

  if (!validation.ok) {
    appStore.getState().setVrmError(getVrmFileValidationMessage(validation));
    return;
  }

  if (!file) {
    appStore.getState().setVrmError('Choose a local .vrm file.');
    return;
  }

  appStore.getState().setVrmLoading(file.name);

  try {
    const nextVrm = await loadVrmFromFile(file);
    replaceCurrentVrm(nextVrm);
    appStore.getState().setVrmReady(file.name);
  } catch (error) {
    const message =
      error instanceof VrmLoadError ? error.message : getUnknownVrmLoadErrorMessage(error);
    appStore.getState().setVrmError(message);
  }
}

async function handleVrmaFileSelection(files: File[] | File | null): Promise<void> {
  const selectedFiles = Array.isArray(files) ? files : files ? [files] : [];
  const firstFile = selectedFiles[0] ?? null;
  const validation = validateVrmaFile(firstFile);

  if (!validation.ok) {
    currentVrma = null;
    selectedVrmaSlotIndex = -1;
    stopVrmaPlayback();
    appStore.getState().setVrmaError(getVrmaFileValidationMessage(validation));
    renderVrmaSlotList();
    return;
  }

  if (!firstFile) {
    currentVrma = null;
    selectedVrmaSlotIndex = -1;
    stopVrmaPlayback();
    appStore.getState().setVrmaError('Choose a local .vrma file.');
    renderVrmaSlotList();
    return;
  }

  stopVrmaPlayback();
  vrmaSlots.length = 0;
  selectedVrmaSlotIndex = -1;
  renderVrmaSlotList();
  appStore.getState().setVrmaLoading(
    selectedFiles.length === 1 ? firstFile.name : `${selectedFiles.length} VRMA files`,
  );

  try {
    for (const file of selectedFiles) {
      const fileValidation = validateVrmaFile(file);
      if (!fileValidation.ok) {
        throw new VrmaLoadError(getVrmaFileValidationMessage(fileValidation));
      }

      const animation = await loadVrmaFromFile(file);
      vrmaSlots.push({
        name: file.name,
        duration: animation.duration,
        animation,
      });
    }

    selectedVrmaSlotIndex = 0;
    currentVrma = vrmaSlots[0]?.animation ?? null;
    resetVrmaMixer();
    const selectedSlot = vrmaSlots[0];
    if (!selectedSlot) {
      throw new VrmaLoadError('No VRMA motion was loaded.');
    }
    appStore.getState().setVrmaReady(selectedSlot.name, selectedSlot.duration);
    renderVrmaSlotList();
  } catch (error) {
    currentVrma = null;
    selectedVrmaSlotIndex = -1;
    const message =
      error instanceof VrmaLoadError ? error.message : getUnknownVrmaLoadErrorMessage(error);
    appStore.getState().setVrmaError(message);
    renderVrmaSlotList();
  }
}

function replaceCurrentVrm(nextVrm: VRM): void {
  stopVrmaPlayback();

  if (currentVrm) {
    scene.remove(currentVrm.scene);
    VRMUtils.deepDispose(currentVrm.scene);
  }

  if (placeholderVisible) {
    scene.remove(cube);
    placeholderVisible = false;
  }

  currentVrm = nextVrm;
  fitObjectToDefaultView(nextVrm.scene);
  applyIdleArmPose(nextVrm);
  configureUpperBodyCamera();
  configureLookAtCameraTarget(nextVrm);
  captureAvatarBaseTransform(nextVrm.scene);
  applyAvatarTransform();
  scene.add(nextVrm.scene);
  captureRestBoneQuaternions(nextVrm);
  resetVrmaMixer();
  applyExpressionPreset();
  applyMouthOpen(appStore.getState().mouthOpen);
}

function fitObjectToDefaultView(object: THREE.Object3D): void {
  object.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(object);

  if (box.isEmpty()) {
    object.position.set(0, -0.2, 0);
    return;
  }

  const size = box.getSize(new THREE.Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z);

  if (maxAxis > 0) {
    object.scale.multiplyScalar(2.4 / maxAxis);
  }

  object.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(object);
  const center = scaledBox.getCenter(new THREE.Vector3());
  object.position.sub(center);

  object.updateMatrixWorld(true);

  const groundedBox = new THREE.Box3().setFromObject(object);
  object.position.y += -0.2 - groundedBox.min.y;
}

function configureUpperBodyCamera(): void {
  camera.position.set(0, 1.58, 2.55);
  camera.lookAt(0, 1.38, 0);
  camera.updateProjectionMatrix();
}

function configureLookAtCameraTarget(vrm: VRM): void {
  if (!vrm.lookAt) {
    return;
  }

  vrm.lookAt.autoUpdate = true;
  vrm.lookAt.target = lookAtCameraTarget;
  updateLookAtCameraTarget();
}

function updateLookAtCameraTarget(): void {
  lookAtCameraTarget.position.copy(camera.position);
}

function applyIdleArmPose(vrm: VRM): void {
  rotateNormalizedBone(vrm, VRMHumanBoneName.LeftUpperArm, 0, 0, 1.12);
  rotateNormalizedBone(vrm, VRMHumanBoneName.RightUpperArm, 0, 0, -1.12);
  rotateNormalizedBone(vrm, VRMHumanBoneName.LeftHand, 0, 0.03, 0);
  rotateNormalizedBone(vrm, VRMHumanBoneName.RightHand, 0, -0.03, 0);
  vrm.humanoid.update();
  vrm.scene.updateMatrixWorld(true);
}

function rotateNormalizedBone(
  vrm: VRM,
  boneName: VRMHumanBoneName,
  x: number,
  y: number,
  z: number,
): void {
  const bone = vrm.humanoid.getNormalizedBoneNode(boneName);

  if (!bone) {
    return;
  }

  const delta = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'XYZ'));
  bone.quaternion.multiply(delta);
}

function captureRestBoneQuaternions(vrm: VRM): void {
  restBoneQuaternions.clear();

  for (const boneName of [
    VRMHumanBoneName.Chest,
    VRMHumanBoneName.UpperChest,
    VRMHumanBoneName.Neck,
    VRMHumanBoneName.Head,
    ...idleArmBoneNames,
  ]) {
    const bone = vrm.humanoid.getNormalizedBoneNode(boneName);

    if (bone) {
      restBoneQuaternions.set(boneName, bone.quaternion.clone());
    }
  }
}

function captureAvatarBaseTransform(object: THREE.Object3D): void {
  avatarBasePosition.copy(object.position);
  avatarBaseScale.copy(object.scale);
  avatarBaseRotationY = object.rotation.y;
}

function applyAvatarTransform(): void {
  if (!currentVrm) {
    return;
  }

  const nextState = appStore.getState();
  currentVrm.scene.position.set(
    avatarBasePosition.x + nextState.avatarOffsetX,
    avatarBasePosition.y + nextState.avatarOffsetY,
    avatarBasePosition.z,
  );
  currentVrm.scene.scale.copy(avatarBaseScale).multiplyScalar(nextState.avatarScale);
  currentVrm.scene.rotation.y =
    avatarBaseRotationY + THREE.MathUtils.degToRad(nextState.avatarRotationY);
}

function updateVrmStatusUi(nextState: AppState): void {
  if (vrmStatusText && vrmFileText) {
    vrmStatusText.textContent = getVrmStatusText(nextState);
    vrmFileText.textContent = nextState.vrmFileName ?? 'No file selected.';
  }

  updateVrmaStatusUi(nextState);
  updateMicStatusUi(nextState);
  updatePoseStatusUi(nextState);
  updateAvatarTransformUi(nextState);
}

function getVrmStatusText(nextState: AppState): string {
  switch (nextState.vrmStatus) {
    case 'idle':
      return 'Choose a local .vrm file.';
    case 'loading':
      return 'Loading VRM...';
    case 'ready':
      return 'VRM loaded.';
    case 'error':
      return nextState.vrmError ?? 'Failed to load the selected VRM file.';
  }
}

function updateAvatarTransformUi(nextState: AppState): void {
  if (avatarOffsetXInput) {
    avatarOffsetXInput.value = nextState.avatarOffsetX.toString();
  }

  if (avatarOffsetYInput) {
    avatarOffsetYInput.value = nextState.avatarOffsetY.toString();
  }

  if (avatarScaleInput) {
    avatarScaleInput.value = nextState.avatarScale.toString();
  }

  if (avatarRotationYInput) {
    avatarRotationYInput.value = nextState.avatarRotationY.toString();
  }

  if (avatarOffsetXText) {
    avatarOffsetXText.textContent = nextState.avatarOffsetX.toFixed(2);
  }

  if (avatarOffsetYText) {
    avatarOffsetYText.textContent = nextState.avatarOffsetY.toFixed(2);
  }

  if (avatarScaleText) {
    avatarScaleText.textContent = `${nextState.avatarScale.toFixed(2)}x`;
  }

  if (avatarRotationYText) {
    avatarRotationYText.textContent = `${Math.round(nextState.avatarRotationY)}°`;
  }
}

function resetVrmaMixer(): void {
  currentVrmaMixer?.stopAllAction();
  currentVrmaMixer = null;
  currentVrmaAction = null;

  if (!currentVrm || !currentVrma) {
    return;
  }

  ensureLookAtQuaternionProxy(currentVrm);

  const clip = createVRMAnimationClip(currentVrma, currentVrm);
  currentVrmaMixer = new THREE.AnimationMixer(currentVrm.scene);
  currentVrmaMixer.addEventListener('finished', handleVrmaPlaybackFinished);
  currentVrmaAction = currentVrmaMixer.clipAction(clip);
  currentVrmaAction.clampWhenFinished = true;
  syncVrmaLoopMode(appStore.getState().vrmaLoop);
}

function ensureLookAtQuaternionProxy(vrm: VRM): void {
  if (!vrm.lookAt) {
    return;
  }

  const existingProxy = vrm.scene.children.find(
    (child) => child instanceof VRMLookAtQuaternionProxy,
  );

  if (existingProxy) {
    existingProxy.name = 'VRMLookAtQuaternionProxy';
    return;
  }

  const proxy = new VRMLookAtQuaternionProxy(vrm.lookAt);
  proxy.name = 'VRMLookAtQuaternionProxy';
  vrm.scene.add(proxy);
}

function startVrmaPlayback(): void {
  if (!currentVrm) {
    appStore.getState().setVrmaError('Load a VRM before playing VRMA.');
    return;
  }

  if (!currentVrma) {
    appStore.getState().setVrmaError('Choose a local .vrma file before playback.');
    return;
  }

  if (!currentVrmaAction) {
    resetVrmaMixer();
  }

  currentVrmaAction?.reset().play();
  appStore.getState().setVrmaPlaybackStatus('playing');
}

function stopVrmaPlayback(): void {
  currentVrmaAction?.stop();
  currentVrmaMixer?.setTime(0);
  appStore.getState().setVrmaPlaybackStatus('stopped');
}

function syncVrmaLoopMode(loop: boolean): void {
  if (!currentVrmaAction) {
    return;
  }

  currentVrmaAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
  currentVrmaAction.clampWhenFinished = true;
}

function handleVrmaPlaybackFinished(): void {
  if (!appStore.getState().vrmaLoop) {
    appStore.getState().setVrmaPlaybackStatus('stopped');
  }
}

function updateVrmaStatusUi(nextState: AppState): void {
  if (vrmaStatusText && vrmaFileText) {
    vrmaStatusText.textContent = getVrmaStatusText(nextState);
    vrmaFileText.textContent = getVrmaFileText(nextState);
  }

  if (vrmaRequirementText) {
    vrmaRequirementText.textContent = getVrmaRequirementText(nextState);
  }

  if (vrmaLoopInput) {
    vrmaLoopInput.checked = nextState.vrmaLoop;
  }

  const canPlay = nextState.vrmStatus === 'ready' && nextState.vrmaStatus === 'ready';

  if (vrmaPlayButton) {
    vrmaPlayButton.disabled = !canPlay || nextState.vrmaPlaybackStatus === 'playing';
  }

  if (vrmaStopButton) {
    vrmaStopButton.disabled = nextState.vrmaPlaybackStatus !== 'playing';
  }
}

function getVrmaStatusText(nextState: AppState): string {
  switch (nextState.vrmaStatus) {
    case 'idle':
      return 'Choose a local .vrma file.';
    case 'loading':
      return 'Loading VRMA...';
    case 'ready':
      return nextState.vrmaPlaybackStatus === 'playing' ? 'VRMA playing.' : 'VRMA loaded.';
    case 'error':
      return nextState.vrmaError ?? 'Failed to load the selected VRMA file.';
  }
}

function getVrmaFileText(nextState: AppState): string {
  if (!nextState.vrmaFileName) {
    return 'No motion selected.';
  }

  if (nextState.vrmaDuration === null) {
    return nextState.vrmaFileName;
  }

  return `${nextState.vrmaFileName} (${nextState.vrmaDuration.toFixed(2)}s)`;
}

function getVrmaRequirementText(nextState: AppState): string {
  if (nextState.vrmStatus !== 'ready') {
    return 'Load a VRM before playing VRMA.';
  }

  if (nextState.vrmaStatus !== 'ready') {
    return 'Load a VRMA motion to enable playback.';
  }

  return nextState.vrmaLoop ? 'Ready to play in loop mode.' : 'Ready to play once.';
}

function renderVrmaSlotList(): void {
  if (!vrmaSlotList) {
    return;
  }

  if (vrmaSlots.length === 0) {
    vrmaSlotList.innerHTML =
      '<span class="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold text-[#9fa9aa]">No VRMA slots loaded.</span>';
    return;
  }

  vrmaSlotList.replaceChildren(
    ...vrmaSlots.map((slot, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className =
        index === selectedVrmaSlotIndex
          ? 'rounded-md border border-[#6dff9a]/70 bg-[#6dff9a]/10 px-3 py-2 text-left text-xs font-bold text-[#dfffee] transition hover:border-[#38d5ff]'
          : 'rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-left text-xs font-bold text-[#eef4f2] transition hover:border-[#38d5ff]';
      button.textContent = `${index + 1}. ${slot.name} (${slot.duration.toFixed(2)}s)`;
      button.addEventListener('click', () => {
        selectVrmaSlot(index);
        startVrmaPlayback();
      });
      return button;
    }),
  );
}

function selectVrmaSlot(index: number): void {
  const slot = vrmaSlots[index];

  if (!slot) {
    return;
  }

  stopVrmaPlayback();
  selectedVrmaSlotIndex = index;
  currentVrma = slot.animation;
  resetVrmaMixer();
  appStore.getState().setVrmaReady(slot.name, slot.duration);
  renderVrmaSlotList();
}

async function startMicReactiveMouth(): Promise<void> {
  stopMicReactiveMouth();
  appStore.getState().setMicRequesting();

  try {
    micController = new MicReactiveMouth({
      fftSize: 1024,
      threshold: 0.025,
      sensitivity: 8,
      attack: 0.55,
      release: 0.16,
    });
    await micController.start();
    appStore.getState().setMicActive();
  } catch (error) {
    micController?.stop();
    micController = null;
    appStore.getState().setMicError(getMicErrorMessage(error));
  }
}

function stopMicReactiveMouth(): void {
  micController?.stop();
  micController = null;
  applyMouthOpen(0);
  appStore.getState().setMicStopped();
}

function sampleMicReactiveMouth(): void {
  if (!micController || appStore.getState().micStatus !== 'active') {
    return;
  }

  const frame = micController.sample();
  if (appStore.getState().faceTrackingStatus !== 'active') {
    applyMouthOpen(frame.mouthOpen);
  }
  appStore.getState().setMicFrame(frame.rms, frame.mouthOpen);
}

function applyMouthOpen(value: number): void {
  currentVrm?.expressionManager?.setValue('aa', value);
}

function applyFaceExpressions(weights: VrmFaceExpressionWeights): void {
  currentVrm?.expressionManager?.setValue('blinkLeft', weights.blinkLeft);
  currentVrm?.expressionManager?.setValue('blinkRight', weights.blinkRight);
  currentVrm?.expressionManager?.setValue('aa', weights.aa);
  currentVrm?.expressionManager?.setValue('ih', weights.ih);
  currentVrm?.expressionManager?.setValue('ou', weights.ou);
  currentVrm?.expressionManager?.setValue('ee', weights.ee);
  currentVrm?.expressionManager?.setValue('oh', weights.oh);
  currentVrm?.expressionManager?.setValue('happy', weights.happy);
  currentVrm?.expressionManager?.setValue('surprised', weights.surprised);
}

function resetFaceExpressions(): void {
  faceExpressionWeights = createNeutralFaceExpressionWeights();
  applyFaceExpressions(faceExpressionWeights);
  resetHeadRetarget();
}

function sampleCameraLessExpressions(elapsedSeconds: number): void {
  if (!currentVrm || appStore.getState().faceTrackingStatus === 'active') {
    return;
  }

  applyExpressionPreset();

  if (!autoBlinkEnabled) {
    return;
  }

  const result = sampleAutoBlink(autoBlinkState, elapsedSeconds);
  autoBlinkState = result.state;
  currentVrm.expressionManager?.setValue('blinkLeft', result.weight);
  currentVrm.expressionManager?.setValue('blinkRight', result.weight);
}

function applyBlinkOpen(): void {
  currentVrm?.expressionManager?.setValue('blinkLeft', 0);
  currentVrm?.expressionManager?.setValue('blinkRight', 0);
}

function applyExpressionPreset(): void {
  const weights = vrmExpressionPresets[selectedExpressionPreset];

  for (const [name, value] of Object.entries(weights)) {
    currentVrm?.expressionManager?.setValue(name, value ?? 0);
  }
}

function updateExpressionPresetUi(): void {
  if (!expressionPresetText) {
    return;
  }

  expressionPresetText.textContent =
    selectedExpressionPreset === 'neutral'
      ? 'Neutral'
      : selectedExpressionPreset === 'happy'
        ? 'Happy'
        : selectedExpressionPreset === 'surprised'
          ? 'Surprise'
          : 'Relax';
}

function isExpressionPresetId(value: unknown): value is VrmExpressionPresetId {
  return (
    value === 'neutral' ||
    value === 'happy' ||
    value === 'surprised' ||
    value === 'relaxed'
  );
}

function getMicErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Failed to start microphone capture.';
}

function updateMicStatusUi(nextState: AppState): void {
  if (micStatusText) {
    micStatusText.textContent = getMicStatusText(nextState);
  }

  if (micRequirementText) {
    micRequirementText.textContent = getMicRequirementText(nextState);
  }

  if (micLevelBar) {
    micLevelBar.style.width = `${Math.min(nextState.micLevel * 320, 100).toFixed(1)}%`;
  }

  if (micMouthBar) {
    micMouthBar.style.width = `${(nextState.mouthOpen * 100).toFixed(1)}%`;
  }

  if (micStartButton) {
    micStartButton.disabled = nextState.micStatus === 'requesting' || nextState.micStatus === 'active';
  }

  if (micStopButton) {
    micStopButton.disabled = nextState.micStatus !== 'active';
  }
}

function getMicStatusText(nextState: AppState): string {
  switch (nextState.micStatus) {
    case 'idle':
      return 'Microphone idle.';
    case 'requesting':
      return 'Requesting microphone permission...';
    case 'active':
      return 'Microphone active.';
    case 'error':
      return nextState.micError ?? 'Failed to start microphone capture.';
  }
}

function getMicRequirementText(nextState: AppState): string {
  if (nextState.vrmStatus !== 'ready') {
    return 'Load a VRM before testing mouth movement.';
  }

  if (nextState.micStatus === 'active') {
    return 'Voice volume is driving the VRM aa expression.';
  }

  return 'Start mic to drive the VRM aa expression.';
}

async function startPoseDebug(): Promise<void> {
  stopPoseDebug();
  appStore.getState().setPoseRequesting();

  if (!poseVideoElement || !poseCanvasElement) {
    appStore.getState().setPoseError('Pose debug UI is not available.');
    return;
  }

  try {
    poseStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 360 },
        facingMode: 'user',
      },
      audio: false,
    });
    poseVideoElement.srcObject = poseStream;
    await poseVideoElement.play();

    const nextState = appStore.getState();
    appStore.getState().setPoseLoading();
    if (nextState.faceTrackingEnabled) {
      appStore.getState().setFaceTrackingLoading();
    } else {
      appStore.getState().setFaceTrackingStopped();
    }
    if (nextState.handTrackingEnabled) {
      appStore.getState().setHandTrackingLoading();
    } else {
      appStore.getState().setHandTrackingStopped();
    }

    const { MediaPipePoseDebug } = await import('./mocap/mediapipe-pose-debug');
    const faceHandModule = await import('./mocap/mediapipe-face-hand');
    const [nextPoseController, nextFaceTracker, nextHandTracker] = await Promise.all([
      MediaPipePoseDebug.create(),
      nextState.faceTrackingEnabled
        ? faceHandModule.MediaPipeFaceTracker.create()
        : Promise.resolve(null),
      nextState.handTrackingEnabled
        ? faceHandModule.MediaPipeHandTracker.create()
        : Promise.resolve(null),
    ]);
    poseController = nextPoseController;
    faceTracker = nextFaceTracker;
    handTracker = nextHandTracker;
    appStore.getState().setPoseActive();
    if (faceTracker) {
      appStore.getState().setFaceTrackingActive();
    }
    if (handTracker) {
      appStore.getState().setHandTrackingActive();
    }
    lastPoseVideoTime = -1;
    poseAnimationFrameId = window.requestAnimationFrame(runPoseDebugFrame);
  } catch (error) {
    stopPoseDebug();
    appStore.getState().setPoseError(getPoseErrorMessage(error));
  }
}

function stopPoseDebug(): void {
  if (poseAnimationFrameId !== null) {
    window.cancelAnimationFrame(poseAnimationFrameId);
    poseAnimationFrameId = null;
  }

  poseController?.close();
  poseController = null;
  faceTracker?.close();
  faceTracker = null;
  handTracker?.close();
  handTracker = null;
  poseStream?.getTracks().forEach((track) => track.stop());
  poseStream = null;
  lastPoseVideoTime = -1;

  if (poseVideoElement) {
    poseVideoElement.pause();
    poseVideoElement.srcObject = null;
  }

  clearPoseCanvas();
  resetUpperBodyRetarget();
  resetFaceExpressions();
  appStore.getState().setPoseStopped();
  appStore.getState().setFaceTrackingStopped();
  appStore.getState().setHandTrackingStopped();
}

function runPoseDebugFrame(frameTime: number): void {
  if (
    !poseController ||
    !poseVideoElement ||
    !poseCanvasElement ||
    appStore.getState().poseStatus !== 'active'
  ) {
    return;
  }

  try {
    if (
      poseVideoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      poseVideoElement.currentTime !== lastPoseVideoTime
    ) {
      const result = poseController.detect(poseVideoElement, frameTime);
      const landmarks = result.landmarks[0] ?? [];
      const summary = summarizeUpperBodyPose(landmarks);
      updateUpperBodyRetarget(summary);
      drawPoseDebugLandmarks(landmarks);
      runFaceTrackingFrame(poseVideoElement, frameTime);
      runHandTrackingFrame(poseVideoElement, frameTime);
      appStore
        .getState()
        .setPoseFrame(
          summary.landmarkCount,
          summary.upperBodyVisibleCount,
          summary.averageUpperBodyVisibility,
          formatPoseSummary(summary),
        );
      lastPoseVideoTime = poseVideoElement.currentTime;
    }

    poseAnimationFrameId = window.requestAnimationFrame(runPoseDebugFrame);
  } catch (error) {
    stopPoseDebug();
    appStore.getState().setPoseError(getPoseErrorMessage(error));
  }
}

function drawPoseDebugLandmarks(landmarks: Array<{ x: number; y: number; visibility?: number }>): void {
  if (!poseCanvasElement) {
    return;
  }

  const context = poseCanvasElement.getContext('2d');

  if (!context) {
    return;
  }

  const width = poseCanvasElement.clientWidth;
  const height = poseCanvasElement.clientHeight;
  const pixelRatio = Math.min(window.devicePixelRatio, 2);
  poseCanvasElement.width = Math.max(1, Math.round(width * pixelRatio));
  poseCanvasElement.height = Math.max(1, Math.round(height * pixelRatio));
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);

  const connections = [
    [11, 12],
    [11, 13],
    [13, 15],
    [12, 14],
    [14, 16],
    [11, 23],
    [12, 24],
    [23, 24],
  ] as const;
  const points = [0, 11, 12, 13, 14, 15, 16, 23, 24] as const;

  context.lineWidth = 3;
  context.strokeStyle = '#38d5ff';
  context.shadowColor = 'rgba(56, 213, 255, 0.8)';
  context.shadowBlur = 10;

  for (const [fromIndex, toIndex] of connections) {
    const from = landmarks[fromIndex];
    const to = landmarks[toIndex];

    if (!from || !to || (from.visibility ?? 0) < 0.35 || (to.visibility ?? 0) < 0.35) {
      continue;
    }

    context.beginPath();
    context.moveTo(from.x * width, from.y * height);
    context.lineTo(to.x * width, to.y * height);
    context.stroke();
  }

  context.fillStyle = '#6dff9a';
  context.shadowColor = 'rgba(109, 255, 154, 0.8)';

  for (const index of points) {
    const point = landmarks[index];

    if (!point || (point.visibility ?? 0) < 0.35) {
      continue;
    }

    context.beginPath();
    context.arc(point.x * width, point.y * height, 4, 0, Math.PI * 2);
    context.fill();
  }
}

function runFaceTrackingFrame(videoFrame: HTMLVideoElement, frameTime: number): void {
  if (!faceTracker || appStore.getState().faceTrackingStatus !== 'active') {
    return;
  }

  const result = faceTracker.detect(videoFrame, frameTime);
  const categories = result.faceBlendshapes[0]?.categories ?? [];
  const nextWeights = createVrmFaceExpressionWeights(categories, {
    mirrorInput: appStore.getState().poseMirrorInput,
  });
  const nextHeadPose = createHeadRetargetPose(result.facialTransformationMatrixes[0], {
    mirrorInput: appStore.getState().poseMirrorInput,
  });
  faceExpressionWeights = smoothFaceExpressionWeights(faceExpressionWeights, nextWeights);
  headRetargetPose = smoothHeadRetargetPose(headRetargetPose, nextHeadPose);
  applyFaceExpressions(faceExpressionWeights);
  applyHeadRetarget();
  appStore
    .getState()
    .setFaceTrackingFrame(
      categories.length === 0
        ? 'No face detected.'
        : `Face expressions: blink ${Math.max(faceExpressionWeights.blinkLeft, faceExpressionWeights.blinkRight).toFixed(2)}, mouth ${faceExpressionWeights.aa.toFixed(2)}.`,
    );
}

function runHandTrackingFrame(videoFrame: HTMLVideoElement, frameTime: number): void {
  if (!handTracker || appStore.getState().handTrackingStatus !== 'active') {
    return;
  }

  const result = handTracker.detect(videoFrame, frameTime);
  const summary = summarizeHandTracking(result.landmarks, result.handedness);
  drawHandDebugLandmarks(result.landmarks);
  appStore
    .getState()
    .setHandTrackingFrame(
      summary.handCount === 0
        ? 'No hands detected.'
        : `Hands: ${summary.labels.join(', ')} (${summary.handCount}).`,
    );
}

function applyHeadRetarget(): void {
  if (!currentVrm) {
    return;
  }

  if (!headRetargetPose.enabled) {
    restoreHeadBone();
    return;
  }

  const head = currentVrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
  const restQuaternion = restBoneQuaternions.get(VRMHumanBoneName.Head);

  if (!head || !restQuaternion) {
    return;
  }

  const delta = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(headRetargetPose.pitch, headRetargetPose.yaw, headRetargetPose.roll, 'YXZ'),
  );
  head.quaternion.copy(restQuaternion).multiply(delta);
}

function drawHandDebugLandmarks(
  hands: Array<Array<{ x: number; y: number; visibility?: number }>>,
): void {
  if (!poseCanvasElement || hands.length === 0) {
    return;
  }

  const context = poseCanvasElement.getContext('2d');

  if (!context) {
    return;
  }

  const width = poseCanvasElement.clientWidth;
  const height = poseCanvasElement.clientHeight;
  const connections = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [0, 5],
    [5, 6],
    [6, 7],
    [7, 8],
    [0, 9],
    [9, 10],
    [10, 11],
    [11, 12],
    [0, 13],
    [13, 14],
    [14, 15],
    [15, 16],
    [0, 17],
    [17, 18],
    [18, 19],
    [19, 20],
    [5, 9],
    [9, 13],
    [13, 17],
  ] as const;

  context.lineWidth = 2;
  context.strokeStyle = '#6dff9a';
  context.shadowColor = 'rgba(109, 255, 154, 0.85)';
  context.shadowBlur = 8;

  for (const hand of hands) {
    for (const [fromIndex, toIndex] of connections) {
      const from = hand[fromIndex];
      const to = hand[toIndex];

      if (!from || !to) {
        continue;
      }

      context.beginPath();
      context.moveTo(from.x * width, from.y * height);
      context.lineTo(to.x * width, to.y * height);
      context.stroke();
    }

    context.fillStyle = '#dfffee';
    for (const point of hand) {
      context.beginPath();
      context.arc(point.x * width, point.y * height, 3, 0, Math.PI * 2);
      context.fill();
    }
  }
}

function clearPoseCanvas(): void {
  const context = poseCanvasElement?.getContext('2d');

  if (!context || !poseCanvasElement) {
    return;
  }

  context.clearRect(0, 0, poseCanvasElement.width, poseCanvasElement.height);
}

function updateUpperBodyRetarget(summary: UpperBodyPoseSummary): void {
  upperBodyRetargetPose = smoothUpperBodyRetargetPose(
    upperBodyRetargetPose,
    createUpperBodyRetargetPose(summary, {
      ...defaultUpperBodyRetargetOptions,
      mirrorInput: appStore.getState().poseMirrorInput,
    }),
  );
}

function applyUpperBodyRetarget(): void {
  if (!currentVrm || appStore.getState().poseStatus !== 'active') {
    return;
  }

  if (!upperBodyRetargetPose.enabled) {
    restoreUpperBodyBones();
    return;
  }

  const upperChest = currentVrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.UpperChest);
  const chest = currentVrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Chest);
  const neck = currentVrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Neck);
  const torsoBone = upperChest ?? chest;
  const torsoBoneName = upperChest ? VRMHumanBoneName.UpperChest : VRMHumanBoneName.Chest;

  applyBoneRetarget(torsoBone, torsoBoneName, upperBodyRetargetPose, {
    yaw: upperBodyRetargetPose.chestYaw,
    roll: upperBodyRetargetPose.chestRoll,
  });
  applyBoneRetarget(neck, VRMHumanBoneName.Neck, upperBodyRetargetPose, {
    yaw: upperBodyRetargetPose.neckYaw,
    roll: upperBodyRetargetPose.neckRoll,
  });
  applyArmRetarget(
    currentVrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm),
    VRMHumanBoneName.LeftUpperArm,
    upperBodyRetargetPose.leftUpperArmRoll,
  );
  applyArmRetarget(
    currentVrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm),
    VRMHumanBoneName.RightUpperArm,
    upperBodyRetargetPose.rightUpperArmRoll,
  );
}

function applyCameraLessIdle(elapsedSeconds: number): void {
  if (
    !currentVrm ||
    !idleSwayEnabled ||
    appStore.getState().poseStatus === 'active' ||
    appStore.getState().vrmaPlaybackStatus === 'playing'
  ) {
    return;
  }

  const sway = sampleIdleSway(elapsedSeconds);
  const upperChest = currentVrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.UpperChest);
  const chest = currentVrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Chest);
  const neck = currentVrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Neck);
  const torsoBone = upperChest ?? chest;
  const torsoBoneName = upperChest ? VRMHumanBoneName.UpperChest : VRMHumanBoneName.Chest;

  applyIdleSwayBone(torsoBone, torsoBoneName, 0, sway.chestYaw, sway.chestRoll);
  applyIdleSwayBone(neck, VRMHumanBoneName.Neck, sway.neckPitch, 0, sway.neckRoll);
}

function applyIdleSwayBone(
  bone: THREE.Object3D | null,
  restBoneName: string,
  pitch: number,
  yaw: number,
  roll: number,
): void {
  if (!bone) {
    return;
  }

  const restQuaternion = restBoneQuaternions.get(restBoneName) ?? bone.quaternion;
  const delta = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, 'XYZ'));
  bone.quaternion.copy(restQuaternion).multiply(delta);
}

function restoreIdleSwayBones(): void {
  if (!currentVrm || appStore.getState().poseStatus === 'active') {
    return;
  }

  for (const boneName of [
    VRMHumanBoneName.Chest,
    VRMHumanBoneName.UpperChest,
    VRMHumanBoneName.Neck,
  ]) {
    const bone = currentVrm.humanoid.getNormalizedBoneNode(boneName);
    const restQuaternion = restBoneQuaternions.get(boneName);

    if (bone && restQuaternion) {
      bone.quaternion.copy(restQuaternion);
    }
  }
}

function applyBoneRetarget(
  bone: THREE.Object3D | null,
  restBoneName: string,
  pose: UpperBodyRetargetPose,
  rotation: { yaw: number; roll: number },
): void {
  if (!bone) {
    return;
  }

  const restQuaternion = restBoneQuaternions.get(restBoneName) ?? bone.quaternion;
  const delta = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, rotation.yaw, rotation.roll, 'XYZ'),
  );

  bone.quaternion.copy(restQuaternion).multiply(delta);
  bone.userData.vplant3dMocapActive = pose.enabled;
}

function applyArmRetarget(
  bone: THREE.Object3D | null,
  restBoneName: string,
  roll: number,
): void {
  if (!bone) {
    return;
  }

  const restQuaternion = restBoneQuaternions.get(restBoneName) ?? bone.quaternion;
  const delta = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, roll, 'XYZ'));

  bone.quaternion.copy(restQuaternion).multiply(delta);
  bone.userData.vplant3dMocapActive = upperBodyRetargetPose.enabled;
}

function resetUpperBodyRetarget(): void {
  upperBodyRetargetPose = createNeutralRetargetPose(false);
  restoreUpperBodyBones();
}

function restoreUpperBodyBones(): void {
  if (!currentVrm) {
    return;
  }

  for (const boneName of [
    VRMHumanBoneName.Chest,
    VRMHumanBoneName.UpperChest,
    VRMHumanBoneName.Neck,
    VRMHumanBoneName.LeftUpperArm,
    VRMHumanBoneName.RightUpperArm,
  ]) {
    const bone = currentVrm.humanoid.getNormalizedBoneNode(boneName);
    const restQuaternion = restBoneQuaternions.get(boneName);

    if (bone && restQuaternion) {
      bone.quaternion.copy(restQuaternion);
      bone.userData.vplant3dMocapActive = false;
    }
  }
}

function resetHeadRetarget(): void {
  headRetargetPose = createNeutralHeadRetargetPose(false);
  restoreHeadBone();
}

function restoreHeadBone(): void {
  if (!currentVrm) {
    return;
  }

  const head = currentVrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
  const restQuaternion = restBoneQuaternions.get(VRMHumanBoneName.Head);

  if (head && restQuaternion) {
    head.quaternion.copy(restQuaternion);
  }
}

function formatPoseSummary(summary: UpperBodyPoseSummary): string {
  if (!summary.poseDetected) {
    return 'No pose detected.';
  }

  const visibility = Math.round(summary.averageUpperBodyVisibility * 100);
  const shoulder = summary.shoulderSpan === null ? 'n/a' : summary.shoulderSpan.toFixed(2);
  const lean = summary.torsoLean === null ? 'n/a' : summary.torsoLean.toFixed(2);

  return `${summary.landmarkCount} landmarks, upper ${summary.upperBodyVisibleCount}/9, vis ${visibility}%, span ${shoulder}, lean ${lean}.`;
}

function getPoseErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Failed to start MediaPipe pose debug.';
}

function updatePoseStatusUi(nextState: AppState): void {
  if (poseStatusText) {
    poseStatusText.textContent = getPoseStatusText(nextState);
  }

  if (poseRequirementText) {
    poseRequirementText.textContent = getPoseRequirementText(nextState);
  }

  if (poseSummaryText) {
    poseSummaryText.textContent = nextState.poseSummaryText;
  }

  if (poseVisibilityBar) {
    poseVisibilityBar.style.width = `${(nextState.poseAverageVisibility * 100).toFixed(1)}%`;
  }

  if (poseMirrorInput) {
    poseMirrorInput.checked = nextState.poseMirrorInput;
  }

  if (faceTrackingInput) {
    faceTrackingInput.checked = nextState.faceTrackingEnabled;
    faceTrackingInput.disabled =
      nextState.poseStatus === 'requesting' ||
      nextState.poseStatus === 'loading' ||
      nextState.poseStatus === 'active';
  }

  if (handTrackingInput) {
    handTrackingInput.checked = nextState.handTrackingEnabled;
    handTrackingInput.disabled =
      nextState.poseStatus === 'requesting' ||
      nextState.poseStatus === 'loading' ||
      nextState.poseStatus === 'active';
  }

  if (faceTrackingText) {
    faceTrackingText.textContent = getTrackingStatusText(
      nextState.faceTrackingStatus,
      nextState.faceTrackingSummary,
      nextState.faceTrackingError,
    );
  }

  if (handTrackingText) {
    handTrackingText.textContent = getTrackingStatusText(
      nextState.handTrackingStatus,
      nextState.handTrackingSummary,
      nextState.handTrackingError,
    );
  }

  if (poseStartButton) {
    poseStartButton.disabled =
      nextState.poseStatus === 'requesting' ||
      nextState.poseStatus === 'loading' ||
      nextState.poseStatus === 'active';
  }

  if (poseStopButton) {
    poseStopButton.disabled = nextState.poseStatus !== 'active';
  }
}

function getTrackingStatusText(
  status: AppState['faceTrackingStatus'],
  summary: string,
  error: string | null,
): string {
  switch (status) {
    case 'idle':
    case 'active':
      return summary;
    case 'loading':
      return 'Loading model...';
    case 'error':
      return error ?? 'Tracking failed.';
  }
}

function getPoseStatusText(nextState: AppState): string {
  switch (nextState.poseStatus) {
    case 'idle':
      return 'Camera idle.';
    case 'requesting':
      return 'Requesting camera permission...';
    case 'loading':
      return 'Loading MediaPipe pose model...';
    case 'active':
      return 'MediaPipe pose debug active.';
    case 'error':
      return nextState.poseError ?? 'Failed to start MediaPipe pose debug.';
  }
}

function getPoseRequirementText(nextState: AppState): string {
  if (nextState.poseStatus === 'active') {
    return 'Move shoulders and upper body while checking the skeleton overlay.';
  }

  if (nextState.poseStatus === 'error') {
    return 'Check camera permission, HTTPS/localhost rules, and model download access.';
  }

  return 'Start camera to inspect upper-body landmarks.';
}
