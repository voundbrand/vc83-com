interface HeadersLike {
  get: (name: string) => string | null;
}

export function getRequestHostFromHeaders(headers: HeadersLike): string | null {
  return headers.get("x-forwarded-host") || headers.get("host");
}

export function getRequestHostFromRequest(request: Request): string | null {
  return getRequestHostFromHeaders(request.headers);
}
