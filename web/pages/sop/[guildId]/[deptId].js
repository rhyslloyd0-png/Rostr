import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { apiFetch, loginUrl } from "../../../lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

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
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!guildId || !deptId) return;
    apiFetch(`/sop/${guildId}/${deptId}`)
      .then(data => {
        setDepartment(data.department);
        setFiles(data.files);
      })
      .catch(err => {
        if (err.status === 401) setNeedsLogin(true);
        else setError(err);
      });
  }, [guildId, deptId]);

  if (needsLogin) {
    return (
      <div className="container">
        <div className="card">
          <p>Sign in with Discord to view this department's documents.</p>
          <a className="btn" href={loginUrl({ mode: "identify", returnTo: `/sop/${guildId}/${deptId}` })}>Sign in with Discord</a>
        </div>
      </div>
    );
  }

  if (error) return <div className="container"><div className="card error">{error.body?.message || error.message}</div></div>;
  if (!department || !files) return <div className="container"><p className="muted">Loading...</p></div>;

  return (
    <div className="container">
      <h1>{department.name} — SOP documents</h1>
      {files.length === 0 && <p className="muted">No documents have been uploaded yet.</p>}
      {files.map(f => (
        <div key={f.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div>{f.display_name || f.filename}</div>
            <div className="muted">{formatSize(f.size)} — uploaded {new Date(f.uploaded_at).toLocaleDateString()}</div>
          </div>
          <a className="btn" href={`${API_BASE_URL}/sop/${guildId}/${deptId}/${f.id}/download`} target="_blank" rel="noreferrer">
            Download
          </a>
        </div>
      ))}
    </div>
  );
}
