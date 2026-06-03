export type VrmMetaVersion = '0' | '1' | string | undefined;
export type VrmCompatVersion = '0' | '1' | 'unknown';
export type IdleArmPoseProfile = 'vrm0' | 'vrm1';

export interface VrmExpressionManagerLike {
  getExpression(name: string): unknown | null;
  setValue(name: string, weight: number): void;
  getValue?(name: string): number | null | undefined;
}

export interface VrmCompatProfile {
  version: VrmCompatVersion;
  versionLabel: string;
  faceMirrorInput: boolean;
  bodyMirrorInput: boolean;
  armMirrorInput: boolean;
  headPitchSign: 1 | -1;
  manualHeadPitchSign: 1 | -1;
  idleArmPoseProfile: IdleArmPoseProfile;
  expressionAliases: Record<string, readonly string[]>;
}

export const vrmExpressionAliases: Record<string, readonly string[]> = {
  neutral: ['neutral'],
  happy: ['happy', 'joy'],
  angry: ['angry'],
  sad: ['sad', 'sorrow'],
  relaxed: ['relaxed', 'fun'],
  surprised: ['surprised'],
  blink: ['blink'],
  blinkLeft: ['blinkLeft', 'blink_l', 'Blink_L'],
  blinkRight: ['blinkRight', 'blink_r', 'Blink_R'],
  aa: ['aa', 'a'],
  ih: ['ih', 'i'],
  ou: ['ou', 'u'],
  ee: ['ee', 'e'],
  oh: ['oh', 'o'],
  lookUp: ['lookUp', 'lookup', 'LookUp'],
  lookDown: ['lookDown', 'lookdown', 'LookDown'],
  lookLeft: ['lookLeft', 'lookleft', 'LookLeft'],
  lookRight: ['lookRight', 'lookright', 'LookRight'],
};

export function getDefaultPoseMirrorInputForVrm(metaVersion: VrmMetaVersion): boolean {
  void metaVersion;
  return true;
}

export function resolveVrmCompatProfile(
  metaVersion: VrmMetaVersion,
  uiMirrorInput = true,
): VrmCompatProfile {
  const version = normalizeVrmCompatVersion(metaVersion);
  const isVrm1 = version === '1';

  return {
    version,
    versionLabel:
      version === '1' ? 'VRM 1.0' : version === '0' ? 'VRM 0.x' : 'VRM 不明',
    faceMirrorInput: uiMirrorInput,
    bodyMirrorInput: uiMirrorInput,
    armMirrorInput: uiMirrorInput,
    headPitchSign: isVrm1 ? -1 : 1,
    manualHeadPitchSign: isVrm1 ? -1 : 1,
    idleArmPoseProfile: isVrm1 ? 'vrm1' : 'vrm0',
    expressionAliases: vrmExpressionAliases,
  };
}

export function normalizeVrmCompatVersion(metaVersion: VrmMetaVersion): VrmCompatVersion {
  if (metaVersion === '0' || metaVersion === '1') {
    return metaVersion;
  }

  return 'unknown';
}

export function getExpressionAliasCandidates(
  profile: Pick<VrmCompatProfile, 'expressionAliases'>,
  name: string,
): string[] {
  const aliases = profile.expressionAliases[name] ?? [name];
  return [...new Set(aliases)];
}

export function resolveExpressionAlias(
  expressionManager: VrmExpressionManagerLike | null | undefined,
  profile: Pick<VrmCompatProfile, 'expressionAliases'>,
  name: string,
): string | null {
  if (!expressionManager) {
    return null;
  }

  for (const candidate of getExpressionAliasCandidates(profile, name)) {
    if (expressionManager.getExpression(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function setVrmExpressionValue(
  expressionManager: VrmExpressionManagerLike | null | undefined,
  profile: Pick<VrmCompatProfile, 'expressionAliases'>,
  name: string,
  weight: number,
): boolean {
  const resolvedName = resolveExpressionAlias(expressionManager, profile, name);

  if (!expressionManager || !resolvedName) {
    return false;
  }

  expressionManager.setValue(resolvedName, weight);
  return true;
}

export function getVrmExpressionValue(
  expressionManager: VrmExpressionManagerLike | null | undefined,
  profile: Pick<VrmCompatProfile, 'expressionAliases'>,
  name: string,
): number | undefined {
  const resolvedName = resolveExpressionAlias(expressionManager, profile, name);

  if (!expressionManager?.getValue || !resolvedName) {
    return undefined;
  }

  return expressionManager.getValue(resolvedName) ?? undefined;
}
