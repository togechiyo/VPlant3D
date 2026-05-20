const VRMA_EXTENSION = '.vrma';
const DEFAULT_MAX_VRMA_BYTES = 64 * 1024 * 1024;

export interface VrmaFileLike {
  name: string;
  size: number;
  type?: string;
}

export type VrmaFileValidation =
  | { ok: true }
  | { ok: false; reason: 'missing-file' | 'invalid-extension' | 'empty-file' | 'too-large' };

export interface VrmaFileValidationOptions {
  maxBytes?: number;
}

export function isVrmaFileName(fileName: string): boolean {
  return fileName.trim().toLowerCase().endsWith(VRMA_EXTENSION);
}

export function validateVrmaFile(
  file: VrmaFileLike | null | undefined,
  options: VrmaFileValidationOptions = {},
): VrmaFileValidation {
  if (!file) {
    return { ok: false, reason: 'missing-file' };
  }

  if (!isVrmaFileName(file.name)) {
    return { ok: false, reason: 'invalid-extension' };
  }

  if (file.size <= 0) {
    return { ok: false, reason: 'empty-file' };
  }

  const maxBytes = options.maxBytes ?? DEFAULT_MAX_VRMA_BYTES;

  if (file.size > maxBytes) {
    return { ok: false, reason: 'too-large' };
  }

  return { ok: true };
}

export function getVrmaFileValidationMessage(validation: VrmaFileValidation): string {
  if (validation.ok) {
    return 'VRMA file is ready to load.';
  }

  switch (validation.reason) {
    case 'missing-file':
      return 'Choose a local .vrma file.';
    case 'invalid-extension':
      return 'Only .vrma files can be loaded here.';
    case 'empty-file':
      return 'The selected VRMA file is empty.';
    case 'too-large':
      return 'The selected VRMA file is too large for the current local loader.';
  }
}

export function getUnknownVrmaLoadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Failed to load the selected VRMA file.';
}
