export type RelayAssetKind = 'vrm' | 'vrma';

export interface RelayAssetDescriptor {
  id: string;
  kind: RelayAssetKind;
  name: string;
  url: string;
  duration?: number;
}

export interface RelayAvatarTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotationY: number;
}

export interface RelayExpressionState {
  blinkLeft?: number;
  blinkRight?: number;
  aa?: number;
  ih?: number;
  ou?: number;
  ee?: number;
  oh?: number;
  happy?: number;
  surprised?: number;
}

export interface RelayPoseState {
  head?: {
    enabled: boolean;
    pitch: number;
    yaw: number;
    roll: number;
  };
  upperBody?: {
    enabled: boolean;
    chestYaw: number;
    chestRoll: number;
    neckYaw: number;
    neckRoll: number;
    leftUpperArmRoll: number;
    rightUpperArmRoll: number;
  };
  hands?: {
    left: RelayHandTarget | null;
    right: RelayHandTarget | null;
  };
}

export interface RelayFingerCurl {
  thumb: number;
  index: number;
  middle: number;
  ring: number;
  little: number;
}

export interface RelayHandTarget {
  fingers: RelayFingerCurl;
  wristPitch: number;
  wristYaw: number;
  wristRoll: number;
}

export interface RelayRenderState {
  avatarTransform: RelayAvatarTransform;
  expressions: RelayExpressionState;
  pose: RelayPoseState;
  vrmaLoop: boolean;
}

export type RelayMessage =
  | {
      type: 'hello';
      role: 'control' | 'render';
    }
  | {
      type: 'asset';
      asset: RelayAssetDescriptor;
    }
  | {
      type: 'vrmaSlots';
      assets: RelayAssetDescriptor[];
      selectedIndex: number;
    }
  | {
      type: 'state';
      state: RelayRenderState;
    }
  | {
      type: 'vrmaCommand';
      command: 'play' | 'stop' | 'select';
      selectedIndex: number;
      loop: boolean;
    };

export function createRelayWebSocketUrl(location: Location): string {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/relay/ws`;
}

export function createRelayAssetUploadUrl(location: Location, kind: RelayAssetKind): string {
  return `/relay/assets?kind=${encodeURIComponent(kind)}&origin=${encodeURIComponent(
    location.pathname + location.search,
  )}`;
}
