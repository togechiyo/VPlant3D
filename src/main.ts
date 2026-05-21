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
import { VPlantRelayClient } from './relay/client';
import type {
  RelayAssetDescriptor,
  RelayMessage,
  RelayRenderState,
} from './relay/messages';
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
const isRenderPage = state.obsMode;
const isControlPage = !state.obsMode;
document.documentElement.classList.toggle('is-transparent-render', state.transparent);
document.body.classList.toggle('is-transparent-render', state.transparent);

const viewport = document.createElement('section');
viewport.className = [
  'viewport',
  state.transparent ? 'viewport--transparent' : '',
  isControlPage ? 'viewport--control' : 'viewport--render',
]
  .filter(Boolean)
  .join(' ');

const renderer = new THREE.WebGLRenderer({
  alpha: state.transparent,
  antialias: true,
  premultipliedAlpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(state.transparent ? 0x000000 : 0x101314, state.transparent ? 0 : 1);
renderer.setClearAlpha(state.transparent ? 0 : 1);
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
if (isControlPage) {
  configureControlPreviewCamera();
}

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
grid.visible = !state.transparent;
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
let handTrackingInput: HTMLInputElement | null = null;
let blinkModeSelect: HTMLSelectElement | null = null;
let lipSyncModeSelect: HTMLSelectElement | null = null;
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
type BlinkMode = 'mocap' | 'auto' | 'off';
type LipSyncMode = 'mocap' | 'mic' | 'off';
let blinkMode: BlinkMode = 'mocap';
let lipSyncMode: LipSyncMode = 'mic';
let idleSwayEnabled = true;
let faceTracker: MediaPipeFaceTracker | null = null;
let handTracker: MediaPipeHandTracker | null = null;
let relayMotionActive = false;
let relayStatePublishTime = 0;
let loadingRelayVrmAssetId: string | null = null;
let loadingRelayVrmaAssetSignature: string | null = null;
const relayClient = new VPlantRelayClient(
  isRenderPage ? 'render' : 'control',
  handleRelayMessage,
);
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

relayClient.connect();

if (isControlPage) {
  const panel = document.createElement('aside');
  panel.className =
    'absolute right-4 top-4 bottom-4 w-[min(420px,42vw)] overflow-hidden rounded-lg border border-[rgba(113,255,191,0.22)] bg-[rgba(20,24,26,0.9)] p-2 text-[#eef4f2] shadow-[0_0_32px_rgba(56,213,255,0.08)] backdrop-blur-md';
  panel.innerHTML = `
    <div class="grid h-full content-start gap-2 overflow-y-auto pr-1">
    <div class="grid gap-2 rounded-md border border-[#6dff9a]/35 bg-black/20 p-2">
      <div class="grid gap-1">
        <span class="text-xs font-bold uppercase tracking-normal text-[#6dff9a]">VRM</span>
        <strong id="vrm-status-text" class="text-sm font-bold text-[#eef4f2]">VRM未選択</strong>
        <span id="vrm-file-text" class="min-h-5 text-sm text-[#9fa9aa]">未読み込み</span>
      </div>
      <label class="inline-flex cursor-pointer items-center justify-center rounded-md border border-[#6dff9a]/80 bg-[#6dff9a]/10 px-3 py-2 text-sm font-bold text-[#dfffee] transition hover:border-[#38d5ff] hover:bg-white/[0.04]">
        <input id="vrm-file-input" class="sr-only" type="file" accept=".vrm" />
        VRMを読み込む
      </label>
    </div>
    <div class="grid gap-2 rounded-md border border-[#6dff9a]/25 bg-black/20 p-2">
      <div class="grid gap-1">
        <span class="text-xs font-bold uppercase tracking-normal text-[#6dff9a]">顔 / 口</span>
        <strong id="mic-status-text" class="text-sm font-bold text-[#eef4f2]">マイク停止中</strong>
        <span id="mic-requirement-text" class="min-h-5 text-sm text-[#9fa9aa]">音量で口を動かす</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button id="mic-start-button" class="rounded-md border border-[#6dff9a]/70 bg-transparent px-3 py-2 text-sm font-bold text-[#dfffee] transition enabled:hover:border-[#38d5ff] enabled:hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40" type="button">マイク開始</button>
        <button id="mic-stop-button" class="rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-bold text-[#eef4f2] transition enabled:hover:border-[#38d5ff] disabled:cursor-not-allowed disabled:opacity-40" type="button">停止</button>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <label class="grid gap-1 text-xs font-bold text-[#9fa9aa]">
          <span>まばたき</span>
          <select id="blink-mode-select" class="rounded-md border border-[#6dff9a]/30 bg-[#101314] px-2 py-2 text-[#eef4f2]">
            <option value="mocap" selected>モーキャプ</option>
            <option value="auto">自動</option>
            <option value="off">オフ</option>
          </select>
        </label>
        <label class="grid gap-1 text-xs font-bold text-[#9fa9aa]">
          <span>口</span>
          <select id="lip-sync-mode-select" class="rounded-md border border-[#6dff9a]/30 bg-[#101314] px-2 py-2 text-[#eef4f2]">
            <option value="mocap">モーキャプ</option>
            <option value="mic" selected>マイク</option>
            <option value="off">オフ</option>
          </select>
        </label>
      </div>
      <span id="face-tracking-text" class="text-xs font-bold text-[#9fa9aa]">顔: 待機</span>
      <div class="grid gap-2 rounded-md border border-white/10 bg-white/[0.03] p-2">
        <div class="flex items-center justify-between gap-3">
          <span class="text-xs font-bold uppercase tracking-normal text-[#6dff9a]">表情</span>
          <span id="expression-preset-text" class="text-xs font-bold text-[#9fa9aa]">通常</span>
        </div>
        <div class="grid grid-cols-4 gap-2">
          <button class="expression-preset-button rounded-md border border-white/15 bg-white/[0.04] px-2 py-1.5 text-xs font-bold text-[#eef4f2] transition hover:border-[#38d5ff]" type="button" data-expression-preset="neutral">通常</button>
          <button class="expression-preset-button rounded-md border border-[#6dff9a]/55 bg-transparent px-2 py-1.5 text-xs font-bold text-[#dfffee] transition hover:border-[#38d5ff]" type="button" data-expression-preset="happy">笑顔</button>
          <button class="expression-preset-button rounded-md border border-[#38d5ff]/55 bg-transparent px-2 py-1.5 text-xs font-bold text-[#dff8ff] transition hover:border-[#6dff9a]" type="button" data-expression-preset="surprised">驚き</button>
          <button class="expression-preset-button rounded-md border border-white/15 bg-white/[0.04] px-2 py-1.5 text-xs font-bold text-[#eef4f2] transition hover:border-[#6dff9a]" type="button" data-expression-preset="relaxed">ゆるめ</button>
        </div>
      </div>
      <div class="grid gap-2">
        <div class="grid gap-1">
          <div class="flex items-center justify-between text-xs font-bold text-[#9fa9aa]"><span>音量</span><span>RMS</span></div>
          <div class="h-2 overflow-hidden rounded-full bg-white/10"><div id="mic-level-bar" class="h-full w-0 rounded-full bg-[#38d5ff] transition-[width] duration-75"></div></div>
        </div>
        <div class="grid gap-1">
          <div class="flex items-center justify-between text-xs font-bold text-[#9fa9aa]"><span>口</span><span>aa</span></div>
          <div class="h-2 overflow-hidden rounded-full bg-white/10"><div id="mic-mouth-bar" class="h-full w-0 rounded-full bg-[#6dff9a] transition-[width] duration-75"></div></div>
        </div>
      </div>
    </div>
    <div class="grid gap-2 rounded-md border border-[#38d5ff]/25 bg-black/20 p-2">
      <div class="grid gap-1">
        <span class="text-xs font-bold uppercase tracking-normal text-[#38d5ff]">体トラック</span>
        <strong id="pose-status-text" class="text-sm font-bold text-[#eef4f2]">カメラ停止中</strong>
        <span id="pose-requirement-text" class="min-h-5 text-sm text-[#9fa9aa]">上半身を動かす</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button id="pose-start-button" class="rounded-md border border-[#38d5ff]/55 bg-[#38d5ff]/10 px-3 py-2 text-sm font-bold text-[#dff8ff] transition enabled:hover:border-[#6dff9a] enabled:hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40" type="button">カメラ開始</button>
        <button id="pose-stop-button" class="rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-bold text-[#eef4f2] transition enabled:hover:border-[#38d5ff] disabled:cursor-not-allowed disabled:opacity-40" type="button">停止</button>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <label class="inline-flex items-center gap-2 rounded-md border border-[#38d5ff]/30 bg-white/[0.03] px-2 py-2 text-xs font-bold text-[#9fa9aa]">
          <input id="idle-sway-input" class="h-4 w-4 accent-[#38d5ff]" type="checkbox" checked />
          揺らぎ
        </label>
        <label class="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2 py-2 text-xs font-bold text-[#9fa9aa]">
          <input id="pose-mirror-input" class="h-4 w-4 accent-[#38d5ff]" type="checkbox" checked />
          ミラー
        </label>
      </div>
      <div class="relative aspect-video overflow-hidden rounded-md border border-white/10 bg-[#0b0f10]">
        <video id="pose-video" class="h-full w-full scale-x-[-1] object-cover opacity-0" autoplay muted playsinline></video>
        <canvas id="pose-canvas" class="pointer-events-none absolute inset-0 h-full w-full scale-x-[-1]"></canvas>
        <div class="pointer-events-none absolute inset-x-0 bottom-0 bg-black/45 px-2 py-1 text-[11px] font-bold text-[#9fa9aa]">骨格のみ表示</div>
      </div>
      <div class="grid gap-2">
        <div class="flex items-center justify-between gap-3 text-xs font-bold text-[#9fa9aa]">
          <span>検出</span>
          <span id="pose-summary-text">待機</span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-white/10"><div id="pose-visibility-bar" class="h-full w-0 rounded-full bg-[#38d5ff] transition-[width] duration-75"></div></div>
      </div>
      <div class="grid gap-2 rounded-md border border-white/10 bg-white/[0.03] p-2">
        <span class="text-xs font-bold uppercase tracking-normal text-[#38d5ff]">体 / 腕</span>
      </div>
    </div>
    <div class="grid content-start gap-2 rounded-md border border-[#38d5ff]/25 bg-black/20 p-2">
      <div class="grid gap-1">
        <span class="text-xs font-bold uppercase tracking-normal text-[#38d5ff]">手</span>
        <strong class="text-sm font-bold text-[#eef4f2]">骨格表示</strong>
        <span id="hand-tracking-text" class="text-xs font-bold text-[#9fa9aa]">手: 待機</span>
      </div>
      <label class="inline-flex items-center gap-2 rounded-md border border-[#38d5ff]/30 bg-white/[0.03] px-2 py-2 text-xs font-bold text-[#9fa9aa]">
        <input id="hand-tracking-input" class="h-4 w-4 accent-[#38d5ff]" type="checkbox" checked />
        手の骨格
      </label>
    </div>
    <div class="grid gap-2 rounded-md border border-[#6dff9a]/25 bg-black/20 p-2">
      <div class="grid gap-1">
        <span class="text-xs font-bold uppercase tracking-normal text-[#6dff9a]">位置調整</span>
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
        <span class="flex justify-between"><span>拡大</span><span id="avatar-scale-text">1.00x</span></span>
        <input id="avatar-scale-input" class="accent-[#38d5ff]" type="range" min="0.7" max="1.7" step="0.01" value="1" />
      </label>
      <label class="grid gap-1 text-xs font-bold text-[#9fa9aa]">
        <span class="flex justify-between"><span>回転</span><span id="avatar-rotation-y-text">0°</span></span>
        <input id="avatar-rotation-y-input" class="accent-[#38d5ff]" type="range" min="-180" max="180" step="1" value="0" />
      </label>
      <button id="avatar-reset-button" class="rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-bold text-[#eef4f2] transition hover:border-[#38d5ff]" type="button">リセット</button>
    </div>
    <div class="grid gap-2 rounded-md border border-[#38d5ff]/25 bg-black/20 p-2">
      <div class="grid gap-1">
        <span class="text-xs font-bold uppercase tracking-normal text-[#38d5ff]">VRMA</span>
        <strong id="vrma-status-text" class="text-sm font-bold text-[#eef4f2]">VRMA未選択</strong>
        <span id="vrma-file-text" class="min-h-5 text-sm text-[#9fa9aa]">未読み込み</span>
        <span id="vrma-requirement-text" class="min-h-5 text-sm text-[#9fa9aa]">VRMが必要</span>
      </div>
      <label class="inline-flex cursor-pointer items-center justify-center rounded-md border border-[#38d5ff]/55 bg-[#38d5ff]/10 px-3 py-2 text-sm font-bold text-[#dff8ff] transition hover:border-[#6dff9a] hover:bg-white/[0.04]">
        <input id="vrma-file-input" class="sr-only" type="file" accept=".vrma" multiple />
        VRMAを読み込む
      </label>
      <div class="grid grid-cols-[1fr_1fr_auto] gap-2">
        <button id="vrma-play-button" class="rounded-md border border-[#6dff9a]/70 bg-transparent px-3 py-2 text-sm font-bold text-[#dfffee] transition enabled:hover:border-[#38d5ff] enabled:hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40" type="button">再生</button>
        <button id="vrma-stop-button" class="rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-bold text-[#eef4f2] transition enabled:hover:border-[#38d5ff] disabled:cursor-not-allowed disabled:opacity-40" type="button">停止</button>
        <label class="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2 py-2 text-xs font-bold text-[#9fa9aa]">
          <input id="vrma-loop-input" class="h-4 w-4 accent-[#6dff9a]" type="checkbox" checked />
          ループ
        </label>
      </div>
      <div id="vrma-slot-list" class="grid gap-2"></div>
    </div>
    <ul class="m-0 grid list-none content-start gap-2 rounded-md border border-white/10 bg-black/20 p-2">
      <li class="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#9fa9aa]"><span>設定</span><strong class="font-bold text-[#6dff9a]">表示中</strong></li>
      <li class="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#9fa9aa]"><span>OBS</span><strong class="font-bold text-[#6dff9a]">${state.obsMode ? 'ON' : 'OFF'}</strong></li>
      <li class="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#9fa9aa]"><span>透過</span><strong class="font-bold text-[#6dff9a]">${state.transparent ? 'ON' : 'OFF'}</strong></li>
      <li class="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#9fa9aa]"><span>描画</span><strong class="font-bold text-[#6dff9a]">WebGL</strong></li>
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
  handTrackingInput = panel.querySelector<HTMLInputElement>('#hand-tracking-input');
  blinkModeSelect = panel.querySelector<HTMLSelectElement>('#blink-mode-select');
  lipSyncModeSelect = panel.querySelector<HTMLSelectElement>('#lip-sync-mode-select');
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
    publishVrmaCommand('select');
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
  handTrackingInput?.addEventListener('change', () => {
    const enabled = handTrackingInput?.checked ?? true;
    appStore.getState().setHandTrackingEnabled(enabled);
    if (!enabled) {
      appStore.getState().setHandTrackingStopped();
    } else if (handTracker && appStore.getState().poseStatus === 'active') {
      appStore.getState().setHandTrackingActive();
    }
  });
  blinkModeSelect?.addEventListener('change', () => {
    blinkMode = getBlinkModeFromSelect();
    autoBlinkState = createAutoBlinkState(performance.now() / 1000);
    syncFaceTrackingEnabledFromModes();
    if (blinkMode === 'off') {
      applyBlinkOpen();
    }
    void syncFaceTrackerForCurrentModes();
  });
  lipSyncModeSelect?.addEventListener('change', () => {
    lipSyncMode = getLipSyncModeFromSelect();
    syncFaceTrackingEnabledFromModes();
    if (lipSyncMode !== 'mic') {
      applyMouthOpen(0);
    }
    void syncFaceTrackerForCurrentModes();
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

syncFaceTrackingEnabledFromModes();
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
  if (!isRenderPage) {
    applyCameraLessIdle(elapsed);
  }
  updateLookAtCameraTarget();
  if (!isRenderPage) {
    sampleCameraLessExpressions(elapsed);
    sampleMicReactiveMouth();
    publishRelayState(frameTime);
  }
  currentVrm?.update(delta);
  renderer.render(scene, camera);
  window.requestAnimationFrame(animate);
}

animate();

function handleRelayMessage(message: RelayMessage): void {
  if (!isRenderPage) {
    return;
  }

  switch (message.type) {
    case 'asset':
      if (message.asset.kind === 'vrm') {
        void loadRelayVrmAsset(message.asset);
      }
      break;
    case 'vrmaSlots':
      void loadRelayVrmaAssets(message.assets, message.selectedIndex);
      break;
    case 'state':
      applyRelayRenderState(message.state);
      break;
    case 'vrmaCommand':
      applyRelayVrmaCommand(message.command, message.selectedIndex, message.loop);
      break;
    case 'hello':
      break;
  }
}

async function loadRelayVrmAsset(asset: RelayAssetDescriptor): Promise<void> {
  if (loadingRelayVrmAssetId === asset.id) {
    return;
  }

  loadingRelayVrmAssetId = asset.id;
  const file = await fileFromRelayAsset(asset);
  await handleVrmFileSelection(file);
}

async function loadRelayVrmaAssets(
  assets: RelayAssetDescriptor[],
  selectedIndex: number,
): Promise<void> {
  const signature = assets.map((asset) => asset.id).join(':');
  if (loadingRelayVrmaAssetSignature === signature) {
    return;
  }

  loadingRelayVrmaAssetSignature = signature;
  const files = await Promise.all(assets.map((asset) => fileFromRelayAsset(asset)));
  await handleVrmaFileSelection(files);

  if (selectedIndex >= 0) {
    selectVrmaSlot(selectedIndex);
  }
}

async function fileFromRelayAsset(asset: RelayAssetDescriptor): Promise<File> {
  const response = await fetch(asset.url, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Relay asset fetch failed: ${response.status}`);
  }

  const blob = await response.blob();
  return new File([blob], asset.name, {
    type: blob.type || 'application/octet-stream',
  });
}

function applyRelayVrmaCommand(
  command: 'play' | 'stop' | 'select',
  selectedIndex: number,
  loop: boolean,
): void {
  appStore.getState().setVrmaLoop(loop);
  syncVrmaLoopMode(loop);

  if (selectedIndex >= 0 && selectedIndex !== selectedVrmaSlotIndex) {
    selectVrmaSlot(selectedIndex);
  }

  if (command === 'play') {
    startVrmaPlayback();
  } else if (command === 'stop') {
    stopVrmaPlayback();
  }
}

function applyRelayRenderState(nextState: RelayRenderState): void {
  appStore.getState().setAvatarOffsetX(nextState.avatarTransform.offsetX);
  appStore.getState().setAvatarOffsetY(nextState.avatarTransform.offsetY);
  appStore.getState().setAvatarScale(nextState.avatarTransform.scale);
  appStore.getState().setAvatarRotationY(nextState.avatarTransform.rotationY);
  appStore.getState().setVrmaLoop(nextState.vrmaLoop);
  applyAvatarTransform();
  syncVrmaLoopMode(nextState.vrmaLoop);

  relayMotionActive = Boolean(
    nextState.pose.head?.enabled || nextState.pose.upperBody?.enabled,
  );
  headRetargetPose = nextState.pose.head ?? createNeutralHeadRetargetPose(false);
  upperBodyRetargetPose = nextState.pose.upperBody ?? createNeutralRetargetPose(false);
  applyHeadRetarget();
  applyRelayExpressions(nextState.expressions);
}

function applyRelayExpressions(expressions: RelayRenderState['expressions']): void {
  for (const [name, value] of Object.entries(expressions)) {
    if (typeof value === 'number') {
      currentVrm?.expressionManager?.setValue(name, value);
    }
  }
}

function publishRelayState(frameTime: number): void {
  if (!isControlPage || frameTime - relayStatePublishTime < 33) {
    return;
  }

  relayStatePublishTime = frameTime;
  const nextState = appStore.getState();
  relayClient.send({
    type: 'state',
    state: {
      avatarTransform: {
        offsetX: nextState.avatarOffsetX,
        offsetY: nextState.avatarOffsetY,
        scale: nextState.avatarScale,
        rotationY: nextState.avatarRotationY,
      },
      expressions: {
        blinkLeft: faceExpressionWeights.blinkLeft,
        blinkRight: faceExpressionWeights.blinkRight,
        aa: faceExpressionWeights.aa,
        ih: faceExpressionWeights.ih,
        ou: faceExpressionWeights.ou,
        ee: faceExpressionWeights.ee,
        oh: faceExpressionWeights.oh,
        happy: faceExpressionWeights.happy,
        surprised: faceExpressionWeights.surprised,
      },
      pose: {
        head: headRetargetPose,
        upperBody: upperBodyRetargetPose,
      },
      vrmaLoop: nextState.vrmaLoop,
    },
  });
}

async function handleVrmFileSelection(file: File | null): Promise<void> {
  const validation = validateVrmFile(file);

  if (!validation.ok) {
    appStore.getState().setVrmError(getVrmFileValidationMessage(validation));
    return;
  }

  if (!file) {
    appStore.getState().setVrmError('VRMを選択してください');
    return;
  }

  appStore.getState().setVrmLoading(file.name);

  try {
    const nextVrm = await loadVrmFromFile(file);
    replaceCurrentVrm(nextVrm);
    appStore.getState().setVrmReady(file.name);
    if (isControlPage) {
      void publishVrmAsset(file);
    }
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
    appStore.getState().setVrmaError('VRMAを選択してください');
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
    const relayAssets: RelayAssetDescriptor[] = [];
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
      if (isControlPage) {
        const asset = await relayClient.uploadAsset('vrma', file);
        relayAssets.push({
          ...asset,
          duration: animation.duration,
        });
      }
    }

    selectedVrmaSlotIndex = 0;
    currentVrma = vrmaSlots[0]?.animation ?? null;
    resetVrmaMixer();
    const selectedSlot = vrmaSlots[0];
    if (!selectedSlot) {
      throw new VrmaLoadError('VRMAを読み込めませんでした');
    }
    appStore.getState().setVrmaReady(selectedSlot.name, selectedSlot.duration);
    renderVrmaSlotList();
    if (isControlPage) {
      relayClient.send({
        type: 'vrmaSlots',
        assets: relayAssets,
        selectedIndex: selectedVrmaSlotIndex,
      });
    }
  } catch (error) {
    currentVrma = null;
    selectedVrmaSlotIndex = -1;
    const message =
      error instanceof VrmaLoadError ? error.message : getUnknownVrmaLoadErrorMessage(error);
    appStore.getState().setVrmaError(message);
    renderVrmaSlotList();
  }
}

async function publishVrmAsset(file: File): Promise<void> {
  try {
    const asset = await relayClient.uploadAsset('vrm', file);
    relayClient.send({
      type: 'asset',
      asset,
    });
  } catch (error) {
    appStore
      .getState()
      .setVrmError(error instanceof Error ? error.message : 'RelayへのVRM送信に失敗しました');
  }
}

function publishVrmaCommand(command: 'play' | 'stop' | 'select'): void {
  if (!isControlPage) {
    return;
  }

  relayClient.send({
    type: 'vrmaCommand',
    command,
    selectedIndex: selectedVrmaSlotIndex,
    loop: appStore.getState().vrmaLoop,
  });
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
  if (isControlPage) {
    configureControlPreviewCamera();
    return;
  }

  camera.position.set(0, 1.58, 2.55);
  camera.lookAt(0, 1.38, 0);
  camera.updateProjectionMatrix();
}

function configureControlPreviewCamera(): void {
  camera.position.set(-0.1, 1.35, 6.4);
  camera.lookAt(-0.1, 1.15, 0);
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
    vrmFileText.textContent = nextState.vrmFileName ?? '未読み込み';
  }

  updateVrmaStatusUi(nextState);
  updateMicStatusUi(nextState);
  updatePoseStatusUi(nextState);
  updateAvatarTransformUi(nextState);
}

function getVrmStatusText(nextState: AppState): string {
  switch (nextState.vrmStatus) {
    case 'idle':
      return 'VRM未選択';
    case 'loading':
      return 'VRM読み込み中';
    case 'ready':
      return 'VRM読み込み済み';
    case 'error':
      return nextState.vrmError ?? 'VRM読み込み失敗';
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
    appStore.getState().setVrmaError('VRMを先に読み込んでください');
    return;
  }

  if (!currentVrma) {
    appStore.getState().setVrmaError('VRMAを選択してください');
    return;
  }

  if (!currentVrmaAction) {
    resetVrmaMixer();
  }

  currentVrmaAction?.reset().play();
  appStore.getState().setVrmaPlaybackStatus('playing');
  publishVrmaCommand('play');
}

function stopVrmaPlayback(): void {
  currentVrmaAction?.stop();
  currentVrmaMixer?.setTime(0);
  appStore.getState().setVrmaPlaybackStatus('stopped');
  publishVrmaCommand('stop');
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
      return 'VRMA未選択';
    case 'loading':
      return 'VRMA読み込み中';
    case 'ready':
      return nextState.vrmaPlaybackStatus === 'playing' ? 'VRMA再生中' : 'VRMA読み込み済み';
    case 'error':
      return nextState.vrmaError ?? 'VRMA読み込み失敗';
  }
}

function getVrmaFileText(nextState: AppState): string {
  if (!nextState.vrmaFileName) {
    return '未読み込み';
  }

  if (nextState.vrmaDuration === null) {
    return nextState.vrmaFileName;
  }

  return `${nextState.vrmaFileName} (${nextState.vrmaDuration.toFixed(2)}s)`;
}

function getVrmaRequirementText(nextState: AppState): string {
  if (nextState.vrmStatus !== 'ready') {
    return 'VRMが必要';
  }

  if (nextState.vrmaStatus !== 'ready') {
    return 'VRMAを読み込む';
  }

  return nextState.vrmaLoop ? 'ループ再生可' : '1回再生';
}

function renderVrmaSlotList(): void {
  if (!vrmaSlotList) {
    return;
  }

  if (vrmaSlots.length === 0) {
    vrmaSlotList.innerHTML =
      '<span class="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold text-[#9fa9aa]">スロットなし</span>';
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
  publishVrmaCommand('select');
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
  if (lipSyncMode === 'mic') {
    applyMouthOpen(frame.mouthOpen);
  }
  appStore.getState().setMicFrame(frame.rms, frame.mouthOpen);
}

function applyMouthOpen(value: number): void {
  faceExpressionWeights = {
    ...faceExpressionWeights,
    aa: value,
  };
  currentVrm?.expressionManager?.setValue('aa', value);
}

function applyAllFaceExpressions(weights: VrmFaceExpressionWeights): void {
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

function applyMocapFaceExpressions(weights: VrmFaceExpressionWeights): void {
  if (blinkMode === 'mocap') {
    currentVrm?.expressionManager?.setValue('blinkLeft', weights.blinkLeft);
    currentVrm?.expressionManager?.setValue('blinkRight', weights.blinkRight);
  }

  if (lipSyncMode === 'mocap') {
    currentVrm?.expressionManager?.setValue('aa', weights.aa);
    currentVrm?.expressionManager?.setValue('ih', weights.ih);
    currentVrm?.expressionManager?.setValue('ou', weights.ou);
    currentVrm?.expressionManager?.setValue('ee', weights.ee);
    currentVrm?.expressionManager?.setValue('oh', weights.oh);
  }

  currentVrm?.expressionManager?.setValue('happy', weights.happy);
  currentVrm?.expressionManager?.setValue('surprised', weights.surprised);
}

function resetFaceExpressions(): void {
  faceExpressionWeights = createNeutralFaceExpressionWeights();
  applyAllFaceExpressions(faceExpressionWeights);
  resetHeadRetarget();
}

function sampleCameraLessExpressions(elapsedSeconds: number): void {
  if (!currentVrm) {
    return;
  }

  applyExpressionPreset();

  if (blinkMode === 'off') {
    applyBlinkOpen();
    return;
  }

  if (blinkMode !== 'auto') {
    return;
  }

  const result = sampleAutoBlink(autoBlinkState, elapsedSeconds);
  autoBlinkState = result.state;
  faceExpressionWeights = {
    ...faceExpressionWeights,
    blinkLeft: result.weight,
    blinkRight: result.weight,
  };
  currentVrm.expressionManager?.setValue('blinkLeft', result.weight);
  currentVrm.expressionManager?.setValue('blinkRight', result.weight);
}

function applyBlinkOpen(): void {
  faceExpressionWeights = {
    ...faceExpressionWeights,
    blinkLeft: 0,
    blinkRight: 0,
  };
  currentVrm?.expressionManager?.setValue('blinkLeft', 0);
  currentVrm?.expressionManager?.setValue('blinkRight', 0);
}

function applyExpressionPreset(): void {
  const weights = vrmExpressionPresets[selectedExpressionPreset];

  for (const [name, value] of Object.entries(weights)) {
    currentVrm?.expressionManager?.setValue(name, value ?? 0);
  }

  faceExpressionWeights = {
    ...faceExpressionWeights,
    happy: weights.happy ?? 0,
    surprised: weights.surprised ?? 0,
  };
}

function updateExpressionPresetUi(): void {
  if (!expressionPresetText) {
    return;
  }

  expressionPresetText.textContent =
    selectedExpressionPreset === 'neutral'
      ? '通常'
      : selectedExpressionPreset === 'happy'
        ? '笑顔'
        : selectedExpressionPreset === 'surprised'
          ? '驚き'
          : 'ゆるめ';
}

function isExpressionPresetId(value: unknown): value is VrmExpressionPresetId {
  return (
    value === 'neutral' ||
    value === 'happy' ||
    value === 'surprised' ||
    value === 'relaxed'
  );
}

function getBlinkModeFromSelect(): BlinkMode {
  const value = blinkModeSelect?.value;
  return value === 'auto' || value === 'off' ? value : 'mocap';
}

function getLipSyncModeFromSelect(): LipSyncMode {
  const value = lipSyncModeSelect?.value;
  return value === 'mocap' || value === 'off' ? value : 'mic';
}

function syncFaceTrackingEnabledFromModes(): void {
  appStore.getState().setFaceTrackingEnabled(true);
}

async function syncFaceTrackerForCurrentModes(): Promise<void> {
  if (appStore.getState().poseStatus !== 'active') {
    return;
  }

  if (faceTracker) {
    appStore.getState().setFaceTrackingActive();
    return;
  }

  appStore.getState().setFaceTrackingLoading();
  try {
    const { MediaPipeFaceTracker } = await import('./mocap/mediapipe-face-hand');
    faceTracker = await MediaPipeFaceTracker.create();
    appStore.getState().setFaceTrackingActive();
  } catch (error) {
    appStore.getState().setFaceTrackingError(getPoseErrorMessage(error));
  }
}

function getMicErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'マイク開始失敗';
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
      return 'マイク停止中';
    case 'requesting':
      return 'マイク許可待ち';
    case 'active':
      return 'マイク使用中';
    case 'error':
      return nextState.micError ?? 'マイク開始失敗';
  }
}

function getMicRequirementText(nextState: AppState): string {
  if (nextState.vrmStatus !== 'ready') {
    return 'VRMが必要';
  }

  if (nextState.micStatus === 'active') {
    return '音量連動中';
  }

  return '音量で口を動かす';
}

async function startPoseDebug(): Promise<void> {
  stopPoseDebug();
  appStore.getState().setPoseRequesting();

  if (!poseVideoElement || !poseCanvasElement) {
    appStore.getState().setPoseError('カメラUIなし');
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
  applyMocapFaceExpressions(faceExpressionWeights);
  applyHeadRetarget();
  const faceSummaryParts = [
    blinkMode === 'mocap'
      ? `まばたき ${Math.max(faceExpressionWeights.blinkLeft, faceExpressionWeights.blinkRight).toFixed(2)}`
      : null,
    lipSyncMode === 'mocap' ? `口 ${faceExpressionWeights.aa.toFixed(2)}` : null,
  ].filter((part): part is string => part !== null);
  appStore
    .getState()
    .setFaceTrackingFrame(
      categories.length === 0
        ? '顔: 未検出'
        : faceSummaryParts.length > 0
          ? `顔: ${faceSummaryParts.join(' / ')}`
          : '頭: トラック中',
    );
}

function runHandTrackingFrame(videoFrame: HTMLVideoElement, frameTime: number): void {
  const nextState = appStore.getState();
  if (!nextState.handTrackingEnabled || !handTracker || nextState.handTrackingStatus !== 'active') {
    return;
  }

  const result = handTracker.detect(videoFrame, frameTime);
  const summary = summarizeHandTracking(result.landmarks, result.handedness);
  drawHandDebugLandmarks(result.landmarks);
  appStore
    .getState()
    .setHandTrackingFrame(
      summary.handCount === 0
        ? '手: 未検出'
        : `手: ${summary.handCount}`,
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
  const nextState = appStore.getState();
  if (!currentVrm || (!relayMotionActive && nextState.poseStatus !== 'active')) {
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
    return '未検出';
  }

  const visibility = Math.round(summary.averageUpperBodyVisibility * 100);
  const shoulder = summary.shoulderSpan === null ? 'n/a' : summary.shoulderSpan.toFixed(2);
  const lean = summary.torsoLean === null ? 'n/a' : summary.torsoLean.toFixed(2);

  return `${visibility}% / 肩 ${shoulder} / 傾き ${lean}`;
}

function getPoseErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'カメラ開始失敗';
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

  if (handTrackingInput) {
    handTrackingInput.checked = nextState.handTrackingEnabled;
    handTrackingInput.disabled =
      nextState.poseStatus === 'requesting' ||
      nextState.poseStatus === 'loading';
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
      return '読込中';
    case 'error':
      return error ?? '失敗';
  }
}

function getPoseStatusText(nextState: AppState): string {
  switch (nextState.poseStatus) {
    case 'idle':
      return 'カメラ停止中';
    case 'requesting':
      return 'カメラ許可待ち';
    case 'loading':
      return 'モデル読込中';
    case 'active':
      return 'カメラ使用中';
    case 'error':
      return nextState.poseError ?? 'カメラ開始失敗';
  }
}

function getPoseRequirementText(nextState: AppState): string {
  if (nextState.poseStatus === 'active') {
    return 'トラック中';
  }

  if (nextState.poseStatus === 'error') {
    return '権限を確認';
  }

  return '上半身を動かす';
}
