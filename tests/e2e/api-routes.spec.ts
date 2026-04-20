/**
 * API route tests -- verify endpoints return correct response shapes.
 */

import { test, expect } from '@playwright/test';

test.describe('API routes', () => {
  test('GET /api/health returns status field', async ({ request }) => {
    test.setTimeout(10_000);

    const res = await request.get('/api/health');
    expect(res.status()).toBeLessThan(400);

    const body = await res.json();
    expect(body).toHaveProperty('status');
    expect(['ok', 'degraded', 'down']).toContain(body.status);
    expect(body).toHaveProperty('dependencies');
  });

  test('GET /api/settings returns model config fields', async ({ request }) => {
    test.setTimeout(10_000);

    const res = await request.get('/api/settings');
    expect(res.ok()).toBe(true);

    const body = await res.json();
    expect(body).toHaveProperty('summaryModel');
    expect(body).toHaveProperty('batchSpeechModel');
    expect(body).toHaveProperty('streamingSpeechModel');
  });

  test('GET /api/models returns provider-grouped object', async ({ request }) => {
    test.setTimeout(10_000);

    const res = await request.get('/api/models');
    expect(res.ok()).toBe(true);

    const body = await res.json();
    // Response is an object keyed by provider, each value is an array of models
    expect(typeof body).toBe('object');
    expect(body).not.toBeNull();

    // At least one provider should have models
    const providers = Object.keys(body);
    expect(providers.length).toBeGreaterThan(0);

    // Each provider's value should be an array
    for (const provider of providers) {
      expect(Array.isArray(body[provider])).toBe(true);
    }
  });

  test('GET /api/meetings returns an array', async ({ request }) => {
    test.setTimeout(10_000);

    const res = await request.get('/api/meetings');
    expect(res.ok()).toBe(true);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('GET /api/observability/health returns sinks object', async ({ request }) => {
    test.setTimeout(10_000);

    const res = await request.get('/api/observability/health');
    expect(res.ok()).toBe(true);

    const body = await res.json();
    expect(body).toHaveProperty('sinks');
    expect(body.sinks).toHaveProperty('stdout');
    expect(body.sinks.stdout).toHaveProperty('configured', true);
    expect(body.sinks.stdout).toHaveProperty('status', 'ok');
  });
});
