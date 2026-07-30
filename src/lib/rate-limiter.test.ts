import { extractUserIdentifier, USER_DAILY_LIMIT, GLOBAL_DAILY_LIMIT } from './rate-limiter';
import { NextRequest } from 'next/server';

function createMockRequest(headers: Record<string, string> = {}, searchParams: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:9002/api/download');
  Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));

  const reqHeaders = new Headers();
  Object.entries(headers).forEach(([k, v]) => reqHeaders.set(k, v));

  return new NextRequest(url.toString(), { headers: reqHeaders });
}

describe('Rate Limiter Tests', () => {
  it('should extract user identifier correctly', () => {
    // 1. x-user-id header
    const req1 = createMockRequest({ 'x-user-id': 'user_123' });
    expect(extractUserIdentifier(req1)).toBe('user_123');

    // 2. Authorization header
    const req2 = createMockRequest({ authorization: 'Bearer token_abc' });
    expect(extractUserIdentifier(req2)).toBe('token_abc');

    // 3. Query param
    const req3 = createMockRequest({}, { userId: 'user_456' });
    expect(extractUserIdentifier(req3)).toBe('user_456');

    // 4. IP fallback
    const req4 = createMockRequest({ 'x-forwarded-for': '192.168.1.1, 10.0.0.1' });
    expect(extractUserIdentifier(req4)).toBe('ip_192.168.1.1');

    // 5. Anonymous fallback
    const req5 = createMockRequest();
    expect(extractUserIdentifier(req5)).toBe('anonymous');
  });

  it('should verify daily limits constants', () => {
    expect(USER_DAILY_LIMIT).toBe(100);
    expect(GLOBAL_DAILY_LIMIT).toBe(1000);
  });
});
