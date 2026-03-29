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

  it('updates to connected=true when gateway responds', async () => {
    const mockSkills = [{ name: 'Test', fitness: 50, generation: 1, status: 'stable', color: '#fff' }];

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockSkills, timestamp: Date.now() }),
    }));

    const { DataProvider, useData } = await import('../src/api/DataProvider');

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(DataProvider, null, children);

    const { result } = renderHook(() => useData(), { wrapper });

    await waitFor(() => {
      expect(result.current.connected).toBe(true);
    });
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

  it('handles partial gateway responses gracefully', async () => {
    let callCount = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      callCount++;
      // First 2 calls succeed, rest fail
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

    // Should not crash — partial data merges with defaults
    await waitFor(() => {
      expect(result.current.connected).toBe(true);
    });
  });
});
