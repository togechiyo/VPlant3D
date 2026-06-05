export type MediaInputDeviceKind = 'audioinput' | 'videoinput';

export interface NormalizedMediaInputDevice {
  deviceId: string;
  groupId: string;
  kind: MediaInputDeviceKind;
  label: string;
  displayName: string;
}

export interface NormalizedMediaInputDevices {
  audioInputs: NormalizedMediaInputDevice[];
  videoInputs: NormalizedMediaInputDevice[];
  hasHiddenLabels: boolean;
}

export type MediaDeviceLike = Pick<MediaDeviceInfo, 'deviceId' | 'groupId' | 'kind' | 'label'>;

export function normalizeMediaInputDevices(
  devices: readonly MediaDeviceLike[],
): NormalizedMediaInputDevices {
  const audioInputs = normalizeDevicesForKind(devices, 'audioinput', 'マイク');
  const videoInputs = normalizeDevicesForKind(devices, 'videoinput', 'カメラ');

  return {
    audioInputs,
    videoInputs,
    hasHiddenLabels: [...audioInputs, ...videoInputs].some((device) => device.label.length === 0),
  };
}

export function resolveSelectedDeviceId(
  devices: readonly NormalizedMediaInputDevice[],
  savedDeviceId: string,
): string {
  if (!savedDeviceId) {
    return '';
  }

  return devices.some((device) => device.deviceId === savedDeviceId) ? savedDeviceId : '';
}

export async function listMediaInputDevices(
  mediaDevices: Pick<MediaDevices, 'enumerateDevices'> | undefined = navigator.mediaDevices,
): Promise<NormalizedMediaInputDevices> {
  if (!mediaDevices?.enumerateDevices) {
    return {
      audioInputs: [],
      videoInputs: [],
      hasHiddenLabels: true,
    };
  }

  return normalizeMediaInputDevices(await mediaDevices.enumerateDevices());
}

export function createAudioInputConstraints(deviceId: string): MediaStreamConstraints {
  return {
    audio: deviceId
      ? {
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      : {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
    video: false,
  };
}

export function createVideoInputConstraints(deviceId: string): MediaStreamConstraints {
  return {
    video: deviceId
      ? {
          deviceId: { exact: deviceId },
          width: { ideal: 640 },
          height: { ideal: 360 },
          facingMode: 'user',
        }
      : {
          width: { ideal: 640 },
          height: { ideal: 360 },
          facingMode: 'user',
        },
    audio: false,
  };
}

function normalizeDevicesForKind(
  devices: readonly MediaDeviceLike[],
  kind: MediaInputDeviceKind,
  fallbackLabel: string,
): NormalizedMediaInputDevice[] {
  let index = 0;

  return devices
    .filter((device): device is MediaDeviceLike & { kind: MediaInputDeviceKind } => device.kind === kind)
    .map((device) => {
      index += 1;
      const label = device.label.trim();
      return {
        deviceId: device.deviceId,
        groupId: device.groupId,
        kind,
        label,
        displayName: label || `${fallbackLabel} ${index}`,
      };
    });
}
