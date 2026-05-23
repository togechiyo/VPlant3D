export interface ObsQueryOptions {
  obsMode: boolean;
  controlMode: boolean;
  transparent: boolean;
  debug?: boolean;
}

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off', '']);

export function parseBooleanParam(value: string | null): boolean {
  if (value === null) {
    return false;
  }

  const normalized = value.trim().toLowerCase();

  if (TRUE_VALUES.has(normalized)) {
    return true;
  }

  if (FALSE_VALUES.has(normalized)) {
    return false;
  }

  return false;
}

export function parseObsQuery(input: string | URLSearchParams): ObsQueryOptions {
  const params =
    typeof input === 'string'
      ? new URLSearchParams(input.startsWith('?') ? input.slice(1) : input)
      : input;

  return {
    obsMode: parseBooleanParam(params.get('obs')),
    controlMode: parseBooleanParam(params.get('control')),
    transparent: parseBooleanParam(params.get('transparent')),
    debug: parseBooleanParam(params.get('debug')),
  };
}
