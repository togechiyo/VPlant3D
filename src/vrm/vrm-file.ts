const VRM_EXTENSION = '.vrm';
const DEFAULT_MAX_VRM_BYTES = 128 * 1024 * 1024;

export interface VrmFileLike {
  name: string;
  size: number;
  type?: string;
}

export type VrmFileValidation =
  | { ok: true }
  | { ok: false; reason: 'missing-file' | 'invalid-extension' | 'empty-file' | 'too-large' };

export interface VrmFileValidationOptions {
  maxBytes?: number;
}

export function isVrmFileName(fileName: string): boolean {
  return fileName.trim().toLowerCase().endsWith(VRM_EXTENSION);
}

export function validateVrmFile(
  file: VrmFileLike | null | undefined,
  options: VrmFileValidationOptions = {},
): VrmFileValidation {
  if (!file) {
    return { ok: false, reason: 'missing-file' };
  }

  if (!isVrmFileName(file.name)) {
    return { ok: false, reason: 'invalid-extension' };
  }

  if (file.size <= 0) {
    return { ok: false, reason: 'empty-file' };
  }

  const maxBytes = options.maxBytes ?? DEFAULT_MAX_VRM_BYTES;

  if (file.size > maxBytes) {
    return { ok: false, reason: 'too-large' };
  }

  return { ok: true };
}

export function getVrmFileValidationMessage(validation: VrmFileValidation): string {
  if (validation.ok) {
    return 'VRM file is ready to load.';
  }

  switch (validation.reason) {
    case 'missing-file':
      return 'Choose a local .vrm file.';
    case 'invalid-extension':
      return 'Only .vrm files can be loaded here.';
    case 'empty-file':
      return 'The selected VRM file is empty.';
    case 'too-large':
      return 'The selected VRM file is too large for the current local loader.';
  }
}

export function getUnknownVrmLoadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Failed to load the selected VRM file.';
}
