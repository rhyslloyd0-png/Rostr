const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Every call includes credentials so the rostr_session cookie the API set
// on OAuth callback rides along automatically — no token to manage by hand.
export async function apiFetch(path, options = {}) {
  const resp = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(data.message || data.error || `Request failed (${resp.status})`);
    err.status = resp.status;
    err.body = data;
    throw err;
  }
  return data;
}

export function loginUrl() {
  return `${API_BASE_URL}/auth/discord/login`;
}
