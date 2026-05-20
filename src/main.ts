import * as THREE from 'three';

import { parseObsQuery } from './obs/query';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing #app root element');
}

const options = parseObsQuery(window.location.search);

const viewport = document.createElement('section');
viewport.className = options.transparent
  ? 'viewport viewport--transparent'
  : 'viewport';

const renderer = new THREE.WebGLRenderer({
  alpha: options.transparent,
  antialias: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x101314, options.transparent ? 0 : 1);
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

if (!options.obsMode) {
  const panel = document.createElement('aside');
  panel.className = 'setup-panel';
  panel.innerHTML = `
    <h1>VPlant3D <span class="accent">for OBS</span></h1>
    <p>Lightweight VRM / VRMA 3D avatar layer for OBS Browser Source.</p>
    <ul class="status-list">
      <li><span>Setup Mode</span><strong>Active</strong></li>
      <li><span>OBS Mode</span><strong>${options.obsMode ? 'On' : 'Off'}</strong></li>
      <li><span>Transparent</span><strong>${options.transparent ? 'On' : 'Off'}</strong></li>
      <li><span>Render</span><strong>Three.js WebGL</strong></li>
    </ul>
  `;
  viewport.append(panel);
} else {
  viewport.style.pointerEvents = 'none';
}

app.append(viewport);

function resize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', resize);

const clock = new THREE.Clock();

function animate(): void {
  const elapsed = clock.getElapsedTime();
  cube.rotation.x = elapsed * 0.32;
  cube.rotation.y = elapsed * 0.52;
  renderer.render(scene, camera);
  window.requestAnimationFrame(animate);
}

animate();
