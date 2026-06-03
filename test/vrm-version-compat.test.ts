import { describe, expect, it, vi } from 'vitest';

import {
  getDefaultPoseMirrorInputForVrm,
  getExpressionAliasCandidates,
  getVrmExpressionValue,
  resolveExpressionAlias,
  resolveVrmCompatProfile,
  setVrmExpressionValue,
  type VrmExpressionManagerLike,
} from '../src/vrm/vrm-version-compat';

function createExpressionManager(names: string[]): VrmExpressionManagerLike {
  const values = new Map<string, number>();
  const available = new Set(names);

  return {
    getExpression: (name: string) => (available.has(name) ? { name } : null),
    setValue: vi.fn((name: string, weight: number) => {
      values.set(name, weight);
    }),
    getValue: (name: string) => values.get(name),
  };
}

describe('resolveVrmCompatProfile', () => {
  it('keeps the UI mirror for face and flips body mirror for VRM 1.0', () => {
    const profile = resolveVrmCompatProfile('1', true);

    expect(profile.version).toBe('1');
    expect(profile.versionLabel).toBe('VRM 1.0');
    expect(profile.faceMirrorInput).toBe(true);
    expect(profile.bodyMirrorInput).toBe(false);
    expect(profile.armMirrorInput).toBe(true);
    expect(profile.headPitchSign).toBe(-1);
    expect(profile.manualHeadPitchSign).toBe(-1);
    expect(profile.idleArmPoseProfile).toBe('vrm1');
  });

  it('keeps legacy mirror interpretation for VRM 0.x and unknown metadata', () => {
    expect(resolveVrmCompatProfile('0', true)).toMatchObject({
      version: '0',
      faceMirrorInput: true,
      bodyMirrorInput: true,
      armMirrorInput: true,
      headPitchSign: 1,
      manualHeadPitchSign: 1,
      idleArmPoseProfile: 'vrm0',
    });
    expect(resolveVrmCompatProfile(undefined, false)).toMatchObject({
      version: 'unknown',
      faceMirrorInput: false,
      bodyMirrorInput: false,
      armMirrorInput: false,
      headPitchSign: 1,
      manualHeadPitchSign: 1,
      idleArmPoseProfile: 'vrm0',
    });
  });

  it('keeps mirror enabled by default for every VRM version', () => {
    expect(getDefaultPoseMirrorInputForVrm('1')).toBe(true);
    expect(getDefaultPoseMirrorInputForVrm('0')).toBe(true);
    expect(getDefaultPoseMirrorInputForVrm(undefined)).toBe(true);
  });
});

describe('VRM expression aliases', () => {
  it('resolves VRM 1.0 preset names first', () => {
    const profile = resolveVrmCompatProfile('1');
    const manager = createExpressionManager(['happy', 'aa', 'blinkLeft']);

    expect(resolveExpressionAlias(manager, profile, 'happy')).toBe('happy');
    expect(resolveExpressionAlias(manager, profile, 'aa')).toBe('aa');
    expect(resolveExpressionAlias(manager, profile, 'blinkLeft')).toBe('blinkLeft');
  });

  it('falls back to VRM 0.x preset names', () => {
    const profile = resolveVrmCompatProfile('0');
    const manager = createExpressionManager(['joy', 'fun', 'sorrow', 'a', 'blink_l']);

    expect(resolveExpressionAlias(manager, profile, 'happy')).toBe('joy');
    expect(resolveExpressionAlias(manager, profile, 'relaxed')).toBe('fun');
    expect(resolveExpressionAlias(manager, profile, 'sad')).toBe('sorrow');
    expect(resolveExpressionAlias(manager, profile, 'aa')).toBe('a');
    expect(resolveExpressionAlias(manager, profile, 'blinkLeft')).toBe('blink_l');
  });

  it('ignores missing expressions safely', () => {
    const profile = resolveVrmCompatProfile('0');
    const manager = createExpressionManager(['joy']);

    expect(setVrmExpressionValue(manager, profile, 'surprised', 0.8)).toBe(false);
    expect(manager.setValue).not.toHaveBeenCalled();
  });

  it('sets and reads through the resolved alias', () => {
    const profile = resolveVrmCompatProfile('0');
    const manager = createExpressionManager(['joy']);

    expect(setVrmExpressionValue(manager, profile, 'happy', 0.72)).toBe(true);
    expect(manager.setValue).toHaveBeenCalledWith('joy', 0.72);
    expect(getVrmExpressionValue(manager, profile, 'happy')).toBe(0.72);
  });

  it('deduplicates alias candidates', () => {
    const profile = resolveVrmCompatProfile('1');

    expect(getExpressionAliasCandidates(profile, 'angry')).toEqual(['angry']);
  });
});
