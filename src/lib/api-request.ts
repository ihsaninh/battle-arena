type BattleRequestParseMode = 'json' | 'void';

export interface BattleRequestOptions
  extends Omit<RequestInit, 'body' | 'headers' | 'method'> {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  parseAs?: BattleRequestParseMode;
  fallbackMessage?: string;
}

function toRequestBody(body: unknown): BodyInit | null {
  if (body === undefined || body === null) {
    return null;
  }

  if (typeof body === 'string' || body instanceof FormData) {
    return body;
  }

  return JSON.stringify(body);
}

const API_BASE = '/api/battle';

export async function battleRequest<TResponse = void>(
  path: string,
  options: BattleRequestOptions = {}
): Promise<TResponse> {
  const {
    method = 'GET',
    body,
    headers,
    parseAs = 'json',
    fallbackMessage,
    credentials = 'include',
    ...rest
  } = options;

  const parseMode: BattleRequestParseMode = parseAs ?? 'json';

  const hasJsonBody =
    body !== undefined && body !== null && !(body instanceof FormData);

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials,
    ...rest,
    headers: {
      ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: toRequestBody(body) ?? undefined,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const shouldParseJson =
    contentType.includes('application/json') || contentType.includes('json');

  let parsedBody: unknown = null;
  if (!response.ok || (parseMode === 'json' && shouldParseJson)) {
    try {
      parsedBody = await response.json();
    } catch {
      parsedBody = null;
    }
  }

  if (!response.ok) {
    if (parsedBody && typeof parsedBody === 'object' && 'error' in parsedBody) {
      throw parsedBody;
    }

    const message =
      (parsedBody as Record<string, unknown>)?.message?.toString() ||
      fallbackMessage ||
      `Request gagal (${response.status})`;

    const error = new Error(message) as Error & {
      status?: number;
      code?: string;
      details?: unknown;
    };

    error.status = response.status;

    if (
      parsedBody &&
      typeof parsedBody === 'object' &&
      'code' in parsedBody &&
      typeof (parsedBody as { code?: string }).code === 'string'
    ) {
      error.code = (parsedBody as { code: string }).code;
    }

    error.details = parsedBody;

    throw error;
  }

  if (parseMode === 'void') {
    return undefined as TResponse;
  }

  if (parsedBody !== null) {
    return parsedBody as TResponse;
  }

  if (shouldParseJson) {
    return (await response.json()) as TResponse;
  }

  return undefined as TResponse;
}
