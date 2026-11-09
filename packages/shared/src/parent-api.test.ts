import { describe, expect, it } from 'vitest';
import {
  apiFailureFromResponse,
  assertDeviceApiBaseUrl,
  classifyFetchError,
} from './parent-api.js';

describe('device API address', () => {
  it('accepts a LAN address and rejects localhost', () => {
    expect(assertDeviceApiBaseUrl('http://192.168.1.24:3001/')).toBe('http://192.168.1.24:3001');
    expect(() => assertDeviceApiBaseUrl('http://localhost:3001')).toThrow('LOCALHOST_API_URL');
    expect(() => assertDeviceApiBaseUrl('http://127.0.0.1:3001')).toThrow('LOCALHOST_API_URL');
    expect(() => assertDeviceApiBaseUrl(undefined)).toThrow('MISSING_API_URL');
  });
});

describe('API failures', () => {
  it('classifies timeouts and network failures', () => {
    expect(classifyFetchError(Object.assign(new Error('aborted'), { name: 'AbortError' })).code).toBe(
      'TIMEOUT',
    );
    expect(classifyFetchError(new TypeError('fetch failed')).code).toBe('NETWORK');
  });

  it('reads a duplicate pickup response without inventing a status', () => {
    expect(
      apiFailureFromResponse(409, {
        code: 'DUPLICATE_PICKUP',
        message: 'already active',
        requestId: '6d9c0c3e-4e2a-4c1b-9d2a-0c5b8a7e6f11',
      }),
    ).toEqual({
      code: 'DUPLICATE_PICKUP',
      message: 'already active',
      requestId: '6d9c0c3e-4e2a-4c1b-9d2a-0c5b8a7e6f11',
    });
  });
});
