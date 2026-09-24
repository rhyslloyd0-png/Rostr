// Proxies /api/* to the real backend so the browser only ever talks to this
// app's own origin. Without this, the session cookie set by the API
// (a different onrender.com subdomain) is a third-party cookie from the
// browser's perspective — Brave, Safari, and Firefox's tracking protections
// block those outright even with SameSite=None; Secure set correctly, which
// is why login kept completing on the backend but the frontend still saw
// "Not logged in". Routing everything through this same-origin proxy makes
// the cookie first-party, sidestepping third-party cookie blocking entirely.
const API_TARGET = process.env.NEXT_PUBLIC_API_BASE_URL;

module.exports = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_TARGET}/:path*` },
    ];
  },
};
