import {
  normalizeAppConfig,
  serializeAppConfig,
  type AppConfigV1,
} from './app-config';

export const appConfigStorageKey = 'vplant3d.config.v1';

export type AppConfigStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function readAppConfigFromStorage(storage: AppConfigStorage): AppConfigV1 | null {
  const rawValue = storage.getItem(appConfigStorageKey);
  if (!rawValue) {
    return null;
  }

  try {
    return normalizeAppConfig(JSON.parse(rawValue));
  } catch {
    storage.removeItem(appConfigStorageKey);
    return null;
  }
}

export function writeAppConfigToStorage(storage: AppConfigStorage, config: AppConfigV1): void {
  storage.setItem(appConfigStorageKey, serializeAppConfig(config));
}
