export type LookPresetId = 'standard' | 'bright' | 'front-top' | 'neon' | 'edge';
export type RimLightStrength = 'off' | 'soft' | 'medium' | 'strong';
export type RimLightColor = 'white' | 'blue' | 'green';
export type RimLightDirection = 'left-back' | 'right-back' | 'top-back';

export interface LookSettings {
  preset: LookPresetId;
  keyIntensityScale: number;
  fillIntensityScale: number;
  rimStrength: RimLightStrength;
  rimColor: RimLightColor;
  rimDirection: RimLightDirection;
}

export interface LookLightPreset {
  id: LookPresetId;
  label: string;
  keyColor: number;
  keyIntensity: number;
  keyPosition: [number, number, number];
  keyTarget: [number, number, number];
  fillColor: number;
  fillIntensity: number;
  fillPosition: [number, number, number];
  fillTarget: [number, number, number];
  rimColor: number;
  rimIntensity: number;
  rimPosition: [number, number, number];
  rimTarget: [number, number, number];
  exposure: number;
}

export interface ResolvedLookLights extends LookLightPreset {
  keyIntensity: number;
  fillIntensity: number;
  rimColor: number;
  rimIntensity: number;
  rimPosition: [number, number, number];
}

export const lookLightPresets: Record<LookPresetId, LookLightPreset> = {
  standard: {
    id: 'standard',
    label: '標準',
    keyColor: 0xf4fbff,
    keyIntensity: 1.65,
    keyPosition: [-2.4, 3.35, 3.35],
    keyTarget: [0, 1.34, 0],
    fillColor: 0xb8d7ff,
    fillIntensity: 0.26,
    fillPosition: [2.6, 1.9, 2.25],
    fillTarget: [0, 1.12, 0],
    rimColor: 0x38d5ff,
    rimIntensity: 0.82,
    rimPosition: [2.9, 2.65, -3.4],
    rimTarget: [0, 1.42, 0],
    exposure: 0.88,
  },
  bright: {
    id: 'bright',
    label: '明るめ',
    keyColor: 0xffffff,
    keyIntensity: 1.95,
    keyPosition: [-2.2, 3.4, 3.45],
    keyTarget: [0, 1.34, 0],
    fillColor: 0xcfe8ff,
    fillIntensity: 0.42,
    fillPosition: [2.5, 1.95, 2.45],
    fillTarget: [0, 1.12, 0],
    rimColor: 0xf4fbff,
    rimIntensity: 0.78,
    rimPosition: [2.9, 2.7, -3.35],
    rimTarget: [0, 1.42, 0],
    exposure: 0.9,
  },
  'front-top': {
    id: 'front-top',
    label: '正面上',
    keyColor: 0xf4fbff,
    keyIntensity: 1.82,
    keyPosition: [0, 4.2, 3.25],
    keyTarget: [0, 1.36, 0],
    fillColor: 0xcfe8ff,
    fillIntensity: 0.28,
    fillPosition: [2.35, 1.85, 2.25],
    fillTarget: [0, 1.1, 0],
    rimColor: 0x38d5ff,
    rimIntensity: 0.72,
    rimPosition: [2.8, 2.65, -3.35],
    rimTarget: [0, 1.42, 0],
    exposure: 0.88,
  },
  neon: {
    id: 'neon',
    label: 'ネオン',
    keyColor: 0xf4fbff,
    keyIntensity: 1.46,
    keyPosition: [-2.35, 3.25, 3.15],
    keyTarget: [0, 1.34, 0],
    fillColor: 0x38d5ff,
    fillIntensity: 0.34,
    fillPosition: [2.85, 1.9, 2.1],
    fillTarget: [0, 1.08, 0],
    rimColor: 0x6dff9a,
    rimIntensity: 1.65,
    rimPosition: [3.2, 2.65, -3.55],
    rimTarget: [0, 1.42, 0],
    exposure: 0.84,
  },
  edge: {
    id: 'edge',
    label: '輪郭強調',
    keyColor: 0xf4fbff,
    keyIntensity: 1.26,
    keyPosition: [-2.45, 3.2, 3.1],
    keyTarget: [0, 1.34, 0],
    fillColor: 0xaecfff,
    fillIntensity: 0.12,
    fillPosition: [2.7, 1.85, 2.05],
    fillTarget: [0, 1.08, 0],
    rimColor: 0x38d5ff,
    rimIntensity: 1.95,
    rimPosition: [3.35, 2.75, -3.6],
    rimTarget: [0, 1.44, 0],
    exposure: 0.84,
  },
};

export function createDefaultLookSettings(): LookSettings {
  return {
    preset: 'standard',
    keyIntensityScale: 1,
    fillIntensityScale: 1,
    rimStrength: 'soft',
    rimColor: 'blue',
    rimDirection: 'right-back',
  };
}

export function resolveLookLights(settings: LookSettings): ResolvedLookLights {
  const preset = lookLightPresets[settings.preset] ?? lookLightPresets.standard;
  const rimIntensity = getRimIntensity(settings.rimStrength, preset.rimIntensity);

  return {
    ...preset,
    keyIntensity: preset.keyIntensity * clampScale(settings.keyIntensityScale),
    fillIntensity: preset.fillIntensity * clampScale(settings.fillIntensityScale),
    rimColor: getRimColor(settings.rimColor, preset.rimColor),
    rimIntensity,
    rimPosition: getRimPosition(settings.rimDirection, preset.rimPosition),
  };
}

export function normalizeLookSettings(settings: Partial<LookSettings>): LookSettings {
  const defaults = createDefaultLookSettings();

  return {
    preset: isLookPresetId(settings.preset) ? settings.preset : defaults.preset,
    keyIntensityScale: clampScale(settings.keyIntensityScale ?? defaults.keyIntensityScale),
    fillIntensityScale: clampScale(settings.fillIntensityScale ?? defaults.fillIntensityScale),
    rimStrength: isRimLightStrength(settings.rimStrength)
      ? settings.rimStrength
      : defaults.rimStrength,
    rimColor: isRimLightColor(settings.rimColor) ? settings.rimColor : defaults.rimColor,
    rimDirection: isRimLightDirection(settings.rimDirection)
      ? settings.rimDirection
      : defaults.rimDirection,
  };
}

function getRimIntensity(strength: RimLightStrength, presetIntensity: number): number {
  switch (strength) {
    case 'off':
      return 0;
    case 'soft':
      return Math.min(presetIntensity, 0.65);
    case 'medium':
      return Math.max(presetIntensity, 1);
    case 'strong':
      return Math.max(presetIntensity, 1.8);
  }
}

function getRimColor(color: RimLightColor, fallback: number): number {
  switch (color) {
    case 'white':
      return 0xf4fbff;
    case 'blue':
      return 0x38d5ff;
    case 'green':
      return 0x6dff9a;
    default:
      return fallback;
  }
}

function getRimPosition(
  direction: RimLightDirection,
  fallback: [number, number, number],
): [number, number, number] {
  switch (direction) {
    case 'left-back':
      return [-3.2, 2.65, -3.55];
    case 'right-back':
      return [3.2, 2.65, -3.55];
    case 'top-back':
      return [0, 3.65, -3.35];
    default:
      return fallback;
  }
}

function clampScale(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(value, 0), 2);
}

function isLookPresetId(value: unknown): value is LookPresetId {
  return (
    value === 'standard' ||
    value === 'bright' ||
    value === 'front-top' ||
    value === 'neon' ||
    value === 'edge'
  );
}

function isRimLightStrength(value: unknown): value is RimLightStrength {
  return value === 'off' || value === 'soft' || value === 'medium' || value === 'strong';
}

function isRimLightColor(value: unknown): value is RimLightColor {
  return value === 'white' || value === 'blue' || value === 'green';
}

function isRimLightDirection(value: unknown): value is RimLightDirection {
  return value === 'left-back' || value === 'right-back' || value === 'top-back';
}
