import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { apiFetch, loginUrl } from "../../../lib/api";
import AppHeader from "../../../components/AppHeader";

// See lib/api.js — routed through this app's own /api/* proxy so the
// session cookie stays first-party instead of a blocked third-party cookie.
const API_BASE_URL = "/api";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SopLibrary() {
  const router = useRouter();
  const { guildId, deptId } = router.query;

  const [department, setDepartment] = useState(null);
  const [files, setFiles] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!guildId || !deptId) return;
    apiFetch(`/sop/${guildId}/${deptId}`)
      .then(data => {
        setDepartment(data.department);
        setFiles(data.files);
        const preferred = data.files.find(f => f.is_default) || data.files[0];
        setSelectedId(preferred ? preferred.id : null);
      })
      .catch(err => {
        if (err.status === 401) setNeedsLogin(true);
        else setError(err);
      });
  }, [guildId, deptId]);

  if (needsLogin) {
    return (
      <>
        <AppHeader guildId={guildId} activeDeptSlug={deptId} />
        <div className="container">
          <div className="card">
            <p>Sign in with Discord to view this department's documents.</p>
            <a className="btn" href={loginUrl({ mode: "identify", returnTo: `/sop/${guildId}/${deptId}` })}>Sign in with Discord</a>
          </div>
        </div>
      </>
    );
  }

  if (error) return <><AppHeader guildId={guildId} activeDeptSlug={deptId} /><div className="container"><div className="card error">{error.body?.message || error.message}</div></div></>;
  if (!department || !files) return <><AppHeader guildId={guildId} activeDeptSlug={deptId} /><div className="container"><div className="page-loading"><span className="spinner" /> Loading…</div></div></>;

  const selected = files.find(f => f.id === selectedId) || null;
  const canView = selected && selected.content_type === "text/html";

  return (
    <>
    <AppHeader guildId={guildId} activeDeptSlug={deptId} />
    <div className="container wide sop-library">
      <h1>{department.name} — SOP documents</h1>

      {files.length === 0 ? (
        <p className="muted">No documents have been uploaded yet.</p>
      ) : (
        <div className="sop-layout">
          <div className="sop-sidebar">
            {files.map(f => (
              <div
                key={f.id}
                className={`card sop-doc-card${f.id === selectedId ? " sop-doc-card-active" : ""}`}
                onClick={() => setSelectedId(f.id)}
              >
                <div className="sop-doc-name">
                  {f.display_name || f.filename}
                  {f.is_default && <span className="pill pill-green">Default</span>}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {formatSize(f.size)} — uploaded {new Date(f.uploaded_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>

          <div className="sop-viewer card">
            {selected && (
              <>
                <div className="sop-viewer-header">
                  <strong>{selected.display_name || selected.filename}</strong>
                  <a
                    className="btn secondary"
                    href={`${API_BASE_URL}/sop/${guildId}/${deptId}/${selected.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download
                  </a>
                </div>
                {canView ? (
                  <iframe
                    key={selected.id}
                    src={`${API_BASE_URL}/sop/${guildId}/${deptId}/${selected.id}/view`}
                    className="sop-viewer-frame"
                    sandbox="allow-scripts allow-popups"
                    title={selected.display_name || selected.filename}
                  />
                ) : (
                  <p className="muted" style={{ padding: 20 }}>
                    This file type can't be previewed — use Download to open it.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
