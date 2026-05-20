import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import type { VRM } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Object3D } from 'three';

import {
  getUnknownVrmLoadErrorMessage,
  getVrmFileValidationMessage,
  validateVrmFile,
} from './vrm-file';

export class VrmLoadError extends Error {
  public override readonly name = 'VrmLoadError';
}

export async function loadVrmFromFile(file: File): Promise<VRM> {
  const validation = validateVrmFile(file);

  if (!validation.ok) {
    throw new VrmLoadError(getVrmFileValidationMessage(validation));
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    return await loadVrmFromArrayBuffer(arrayBuffer);
  } catch (error) {
    if (error instanceof VrmLoadError) {
      throw error;
    }

    throw new VrmLoadError(getUnknownVrmLoadErrorMessage(error));
  }
}

export async function loadVrmFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<VRM> {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));

  const gltf = await loader.parseAsync(arrayBuffer, '');
  const vrm = extractVrm(gltf);

  VRMUtils.removeUnnecessaryVertices(vrm.scene);
  VRMUtils.combineSkeletons(vrm.scene);
  VRMUtils.rotateVRM0(vrm);

  return vrm;
}

function extractVrm(gltf: GLTF): VRM {
  const vrm = gltf.userData.vrm;

  if (isVrm(vrm)) {
    return vrm;
  }

  throw new VrmLoadError('The selected file was parsed, but it does not contain VRM data.');
}

function isVrm(value: unknown): value is VRM {
  const candidate = value as { scene?: unknown; update?: unknown } | null;

  return (
    candidate !== null &&
    typeof candidate === 'object' &&
    candidate.scene instanceof Object3D &&
    typeof candidate.update === 'function'
  );
}
