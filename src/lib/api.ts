/**
 * api.ts — fetch wrapper that auto-refreshes JWT when 401 is received.
 * Usage: import { apiFetch } from '@/lib/api'; then use it like fetch().
 */

let isRefreshing = false;
let refreshQueue: Array<(ok: boolean) => void> = [];

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let res = await fetch(input, init);

  if (res.status !== 401) return res;

  // Try token refresh (queue concurrent requests while refreshing)
  if (isRefreshing) {
    await new Promise<boolean>(resolve => refreshQueue.push(resolve));
    return fetch(input, init);
  }

  isRefreshing = true;
  const refreshed = await doRefresh();
  isRefreshing = false;

  // Resolve all queued callers
  refreshQueue.forEach(cb => cb(refreshed));
  refreshQueue = [];

  if (!refreshed) {
    // Session truly expired — redirect to login
    window.location.href = '/login';
    return res;
  }

  // Retry the original request with the new cookie
  res = await fetch(input, init);
  return res;
}
