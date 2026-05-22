import type { ResolvedLookLights } from '../look/look-presets';
import type { RelayAvatarTransform } from './messages';

export function smoothRelayAvatarTransform(
  previous: RelayAvatarTransform,
  target: RelayAvatarTransform,
  amount: number,
): RelayAvatarTransform {
  const nextAmount = clamp01(amount);

  return {
    offsetX: lerp(previous.offsetX, target.offsetX, nextAmount),
    offsetY: lerp(previous.offsetY, target.offsetY, nextAmount),
    scale: lerp(previous.scale, target.scale, nextAmount),
    rotationY: lerpDegrees(previous.rotationY, target.rotationY, nextAmount),
  };
}

export function smoothResolvedLookLights(
  previous: ResolvedLookLights,
  target: ResolvedLookLights,
  amount: number,
): ResolvedLookLights {
  const nextAmount = clamp01(amount);

  return {
    ...target,
    keyColor: lerpHexColor(previous.keyColor, target.keyColor, nextAmount),
    keyIntensity: lerp(previous.keyIntensity, target.keyIntensity, nextAmount),
    keyPosition: lerpTuple(previous.keyPosition, target.keyPosition, nextAmount),
    fillColor: lerpHexColor(previous.fillColor, target.fillColor, nextAmount),
    fillIntensity: lerp(previous.fillIntensity, target.fillIntensity, nextAmount),
    fillPosition: lerpTuple(previous.fillPosition, target.fillPosition, nextAmount),
    rimColor: lerpHexColor(previous.rimColor, target.rimColor, nextAmount),
    rimIntensity: lerp(previous.rimIntensity, target.rimIntensity, nextAmount),
    rimPosition: lerpTuple(previous.rimPosition, target.rimPosition, nextAmount),
    exposure: lerp(previous.exposure, target.exposure, nextAmount),
  };
}

function lerp(previous: number, target: number, amount: number): number {
  return previous + (target - previous) * amount;
}

function lerpDegrees(previous: number, target: number, amount: number): number {
  return normalizeDegrees(previous + shortestDegreeDelta(previous, target) * amount);
}

function shortestDegreeDelta(previous: number, target: number): number {
  return ((((target - previous + 180) % 360) + 360) % 360) - 180;
}

function normalizeDegrees(value: number): number {
  return ((((value + 180) % 360) + 360) % 360) - 180;
}

function lerpTuple(
  previous: [number, number, number],
  target: [number, number, number],
  amount: number,
): [number, number, number] {
  return [
    lerp(previous[0], target[0], amount),
    lerp(previous[1], target[1], amount),
    lerp(previous[2], target[2], amount),
  ];
}

function lerpHexColor(previous: number, target: number, amount: number): number {
  const previousRgb = hexToRgb(previous);
  const targetRgb = hexToRgb(target);

  return rgbToHex(
    Math.round(lerp(previousRgb[0], targetRgb[0], amount)),
    Math.round(lerp(previousRgb[1], targetRgb[1], amount)),
    Math.round(lerp(previousRgb[2], targetRgb[2], amount)),
  );
}

function hexToRgb(value: number): [number, number, number] {
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex(red: number, green: number, blue: number): number {
  return (clampByte(red) << 16) | (clampByte(green) << 8) | clampByte(blue);
}

function clampByte(value: number): number {
  return Math.min(Math.max(value, 0), 255);
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}
