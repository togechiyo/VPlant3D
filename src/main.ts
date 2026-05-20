import * as THREE from 'three';
import { VRMUtils } from '@pixiv/three-vrm';
import type { VRM } from '@pixiv/three-vrm';

import { parseObsQuery } from './obs/query';
import type { AppState } from './state/app-store';
import { createAppStore } from './state/app-store';
import { loadVrmFromFile, VrmLoadError } from './vrm/load-vrm';
import {
  getUnknownVrmLoadErrorMessage,
  getVrmFileValidationMessage,
  validateVrmFile,
} from './vrm/vrm-file';
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
let placeholderVisible = true;
let vrmStatusText: HTMLElement | null = null;
let vrmFileText: HTMLElement | null = null;

if (!state.obsMode) {
  const panel = document.createElement('aside');
  panel.className =
    'absolute left-6 top-6 w-[min(420px,calc(100vw-48px))] rounded-lg border border-[rgba(113,255,191,0.22)] bg-[rgba(20,24,26,0.86)] p-5 text-[#eef4f2] shadow-[0_0_32px_rgba(56,213,255,0.08)] backdrop-blur-md';
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
    <ul class="m-0 grid list-none gap-2 p-0">
      <li class="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#9fa9aa]"><span>Setup Mode</span><strong class="font-bold text-[#6dff9a]">Active</strong></li>
      <li class="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#9fa9aa]"><span>OBS Mode</span><strong class="font-bold text-[#6dff9a]">${state.obsMode ? 'On' : 'Off'}</strong></li>
      <li class="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#9fa9aa]"><span>Transparent</span><strong class="font-bold text-[#6dff9a]">${state.transparent ? 'On' : 'Off'}</strong></li>
      <li class="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#9fa9aa]"><span>Render</span><strong class="font-bold text-[#6dff9a]">${state.rendererName}</strong></li>
    </ul>
  `;

  const vrmFileInput = panel.querySelector<HTMLInputElement>('#vrm-file-input');
  vrmStatusText = panel.querySelector<HTMLElement>('#vrm-status-text');
  vrmFileText = panel.querySelector<HTMLElement>('#vrm-file-text');

  vrmFileInput?.addEventListener('change', () => {
    const file = vrmFileInput.files?.[0] ?? null;
    void handleVrmFileSelection(file);
  });

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

const clock = new THREE.Clock();

function animate(): void {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;
  cube.rotation.x = elapsed * 0.32;
  cube.rotation.y = elapsed * 0.52;
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

function replaceCurrentVrm(nextVrm: VRM): void {
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
  if (!vrmStatusText || !vrmFileText) {
    return;
  }

  vrmStatusText.textContent = getVrmStatusText(nextState);
  vrmFileText.textContent = nextState.vrmFileName ?? 'No file selected.';
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
