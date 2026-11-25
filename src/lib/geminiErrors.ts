export type GeminiErrorCode =
  | 'RESOURCE_EXHAUSTED'
  | 'UNAVAILABLE'
  | 'INVALID_ARGUMENT'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'MISSING_API_KEY'
  | 'INTERNAL';

export interface ClassifiedGeminiError {
  httpStatus: number;
  code: GeminiErrorCode;
  message: string;
  quotaExceeded: boolean;
  retryable: boolean;
}

interface RawGeminiErrorBody {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

function tryExtractNestedError(rawMessage: string): RawGeminiErrorBody['error'] | null {
  const trimmed = rawMessage.trim();
  const jsonStart = trimmed.indexOf('{');
  if (jsonStart === -1) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(jsonStart)) as RawGeminiErrorBody;
    return parsed?.error ?? null;
  } catch {
    return null;
  }
}

function mapStatusToCode(httpStatus: number, rawStatus?: string): GeminiErrorCode {
  switch (rawStatus) {
    case 'RESOURCE_EXHAUSTED':
    case 'UNAVAILABLE':
    case 'INVALID_ARGUMENT':
    case 'PERMISSION_DENIED':
    case 'NOT_FOUND':
      return rawStatus;
    default:
      break;
  }

  switch (httpStatus) {
    case 429:
      return 'RESOURCE_EXHAUSTED';
    case 503:
      return 'UNAVAILABLE';
    case 400:
      return 'INVALID_ARGUMENT';
    case 403:
      return 'PERMISSION_DENIED';
    case 404:
      return 'NOT_FOUND';
    default:
      return 'INTERNAL';
  }
}

export function classifyGeminiError(error: unknown): ClassifiedGeminiError {
  const rawMessage = error instanceof Error ? error.message : String(error ?? 'Gemini request failed.');

  if (rawMessage.includes('GEMINI_API_KEY is not configured')) {
    return {
      httpStatus: 503,
      code: 'MISSING_API_KEY',
      message: 'GEMINI_API_KEY is not configured on the server.',
      quotaExceeded: false,
      retryable: false,
    };
  }

  const objectStatus =
    typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status?: unknown }).status)
      : NaN;

  const nested = tryExtractNestedError(rawMessage);
  const nestedCode = typeof nested?.code === 'number' ? nested.code : NaN;

  let httpStatus = Number.isFinite(nestedCode)
    ? nestedCode
    : Number.isFinite(objectStatus)
      ? objectStatus
      : 500;

  if (httpStatus < 400 || httpStatus > 599) {
    if (rawMessage.includes('RESOURCE_EXHAUSTED') || rawMessage.includes('429')) {
      httpStatus = 429;
    } else if (rawMessage.includes('UNAVAILABLE') || rawMessage.includes('503')) {
      httpStatus = 503;
    } else {
      httpStatus = 500;
    }
  }

  const code = mapStatusToCode(httpStatus, nested?.status);
  const cleanMessage =
    nested?.message?.trim() ||
    (code === 'RESOURCE_EXHAUSTED'
      ? 'Gemini API quota or rate limit exceeded. Please wait briefly, use a billing-enabled API key in Settings > Secrets, or use the Offline KB mode.'
      : code === 'UNAVAILABLE'
        ? 'The Gemini model is temporarily busy. Please try again in a moment.'
        : rawMessage);

  const quotaExceeded = httpStatus === 429 || code === 'RESOURCE_EXHAUSTED';
  const retryable = quotaExceeded || httpStatus === 503 || code === 'UNAVAILABLE';

  return {
    httpStatus,
    code,
    message: cleanMessage,
    quotaExceeded,
    retryable,
  };
}

export async function withExponentialBackoff<T>(
  operation: () => Promise<T>,
  options: { maxRetries?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 1;
  const baseDelayMs = options.baseDelayMs ?? 350;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const classified = classifyGeminiError(error);
      if (!classified.retryable || attempt >= maxRetries) {
        throw error;
      }
      const delay = baseDelayMs * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
