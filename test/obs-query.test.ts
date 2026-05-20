import { describe, expect, it } from 'vitest';

import { parseBooleanParam, parseObsQuery } from '../src/obs/query';

describe('parseBooleanParam', () => {
  it('treats explicit true-like values as true', () => {
    expect(parseBooleanParam('1')).toBe(true);
    expect(parseBooleanParam('true')).toBe(true);
    expect(parseBooleanParam('yes')).toBe(true);
    expect(parseBooleanParam('on')).toBe(true);
  });

  it('treats missing, empty, false-like, and unknown values as false', () => {
    expect(parseBooleanParam(null)).toBe(false);
    expect(parseBooleanParam('')).toBe(false);
    expect(parseBooleanParam('0')).toBe(false);
    expect(parseBooleanParam('false')).toBe(false);
    expect(parseBooleanParam('maybe')).toBe(false);
  });
});

describe('parseObsQuery', () => {
  it('enables OBS mode with ?obs=1', () => {
    expect(parseObsQuery('?obs=1')).toEqual({
      obsMode: true,
      transparent: false,
    });
  });

  it('enables transparent mode with ?transparent=1', () => {
    expect(parseObsQuery('?transparent=1')).toEqual({
      obsMode: false,
      transparent: true,
    });
  });

  it('supports URLSearchParams input', () => {
    const params = new URLSearchParams('obs=true&transparent=true');

    expect(parseObsQuery(params)).toEqual({
      obsMode: true,
      transparent: true,
    });
  });

  it('ignores unknown parameters', () => {
    expect(parseObsQuery('?obs=1&foo=bar')).toEqual({
      obsMode: true,
      transparent: false,
    });
  });
});
