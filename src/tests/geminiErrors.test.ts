import { describe, expect, it, vi } from 'vitest';

import { classifyGeminiError, withExponentialBackoff } from '../lib/geminiErrors';

describe('classifyGeminiError', () => {
  it('parses embedded JSON RESOURCE_EXHAUSTED (429) errors from @google/genai ApiError', () => {
    const raw = new Error(
      'got status: 429 Too Many Requests. {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details.","status":"RESOURCE_EXHAUSTED"}}',
    );
    const classified = classifyGeminiError(raw);
    expect(classified.httpStatus).toBe(429);
    expect(classified.code).toBe('RESOURCE_EXHAUSTED');
    expect(classified.quotaExceeded).toBe(true);
    expect(classified.retryable).toBe(true);
    expect(classified.message).toContain('exceeded your current quota');
  });

  it('parses 503 UNAVAILABLE errors as retryable service unavailability', () => {
    const raw = new Error(
      '{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}',
    );
    const classified = classifyGeminiError(raw);
    expect(classified.httpStatus).toBe(503);
    expect(classified.code).toBe('UNAVAILABLE');
    expect(classified.quotaExceeded).toBe(false);
    expect(classified.retryable).toBe(true);
  });

  it('classifies missing GEMINI_API_KEY as 503 non-retryable', () => {
    const classified = classifyGeminiError(new Error('GEMINI_API_KEY is not configured on the server.'));
    expect(classified.httpStatus).toBe(503);
    expect(classified.code).toBe('MISSING_API_KEY');
    expect(classified.retryable).toBe(false);
  });

  it('classifies 400 INVALID_ARGUMENT as non-retryable client error', () => {
    const classified = classifyGeminiError(
      new Error('{"error":{"code":400,"message":"Invalid JSON payload received.","status":"INVALID_ARGUMENT"}}'),
    );
    expect(classified.httpStatus).toBe(400);
    expect(classified.code).toBe('INVALID_ARGUMENT');
    expect(classified.retryable).toBe(false);
  });
});

describe('withExponentialBackoff', () => {
  it('retries retryable errors once and succeeds if the next attempt passes', async () => {
    const op = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(
        new Error('{"error":{"code":503,"message":"Busy","status":"UNAVAILABLE"}}'),
      )
      .mockResolvedValueOnce('ok');

    const result = await withExponentialBackoff(op, { maxRetries: 1, baseDelayMs: 5 });
    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-retryable errors', async () => {
    const op = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(
        new Error('{"error":{"code":400,"message":"Bad request","status":"INVALID_ARGUMENT"}}'),
      );

    await expect(withExponentialBackoff(op, { maxRetries: 2, baseDelayMs: 5 })).rejects.toThrow();
    expect(op).toHaveBeenCalledTimes(1);
  });
});
