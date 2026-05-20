import * as THREE from 'three';
import { VRMUtils } from '@pixiv/three-vrm';
import type { VRM } from '@pixiv/three-vrm';
import { createVRMAnimationClip, VRMLookAtQuaternionProxy } from '@pixiv/three-vrm-animation';
import type { VRMAnimation } from '@pixiv/three-vrm-animation';

import { parseObsQuery } from './obs/query';
import type { AppState } from './state/app-store';
import { createAppStore } from './state/app-store';
import { MicReactiveMouth } from './audio/mic-reactive-mouth';
import { MediaPipePoseDebug } from './mocap/mediapipe-pose-debug';
import { summarizeUpperBodyPose } from './mocap/pose-landmarks';
import type { UpperBodyPoseSummary } from './mocap/pose-landmarks';
import { loadVrmFromFile, VrmLoadError } from './vrm/load-vrm';
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
renderer.domElement.className = 'scene-canvas';
viewport.append(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  35,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(0, 1.2, 6);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
keyLight.position.set(2, 4, 4);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x38d5ff, 2.2);
rimLight.position.set(-3, 2, -2);
scene.add(rimLight);

const fillLight = new THREE.AmbientLight(0x6dff9a, 0.35);
scene.add(fillLight);

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
let placeholderVisible = true;
let vrmStatusText: HTMLElement | null = null;
let vrmFileText: HTMLElement | null = null;
let vrmaStatusText: HTMLElement | null = null;
let vrmaFileText: HTMLElement | null = null;
let vrmaRequirementText: HTMLElement | null = null;
let vrmaPlayButton: HTMLButtonElement | null = null;
let vrmaStopButton: HTMLButtonElement | null = null;
let vrmaLoopInput: HTMLInputElement | null = null;
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
let poseAnimationFrameId: number | null = null;
let lastPoseVideoTime = -1;

if (!state.obsMode) {
  const panel = document.createElement('aside');
  panel.className =
    'absolute left-6 top-6 max-h-[calc(100vh-48px)] w-[min(420px,calc(100vw-48px))] overflow-y-auto rounded-lg border border-[rgba(113,255,191,0.22)] bg-[rgba(20,24,26,0.86)] p-5 text-[#eef4f2] shadow-[0_0_32px_rgba(56,213,255,0.08)] backdrop-blur-md';
  panel.innerHTML = `
    <h1 class="m-0 mb-2 text-2xl leading-tight tracking-normal">VPlant3D <span class="text-[#38d5ff]">for OBS</span></h1>
    <p class="m-0 mb-4 leading-relaxed text-[#9fa9aa]">Lightweight VRM / VRMA 3D avatar layer for OBS Browser Source.</p>
    <div class="mb-4 grid gap-3 rounded-md border border-[#38d5ff]/25 bg-black/20 p-3">
      <div class="grid gap-1">
        <span class="text-xs font-bold uppercase tracking-normal text-[#6dff9a]">VRM Model</span>
        <strong id="vrm-status-text" class="text-sm font-bold text-[#eef4f2]">Choose a local .vrm file.</strong>
        <span id="vrm-file-text" class="min-h-5 text-sm text-[#9fa9aa]">No file selected.</span>
      </div>
      <label class="inline-flex cursor-pointer items-center justify-center rounded-md border border-[#6dff9a]/55 bg-[#6dff9a]/10 px-3 py-2 text-sm font-bold text-[#dfffee] shadow-[0_0_18px_rgba(109,255,154,0.12)] transition hover:border-[#38d5ff] hover:bg-[#38d5ff]/10">
        <input id="vrm-file-input" class="sr-only" type="file" accept=".vrm" />
        Load local VRM
      </label>
    </div>
    <div class="mb-4 grid gap-3 rounded-md border border-[#38d5ff]/25 bg-black/20 p-3">
      <div class="grid gap-1">
        <span class="text-xs font-bold uppercase tracking-normal text-[#38d5ff]">VRMA Motion</span>
        <strong id="vrma-status-text" class="text-sm font-bold text-[#eef4f2]">Choose a local .vrma file.</strong>
        <span id="vrma-file-text" class="min-h-5 text-sm text-[#9fa9aa]">No motion selected.</span>
        <span id="vrma-requirement-text" class="min-h-5 text-sm text-[#9fa9aa]">Load a VRM before playing VRMA.</span>
      </div>
      <label class="inline-flex cursor-pointer items-center justify-center rounded-md border border-[#38d5ff]/55 bg-[#38d5ff]/10 px-3 py-2 text-sm font-bold text-[#dff8ff] shadow-[0_0_18px_rgba(56,213,255,0.12)] transition hover:border-[#6dff9a] hover:bg-[#6dff9a]/10">
        <input id="vrma-file-input" class="sr-only" type="file" accept=".vrma" />
        Load local VRMA
      </label>
      <div class="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
        <button id="vrma-play-button" class="rounded-md border border-[#6dff9a]/55 bg-[#6dff9a]/10 px-3 py-2 text-sm font-bold text-[#dfffee] transition enabled:hover:border-[#38d5ff] enabled:hover:bg-[#38d5ff]/10 disabled:cursor-not-allowed disabled:opacity-40" type="button">Play</button>
        <button id="vrma-stop-button" class="rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-bold text-[#eef4f2] transition enabled:hover:border-[#38d5ff] disabled:cursor-not-allowed disabled:opacity-40" type="button">Stop</button>
        <label class="inline-flex min-w-20 items-center gap-2 text-sm font-bold text-[#9fa9aa]">
          <input id="vrma-loop-input" class="h-4 w-4 accent-[#6dff9a]" type="checkbox" checked />
          Loop
        </label>
      </div>
    </div>
    <div class="mb-4 grid gap-3 rounded-md border border-[#6dff9a]/25 bg-black/20 p-3">
      <div class="grid gap-1">
        <span class="text-xs font-bold uppercase tracking-normal text-[#6dff9a]">Mic Reactive Mouth</span>
        <strong id="mic-status-text" class="text-sm font-bold text-[#eef4f2]">Microphone idle.</strong>
        <span id="mic-requirement-text" class="min-h-5 text-sm text-[#9fa9aa]">Load a VRM before testing mouth movement.</span>
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
      <div class="grid grid-cols-2 gap-2">
        <button id="mic-start-button" class="rounded-md border border-[#6dff9a]/55 bg-[#6dff9a]/10 px-3 py-2 text-sm font-bold text-[#dfffee] transition enabled:hover:border-[#38d5ff] enabled:hover:bg-[#38d5ff]/10 disabled:cursor-not-allowed disabled:opacity-40" type="button">Start mic</button>
        <button id="mic-stop-button" class="rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-bold text-[#eef4f2] transition enabled:hover:border-[#38d5ff] disabled:cursor-not-allowed disabled:opacity-40" type="button">Stop mic</button>
      </div>
    </div>
    <div class="mb-4 grid gap-3 rounded-md border border-[#38d5ff]/25 bg-black/20 p-3">
      <div class="grid gap-1">
        <span class="text-xs font-bold uppercase tracking-normal text-[#38d5ff]">MediaPipe Pose Debug</span>
        <strong id="pose-status-text" class="text-sm font-bold text-[#eef4f2]">Camera idle.</strong>
        <span id="pose-requirement-text" class="min-h-5 text-sm text-[#9fa9aa]">Start camera to inspect upper-body landmarks.</span>
      </div>
      <div class="relative aspect-video overflow-hidden rounded-md border border-white/10 bg-[#0b0f10]">
        <video id="pose-video" class="h-full w-full scale-x-[-1] object-cover opacity-80" autoplay muted playsinline></video>
        <canvas id="pose-canvas" class="pointer-events-none absolute inset-0 h-full w-full scale-x-[-1]"></canvas>
      </div>
      <div class="grid gap-2">
        <div class="flex items-center justify-between gap-3 text-xs font-bold text-[#9fa9aa]">
          <span>Upper body visibility</span>
          <span id="pose-summary-text">Camera idle.</span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-white/10"><div id="pose-visibility-bar" class="h-full w-0 rounded-full bg-[#38d5ff] transition-[width] duration-75"></div></div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button id="pose-start-button" class="rounded-md border border-[#38d5ff]/55 bg-[#38d5ff]/10 px-3 py-2 text-sm font-bold text-[#dff8ff] transition enabled:hover:border-[#6dff9a] enabled:hover:bg-[#6dff9a]/10 disabled:cursor-not-allowed disabled:opacity-40" type="button">Start camera</button>
        <button id="pose-stop-button" class="rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-bold text-[#eef4f2] transition enabled:hover:border-[#38d5ff] disabled:cursor-not-allowed disabled:opacity-40" type="button">Stop camera</button>
      </div>
    </div>
    <ul class="m-0 grid list-none gap-2 p-0">
      <li class="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#9fa9aa]"><span>Setup Mode</span><strong class="font-bold text-[#6dff9a]">Active</strong></li>
      <li class="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#9fa9aa]"><span>OBS Mode</span><strong class="font-bold text-[#6dff9a]">${state.obsMode ? 'On' : 'Off'}</strong></li>
      <li class="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#9fa9aa]"><span>Transparent</span><strong class="font-bold text-[#6dff9a]">${state.transparent ? 'On' : 'Off'}</strong></li>
      <li class="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#9fa9aa]"><span>Render</span><strong class="font-bold text-[#6dff9a]">${state.rendererName}</strong></li>
    </ul>
  `;

  const vrmFileInput = panel.querySelector<HTMLInputElement>('#vrm-file-input');
  const vrmaFileInput = panel.querySelector<HTMLInputElement>('#vrma-file-input');
  vrmStatusText = panel.querySelector<HTMLElement>('#vrm-status-text');
  vrmFileText = panel.querySelector<HTMLElement>('#vrm-file-text');
  vrmaStatusText = panel.querySelector<HTMLElement>('#vrma-status-text');
  vrmaFileText = panel.querySelector<HTMLElement>('#vrma-file-text');
  vrmaRequirementText = panel.querySelector<HTMLElement>('#vrma-requirement-text');
  vrmaPlayButton = panel.querySelector<HTMLButtonElement>('#vrma-play-button');
  vrmaStopButton = panel.querySelector<HTMLButtonElement>('#vrma-stop-button');
  vrmaLoopInput = panel.querySelector<HTMLInputElement>('#vrma-loop-input');
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

  vrmFileInput?.addEventListener('change', () => {
    const file = vrmFileInput.files?.[0] ?? null;
    void handleVrmFileSelection(file);
  });

  vrmaFileInput?.addEventListener('change', () => {
    const file = vrmaFileInput.files?.[0] ?? null;
    void handleVrmaFileSelection(file);
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

async function handleVrmaFileSelection(file: File | null): Promise<void> {
  const validation = validateVrmaFile(file);

  if (!validation.ok) {
    currentVrma = null;
    stopVrmaPlayback();
    appStore.getState().setVrmaError(getVrmaFileValidationMessage(validation));
    return;
  }

  if (!file) {
    currentVrma = null;
    stopVrmaPlayback();
    appStore.getState().setVrmaError('Choose a local .vrma file.');
    return;
  }

  stopVrmaPlayback();
  appStore.getState().setVrmaLoading(file.name);

  try {
    currentVrma = await loadVrmaFromFile(file);
    resetVrmaMixer();
    appStore.getState().setVrmaReady(file.name, currentVrma.duration);
  } catch (error) {
    currentVrma = null;
    const message =
      error instanceof VrmaLoadError ? error.message : getUnknownVrmaLoadErrorMessage(error);
    appStore.getState().setVrmaError(message);
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
  scene.add(nextVrm.scene);
  resetVrmaMixer();
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

function updateVrmStatusUi(nextState: AppState): void {
  if (vrmStatusText && vrmFileText) {
    vrmStatusText.textContent = getVrmStatusText(nextState);
    vrmFileText.textContent = nextState.vrmFileName ?? 'No file selected.';
  }

  updateVrmaStatusUi(nextState);
  updateMicStatusUi(nextState);
  updatePoseStatusUi(nextState);
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
  applyMouthOpen(frame.mouthOpen);
  appStore.getState().setMicFrame(frame.rms, frame.mouthOpen);
}

function applyMouthOpen(value: number): void {
  currentVrm?.expressionManager?.setValue('aa', value);
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

    appStore.getState().setPoseLoading();
    poseController = await MediaPipePoseDebug.create();
    appStore.getState().setPoseActive();
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
  poseStream?.getTracks().forEach((track) => track.stop());
  poseStream = null;
  lastPoseVideoTime = -1;

  if (poseVideoElement) {
    poseVideoElement.pause();
    poseVideoElement.srcObject = null;
  }

  clearPoseCanvas();
  appStore.getState().setPoseStopped();
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
      drawPoseDebugLandmarks(landmarks);
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

function clearPoseCanvas(): void {
  const context = poseCanvasElement?.getContext('2d');

  if (!context || !poseCanvasElement) {
    return;
  }

  context.clearRect(0, 0, poseCanvasElement.width, poseCanvasElement.height);
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
    return 'Move shoulders and upper body inside the camera preview.';
  }

  if (nextState.poseStatus === 'error') {
    return 'Check camera permission, HTTPS/localhost rules, and model download access.';
  }

  return 'Start camera to inspect upper-body landmarks.';
}
