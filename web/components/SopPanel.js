import { useEffect, useState, useCallback, useRef } from "react";

// See lib/api.js — routed through this app's own /api/* proxy so the
// session cookie stays first-party instead of a blocked third-party cookie.
const API_BASE_URL = "/api";

async function apiFetchRaw(path, options = {}) {
  const resp = await fetch(`${API_BASE_URL}${path}`, { ...options, credentials: "include" });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    const err = new Error(data.message || data.error || `Request failed (${resp.status})`);
    err.status = resp.status;
    throw err;
  }
  return resp.status === 204 ? null : resp.json();
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SopPanel({ guildId, deptId }) {
  const [files, setFiles] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null);

  const load = useCallback(() => {
    apiFetchRaw(`/guilds/${guildId}/departments/${deptId}/sop`)
      .then(data => setFiles(data.files))
      .catch(setError);
  }, [guildId, deptId]);

  useEffect(load, [load]);

  async function upload(e) {
    e.preventDefault();
    const file = fileInput.current.files[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      await apiFetchRaw(`/guilds/${guildId}/departments/${deptId}/sop`, { method: "POST", body: form });
      fileInput.current.value = "";
      load();
    } catch (err) {
      setError(err);
    } finally {
      setUploading(false);
    }
  }

  async function remove(id) {
    await apiFetchRaw(`/guilds/${guildId}/departments/${deptId}/sop/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h2>SOP documents</h2>
      {error && <div className="card error">{error.message}</div>}

      <form className="card" onSubmit={upload} style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input type="file" ref={fileInput} />
        <button className="btn" type="submit" disabled={uploading}>{uploading ? "Uploading..." : "Upload"}</button>
      </form>

      {!files && !error && <p className="muted">Loading documents...</p>}
      {files && files.length === 0 && <p className="muted">No documents yet.</p>}
      {files && files.map(f => (
        <div key={f.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div>{f.display_name || f.filename}</div>
            <div className="muted">{formatSize(f.size)} — uploaded {new Date(f.uploaded_at).toLocaleDateString()}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a className="btn secondary" href={`${API_BASE_URL}/guilds/${guildId}/departments/${deptId}/sop/${f.id}/download`} target="_blank" rel="noreferrer">
              Download
            </a>
            <button className="btn secondary" onClick={() => remove(f.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
