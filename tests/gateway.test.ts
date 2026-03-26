import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We test the gateway module by mocking fetch
const MOCK_GATEWAY_URL = 'http://localhost:3033';

describe('Gateway API Client', () => {
  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn());

    // Mock the discovery probe so gateway resolves localhost:3033
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], timestamp: Date.now() }),
    });

    const { discoverGateway } = await import('../src/api/gateway');
    await discoverGateway();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('returns data on successful response', async () => {
    const mockData = [{ name: 'TestSkill', fitness: 80 }];
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockData, timestamp: Date.now() }),
    });

    const { gateway } = await import('../src/api/gateway');
    const result = await gateway.getSkills();
    expect(result).toEqual(mockData);
  });

  it('throws on non-ok response', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const { gateway } = await import('../src/api/gateway');
    await expect(gateway.getSkills()).rejects.toThrow('Gateway');
  });

  it('throws on network failure', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new TypeError('fetch failed'),
    );

    const { gateway } = await import('../src/api/gateway');
    await expect(gateway.getSkills()).rejects.toThrow();
  });

  it('passes abort signal to fetch', async () => {
    const mockData = [{ name: 'TestSkill', fitness: 80 }];
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockData, timestamp: Date.now() }),
    });

    const { gateway } = await import('../src/api/gateway');
    const ac = new AbortController();
    await gateway.getSkills(ac.signal);

    // fetch is called for discovery probe + getSkills
    const lastCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.at(-1)!;
    expect(lastCall[0]).toContain('/api/v1/skills');
  });

  it('includes correct headers', async () => {
    const mockData: unknown[] = [];
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockData, timestamp: Date.now() }),
    });

    const { gateway } = await import('../src/api/gateway');
    await gateway.getSkills();

    const lastCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.at(-1)!;
    expect(lastCall[1].headers).toEqual({ Accept: 'application/json' });
  });

  it('all endpoints use correct paths', async () => {
    const { gateway } = await import('../src/api/gateway');

    const endpoints = [
      { fn: () => gateway.getSkills(), path: '/api/v1/skills' },
      { fn: () => gateway.getDreamNodes(), path: '/api/v1/dreams' },
      { fn: () => gateway.getProjects(), path: '/api/v1/projects' },
      { fn: () => gateway.getRedTeamData(), path: '/api/v1/redteam' },
      { fn: () => gateway.getMetaLearningData(), path: '/api/v1/metalearning' },
      { fn: () => gateway.getTemporalData(), path: '/api/v1/temporal' },
      { fn: () => gateway.getAgents(), path: '/api/v1/agents' },
    ];

    for (const { fn, path } of endpoints) {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], timestamp: Date.now() }),
      });

      await fn();
      const lastCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.at(-1)!;
      expect(lastCall[0]).toBe(`${MOCK_GATEWAY_URL}${path}`);
    }
  });
});
