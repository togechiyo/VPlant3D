import { describe, expect, it } from 'vitest';

import {
  createRelayAssetUploadUrl,
  createRelayWebSocketUrl,
} from '../src/relay/messages';

describe('relay url helpers', () => {
  it('builds a ws URL for localhost control/render pages', () => {
    const location = new URL('http://127.0.0.1:5173/?control=1') as unknown as Location;

    expect(createRelayWebSocketUrl(location)).toBe('ws://127.0.0.1:5173/relay/ws');
  });

  it('builds a wss URL for https pages', () => {
    const location = new URL('https://example.test/?obs=1') as unknown as Location;

    expect(createRelayWebSocketUrl(location)).toBe('wss://example.test/relay/ws');
  });

  it('keeps upload URLs same-origin and includes the asset kind', () => {
    const location = new URL('http://127.0.0.1:5173/?control=1') as unknown as Location;

    expect(createRelayAssetUploadUrl(location, 'vrm')).toBe(
      '/relay/assets?kind=vrm&origin=%2F%3Fcontrol%3D1',
    );
  });
});
