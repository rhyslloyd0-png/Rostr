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

// mode "bot" (default) installs the bot and logs the guild owner in.
// mode "identify" is a plain Discord login for applicants — no bot prompt,
// no server picker — landing them back on returnTo once signed in.
export function loginUrl({ mode = "bot", returnTo } = {}) {
  const params = new URLSearchParams({ mode });
  if (returnTo) params.set("returnTo", returnTo);
  return `${API_BASE_URL}/auth/discord/login?${params.toString()}`;
}
