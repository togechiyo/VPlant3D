import { describe, expect, it } from 'vitest';

import {
  getUnknownVrmaLoadErrorMessage,
  getVrmaFileValidationMessage,
  isVrmaFileName,
  validateVrmaFile,
} from '../src/vrma/vrma-file';

describe('isVrmaFileName', () => {
  it('accepts .vrma files case-insensitively', () => {
    expect(isVrmaFileName('VRMA_02.vrma')).toBe(true);
    expect(isVrmaFileName('Motion.VRMA')).toBe(true);
  });

  it('rejects non-VRMA file names', () => {
    expect(isVrmaFileName('avatar.vrm')).toBe(false);
    expect(isVrmaFileName('motion.glb')).toBe(false);
  });
});

describe('validateVrmaFile', () => {
  it('accepts a non-empty .vrma file below the size limit', () => {
    expect(validateVrmaFile({ name: 'motion.vrma', size: 1024 })).toEqual({ ok: true });
  });

  it('rejects missing, empty, non-VRMA, and too-large files', () => {
    expect(validateVrmaFile(null)).toEqual({ ok: false, reason: 'missing-file' });
    expect(validateVrmaFile({ name: 'motion.vrma', size: 0 })).toEqual({
      ok: false,
      reason: 'empty-file',
    });
    expect(validateVrmaFile({ name: 'motion.vrm', size: 1024 })).toEqual({
      ok: false,
      reason: 'invalid-extension',
    });
    expect(validateVrmaFile({ name: 'motion.vrma', size: 2048 }, { maxBytes: 1024 })).toEqual({
      ok: false,
      reason: 'too-large',
    });
  });
});

describe('VRMA error messages', () => {
  it('creates human-readable validation and unknown error messages', () => {
    expect(getVrmaFileValidationMessage({ ok: false, reason: 'invalid-extension' })).toBe(
      'Only .vrma files can be loaded here.',
    );
    expect(getUnknownVrmaLoadErrorMessage(new Error('VRMA parse failed'))).toBe(
      'VRMA parse failed',
    );
    expect(getUnknownVrmaLoadErrorMessage('nope')).toBe('Failed to load the selected VRMA file.');
  });
});
