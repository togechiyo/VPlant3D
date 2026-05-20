import type { VRMAnimation } from '@pixiv/three-vrm-animation';
import { VRMAnimationLoaderPlugin } from '@pixiv/three-vrm-animation';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

import {
  getUnknownVrmaLoadErrorMessage,
  getVrmaFileValidationMessage,
  validateVrmaFile,
} from './vrma-file';

export class VrmaLoadError extends Error {
  public override readonly name = 'VrmaLoadError';
}

export async function loadVrmaFromFile(file: File): Promise<VRMAnimation> {
  const validation = validateVrmaFile(file);

  if (!validation.ok) {
    throw new VrmaLoadError(getVrmaFileValidationMessage(validation));
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    return await loadVrmaFromArrayBuffer(arrayBuffer);
  } catch (error) {
    if (error instanceof VrmaLoadError) {
      throw error;
    }

    throw new VrmaLoadError(getUnknownVrmaLoadErrorMessage(error));
  }
}

export async function loadVrmaFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<VRMAnimation> {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMAnimationLoaderPlugin(parser));

  const gltf = await loader.parseAsync(arrayBuffer, '');
  return extractFirstVrma(gltf);
}

function extractFirstVrma(gltf: GLTF): VRMAnimation {
  const vrmAnimations = gltf.userData.vrmAnimations;

  if (Array.isArray(vrmAnimations) && isVrmAnimation(vrmAnimations[0])) {
    return vrmAnimations[0];
  }

  throw new VrmaLoadError('The selected file was parsed, but it does not contain VRMA data.');
}

function isVrmAnimation(value: unknown): value is VRMAnimation {
  const candidate = value as { duration?: unknown; humanoidTracks?: unknown } | null;

  return (
    candidate !== null &&
    typeof candidate === 'object' &&
    typeof candidate.duration === 'number' &&
    typeof candidate.humanoidTracks === 'object'
  );
}
