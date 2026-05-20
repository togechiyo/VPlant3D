import { describe, expect, it } from 'vitest';

import {
  getUnknownVrmLoadErrorMessage,
  getVrmFileValidationMessage,
  isVrmFileName,
  validateVrmFile,
} from '../src/vrm/vrm-file';

describe('isVrmFileName', () => {
  it('accepts .vrm files case-insensitively', () => {
    expect(isVrmFileName('AliciaSolid.vrm')).toBe(true);
    expect(isVrmFileName('Avatar.VRM')).toBe(true);
  });

  it('rejects non-VRM file names', () => {
    expect(isVrmFileName('motion.vrma')).toBe(false);
    expect(isVrmFileName('avatar.glb')).toBe(false);
  });
});

describe('validateVrmFile', () => {
  it('accepts a non-empty .vrm file below the size limit', () => {
    expect(validateVrmFile({ name: 'avatar.vrm', size: 1024 })).toEqual({ ok: true });
  });

  it('rejects missing, empty, non-VRM, and too-large files', () => {
    expect(validateVrmFile(null)).toEqual({ ok: false, reason: 'missing-file' });
    expect(validateVrmFile({ name: 'avatar.vrm', size: 0 })).toEqual({
      ok: false,
      reason: 'empty-file',
    });
    expect(validateVrmFile({ name: 'avatar.glb', size: 1024 })).toEqual({
      ok: false,
      reason: 'invalid-extension',
    });
    expect(validateVrmFile({ name: 'avatar.vrm', size: 2048 }, { maxBytes: 1024 })).toEqual({
      ok: false,
      reason: 'too-large',
    });
  });
});

describe('VRM error messages', () => {
  it('creates human-readable validation and unknown error messages', () => {
    expect(getVrmFileValidationMessage({ ok: false, reason: 'invalid-extension' })).toBe(
      'Only .vrm files can be loaded here.',
    );
    expect(getUnknownVrmLoadErrorMessage(new Error('GLB parse failed'))).toBe('GLB parse failed');
    expect(getUnknownVrmLoadErrorMessage('nope')).toBe('Failed to load the selected VRM file.');
  });
});
