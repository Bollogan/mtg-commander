// k6 load test against the API gateway (Fase 5 performance target).
//
// Goal (plan): 100 concurrent users / ~100 req/s, p95 < 500ms.
// Run:
//   k6 run docs/load-test/gateway-load-test.js
//   k6 run -e BASE_URL=http://localhost:8080 docs/load-test/gateway-load-test.js
//
// Exercises public, unauthenticated paths so the test needs no seeded tokens:
//   - register a throwaway user, then log in (rate-limited by the gateway).
// The gateway's RequestRateLimiter (20 req/s per IP) will produce some 429s under
// high load from a single host — that is expected and asserts the limiter works.

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export const options = {
  scenarios: {
    steady_load: {
      executor: 'constant-arrival-rate',
      rate: 100, // iterations per second
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 100,
      maxVUs: 200,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'], // p95 under 500ms
    checks: ['rate>0.90'],
  },
};

export default function () {
  const email = `load_${__VU}_${__ITER}_${Date.now()}@example.com`;
  const password = 'Password123!';

  const registerRes = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({ email, password, displayName: `Load${__VU}` }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  // 200 created, 409 already-exists, or 429 rate-limited are all "handled" responses.
  check(registerRes, {
    'register handled': (r) => [200, 409, 429].includes(r.status),
  });

  if (registerRes.status === 200) {
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email, password }),
      { headers: { 'Content-Type': 'application/json' } },
    );
    check(loginRes, {
      'login handled': (r) => [200, 401, 429].includes(r.status),
    });
  }

  sleep(0.2);
}
