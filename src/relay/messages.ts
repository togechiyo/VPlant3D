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

export interface RelayLookSettings {
  preset: 'standard' | 'bright' | 'front-top' | 'neon' | 'edge';
  keyIntensityScale: number;
  fillIntensityScale: number;
  rimStrength: 'off' | 'soft' | 'medium' | 'strong';
  rimColor: 'white' | 'blue' | 'green';
  rimDirection: 'left-back' | 'right-back' | 'top-back';
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
    leftLowerArmRoll: number;
    rightLowerArmRoll: number;
  };
  hands?: {
    left: RelayHandTarget | null;
    right: RelayHandTarget | null;
  };
  arms?: {
    left: RelayArmIkTarget | null;
    right: RelayArmIkTarget | null;
  };
}

export interface RelayVector3 {
  x: number;
  y: number;
  z: number;
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

export interface RelayArmIkTarget {
  enabled: boolean;
  side: 'left' | 'right';
  shoulder: RelayVector3;
  elbow: RelayVector3;
  wrist: RelayVector3;
  pole: RelayVector3;
  upperArmRaise: number;
  upperArmSpread: number;
  lowerArmRaise: number;
  lowerArmSpread: number;
  lowerArmBend: number;
  wristHint: number;
  confidence: number;
}

export interface RelayRenderState {
  avatarTransform: RelayAvatarTransform;
  look: RelayLookSettings;
  expressions: RelayExpressionState;
  pose: RelayPoseState;
  vrmaLoop: boolean;
}

export interface RelayStaticState {
  avatarTransform: RelayAvatarTransform;
  look: RelayLookSettings;
  vrmaLoop: boolean;
}

export interface RelayMotionState {
  sequence: number;
  sentAt: number;
  expressions: RelayExpressionState;
  pose: RelayPoseState;
}

export interface RelayRuntimeState {
  sequence: number;
  sentAt: number;
  expressions: RelayExpressionState;
  pose: RelayPoseState;
}

export interface RelayExpressionSyncState {
  sequence: number;
  sentAt: number;
  expressions: RelayExpressionState;
}

export interface RelayDebugSample {
  role: 'render';
  sentAt: number;
  runtimeSequence: number;
  runtimeAgeMs: number;
  expressions: {
    rx: RelayExpressionState;
    target: RelayExpressionState;
    set: RelayExpressionState;
    afterUpdate: RelayExpressionState;
  };
  pose: RelayPoseState;
  dropped: {
    runtime: number;
    motion: number;
    expression: number;
  };
  bufferedAmount: number;
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
      type: 'staticState';
      state: RelayStaticState;
    }
  | {
      type: 'motionState';
      state: RelayMotionState;
    }
  | {
      type: 'runtimeState';
      state: RelayRuntimeState;
    }
  | {
      type: 'expressionState';
      state: RelayExpressionSyncState;
    }
  | {
      type: 'debugSample';
      sample: RelayDebugSample;
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
