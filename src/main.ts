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
import {
  createNeutralManualPoseState,
  updateManualAvatarScaleFromWheel,
  updateManualAvatarTransformFromDrag,
  updateManualPoseFromDrag,
  type ManualPointerButton,
  type ManualPoseState,
} from './input/manual-control';
import {
  resolveLookLights,
  type LookPresetId,
  type LookSettings,
  type ResolvedLookLights,
  type RimLightColor,
  type RimLightDirection,
  type RimLightStrength,
} from './look/look-presets';
import { sampleIdleSway } from './idle/idle-sway';
import {
  createNeutralFaceExpressionWeights,
  createVrmFaceExpressionWeights,
  smoothFaceExpressionWeights,
} from './mocap/face-expression-retarget';
import {
  createHandRetargetPose,
  createNeutralHandRetargetPose,
  getHandPoseGripAmount,
  smoothHandRetargetPose,
  summarizeHandTracking,
} from './mocap/hand-landmarks';
import {
  createArmIkRetargetPose,
  createNeutralArmIkRetargetPose,
  hasArmIkTarget,
  smoothArmIkRetargetPose,
} from './mocap/arm-ik-target';
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
import type {
  HandFingerCurl,
  HandRetargetPose,
  HandRetargetTarget,
} from './mocap/hand-landmarks';
import type {
  ArmIkRetargetPose,
  ArmIkSideTarget,
  Vector3Like,
} from './mocap/arm-ik-target';
import type { HeadRetargetPose } from './mocap/head-retarget';
import type { UpperBodyPoseSummary } from './mocap/pose-landmarks';
import type { UpperBodyRetargetPose } from './mocap/upper-body-retarget';
import { loadVrmFromFile, VrmLoadError } from './vrm/load-vrm';
import {
  createNeutralVrmEmotionExpressionWeights,
  createVrmExpressionPresetTarget,
  smoothVrmEmotionExpressionWeights,
  vrmEmotionExpressionNames,
  type VrmEmotionExpressionWeights,
  type VrmExpressionPresetId,
} from './vrm/expression-presets';
import { VPlantRelayClient } from './relay/client';
import type {
  RelayAssetDescriptor,
  RelayAvatarTransform,
  RelayDebugSample,
  RelayExpressionState,
  RelayExpressionSyncState,
  RelayMessage,
  RelayMotionState,
  RelayPoseState,
  RelayRenderState,
  RelayRuntimeState,
  RelayStaticState,
} from './relay/messages';
import {
  createRelayRuntimeState as createRelayRuntimeStateMessage,
  shouldDiscardRelayRuntimeState,
} from './relay/runtime-state';
import {
  createRelayExpressionStabilizer,
  stabilizeRelayExpressionState,
} from './relay/expression-stabilizer';
import {
  createRelayPoseStabilizer,
  stabilizeRelayPoseState,
} from './relay/pose-stabilizer';
import {
  smoothRelayAvatarTransform,
  smoothResolvedLookLights,
} from './relay/render-smoothing';
import {
  sampleRelayMotionFrames,
  type RelayMotionFrame,
} from './relay/motion-interpolation';
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
renderer.setSize(window.innerWidth, window.innerHeight, !isControlPage);
renderer.setClearColor(state.transparent ? 0x000000 : 0x101314, state.transparent ? 0 : 1);
renderer.setClearAlpha(state.transparent ? 0 : 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.86;
renderer.shadowMap.enabled = false;
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
const keyLightTarget = new THREE.Object3D();
keyLightTarget.position.set(0, 1.34, 0);
keyLight.target = keyLightTarget;
scene.add(keyLightTarget);

const rimLight = new THREE.DirectionalLight(0x38d5ff, 0.65);
rimLight.position.set(-3, 2, -2);
scene.add(rimLight);
const rimLightTarget = new THREE.Object3D();
rimLightTarget.position.set(0, 1.42, 0);
rimLight.target = rimLightTarget;
scene.add(rimLightTarget);

const fillLight = new THREE.DirectionalLight(0xf2f7ff, 0.5);
fillLight.position.set(-2.6, 2.1, 3);
scene.add(fillLight);
const fillLightTarget = new THREE.Object3D();
fillLightTarget.position.set(0, 1.12, 0);
fillLight.target = fillLightTarget;
scene.add(fillLightTarget);
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
let manualControlInput: HTMLInputElement | null = null;
let manualMouseInput: HTMLInputElement | null = null;
let manualControlStatusText: HTMLElement | null = null;
let lookPresetSelect: HTMLSelectElement | null = null;
let keyLightScaleInput: HTMLInputElement | null = null;
let fillLightScaleInput: HTMLInputElement | null = null;
let rimLightStrengthSelect: HTMLSelectElement | null = null;
let rimLightColorSelect: HTMLSelectElement | null = null;
let rimLightDirectionSelect: HTMLSelectElement | null = null;
let keyLightScaleText: HTMLElement | null = null;
let fillLightScaleText: HTMLElement | null = null;
type ControlMode = 'mic-manual' | 'camera';
let selectedControlMode: ControlMode = 'mic-manual';
let manualPose: ManualPoseState = createNeutralManualPoseState(false);
let manualPointerSession: {
  pointerId: number;
  button: ManualPointerButton;
  lastX: number;
  lastY: number;
} | null = null;
let poseAnimationFrameId: number | null = null;
let lastPoseVideoTime = -1;
let upperBodyRetargetPose = createNeutralRetargetPose(false);
let faceExpressionWeights = createNeutralFaceExpressionWeights();
let headRetargetPose: HeadRetargetPose = createNeutralHeadRetargetPose(false);
let handRetargetPose: HandRetargetPose = createNeutralHandRetargetPose();
let armIkRetargetPose: ArmIkRetargetPose = createNeutralArmIkRetargetPose();
let armIkRetargetWasActive = false;
let handRetargetWasActive = false;
let autoBlinkState: AutoBlinkState = createAutoBlinkState(performance.now() / 1000);
let selectedExpressionPreset: VrmExpressionPresetId | null = null;
let emotionExpressionWeights: VrmEmotionExpressionWeights =
  createNeutralVrmEmotionExpressionWeights();
type BlinkMode = 'mocap' | 'auto' | 'off';
type LipSyncMode = 'mocap' | 'mic' | 'off';
let blinkMode: BlinkMode = 'mocap';
let lipSyncMode: LipSyncMode = 'mic';
let idleSwayEnabled = true;
let faceTracker: MediaPipeFaceTracker | null = null;
let handTracker: MediaPipeHandTracker | null = null;
let lastFaceTrackingSignalTime = 0;
let relayMotionActive = false;
let relayHeadTarget: HeadRetargetPose = createNeutralHeadRetargetPose(false);
let relayUpperBodyTarget: UpperBodyRetargetPose = createNeutralRetargetPose(false);
let relayHandTarget: HandRetargetPose = createNeutralHandRetargetPose();
let relayArmIkTarget: ArmIkRetargetPose = createNeutralArmIkRetargetPose();
let relayArmIkTrackingEnabled = false;
let relayExpressionTarget: VrmFaceExpressionWeights = createNeutralFaceExpressionWeights();
let relayReceivedExpressionSnapshot: RelayExpressionState = {};
let relayAppliedBeforeUpdateSnapshot: RelayExpressionState = {};
let relayAppliedAfterUpdateSnapshot: RelayExpressionState = {};
let relayAvatarTransformCurrent: RelayAvatarTransform = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  rotationY: 0,
};
let relayAvatarTransformTarget: RelayAvatarTransform = {
  ...relayAvatarTransformCurrent,
};
let relayLookLightsCurrent: ResolvedLookLights = resolveLookLights(appStore.getState().lookSettings);
let relayLookSettingsTarget: LookSettings = appStore.getState().lookSettings;
let relayRenderStaticStateSignature = '';
let relayStaticPublishSignature = '';
let relayMotionPublishTime = 0;
let relayRuntimeSequence = 0;
let relayDebugSamplePublishTime = 0;
const relayExpressionStabilizer = createRelayExpressionStabilizer();
const relayPoseStabilizer = createRelayPoseStabilizer();
let lastAppliedRelayMotionSequence = 0;
let lastAppliedRelayMotionSentAt = 0;
let lastAppliedRelayExpressionSequence = 0;
let lastAppliedRelayExpressionSentAt = 0;
let lastAppliedRelayRuntimeSequence = 0;
let lastAppliedRelayRuntimeSentAt = 0;
let relayRuntimeModeActive = false;
let relayDroppedStaleRuntimeFrames = 0;
let relayDroppedStaleMotionFrames = 0;
let relayDroppedStaleExpressionFrames = 0;
let relayPreviousMotionFrame: RelayMotionFrame | null = null;
let relayCurrentMotionFrame: RelayMotionFrame | null = null;
let relayDebugOverlay: HTMLElement | null = null;
let loadingRelayVrmAssetId: string | null = null;
let loadingRelayVrmaAssetSignature: string | null = null;
const relayClient = new VPlantRelayClient(
  isRenderPage ? 'render' : 'control',
  handleRelayMessage,
);
const restBoneQuaternions = new Map<string, THREE.Quaternion>();
const restBoneWorldPositions = new Map<string, THREE.Vector3>();
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
const fingerBoneNames = [
  VRMHumanBoneName.LeftThumbMetacarpal,
  VRMHumanBoneName.LeftThumbProximal,
  VRMHumanBoneName.LeftThumbDistal,
  VRMHumanBoneName.LeftIndexProximal,
  VRMHumanBoneName.LeftIndexIntermediate,
  VRMHumanBoneName.LeftIndexDistal,
  VRMHumanBoneName.LeftMiddleProximal,
  VRMHumanBoneName.LeftMiddleIntermediate,
  VRMHumanBoneName.LeftMiddleDistal,
  VRMHumanBoneName.LeftRingProximal,
  VRMHumanBoneName.LeftRingIntermediate,
  VRMHumanBoneName.LeftRingDistal,
  VRMHumanBoneName.LeftLittleProximal,
  VRMHumanBoneName.LeftLittleIntermediate,
  VRMHumanBoneName.LeftLittleDistal,
  VRMHumanBoneName.RightThumbMetacarpal,
  VRMHumanBoneName.RightThumbProximal,
  VRMHumanBoneName.RightThumbDistal,
  VRMHumanBoneName.RightIndexProximal,
  VRMHumanBoneName.RightIndexIntermediate,
  VRMHumanBoneName.RightIndexDistal,
  VRMHumanBoneName.RightMiddleProximal,
  VRMHumanBoneName.RightMiddleIntermediate,
  VRMHumanBoneName.RightMiddleDistal,
  VRMHumanBoneName.RightRingProximal,
  VRMHumanBoneName.RightRingIntermediate,
  VRMHumanBoneName.RightRingDistal,
  VRMHumanBoneName.RightLittleProximal,
  VRMHumanBoneName.RightLittleIntermediate,
  VRMHumanBoneName.RightLittleDistal,
];

relayClient.connect();

if (isControlPage) {
  const panel = document.createElement('aside');
  panel.className = 'control-panel';
  const localOrigin = `${window.location.protocol}//127.0.0.1${window.location.port ? `:${window.location.port}` : ''}`;
  const controlUrl = `${localOrigin}/?control=1`;
  const obsRenderUrl = `${localOrigin}/?obs=1&transparent=1`;
  panel.innerHTML = `
    <div class="grid h-full content-start gap-3 overflow-y-auto pr-1">
    <div class="grid gap-3 rounded-md border border-[#6dff9a]/55 bg-black/25 p-3 shadow-[0_0_22px_rgba(109,255,154,0.08)]">
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm font-bold tracking-normal text-[#6dff9a]">表情プリセット</span>
        <span id="expression-preset-text" class="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-bold text-[#9fa9aa]">なし</span>
      </div>
      <div class="grid grid-cols-6 gap-2">
        <button class="expression-preset-button rounded-md border border-white/15 bg-white/[0.04] px-2 py-3 text-base font-bold text-[#eef4f2] transition hover:border-[#38d5ff]" type="button" data-expression-preset="neutral" aria-pressed="false">自然</button>
        <button class="expression-preset-button rounded-md border border-[#6dff9a]/55 bg-transparent px-2 py-3 text-base font-bold text-[#dfffee] transition hover:border-[#38d5ff]" type="button" data-expression-preset="happy" aria-pressed="false">喜</button>
        <button class="expression-preset-button rounded-md border border-white/15 bg-white/[0.04] px-2 py-3 text-base font-bold text-[#eef4f2] transition hover:border-[#6dff9a]" type="button" data-expression-preset="angry" aria-pressed="false">怒</button>
        <button class="expression-preset-button rounded-md border border-[#38d5ff]/55 bg-transparent px-2 py-3 text-base font-bold text-[#dff8ff] transition hover:border-[#6dff9a]" type="button" data-expression-preset="sad" aria-pressed="false">哀</button>
        <button class="expression-preset-button rounded-md border border-[#6dff9a]/55 bg-transparent px-2 py-3 text-base font-bold text-[#dfffee] transition hover:border-[#38d5ff]" type="button" data-expression-preset="relaxed" aria-pressed="false">楽</button>
        <button class="expression-preset-button rounded-md border border-[#38d5ff]/55 bg-transparent px-2 py-3 text-base font-bold text-[#dff8ff] transition hover:border-[#6dff9a]" type="button" data-expression-preset="surprised" aria-pressed="false">驚</button>
      </div>
    </div>
    <div class="grid gap-3 rounded-md border border-[#6dff9a]/45 bg-black/20 p-3">
      <div class="flex items-start justify-between gap-3">
        <div class="grid gap-1">
          <span class="text-xs font-bold uppercase tracking-normal text-[#6dff9a]">VRM</span>
          <strong id="vrm-status-text" class="text-base font-bold text-[#eef4f2]">VRM未選択</strong>
          <span id="vrm-file-text" class="min-h-5 text-sm text-[#9fa9aa]">未読み込み</span>
        </div>
      </div>
      <label class="inline-flex cursor-pointer items-center justify-center rounded-md border border-[#6dff9a]/80 bg-[#6dff9a]/10 px-4 py-3 text-base font-bold text-[#dfffee] transition hover:border-[#38d5ff] hover:bg-white/[0.04]">
        <input id="vrm-file-input" class="sr-only" type="file" accept=".vrm" />
        VRMを読み込む
      </label>
    </div>
    <div class="grid gap-3 rounded-md border border-white/10 bg-black/20 p-3">
      <span class="text-sm font-bold tracking-normal text-[#eef4f2]">操作モード</span>
      <div class="grid grid-cols-2 gap-2">
        <button id="mic-manual-mode-button" class="rounded-md border border-[#6dff9a]/80 bg-[#6dff9a]/15 px-3 py-5 text-lg font-bold text-[#dfffee] transition hover:border-[#38d5ff]" type="button" aria-pressed="true">マイク&手動</button>
        <button id="camera-mode-button" class="rounded-md border border-white/15 bg-white/[0.04] px-3 py-5 text-lg font-bold text-[#9fa9aa] transition hover:border-[#38d5ff]" type="button" aria-pressed="false">カメラ</button>
      </div>
    </div>
    <div id="mic-manual-mode-panel" class="grid gap-3 rounded-md border border-[#6dff9a]/35 bg-black/20 p-3">
      <div class="flex items-start justify-between gap-3">
        <div class="grid gap-1">
          <span class="text-xs font-bold uppercase tracking-normal text-[#6dff9a]">モード</span>
          <strong class="text-sm font-bold text-[#eef4f2]">マイク&手動モード</strong>
        </div>
        <span id="manual-control-status-text" class="text-xs font-bold text-[#9fa9aa]">未操作</span>
      </div>
      <div class="grid gap-1">
        <strong id="mic-status-text" class="text-sm font-bold text-[#eef4f2]">マイク停止中</strong>
        <span id="mic-requirement-text" class="min-h-5 text-sm text-[#9fa9aa]">音量で口を動かす</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button id="mic-start-button" class="rounded-md border border-[#6dff9a]/75 bg-[#6dff9a]/10 px-3 py-3 text-base font-bold text-[#dfffee] transition enabled:hover:border-[#38d5ff] enabled:hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40" type="button">マイク開始</button>
        <button id="mic-stop-button" class="rounded-md border border-white/15 bg-white/[0.04] px-3 py-3 text-base font-bold text-[#eef4f2] transition enabled:hover:border-[#38d5ff] disabled:cursor-not-allowed disabled:opacity-40" type="button">停止</button>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <label class="inline-flex items-center gap-2 rounded-md border border-[#38d5ff]/30 bg-white/[0.03] px-2 py-2 text-xs font-bold text-[#9fa9aa]">
          <input id="manual-control-input" class="h-4 w-4 accent-[#38d5ff]" type="checkbox" checked />
          手動操作
        </label>
        <label class="inline-flex items-center gap-2 rounded-md border border-[#38d5ff]/30 bg-white/[0.03] px-2 py-2 text-xs font-bold text-[#9fa9aa]">
          <input id="manual-mouse-input" class="h-4 w-4 accent-[#38d5ff]" type="checkbox" checked />
          マウス
        </label>
        <label class="inline-flex items-center gap-2 rounded-md border border-[#38d5ff]/30 bg-white/[0.03] px-2 py-2 text-xs font-bold text-[#9fa9aa]">
          <input id="idle-sway-input" class="h-4 w-4 accent-[#38d5ff]" type="checkbox" checked />
          揺らぎ
        </label>
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
      <button id="manual-reset-button" class="rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-bold text-[#eef4f2] transition hover:border-[#38d5ff]" type="button">顔向きリセット</button>
    </div>
    <div id="camera-mode-panel" class="hidden gap-3 rounded-md border border-[#38d5ff]/35 bg-black/20 p-3">
      <div class="grid gap-1">
        <span class="text-xs font-bold uppercase tracking-normal text-[#38d5ff]">モード</span>
        <strong class="text-sm font-bold text-[#eef4f2]">カメラモード</strong>
        <span id="pose-status-text" class="text-sm font-bold text-[#eef4f2]">カメラ停止中</span>
        <span id="pose-requirement-text" class="min-h-5 text-sm text-[#9fa9aa]">上半身を動かす</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button id="pose-start-button" class="rounded-md border border-[#38d5ff]/65 bg-[#38d5ff]/10 px-3 py-3 text-base font-bold text-[#dff8ff] transition enabled:hover:border-[#6dff9a] enabled:hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40" type="button">カメラ開始</button>
        <button id="pose-stop-button" class="rounded-md border border-white/15 bg-white/[0.04] px-3 py-3 text-base font-bold text-[#eef4f2] transition enabled:hover:border-[#38d5ff] disabled:cursor-not-allowed disabled:opacity-40" type="button">停止</button>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <label class="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2 py-2 text-xs font-bold text-[#9fa9aa]">
          <input id="pose-mirror-input" class="h-4 w-4 accent-[#38d5ff]" type="checkbox" checked />
          ミラー
        </label>
        <span id="face-tracking-text" class="rounded-md border border-white/10 bg-white/[0.03] px-2 py-2 text-xs font-bold text-[#9fa9aa]">顔: 待機</span>
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
    </div>
    <div class="grid gap-2 rounded-md border border-[#6dff9a]/20 bg-black/15 p-2">
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
    <div class="grid gap-2 rounded-md border border-[#38d5ff]/20 bg-black/15 p-2">
      <div class="grid gap-1">
        <span class="text-xs font-bold uppercase tracking-normal text-[#38d5ff]">ルック</span>
        <strong class="text-sm font-bold text-[#eef4f2]">キーライト</strong>
      </div>
      <label class="grid gap-1 text-xs font-bold text-[#9fa9aa]">
        <span>プリセット</span>
        <select id="look-preset-select" class="rounded-md border border-[#38d5ff]/30 bg-[#101314] px-2 py-2 text-[#eef4f2]">
          <option value="standard" selected>標準</option>
          <option value="bright">明るめ</option>
          <option value="front-top">正面上</option>
          <option value="neon">ネオン</option>
          <option value="edge">輪郭強調</option>
        </select>
      </label>
      <label class="grid gap-1 text-xs font-bold text-[#9fa9aa]">
        <span class="flex justify-between"><span>明るさ</span><span id="key-light-scale-text">100%</span></span>
        <input id="key-light-scale-input" class="accent-[#38d5ff]" type="range" min="0" max="2" step="0.05" value="1" />
      </label>
    </div>
    <div class="grid gap-2 rounded-md border border-[#38d5ff]/20 bg-black/15 p-2">
      <div class="grid gap-1">
        <span class="text-xs font-bold uppercase tracking-normal text-[#38d5ff]">VRMA</span>
        <strong id="vrma-status-text" class="text-sm font-bold text-[#eef4f2]">VRMA未選択</strong>
        <span id="vrma-file-text" class="min-h-5 text-sm text-[#9fa9aa]">未読み込み</span>
        <span id="vrma-requirement-text" class="min-h-5 text-sm text-[#9fa9aa]">VRMが必要</span>
      </div>
      <label class="inline-flex cursor-pointer items-center justify-center rounded-md border border-[#38d5ff]/55 bg-[#38d5ff]/10 px-3 py-2 text-xs font-bold text-[#dff8ff] transition hover:border-[#6dff9a] hover:bg-white/[0.04]">
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
    <div class="grid gap-2 rounded-md border border-white/10 bg-black/20 p-2">
      <div class="grid gap-1">
        <span class="text-xs font-bold uppercase tracking-normal text-[#9fa9aa]">OBS URL</span>
        <strong class="text-sm font-bold text-[#eef4f2]">OBSに貼る</strong>
      </div>
      <div class="grid gap-2 rounded-md border border-white/10 bg-white/[0.03] p-2">
        <span class="text-xs font-bold text-[#9fa9aa]">Render</span>
        <code id="obs-render-url-text" class="break-all rounded bg-black/30 px-2 py-1 text-xs text-[#dfffee]">${obsRenderUrl}</code>
        <button id="obs-render-url-copy-button" class="rounded-md border border-[#6dff9a]/60 bg-transparent px-3 py-2 text-xs font-bold text-[#dfffee] transition hover:border-[#38d5ff]" type="button">Render URLをコピー</button>
      </div>
      <div class="grid gap-2 rounded-md border border-white/10 bg-white/[0.03] p-2">
        <span class="text-xs font-bold text-[#9fa9aa]">Control</span>
        <code id="control-url-text" class="break-all rounded bg-black/30 px-2 py-1 text-xs text-[#dff8ff]">${controlUrl}</code>
        <button id="control-url-copy-button" class="rounded-md border border-[#38d5ff]/55 bg-transparent px-3 py-2 text-xs font-bold text-[#dff8ff] transition hover:border-[#6dff9a]" type="button">Control URLをコピー</button>
      </div>
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
  const obsRenderUrlCopyButton = panel.querySelector<HTMLButtonElement>(
    '#obs-render-url-copy-button',
  );
  const controlUrlCopyButton = panel.querySelector<HTMLButtonElement>('#control-url-copy-button');
  const micManualModeButton = panel.querySelector<HTMLButtonElement>('#mic-manual-mode-button');
  const cameraModeButton = panel.querySelector<HTMLButtonElement>('#camera-mode-button');
  const micManualModePanel = panel.querySelector<HTMLElement>('#mic-manual-mode-panel');
  const cameraModePanel = panel.querySelector<HTMLElement>('#camera-mode-panel');
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
  manualControlInput = panel.querySelector<HTMLInputElement>('#manual-control-input');
  manualMouseInput = panel.querySelector<HTMLInputElement>('#manual-mouse-input');
  manualControlStatusText = panel.querySelector<HTMLElement>('#manual-control-status-text');
  const manualResetButton = panel.querySelector<HTMLButtonElement>('#manual-reset-button');
  lookPresetSelect = panel.querySelector<HTMLSelectElement>('#look-preset-select');
  keyLightScaleInput = panel.querySelector<HTMLInputElement>('#key-light-scale-input');
  fillLightScaleInput = panel.querySelector<HTMLInputElement>('#fill-light-scale-input');
  rimLightStrengthSelect = panel.querySelector<HTMLSelectElement>('#rim-light-strength-select');
  rimLightColorSelect = panel.querySelector<HTMLSelectElement>('#rim-light-color-select');
  rimLightDirectionSelect = panel.querySelector<HTMLSelectElement>('#rim-light-direction-select');
  keyLightScaleText = panel.querySelector<HTMLElement>('#key-light-scale-text');
  fillLightScaleText = panel.querySelector<HTMLElement>('#fill-light-scale-text');

  vrmFileInput?.addEventListener('change', () => {
    const file = vrmFileInput.files?.[0] ?? null;
    void handleVrmFileSelection(file);
  });

  vrmaFileInput?.addEventListener('change', () => {
    const files = Array.from(vrmaFileInput.files ?? []);
    void handleVrmaFileSelection(files);
  });
  obsRenderUrlCopyButton?.addEventListener('click', () => {
    void navigator.clipboard?.writeText(obsRenderUrl);
  });
  controlUrlCopyButton?.addEventListener('click', () => {
    void navigator.clipboard?.writeText(controlUrl);
  });
  const setControlMode = (mode: ControlMode) => {
    const isMicManual = mode === 'mic-manual';
    selectedControlMode = mode;
    micManualModePanel?.classList.toggle('hidden', !isMicManual);
    micManualModePanel?.classList.toggle('grid', isMicManual);
    cameraModePanel?.classList.toggle('hidden', isMicManual);
    cameraModePanel?.classList.toggle('grid', !isMicManual);
    micManualModeButton?.setAttribute('aria-pressed', String(isMicManual));
    cameraModeButton?.setAttribute('aria-pressed', String(!isMicManual));
    micManualModeButton?.classList.toggle('border-[#6dff9a]/80', isMicManual);
    micManualModeButton?.classList.toggle('bg-[#6dff9a]/15', isMicManual);
    micManualModeButton?.classList.toggle('text-[#dfffee]', isMicManual);
    micManualModeButton?.classList.toggle('border-white/15', !isMicManual);
    micManualModeButton?.classList.toggle('bg-white/[0.04]', !isMicManual);
    micManualModeButton?.classList.toggle('text-[#9fa9aa]', !isMicManual);
    cameraModeButton?.classList.toggle('border-[#38d5ff]/80', !isMicManual);
    cameraModeButton?.classList.toggle('bg-[#38d5ff]/15', !isMicManual);
    cameraModeButton?.classList.toggle('text-[#dff8ff]', !isMicManual);
    cameraModeButton?.classList.toggle('border-white/15', isMicManual);
    cameraModeButton?.classList.toggle('bg-white/[0.04]', isMicManual);
    cameraModeButton?.classList.toggle('text-[#9fa9aa]', isMicManual);

    if (!isMicManual) {
      resetManualControlPose();
      if (shouldAutoStartCameraOnModeChange()) {
        void startPoseDebug();
      }
    }
  };
  micManualModeButton?.addEventListener('click', () => setControlMode('mic-manual'));
  cameraModeButton?.addEventListener('click', () => setControlMode('camera'));
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
  manualControlInput?.addEventListener('change', () => {
    const enabled = manualControlInput?.checked ?? true;
    appStore.getState().setManualControlEnabled(enabled);
    if (!enabled) {
      resetManualControlPose();
    }
  });
  manualMouseInput?.addEventListener('change', () => {
    appStore.getState().setManualMouseEnabled(manualMouseInput?.checked ?? true);
  });
  manualResetButton?.addEventListener('click', resetManualControlPose);
  lookPresetSelect?.addEventListener('change', () => {
    appStore.getState().setLookPreset(getLookPresetFromSelect());
    applyLookSettings(appStore.getState().lookSettings);
  });
  keyLightScaleInput?.addEventListener('input', () => {
    appStore.getState().setKeyLightScale(Number(keyLightScaleInput?.value ?? 1));
    applyLookSettings(appStore.getState().lookSettings);
  });
  fillLightScaleInput?.addEventListener('input', () => {
    appStore.getState().setFillLightScale(Number(fillLightScaleInput?.value ?? 1));
    applyLookSettings(appStore.getState().lookSettings);
  });
  rimLightStrengthSelect?.addEventListener('change', () => {
    appStore.getState().setRimLightStrength(getRimLightStrengthFromSelect());
    applyLookSettings(appStore.getState().lookSettings);
  });
  rimLightColorSelect?.addEventListener('change', () => {
    appStore.getState().setRimLightColor(getRimLightColorFromSelect());
    applyLookSettings(appStore.getState().lookSettings);
  });
  rimLightDirectionSelect?.addEventListener('change', () => {
    appStore.getState().setRimLightDirection(getRimLightDirectionFromSelect());
    applyLookSettings(appStore.getState().lookSettings);
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
    resetArmIkRetarget();
  });
  handTrackingInput?.addEventListener('change', () => {
    const enabled = handTrackingInput?.checked ?? true;
    appStore.getState().setHandTrackingEnabled(enabled);
    resetArmIkRetarget();
    if (!enabled) {
      clearArmRetargetPose();
      appStore.getState().setHandTrackingStopped();
    } else if (appStore.getState().poseStatus === 'active') {
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
      applyMouthExpressions(createNeutralMouthExpressions());
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
        selectedExpressionPreset = selectedExpressionPreset === preset ? null : preset;
        applyExpressionPreset();
        updateExpressionPresetUi();
      }
    });
  });
  renderVrmaSlotList();
  updateExpressionPresetUi();
  setupManualControlEvents();

  viewport.append(panel);
} else {
  viewport.style.pointerEvents = 'none';
  if (options.debug) {
    relayDebugOverlay = document.createElement('aside');
    relayDebugOverlay.className = 'relay-debug-overlay';
    relayDebugOverlay.setAttribute('aria-label', 'OBS relay debug');
    relayDebugOverlay.textContent = 'Relay debug waiting...';
    viewport.append(relayDebugOverlay);
  }
}

app.append(viewport);

applyLookSettings(appStore.getState().lookSettings);
syncFaceTrackingEnabledFromModes();
appStore.subscribe(updateVrmStatusUi);
updateVrmStatusUi(appStore.getState());
resize();

function resize(): void {
  const { width, height } = getRenderSize();
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, !isControlPage);
}

function applyLookSettings(settings: LookSettings): void {
  applyResolvedLookLights(resolveLookLights(settings));
}

function applyResolvedLookLights(lights: ResolvedLookLights): void {
  keyLight.color.setHex(lights.keyColor);
  keyLight.intensity = lights.keyIntensity;
  keyLight.position.set(...lights.keyPosition);
  keyLightTarget.position.set(...lights.keyTarget);
  fillLight.color.setHex(lights.fillColor);
  fillLight.intensity = lights.fillIntensity;
  fillLight.position.set(...lights.fillPosition);
  fillLightTarget.position.set(...lights.fillTarget);
  rimLight.color.setHex(lights.rimColor);
  rimLight.intensity = lights.rimIntensity;
  rimLight.position.set(...lights.rimPosition);
  rimLightTarget.position.set(...lights.rimTarget);
  renderer.toneMappingExposure = lights.exposure;
}

function setupManualControlEvents(): void {
  const canvas = renderer.domElement;

  canvas.addEventListener('pointerdown', handleManualPointerDown);
  canvas.addEventListener('pointermove', handleManualPointerMove);
  canvas.addEventListener('pointerup', handleManualPointerEnd);
  canvas.addEventListener('pointercancel', handleManualPointerEnd);
  canvas.addEventListener('lostpointercapture', handleManualPointerCaptureLost);
  canvas.addEventListener('dblclick', handleManualDoubleClick);
  canvas.addEventListener('contextmenu', preventManualCanvasDefault);
  canvas.addEventListener('auxclick', preventManualCanvasDefault);
  canvas.addEventListener('wheel', handleManualWheel, {
    passive: false,
  });
}

function handleManualPointerDown(event: PointerEvent): void {
  if (!canUseManualMouse()) {
    return;
  }

  const button = getManualPointerButton(event.button);

  if (!button) {
    return;
  }

  event.preventDefault();
  renderer.domElement.setPointerCapture(event.pointerId);
  manualPointerSession = {
    pointerId: event.pointerId,
    button,
    lastX: event.clientX,
    lastY: event.clientY,
  };
}

function handleManualPointerMove(event: PointerEvent): void {
  if (!manualPointerSession || event.pointerId !== manualPointerSession.pointerId) {
    return;
  }

  if (!canUseManualMouse()) {
    manualPointerSession = null;
    return;
  }

  event.preventDefault();
  const rect = renderer.domElement.getBoundingClientRect();
  const deltaX = event.clientX - manualPointerSession.lastX;
  const deltaY = event.clientY - manualPointerSession.lastY;

  manualPointerSession.lastX = event.clientX;
  manualPointerSession.lastY = event.clientY;

  if (manualPointerSession.button === 'primary') {
    manualPose = updateManualPoseFromDrag(manualPose, {
      button: manualPointerSession.button,
      deltaX,
      deltaY,
      viewportWidth: rect.width,
      viewportHeight: rect.height,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
    });
    appStore.getState().setManualControlStatus(event.altKey ? '傾き操作' : '顔操作');
    applyManualControlPose();
    return;
  }

  const currentState = appStore.getState();
  const transform = updateManualAvatarTransformFromDrag(
    {
      offsetX: currentState.avatarOffsetX,
      offsetY: currentState.avatarOffsetY,
      scale: currentState.avatarScale,
      rotationY: currentState.avatarRotationY,
    },
    {
      button: manualPointerSession.button,
      deltaX,
      deltaY,
      viewportWidth: rect.width,
      viewportHeight: rect.height,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
    },
  );

  currentState.setAvatarOffsetX(transform.offsetX);
  currentState.setAvatarOffsetY(transform.offsetY);
  currentState.setAvatarRotationY(transform.rotationY);
  appStore
    .getState()
    .setManualControlStatus(manualPointerSession.button === 'auxiliary' ? '位置調整' : '回転');
  applyAvatarTransform();
}

function handleManualPointerEnd(event: PointerEvent): void {
  if (!manualPointerSession || event.pointerId !== manualPointerSession.pointerId) {
    return;
  }

  event.preventDefault();
  manualPointerSession = null;
}

function handleManualPointerCaptureLost(event: PointerEvent): void {
  if (manualPointerSession?.pointerId === event.pointerId) {
    manualPointerSession = null;
  }
}

function handleManualDoubleClick(event: MouseEvent): void {
  if (!canUseManualMouse()) {
    return;
  }

  event.preventDefault();
  resetManualControlPose();
}

function handleManualWheel(event: WheelEvent): void {
  if (!canUseManualMouse()) {
    return;
  }

  event.preventDefault();
  const currentState = appStore.getState();
  const transform = updateManualAvatarScaleFromWheel(
    {
      offsetX: currentState.avatarOffsetX,
      offsetY: currentState.avatarOffsetY,
      scale: currentState.avatarScale,
      rotationY: currentState.avatarRotationY,
    },
    event.deltaY,
  );

  currentState.setAvatarScale(transform.scale);
  appStore.getState().setManualControlStatus('拡大');
  applyAvatarTransform();
}

function preventManualCanvasDefault(event: Event): void {
  if (canUseManualMouse()) {
    event.preventDefault();
  }
}

function canUseManualMouse(): boolean {
  const nextState = appStore.getState();

  return (
    isControlPage &&
    selectedControlMode === 'mic-manual' &&
    nextState.poseStatus !== 'active' &&
    nextState.manualControlEnabled &&
    nextState.manualMouseEnabled
  );
}

function shouldAutoStartCameraOnModeChange(): boolean {
  const nextState = appStore.getState();

  return (
    isControlPage &&
    selectedControlMode === 'camera' &&
    nextState.poseStatus !== 'requesting' &&
    nextState.poseStatus !== 'loading' &&
    nextState.poseStatus !== 'active' &&
    !navigator.webdriver
  );
}

function getManualPointerButton(button: number): ManualPointerButton | null {
  switch (button) {
    case 0:
      return 'primary';
    case 1:
      return 'auxiliary';
    case 2:
      return 'secondary';
    default:
      return null;
  }
}

function getLookPresetFromSelect(): LookPresetId {
  const value = lookPresetSelect?.value;

  return value === 'bright' ||
    value === 'front-top' ||
    value === 'neon' ||
    value === 'edge'
    ? value
    : 'standard';
}

function getRimLightStrengthFromSelect(): RimLightStrength {
  const value = rimLightStrengthSelect?.value;

  return value === 'off' || value === 'medium' || value === 'strong' ? value : 'soft';
}

function getRimLightColorFromSelect(): RimLightColor {
  const value = rimLightColorSelect?.value;

  return value === 'white' || value === 'green' ? value : 'blue';
}

function getRimLightDirectionFromSelect(): RimLightDirection {
  const value = rimLightDirectionSelect?.value;

  return value === 'left-back' || value === 'top-back' ? value : 'right-back';
}

function getRenderSize(): { width: number; height: number } {
  if (!isControlPage) {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  const canvasBox = renderer.domElement.getBoundingClientRect();
  const width = Math.max(1, Math.round(canvasBox.width || window.innerWidth));
  const height = Math.max(1, Math.round(canvasBox.height || width * 9 / 16));

  return {
    width,
    height,
  };
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
  updateRelayRenderStableState(delta);
  updateRelayRenderMotion(delta);
  applyManualControlPose();
  applyUpperBodyRetarget();
  applyArmIkRetarget();
  applyHandRetarget();
  if (!isRenderPage) {
    applyCameraLessIdle(elapsed);
  }
  updateLookAtCameraTarget();
  if (!isRenderPage) {
    sampleCameraLessExpressions(elapsed, delta);
    sampleMicReactiveMouth();
    publishRelayState(frameTime);
  }
  currentVrm?.update(delta);
  if (isRenderPage) {
    relayAppliedAfterUpdateSnapshot = captureExpressionManagerSnapshot();
  }
  updateRelayDebugOverlay();
  publishRelayDebugSample(frameTime);
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
    case 'staticState':
      applyRelayStaticState(message.state);
      break;
    case 'motionState':
      applyRelayMotionState(message.state);
      break;
    case 'runtimeState':
      applyRelayRuntimeState(message.state);
      break;
    case 'expressionState':
      applyRelayExpressionState(message.state);
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
  applyRelayStaticState({
    avatarTransform: nextState.avatarTransform,
    look: nextState.look,
    vrmaLoop: nextState.vrmaLoop,
  });
  applyRelayMotionState({
    sequence: lastAppliedRelayMotionSequence + 1,
    sentAt: Date.now(),
    expressions: nextState.expressions,
    pose: nextState.pose,
  });
}

function applyRelayStaticState(nextState: RelayStaticState): void {
  const staticStateSignature = createRelayStaticStateSignature(nextState);
  if (staticStateSignature === relayRenderStaticStateSignature) {
    return;
  }

  relayRenderStaticStateSignature = staticStateSignature;
  relayAvatarTransformTarget = nextState.avatarTransform;
  relayAvatarTransformCurrent = { ...relayAvatarTransformTarget };
  const currentState = appStore.getState();
  currentState.setAvatarOffsetX(nextState.avatarTransform.offsetX);
  currentState.setAvatarOffsetY(nextState.avatarTransform.offsetY);
  currentState.setAvatarScale(nextState.avatarTransform.scale);
  currentState.setAvatarRotationY(nextState.avatarTransform.rotationY);
  currentState.setLookSettings(nextState.look);
  currentState.setVrmaLoop(nextState.vrmaLoop);
  syncVrmaLoopMode(nextState.vrmaLoop);
  relayLookSettingsTarget = appStore.getState().lookSettings;
  relayLookLightsCurrent = resolveLookLights(relayLookSettingsTarget);
  applyAvatarTransformValues(relayAvatarTransformCurrent);
  applyResolvedLookLights(relayLookLightsCurrent);
}

function applyRelayRuntimeState(nextState: RelayRuntimeState): void {
  if (
    shouldDiscardRelayRuntimeState(nextState, {
      lastSequence: lastAppliedRelayRuntimeSequence,
      lastSentAt: lastAppliedRelayRuntimeSentAt,
    })
  ) {
    relayDroppedStaleRuntimeFrames += 1;
    return;
  }

  relayRuntimeModeActive = true;
  relayReceivedExpressionSnapshot = { ...nextState.expressions };
  relayExpressionTarget = createRelayExpressionTarget(nextState.expressions);
  faceExpressionWeights = relayExpressionTarget;
  relayMotionActive = true;
  relayHeadTarget = nextState.pose.head ?? relayHeadTarget;
  relayUpperBodyTarget = nextState.pose.upperBody ?? relayUpperBodyTarget;
  relayHandTarget = nextState.pose.hands ?? createNeutralHandRetargetPose();
  relayArmIkTrackingEnabled = nextState.pose.arms !== undefined;
  relayArmIkTarget = nextState.pose.arms ?? createNeutralArmIkRetargetPose();
  syncRelayArmIkBaseline();
  relayPreviousMotionFrame = null;
  relayCurrentMotionFrame = null;
  lastAppliedRelayRuntimeSequence = nextState.sequence;
  lastAppliedRelayRuntimeSentAt = nextState.sentAt;
}

function applyRelayMotionState(nextState: RelayMotionState): void {
  if (relayRuntimeModeActive) {
    relayDroppedStaleMotionFrames += 1;
    return;
  }

  if (lastAppliedRelayRuntimeSentAt >= nextState.sentAt) {
    relayDroppedStaleMotionFrames += 1;
    return;
  }

  if (shouldDiscardRelayMotionState(nextState)) {
    relayDroppedStaleMotionFrames += 1;
    return;
  }

  relayMotionActive = true;
  lastAppliedRelayMotionSequence = nextState.sequence;
  lastAppliedRelayMotionSentAt = nextState.sentAt;
  relayPreviousMotionFrame = relayCurrentMotionFrame;
  relayCurrentMotionFrame = {
    receivedAt: performance.now(),
    state: nextState,
  };

  if (!relayPreviousMotionFrame) {
    applySampledRelayMotionState(nextState);
  }
}

function applyRelayExpressionState(nextState: RelayExpressionSyncState): void {
  if (relayRuntimeModeActive) {
    relayDroppedStaleExpressionFrames += 1;
    return;
  }

  if (lastAppliedRelayRuntimeSentAt >= nextState.sentAt) {
    relayDroppedStaleExpressionFrames += 1;
    return;
  }

  if (shouldDiscardRelayExpressionState(nextState)) {
    relayDroppedStaleExpressionFrames += 1;
    return;
  }

  lastAppliedRelayExpressionSequence = nextState.sequence;
  lastAppliedRelayExpressionSentAt = nextState.sentAt;
  relayExpressionTarget = createRelayExpressionTarget(nextState.expressions);
  faceExpressionWeights = relayExpressionTarget;
}

function shouldDiscardRelayMotionState(nextState: RelayMotionState): boolean {
  const staleAgeMs = Date.now() - nextState.sentAt;

  if (staleAgeMs > 250) {
    return true;
  }

  return (
    nextState.sequence <= lastAppliedRelayMotionSequence &&
    nextState.sentAt <= lastAppliedRelayMotionSentAt
  );
}

function shouldDiscardRelayExpressionState(nextState: RelayExpressionSyncState): boolean {
  const staleAgeMs = Date.now() - nextState.sentAt;

  if (staleAgeMs > 250) {
    return true;
  }

  return (
    nextState.sequence <= lastAppliedRelayExpressionSequence &&
    nextState.sentAt <= lastAppliedRelayExpressionSentAt
  );
}

function applySampledRelayMotionState(nextState: RelayMotionState): void {
  relayHeadTarget = nextState.pose.head ?? createNeutralHeadRetargetPose(false);
  relayUpperBodyTarget = nextState.pose.upperBody ?? createNeutralRetargetPose(false);
  relayHandTarget = nextState.pose.hands ?? createNeutralHandRetargetPose();
  relayArmIkTrackingEnabled = nextState.pose.arms !== undefined;
  relayArmIkTarget = nextState.pose.arms ?? createNeutralArmIkRetargetPose();
  syncRelayArmIkBaseline();
}

function syncRelayArmIkBaseline(): void {
  if (!relayArmIkTrackingEnabled) {
    resetArmIkRetarget();
  }
}

function createRelayStaticStateSignature(state: RelayStaticState): string {
  return JSON.stringify({
    avatarTransform: state.avatarTransform,
    look: state.look,
    vrmaLoop: state.vrmaLoop,
  });
}

function updateRelayRenderStableState(delta: number): void {
  if (!isRenderPage) {
    return;
  }

  const avatarSmoothing = getFrameSmoothing(delta, 5);
  const lookSmoothing = getFrameSmoothing(delta, 3.2);
  relayAvatarTransformCurrent = smoothRelayAvatarTransform(
    relayAvatarTransformCurrent,
    relayAvatarTransformTarget,
    avatarSmoothing,
  );
  relayLookLightsCurrent = smoothResolvedLookLights(
    relayLookLightsCurrent,
    resolveLookLights(relayLookSettingsTarget),
    lookSmoothing,
  );
  applyAvatarTransformValues(relayAvatarTransformCurrent);
  applyResolvedLookLights(relayLookLightsCurrent);
}

function updateRelayRenderMotion(delta: number): void {
  if (!isRenderPage) {
    return;
  }

  const sampledMotionState = sampleRelayMotionFrames(
    relayPreviousMotionFrame,
    relayCurrentMotionFrame,
    performance.now(),
  );

  if (sampledMotionState) {
    applySampledRelayMotionState(sampledMotionState);
  }

  const activeMotionSmoothing = getFrameSmoothing(delta, 36);
  const releaseMotionSmoothing = getFrameSmoothing(delta, 1.8);
  const headSmoothing = relayHeadTarget.enabled ? activeMotionSmoothing : releaseMotionSmoothing;
  const upperBodySmoothing = relayUpperBodyTarget.enabled
    ? activeMotionSmoothing
    : releaseMotionSmoothing;
  const handSmoothing = hasHandTarget(relayHandTarget)
    ? activeMotionSmoothing
    : releaseMotionSmoothing;
  const armIkSmoothing = hasArmIkTarget(relayArmIkTarget)
    ? activeMotionSmoothing
    : releaseMotionSmoothing;
  headRetargetPose = smoothHeadRetargetPose(headRetargetPose, relayHeadTarget, headSmoothing);
  upperBodyRetargetPose = smoothUpperBodyRetargetPose(
    upperBodyRetargetPose,
    relayUpperBodyTarget,
    upperBodySmoothing,
  );
  handRetargetPose = smoothHandRetargetPose(handRetargetPose, relayHandTarget, handSmoothing);
  armIkRetargetPose = relayArmIkTrackingEnabled
    ? smoothArmIkRetargetPose(armIkRetargetPose, relayArmIkTarget, armIkSmoothing)
    : createNeutralArmIkRetargetPose();
  faceExpressionWeights = relayExpressionTarget;
  applyHeadRetarget();
  applyRelayExpressions(faceExpressionWeights);
  relayAppliedBeforeUpdateSnapshot = captureExpressionManagerSnapshot();
}

function hasHandTarget(pose: HandRetargetPose): boolean {
  return Boolean(pose.left || pose.right);
}

function createRelayExpressionTarget(
  expressions: RelayRenderState['expressions'],
): VrmFaceExpressionWeights {
  return {
    ...createNeutralFaceExpressionWeights(),
    ...expressions,
  };
}

function applyRelayExpressions(expressions: Partial<VrmFaceExpressionWeights>): void {
  for (const [name, value] of Object.entries(expressions)) {
    if (typeof value === 'number') {
      currentVrm?.expressionManager?.setValue(name, value);
    }
  }
}

function captureExpressionManagerSnapshot(): RelayExpressionState {
  const expressionManager = currentVrm?.expressionManager;

  return {
    neutral: expressionManager?.getValue('neutral') ?? undefined,
    blinkLeft: expressionManager?.getValue('blinkLeft') ?? undefined,
    blinkRight: expressionManager?.getValue('blinkRight') ?? undefined,
    aa: expressionManager?.getValue('aa') ?? undefined,
    ih: expressionManager?.getValue('ih') ?? undefined,
    ou: expressionManager?.getValue('ou') ?? undefined,
    ee: expressionManager?.getValue('ee') ?? undefined,
    oh: expressionManager?.getValue('oh') ?? undefined,
    happy: expressionManager?.getValue('happy') ?? undefined,
    surprised: expressionManager?.getValue('surprised') ?? undefined,
    relaxed: expressionManager?.getValue('relaxed') ?? undefined,
    angry: expressionManager?.getValue('angry') ?? undefined,
    sad: expressionManager?.getValue('sad') ?? undefined,
  };
}

function updateRelayDebugOverlay(): void {
  if (!relayDebugOverlay) {
    return;
  }

  const runtimeAge =
    lastAppliedRelayRuntimeSentAt > 0 ? Math.max(Date.now() - lastAppliedRelayRuntimeSentAt, 0) : 0;
  const motionAge =
    lastAppliedRelayMotionSentAt > 0 ? Math.max(Date.now() - lastAppliedRelayMotionSentAt, 0) : 0;
  const expressionAge =
    lastAppliedRelayExpressionSentAt > 0
      ? Math.max(Date.now() - lastAppliedRelayExpressionSentAt, 0)
      : 0;
  const droppedFrames =
    relayDroppedStaleRuntimeFrames +
    relayDroppedStaleMotionFrames +
    relayDroppedStaleExpressionFrames;

  relayDebugOverlay.textContent = [
    'OBS Relay Debug',
    `runtime #${lastAppliedRelayRuntimeSequence} age ${runtimeAge}ms`,
    `motion #${lastAppliedRelayMotionSequence} age ${motionAge}ms`,
    `expression #${lastAppliedRelayExpressionSequence} age ${expressionAge}ms`,
    `dropped runtime/motion/expression ${relayDroppedStaleRuntimeFrames}/${relayDroppedStaleMotionFrames}/${relayDroppedStaleExpressionFrames} total ${droppedFrames}`,
    `rx blink/aa ${formatRelayDebugValue(relayReceivedExpressionSnapshot.blinkLeft)} / ${formatRelayDebugValue(relayReceivedExpressionSnapshot.aa)}`,
    `target blink/aa ${formatRelayDebugValue(relayExpressionTarget.blinkLeft)} / ${formatRelayDebugValue(relayExpressionTarget.aa)}`,
    `set blink/aa ${formatRelayDebugValue(relayAppliedBeforeUpdateSnapshot.blinkLeft)} / ${formatRelayDebugValue(relayAppliedBeforeUpdateSnapshot.aa)}`,
    `after update blink/aa ${formatRelayDebugValue(relayAppliedAfterUpdateSnapshot.blinkLeft)} / ${formatRelayDebugValue(relayAppliedAfterUpdateSnapshot.aa)}`,
    `target mouth ih/ou/ee/oh ${formatRelayDebugValue(relayExpressionTarget.ih)} / ${formatRelayDebugValue(relayExpressionTarget.ou)} / ${formatRelayDebugValue(relayExpressionTarget.ee)} / ${formatRelayDebugValue(relayExpressionTarget.oh)}`,
    `emotion happy/angry/sad ${formatRelayDebugValue(relayExpressionTarget.happy)} / ${formatRelayDebugValue(relayExpressionTarget.angry)} / ${formatRelayDebugValue(relayExpressionTarget.sad)}`,
    `head yaw/pitch/roll ${formatRelayDebugValue(relayHeadTarget.yaw)} / ${formatRelayDebugValue(relayHeadTarget.pitch)} / ${formatRelayDebugValue(relayHeadTarget.roll)} enabled ${relayHeadTarget.enabled ? 'yes' : 'no'}`,
    `upper chestYaw/chestRoll ${formatRelayDebugValue(relayUpperBodyTarget.chestYaw)} / ${formatRelayDebugValue(relayUpperBodyTarget.chestRoll)} enabled ${relayUpperBodyTarget.enabled ? 'yes' : 'no'}`,
    `armIK ${formatRelayArmIkDebug(relayArmIkTarget)}`,
    `hands ${relayHandTarget.left ? 'L' : '-'}${relayHandTarget.right ? 'R' : '-'} buffered ${relayClient.bufferedAmount} bytes`,
  ].join('\n');
}

function publishRelayDebugSample(frameTime: number): void {
  if (!isRenderPage || !options.debug || frameTime - relayDebugSamplePublishTime < 250) {
    return;
  }

  relayDebugSamplePublishTime = frameTime;
  relayClient.send({
    type: 'debugSample',
    sample: createRelayDebugSample(),
  });
}

function createRelayDebugSample(): RelayDebugSample {
  return {
    role: 'render',
    sentAt: Date.now(),
    runtimeSequence: lastAppliedRelayRuntimeSequence,
    runtimeAgeMs:
      lastAppliedRelayRuntimeSentAt > 0 ? Math.max(Date.now() - lastAppliedRelayRuntimeSentAt, 0) : 0,
    expressions: {
      rx: { ...relayReceivedExpressionSnapshot },
      target: {
        blinkLeft: relayExpressionTarget.blinkLeft,
        blinkRight: relayExpressionTarget.blinkRight,
        aa: relayExpressionTarget.aa,
        ih: relayExpressionTarget.ih,
        ou: relayExpressionTarget.ou,
        ee: relayExpressionTarget.ee,
        oh: relayExpressionTarget.oh,
        happy: relayExpressionTarget.happy,
        surprised: relayExpressionTarget.surprised,
        angry: relayExpressionTarget.angry,
        sad: relayExpressionTarget.sad,
      },
      set: { ...relayAppliedBeforeUpdateSnapshot },
      afterUpdate: { ...relayAppliedAfterUpdateSnapshot },
    },
    pose: {
      head: relayHeadTarget,
      upperBody: relayUpperBodyTarget,
      hands: relayHandTarget,
      arms: relayArmIkTarget,
    },
    dropped: {
      runtime: relayDroppedStaleRuntimeFrames,
      motion: relayDroppedStaleMotionFrames,
      expression: relayDroppedStaleExpressionFrames,
    },
    bufferedAmount: relayClient.bufferedAmount,
  };
}

function formatRelayDebugValue(value: number | undefined): string {
  return typeof value === 'number' ? value.toFixed(3) : 'n/a';
}

function formatRelayArmIkDebug(pose: ArmIkRetargetPose): string {
  const left = pose.left
    ? `L ${pose.left.confidence.toFixed(2)} raise ${pose.left.upperArmRaise.toFixed(2)} bend ${pose.left.lowerArmBend.toFixed(2)}`
    : 'L -';
  const right = pose.right
    ? `R ${pose.right.confidence.toFixed(2)} raise ${pose.right.upperArmRaise.toFixed(2)} bend ${pose.right.lowerArmBend.toFixed(2)}`
    : 'R -';

  return `${left} ${right}`;
}

function getFrameSmoothing(delta: number, speed: number): number {
  return 1 - Math.exp(-speed * delta);
}

function publishRelayState(frameTime: number): void {
  if (!isControlPage) {
    return;
  }

  const nextState = appStore.getState();
  const staticState = createRelayStaticState(nextState);
  const staticSignature = createRelayStaticStateSignature(staticState);

  if (staticSignature !== relayStaticPublishSignature) {
    relayStaticPublishSignature = staticSignature;
    relayClient.send({
      type: 'staticState',
      state: staticState,
    });
  }

  if (frameTime - relayMotionPublishTime < 33 || relayClient.bufferedAmount > 262_144) {
    return;
  }

  relayMotionPublishTime = frameTime;
  const runtimeState = createRelayRuntimeState(nextState);
  relayClient.send({
    type: 'runtimeState',
    state: runtimeState,
  });
  relayClient.send({
    type: 'motionState',
    state: {
      sequence: runtimeState.sequence,
      sentAt: runtimeState.sentAt,
      expressions: runtimeState.expressions,
      pose: runtimeState.pose,
    },
  });
  relayClient.send({
    type: 'expressionState',
    state: {
      sequence: runtimeState.sequence,
      sentAt: runtimeState.sentAt,
      expressions: runtimeState.expressions,
    },
  });
}

function createRelayStaticState(nextState: AppState): RelayStaticState {
  return {
    avatarTransform: {
      offsetX: nextState.avatarOffsetX,
      offsetY: nextState.avatarOffsetY,
      scale: nextState.avatarScale,
      rotationY: nextState.avatarRotationY,
    },
    look: nextState.lookSettings,
    vrmaLoop: nextState.vrmaLoop,
  };
}

function createRelayRuntimeState(nextState: AppState): RelayRuntimeState {
  const poseCandidate: RelayPoseState = {
    head: roundRelayHeadPose(headRetargetPose),
    upperBody: roundRelayUpperBodyPose(upperBodyRetargetPose),
    hands: nextState.handTrackingEnabled ? roundRelayHandPose(handRetargetPose) : undefined,
    arms: nextState.handTrackingEnabled ? roundRelayArmIkPose(armIkRetargetPose) : undefined,
  };
  const isHeadTrackingActive =
    nextState.faceTrackingStatus === 'active' ||
    nextState.poseStatus === 'active' ||
    isManualControlPoseActive();
  const isUpperBodyTrackingActive = nextState.poseStatus === 'active' || isManualControlPoseActive();
  const pose = stabilizeRelayPoseState(poseCandidate, relayPoseStabilizer, Date.now(), {
    headHoldMs: isHeadTrackingActive ? 260 : 0,
    upperBodyHoldMs: isUpperBodyTrackingActive ? 260 : 0,
  });

  return createRelayRuntimeStateMessage(++relayRuntimeSequence, Date.now(), {
    expressions: createRelayExpressionState(),
    pose,
  });
}

function createRelayExpressionState(): RelayExpressionState {
  const mouthExpressions =
    lipSyncMode === 'off'
      ? createNeutralMouthExpressions()
      : lipSyncMode === 'mic'
        ? {
            aa: faceExpressionWeights.aa,
            ih: 0,
            ou: 0,
            ee: 0,
            oh: 0,
          }
        : {
            aa: faceExpressionWeights.aa,
            ih: faceExpressionWeights.ih,
            ou: faceExpressionWeights.ou,
            ee: faceExpressionWeights.ee,
            oh: faceExpressionWeights.oh,
          };

  const candidate = {
    neutral: roundRelayValue(emotionExpressionWeights.neutral, 3),
    blinkLeft: roundRelayValue(faceExpressionWeights.blinkLeft, 3),
    blinkRight: roundRelayValue(faceExpressionWeights.blinkRight, 3),
    aa: roundRelayValue(mouthExpressions.aa, 3),
    ih: roundRelayValue(mouthExpressions.ih, 3),
    ou: roundRelayValue(mouthExpressions.ou, 3),
    ee: roundRelayValue(mouthExpressions.ee, 3),
    oh: roundRelayValue(mouthExpressions.oh, 3),
    happy: roundRelayValue(faceExpressionWeights.happy, 3),
    surprised: roundRelayValue(faceExpressionWeights.surprised, 3),
    relaxed: roundRelayValue(emotionExpressionWeights.relaxed, 3),
    angry: roundRelayValue(faceExpressionWeights.angry, 3),
    sad: roundRelayValue(faceExpressionWeights.sad, 3),
  };

  return stabilizeRelayExpressionState(candidate, relayExpressionStabilizer, Date.now(), {
    blinkHoldMs: blinkMode === 'mocap' ? 120 : 0,
    mouthHoldMs: lipSyncMode === 'mocap' ? 240 : 0,
  });
}

function roundRelayHeadPose(pose: HeadRetargetPose): HeadRetargetPose {
  return {
    enabled: pose.enabled,
    pitch: roundRelayValue(pose.pitch, 4),
    yaw: roundRelayValue(pose.yaw, 4),
    roll: roundRelayValue(pose.roll, 4),
  };
}

function roundRelayUpperBodyPose(pose: UpperBodyRetargetPose): UpperBodyRetargetPose {
  return {
    enabled: pose.enabled,
    chestYaw: roundRelayValue(pose.chestYaw, 4),
    chestRoll: roundRelayValue(pose.chestRoll, 4),
    neckYaw: roundRelayValue(pose.neckYaw, 4),
    neckRoll: roundRelayValue(pose.neckRoll, 4),
    leftUpperArmRoll: roundRelayValue(pose.leftUpperArmRoll, 4),
    rightUpperArmRoll: roundRelayValue(pose.rightUpperArmRoll, 4),
    leftLowerArmRoll: roundRelayValue(pose.leftLowerArmRoll, 4),
    rightLowerArmRoll: roundRelayValue(pose.rightLowerArmRoll, 4),
  };
}

function roundRelayHandPose(pose: HandRetargetPose): HandRetargetPose {
  return {
    left: pose.left ? roundRelayHandTarget(pose.left) : null,
    right: pose.right ? roundRelayHandTarget(pose.right) : null,
  };
}

function roundRelayHandTarget(target: HandRetargetTarget): HandRetargetTarget {
  return {
    fingers: {
      thumb: roundRelayValue(target.fingers.thumb, 3),
      index: roundRelayValue(target.fingers.index, 3),
      middle: roundRelayValue(target.fingers.middle, 3),
      ring: roundRelayValue(target.fingers.ring, 3),
      little: roundRelayValue(target.fingers.little, 3),
    },
    wristPitch: roundRelayValue(target.wristPitch, 4),
    wristYaw: roundRelayValue(target.wristYaw, 4),
    wristRoll: roundRelayValue(target.wristRoll, 4),
  };
}

function roundRelayArmIkPose(pose: ArmIkRetargetPose): ArmIkRetargetPose {
  return {
    left: pose.left ? roundRelayArmIkTarget(pose.left) : null,
    right: pose.right ? roundRelayArmIkTarget(pose.right) : null,
  };
}

function roundRelayArmIkTarget(target: ArmIkSideTarget): ArmIkSideTarget {
  return {
    enabled: target.enabled,
    side: target.side,
    shoulder: roundRelayVector3(target.shoulder),
    elbow: roundRelayVector3(target.elbow),
    wrist: roundRelayVector3(target.wrist),
    pole: roundRelayVector3(target.pole),
    upperArmRaise: roundRelayValue(target.upperArmRaise, 4),
    upperArmSpread: roundRelayValue(target.upperArmSpread, 4),
    lowerArmRaise: roundRelayValue(target.lowerArmRaise, 4),
    lowerArmSpread: roundRelayValue(target.lowerArmSpread, 4),
    lowerArmBend: roundRelayValue(target.lowerArmBend, 4),
    wristHint: roundRelayValue(target.wristHint, 4),
    upperArmRotation: target.upperArmRotation
      ? roundRelayVector3(target.upperArmRotation)
      : undefined,
    lowerArmRotation: target.lowerArmRotation
      ? roundRelayVector3(target.lowerArmRotation)
      : undefined,
    confidence: roundRelayValue(target.confidence, 3),
  };
}

function roundRelayVector3(vector: Vector3Like): Vector3Like {
  return {
    x: roundRelayValue(vector.x, 4),
    y: roundRelayValue(vector.y, 4),
    z: roundRelayValue(vector.z, 4),
  };
}

function roundRelayValue(value: number, decimals: number): number {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
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
  applyMouthOpen(lipSyncMode === 'mic' ? appStore.getState().mouthOpen : 0);
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

  camera.position.set(0, 1.62, 3.05);
  camera.lookAt(0, 1.64, 0);
  camera.updateProjectionMatrix();
}

function configureControlPreviewCamera(): void {
  camera.position.set(0, 1.42, 5.2);
  camera.lookAt(0, 1.18, 0);
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
  restBoneWorldPositions.clear();
  vrm.scene.updateWorldMatrix(true, true);

  for (const boneName of [
    VRMHumanBoneName.Chest,
    VRMHumanBoneName.UpperChest,
    VRMHumanBoneName.Neck,
    VRMHumanBoneName.Head,
    ...idleArmBoneNames,
    ...fingerBoneNames,
  ]) {
    const bone = vrm.humanoid.getNormalizedBoneNode(boneName);

    if (bone) {
      restBoneQuaternions.set(boneName, bone.quaternion.clone());
      restBoneWorldPositions.set(boneName, bone.getWorldPosition(new THREE.Vector3()));
    }
  }
}

function captureAvatarBaseTransform(object: THREE.Object3D): void {
  avatarBasePosition.copy(object.position);
  avatarBaseScale.copy(object.scale);
  avatarBaseRotationY = object.rotation.y;
}

function applyAvatarTransform(): void {
  const nextState = appStore.getState();
  applyAvatarTransformValues({
    offsetX: nextState.avatarOffsetX,
    offsetY: nextState.avatarOffsetY,
    scale: nextState.avatarScale,
    rotationY: nextState.avatarRotationY,
  });
}

function applyAvatarTransformValues(transform: RelayAvatarTransform): void {
  if (!currentVrm) {
    return;
  }

  currentVrm.scene.position.set(
    avatarBasePosition.x + transform.offsetX,
    avatarBasePosition.y + transform.offsetY,
    avatarBasePosition.z,
  );
  currentVrm.scene.scale.copy(avatarBaseScale).multiplyScalar(transform.scale);
  currentVrm.scene.rotation.y =
    avatarBaseRotationY + THREE.MathUtils.degToRad(transform.rotationY);
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
  updateManualControlUi(nextState);
  updateLookSettingsUi(nextState);
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

function updateManualControlUi(nextState: AppState): void {
  if (manualControlInput) {
    manualControlInput.checked = nextState.manualControlEnabled;
  }

  if (manualMouseInput) {
    manualMouseInput.checked = nextState.manualMouseEnabled;
  }

  if (manualControlStatusText) {
    manualControlStatusText.textContent = nextState.manualControlStatus;
  }
}

function updateLookSettingsUi(nextState: AppState): void {
  const settings = nextState.lookSettings;

  if (lookPresetSelect) {
    lookPresetSelect.value = settings.preset;
  }

  if (keyLightScaleInput) {
    keyLightScaleInput.value = settings.keyIntensityScale.toString();
  }

  if (fillLightScaleInput) {
    fillLightScaleInput.value = settings.fillIntensityScale.toString();
  }

  if (rimLightStrengthSelect) {
    rimLightStrengthSelect.value = settings.rimStrength;
  }

  if (rimLightColorSelect) {
    rimLightColorSelect.value = settings.rimColor;
  }

  if (rimLightDirectionSelect) {
    rimLightDirectionSelect.value = settings.rimDirection;
  }

  if (keyLightScaleText) {
    keyLightScaleText.textContent = `${Math.round(settings.keyIntensityScale * 100)}%`;
  }

  if (fillLightScaleText) {
    fillLightScaleText.textContent = `${Math.round(settings.fillIntensityScale * 100)}%`;
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
  if (lipSyncMode !== 'mocap') {
    applyMouthExpressions(createNeutralMouthExpressions());
  }
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
  applyMouthExpressions({
    aa: value,
    ih: 0,
    ou: 0,
    ee: 0,
    oh: 0,
  });
}

function applyMouthExpressions(
  expressions: Pick<VrmFaceExpressionWeights, 'aa' | 'ih' | 'ou' | 'ee' | 'oh'>,
): void {
  faceExpressionWeights = {
    ...faceExpressionWeights,
    ...expressions,
  };
  currentVrm?.expressionManager?.setValue('aa', expressions.aa);
  currentVrm?.expressionManager?.setValue('ih', expressions.ih);
  currentVrm?.expressionManager?.setValue('ou', expressions.ou);
  currentVrm?.expressionManager?.setValue('ee', expressions.ee);
  currentVrm?.expressionManager?.setValue('oh', expressions.oh);
}

function createNeutralMouthExpressions(): Pick<
  VrmFaceExpressionWeights,
  'aa' | 'ih' | 'ou' | 'ee' | 'oh'
> {
  return {
    aa: 0,
    ih: 0,
    ou: 0,
    ee: 0,
    oh: 0,
  };
}

function applyAllFaceExpressions(weights: VrmFaceExpressionWeights): void {
  currentVrm?.expressionManager?.setValue('neutral', emotionExpressionWeights.neutral);
  currentVrm?.expressionManager?.setValue('blinkLeft', weights.blinkLeft);
  currentVrm?.expressionManager?.setValue('blinkRight', weights.blinkRight);
  currentVrm?.expressionManager?.setValue('aa', weights.aa);
  currentVrm?.expressionManager?.setValue('ih', weights.ih);
  currentVrm?.expressionManager?.setValue('ou', weights.ou);
  currentVrm?.expressionManager?.setValue('ee', weights.ee);
  currentVrm?.expressionManager?.setValue('oh', weights.oh);
  currentVrm?.expressionManager?.setValue('happy', weights.happy);
  currentVrm?.expressionManager?.setValue('surprised', weights.surprised);
  currentVrm?.expressionManager?.setValue('relaxed', emotionExpressionWeights.relaxed);
  currentVrm?.expressionManager?.setValue('angry', weights.angry);
  currentVrm?.expressionManager?.setValue('sad', weights.sad);
}

function applyMocapFaceExpressions(weights: VrmFaceExpressionWeights): void {
  if (blinkMode === 'mocap') {
    currentVrm?.expressionManager?.setValue('blinkLeft', weights.blinkLeft);
    currentVrm?.expressionManager?.setValue('blinkRight', weights.blinkRight);
  }

  if (lipSyncMode === 'mocap') {
    applyMouthExpressions({
      aa: weights.aa,
      ih: weights.ih,
      ou: weights.ou,
      ee: weights.ee,
      oh: weights.oh,
    });
  } else if (lipSyncMode === 'off') {
    applyMouthExpressions(createNeutralMouthExpressions());
  }

  currentVrm?.expressionManager?.setValue('happy', weights.happy);
  currentVrm?.expressionManager?.setValue('surprised', weights.surprised);
  currentVrm?.expressionManager?.setValue('angry', weights.angry);
  currentVrm?.expressionManager?.setValue('sad', weights.sad);
}

function resetFaceExpressions(): void {
  faceExpressionWeights = createNeutralFaceExpressionWeights();
  emotionExpressionWeights = createNeutralVrmEmotionExpressionWeights();
  applyAllFaceExpressions(faceExpressionWeights);
  resetHeadRetarget();
}

function sampleCameraLessExpressions(elapsedSeconds: number, deltaSeconds: number): void {
  if (!currentVrm) {
    return;
  }

  applyExpressionPreset(deltaSeconds);

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

function applyExpressionPreset(deltaSeconds = 1 / 60): void {
  const target = createVrmExpressionPresetTarget(selectedExpressionPreset);
  const smoothing = getFrameSmoothing(deltaSeconds, 9);
  emotionExpressionWeights = smoothVrmEmotionExpressionWeights(
    emotionExpressionWeights,
    target,
    smoothing,
  );

  for (const name of vrmEmotionExpressionNames) {
    currentVrm?.expressionManager?.setValue(name, emotionExpressionWeights[name]);
  }

  faceExpressionWeights = {
    ...faceExpressionWeights,
    happy: emotionExpressionWeights.happy,
    surprised: emotionExpressionWeights.surprised,
    angry: emotionExpressionWeights.angry,
    sad: emotionExpressionWeights.sad,
  };
}

function updateExpressionPresetUi(): void {
  if (!expressionPresetText) {
    return;
  }

  expressionPresetText.textContent =
    selectedExpressionPreset === null
      ? 'なし'
      : selectedExpressionPreset === 'neutral'
        ? '自然'
        : selectedExpressionPreset === 'happy'
          ? '喜'
          : selectedExpressionPreset === 'angry'
            ? '怒'
            : selectedExpressionPreset === 'sad'
              ? '哀'
              : selectedExpressionPreset === 'relaxed'
                ? '楽'
                : '驚';

  document.querySelectorAll<HTMLButtonElement>('.expression-preset-button').forEach((button) => {
    const isSelected = button.dataset.expressionPreset === selectedExpressionPreset;
    button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    button.classList.toggle('bg-white/[0.10]', isSelected);
    button.classList.toggle('border-[#6dff9a]', isSelected);
  });
}

function isExpressionPresetId(value: unknown): value is VrmExpressionPresetId {
  return (
    value === 'neutral' ||
    value === 'happy' ||
    value === 'angry' ||
    value === 'sad' ||
    value === 'relaxed' ||
    value === 'surprised'
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
    const [nextPoseController, nextFaceTracker] = await Promise.all([
      MediaPipePoseDebug.create(),
      nextState.faceTrackingEnabled
        ? faceHandModule.MediaPipeFaceTracker.create()
        : Promise.resolve(null),
    ]);
    poseController = nextPoseController;
    faceTracker = nextFaceTracker;
    handTracker = null;
    appStore.getState().setPoseActive();
    if (faceTracker) {
      appStore.getState().setFaceTrackingActive();
    }
    if (nextState.handTrackingEnabled) {
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
  resetArmIkRetarget();
  resetHandRetarget();
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
      updateArmIkRetarget(landmarks);
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
  const nextHeadPose = createHeadRetargetPose(result.facialTransformationMatrixes[0], {
    mirrorInput: appStore.getState().poseMirrorInput,
  });
  const hasFaceSignal = categories.length > 0 || nextHeadPose.enabled;

  if (categories.length > 0) {
    const nextWeights = createVrmFaceExpressionWeights(categories, {
      mirrorInput: appStore.getState().poseMirrorInput,
    });
    faceExpressionWeights = smoothFaceExpressionWeights(faceExpressionWeights, nextWeights, 0.85);
  }

  if (hasFaceSignal) {
    lastFaceTrackingSignalTime = frameTime;
  }

  const withinFaceHold = frameTime - lastFaceTrackingSignalTime <= 450;
  headRetargetPose = smoothHeadRetargetPose(
    headRetargetPose,
    hasFaceSignal || !withinFaceHold ? nextHeadPose : headRetargetPose,
  );
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
  const nextHandPose = createHandRetargetPose(result.landmarks, result.handedness, {
    mirrorInput: appStore.getState().poseMirrorInput,
  });
  handRetargetPose = smoothHandRetargetPose(handRetargetPose, nextHandPose);
  drawHandDebugLandmarks(result.landmarks);
  const gripAmount = getHandPoseGripAmount(handRetargetPose);
  const armIkSummary = formatArmIkStatus(armIkRetargetPose);
  appStore
    .getState()
    .setHandTrackingFrame(
      summary.handCount === 0
        ? `手: 未検出 / ${armIkSummary}`
        : `手: ${summary.handCount} / 握り ${gripAmount.toFixed(2)} / ${armIkSummary}`,
    );
}

function formatArmIkStatus(pose: ArmIkRetargetPose): string {
  const sides = [
    pose.left
      ? `左 上げ${pose.left.upperArmRaise.toFixed(2)} 肘${pose.left.lowerArmBend.toFixed(2)}`
      : null,
    pose.right
      ? `右 上げ${pose.right.upperArmRaise.toFixed(2)} 肘${pose.right.lowerArmBend.toFixed(2)}`
      : null,
  ].filter((side): side is string => side !== null);

  return sides.length > 0 ? `簡易腕 ${sides.join(' ')}` : '簡易腕 待機';
}

function applyManualControlPose(): void {
  const nextState = appStore.getState();

  if (
    !isControlPage ||
    selectedControlMode !== 'mic-manual' ||
    nextState.poseStatus === 'active' ||
    !nextState.manualControlEnabled ||
    !manualPose.enabled
  ) {
    return;
  }

  headRetargetPose = {
    enabled: true,
    pitch: manualPose.headPitch,
    yaw: manualPose.headYaw,
    roll: manualPose.headRoll,
  };
  upperBodyRetargetPose = {
    ...upperBodyRetargetPose,
    enabled: true,
    chestYaw: manualPose.chestYaw,
    chestRoll: manualPose.chestRoll,
    neckYaw: manualPose.chestYaw * 0.45,
    neckRoll: manualPose.chestRoll * 0.32,
  };
  applyHeadRetarget();
}

function resetManualControlPose(): void {
  manualPose = createNeutralManualPoseState(false);
  appStore.getState().setManualControlStatus('未操作');

  if (!relayMotionActive && appStore.getState().faceTrackingStatus !== 'active') {
    resetHeadRetarget();
  }

  if (!relayMotionActive && appStore.getState().poseStatus !== 'active') {
    resetUpperBodyRetarget();
  }
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
  const nextState = appStore.getState();
  upperBodyRetargetPose = smoothUpperBodyRetargetPose(
    upperBodyRetargetPose,
    createUpperBodyRetargetPose(summary, {
      ...defaultUpperBodyRetargetOptions,
      mirrorInput: nextState.poseMirrorInput,
      trackArms: false,
    }),
  );

  if (!nextState.handTrackingEnabled) {
    clearArmRetargetPose();
  }
}

function updateArmIkRetarget(
  landmarks: Parameters<typeof createArmIkRetargetPose>[0],
): void {
  const nextState = appStore.getState();

  if (!nextState.handTrackingEnabled) {
    resetArmIkRetarget();
    return;
  }

  const nextPose = createArmIkRetargetPose(landmarks, {
    mirrorInput: nextState.poseMirrorInput,
  });

  if (!hasArmIkTarget(nextPose)) {
    resetArmIkRetarget();
    appStore.getState().setHandTrackingFrame('腕: 未検出');
    return;
  }

  armIkRetargetPose = smoothArmIkRetargetPose(armIkRetargetPose, nextPose, 0.56);
  appStore.getState().setHandTrackingFrame(formatArmIkStatus(armIkRetargetPose));
}

function applyUpperBodyRetarget(): void {
  const nextState = appStore.getState();
  if (
    !currentVrm ||
    (!relayMotionActive && nextState.poseStatus !== 'active' && !isManualControlPoseActive())
  ) {
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
  applyArmRetarget(
    currentVrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.LeftLowerArm),
    VRMHumanBoneName.LeftLowerArm,
    upperBodyRetargetPose.leftLowerArmRoll,
  );
  applyArmRetarget(
    currentVrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.RightLowerArm),
    VRMHumanBoneName.RightLowerArm,
    upperBodyRetargetPose.rightLowerArmRoll,
  );
}

function isManualControlPoseActive(): boolean {
  const nextState = appStore.getState();

  return (
    isControlPage &&
    selectedControlMode === 'mic-manual' &&
    nextState.poseStatus !== 'active' &&
    nextState.manualControlEnabled &&
    manualPose.enabled
  );
}

function applyArmIkRetarget(): void {
  if (!currentVrm) {
    return;
  }

  const hasTarget = hasArmIkTarget(armIkRetargetPose);
  if (!hasTarget) {
    if (armIkRetargetWasActive) {
      restoreArmIkBones();
      armIkRetargetWasActive = false;
    }
    return;
  }

  applyArmIkSideTarget('left', armIkRetargetPose.left);
  applyArmIkSideTarget('right', armIkRetargetPose.right);
  currentVrm.humanoid.update();
  armIkRetargetWasActive = true;
}

function applyArmIkSideTarget(side: 'left' | 'right', target: ArmIkSideTarget | null): void {
  if (!currentVrm) {
    return;
  }

  if (!target || !target.enabled) {
    restoreArmIkSideBones(side);
    return;
  }

  const upperBoneName = side === 'left' ? VRMHumanBoneName.LeftUpperArm : VRMHumanBoneName.RightUpperArm;
  const lowerBoneName = side === 'left' ? VRMHumanBoneName.LeftLowerArm : VRMHumanBoneName.RightLowerArm;
  const handBoneName = side === 'left' ? VRMHumanBoneName.LeftHand : VRMHumanBoneName.RightHand;
  const upperBone = currentVrm.humanoid.getNormalizedBoneNode(upperBoneName);
  const lowerBone = currentVrm.humanoid.getNormalizedBoneNode(lowerBoneName);
  const handBone = currentVrm.humanoid.getNormalizedBoneNode(handBoneName);
  const upperRest = restBoneQuaternions.get(upperBoneName);
  const lowerRest = restBoneQuaternions.get(lowerBoneName);
  const handRest = restBoneQuaternions.get(handBoneName);

  if (!upperBone || !lowerBone || !handBone || !upperRest || !lowerRest || !handRest) {
    return;
  }

  const sideSign = side === 'left' ? -1 : 1;
  const fallbackRotation = createFallbackArmRotations(side, target);
  const upperRotation = target.upperArmRotation ?? fallbackRotation.upperArmRotation;
  const lowerRotation = target.lowerArmRotation ?? fallbackRotation.lowerArmRotation;
  const handRoll = sideSign * target.wristHint * 0.28;
  const upperDelta = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(upperRotation.x, upperRotation.y, upperRotation.z, 'XYZ'),
  );
  const lowerDelta = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(lowerRotation.x, lowerRotation.y, lowerRotation.z, 'XYZ'),
  );
  const handDelta = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, 0, handRoll, 'XYZ'),
  );

  upperBone.quaternion.copy(upperRest).multiply(upperDelta);
  lowerBone.quaternion.copy(lowerRest).multiply(lowerDelta);
  handBone.quaternion.copy(handRest).multiply(handDelta);
  upperBone.userData.vplant3dArmIkActive = true;
  lowerBone.userData.vplant3dArmIkActive = true;
  handBone.userData.vplant3dArmIkActive = true;
}

function createFallbackArmRotations(
  side: 'left' | 'right',
  target: ArmIkSideTarget,
): {
  upperArmRotation: Vector3Like;
  lowerArmRotation: Vector3Like;
} {
  const sideSign = side === 'left' ? -1 : 1;
  const upperRaise = clamp(target.upperArmRaise, 0, 1);
  const upperSpread = clamp(target.upperArmSpread, 0, 1);
  const lowerBend = clamp(target.lowerArmBend, 0, 1);
  const lowerRaise = clamp(target.lowerArmRaise, -1, 1);
  const lowerSpread = clamp(target.lowerArmSpread, -1, 1);
  const elbowDepth = clamp(target.elbow.z - target.shoulder.z, -0.45, 0.45);
  const lowerOutward = Math.max(0, lowerSpread);
  const lowerInward = Math.max(0, -lowerSpread);
  const inwardGate = clamp(0.65 + lowerInward * 0.35 - lowerOutward * 0.55, 0.2, 1);
  const forearmForwardBias = clamp(
    lowerInward * 0.4 + Math.max(0, lowerRaise) * 0.3,
    0,
    0.5,
  );
  const torsoClearance = clamp(lowerInward * 0.55 + Math.max(0, lowerRaise) * 0.16, 0, 0.62);

  return {
    upperArmRotation: {
      x: -clamp(upperRaise * 0.26 + Math.max(0, lowerRaise) * 0.06, 0, 0.48),
      y: sideSign * clamp(upperSpread * 0.08 - elbowDepth * 0.16, -0.16, 0.16),
      z: sideSign * clamp(upperSpread * 0.66 + upperRaise * 0.14 + torsoClearance * 0.38, 0, 1.16),
    },
    lowerArmRotation: {
      x: lowerRaise * 0.22,
      y: -sideSign * clamp(lowerSpread * 0.28, -0.36, 0.36) + sideSign * forearmForwardBias * inwardGate,
      z: -sideSign * clamp(
        lowerBend * 1.08 + Math.max(0, lowerRaise) * 1.42 * inwardGate + lowerInward * 0.5,
        0,
        2.42,
      ),
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function applyHandRetarget(): void {
  if (!currentVrm) {
    return;
  }

  const hasHandPose = Boolean(handRetargetPose.left || handRetargetPose.right);
  if (!hasHandPose) {
    if (handRetargetWasActive) {
      restoreHandBones();
      handRetargetWasActive = false;
    }
    return;
  }

  applyHandTarget('left', handRetargetPose.left);
  applyHandTarget('right', handRetargetPose.right);
  currentVrm.humanoid.update();
  handRetargetWasActive = true;
}

function applyHandTarget(side: 'left' | 'right', target: HandRetargetTarget | null): void {
  if (!currentVrm) {
    return;
  }

  if (!target) {
    restoreHandSideBones(side);
    return;
  }

  const sideSign = side === 'left' ? 1 : -1;
  const handBoneName = side === 'left' ? VRMHumanBoneName.LeftHand : VRMHumanBoneName.RightHand;

  applyTrackedHandBone(
    handBoneName,
    target.wristPitch * 0.58,
    sideSign * target.wristYaw * 0.72,
    target.wristRoll * 0.95,
  );
  applyFingerCurl(side, target.fingers);
}

function applyFingerCurl(side: 'left' | 'right', curl: HandFingerCurl): void {
  if (!currentVrm) {
    return;
  }

  const prefix = side;
  const thumbSign = side === 'left' ? 1 : -1;

  applyFingerBone(`${prefix}ThumbMetacarpal`, 0, thumbSign * 0.16 * curl.thumb, -0.25 * curl.thumb);
  applyFingerBone(`${prefix}ThumbProximal`, -0.35 * curl.thumb, thumbSign * 0.08 * curl.thumb, 0);
  applyFingerBone(`${prefix}ThumbDistal`, -0.42 * curl.thumb, 0, 0);
  applyThreeSegmentFinger(prefix, 'Index', curl.index, 0.58, 0.78, 0.46);
  applyThreeSegmentFinger(prefix, 'Middle', curl.middle, 0.62, 0.82, 0.5);
  applyThreeSegmentFinger(prefix, 'Ring', curl.ring, 0.58, 0.78, 0.46);
  applyThreeSegmentFinger(prefix, 'Little', curl.little, 0.52, 0.72, 0.42);
}

function applyTrackedHandBone(
  boneName: VRMHumanBoneName,
  x: number,
  y: number,
  z: number,
): void {
  if (!currentVrm) {
    return;
  }

  const bone = currentVrm.humanoid.getNormalizedBoneNode(boneName);
  const restQuaternion = restBoneQuaternions.get(boneName);

  if (!bone || !restQuaternion) {
    return;
  }

  const delta = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'XYZ'));
  bone.quaternion.copy(restQuaternion).multiply(delta);
  bone.userData.vplant3dHandMocapActive = true;
}

function applyThreeSegmentFinger(
  prefix: 'left' | 'right',
  finger: 'Index' | 'Middle' | 'Ring' | 'Little',
  curl: number,
  proximalAmount: number,
  intermediateAmount: number,
  distalAmount: number,
): void {
  applyFingerBone(`${prefix}${finger}Proximal`, -proximalAmount * curl, 0, 0);
  applyFingerBone(`${prefix}${finger}Intermediate`, -intermediateAmount * curl, 0, 0);
  applyFingerBone(`${prefix}${finger}Distal`, -distalAmount * curl, 0, 0);
}

function applyFingerBone(
  boneName: string,
  x: number,
  y: number,
  z: number,
): void {
  if (!currentVrm) {
    return;
  }

  const bone = currentVrm.humanoid.getNormalizedBoneNode(boneName as VRMHumanBoneName);
  const restQuaternion = restBoneQuaternions.get(boneName);

  if (!bone || !restQuaternion) {
    return;
  }

  const delta = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'XYZ'));
  bone.quaternion.copy(restQuaternion).multiply(delta);
  bone.userData.vplant3dHandMocapActive = true;
}

function resetHandRetarget(): void {
  handRetargetPose = createNeutralHandRetargetPose();
  restoreHandBones();
  handRetargetWasActive = false;
}

function resetArmIkRetarget(): void {
  armIkRetargetPose = createNeutralArmIkRetargetPose();
  restoreArmIkBones();
  armIkRetargetWasActive = false;
}

function restoreArmIkBones(): void {
  restoreArmIkSideBones('left');
  restoreArmIkSideBones('right');
}

function restoreArmIkSideBones(side: 'left' | 'right'): void {
  if (!currentVrm) {
    return;
  }

  const boneNames =
    side === 'left'
      ? [VRMHumanBoneName.LeftUpperArm, VRMHumanBoneName.LeftLowerArm, VRMHumanBoneName.LeftHand]
      : [VRMHumanBoneName.RightUpperArm, VRMHumanBoneName.RightLowerArm, VRMHumanBoneName.RightHand];

  for (const boneName of boneNames) {
    const bone = currentVrm.humanoid.getNormalizedBoneNode(boneName);
    const restQuaternion = restBoneQuaternions.get(boneName);

    if (bone && restQuaternion) {
      bone.quaternion.copy(restQuaternion);
      bone.userData.vplant3dArmIkActive = false;
    }
  }
}

function restoreHandBones(): void {
  restoreHandSideBones('left');
  restoreHandSideBones('right');
}

function restoreHandSideBones(side: 'left' | 'right'): void {
  if (!currentVrm) {
    return;
  }

  const prefix = side === 'left' ? 'left' : 'right';
  const armBoneNames =
    side === 'left'
      ? [VRMHumanBoneName.LeftHand]
      : [VRMHumanBoneName.RightHand];

  for (const boneName of armBoneNames) {
    const bone = currentVrm.humanoid.getNormalizedBoneNode(boneName);
    const restQuaternion = restBoneQuaternions.get(boneName);

    if (bone && restQuaternion) {
      bone.quaternion.copy(restQuaternion);
      bone.userData.vplant3dHandMocapActive = false;
    }
  }

  for (const boneName of fingerBoneNames) {
    if (!boneName.startsWith(prefix)) {
      continue;
    }

    const bone = currentVrm.humanoid.getNormalizedBoneNode(boneName);
    const restQuaternion = restBoneQuaternions.get(boneName);

    if (bone && restQuaternion) {
      bone.quaternion.copy(restQuaternion);
      bone.userData.vplant3dHandMocapActive = false;
    }
  }
}

function applyCameraLessIdle(elapsedSeconds: number): void {
  if (
    !currentVrm ||
    !idleSwayEnabled ||
    isManualControlPoseActive() ||
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

function clearArmRetargetPose(): void {
  upperBodyRetargetPose.leftUpperArmRoll = 0;
  upperBodyRetargetPose.rightUpperArmRoll = 0;
  upperBodyRetargetPose.leftLowerArmRoll = 0;
  upperBodyRetargetPose.rightLowerArmRoll = 0;
  resetArmIkRetarget();
  resetHandRetarget();
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
    VRMHumanBoneName.LeftLowerArm,
    VRMHumanBoneName.RightLowerArm,
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
