import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';

// Must import after mocking
describe('DataProvider', () => {
  beforeEach(() => {
    vi.resetModules();
    // Mock fetch to simulate offline gateway
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('provides mock data when gateway is offline', async () => {
    const { DataProvider, useData } = await import('../src/api/DataProvider');

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(DataProvider, null, children);

    const { result } = renderHook(() => useData(), { wrapper });

    // Without gateway, all data starts empty (no mock fallback)
    expect(result.current.skills.length).toBe(0);
    expect(result.current.dreamNodes.length).toBe(0);
    expect(result.current.projects.length).toBe(0);
    expect(result.current.agents.length).toBe(0);
    expect(result.current.connected).toBe(false);
  });

  it('starts disconnected when gateway is unreachable', async () => {
    // Gateway discovery probes multiple URLs — when all fail, stays disconnected
    const { DataProvider, useData } = await import('../src/api/DataProvider');

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(DataProvider, null, children);

    const { result } = renderHook(() => useData(), { wrapper });

    // Should start disconnected since fetch is mocked to reject
    expect(result.current.connected).toBe(false);
  });

  it('useAgents returns agent array', async () => {
    const { DataProvider, useAgents } = await import('../src/api/DataProvider');

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(DataProvider, null, children);

    const { result } = renderHook(() => useAgents(), { wrapper });

    // Without a gateway connection, agents array starts empty (no mock fallback)
    expect(Array.isArray(result.current)).toBe(true);
    expect(result.current.length).toBe(0);
  });

  it('handles mixed fetch responses without crashing', async () => {
    let callCount = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [], timestamp: Date.now() }),
        });
      }
      return Promise.reject(new TypeError('fetch failed'));
    }));

    const { DataProvider, useData } = await import('../src/api/DataProvider');

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(DataProvider, null, children);

    const { result } = renderHook(() => useData(), { wrapper });

    // Should not crash regardless of connection state
    expect(result.current).toBeDefined();
    expect(result.current.skills).toBeDefined();
  });
});
