import { describe, expect, it } from 'vitest';

import { createObsRenderUrls } from '../src/obs/render-url';

describe('OBS render URL helpers', () => {
  it('creates 127.0.0.1, localhost, debug, and control URLs', () => {
    const urls = createObsRenderUrls({
      location: {
        protocol: 'http:',
        hostname: '127.0.0.1',
        port: '5173',
      },
      transparent: true,
    });

    expect(urls.recommendedRenderUrl).toBe('http://127.0.0.1:5173/?obs=1&transparent=1');
    expect(urls.localhostRenderUrl).toBe('http://localhost:5173/?obs=1&transparent=1');
    expect(urls.debugRenderUrl).toBe(
      'http://127.0.0.1:5173/?obs=1&transparent=1&debug=1',
    );
    expect(urls.controlUrl).toBe('http://127.0.0.1:5173/?control=1');
  });

  it('can generate an opaque render URL for debugging backgrounds', () => {
    const urls = createObsRenderUrls({
      location: {
        protocol: 'http:',
        hostname: 'localhost',
        port: '5173',
      },
      transparent: false,
    });

    expect(urls.recommendedRenderUrl).toBe('http://127.0.0.1:5173/?obs=1');
    expect(urls.debugRenderUrl).toBe('http://127.0.0.1:5173/?obs=1&debug=1');
    expect(urls.controlUrl).toBe('http://localhost:5173/?control=1');
  });
});
