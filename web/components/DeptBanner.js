const API_BASE_URL = "/api";

export default function DeptBanner({ guildId, department, filled, total }) {
  const bannerUrl = department.has_banner || department.hasBanner
    ? `${API_BASE_URL}/guilds/${guildId}/departments/${department.slug}/banner`
    : null;

  return (
    <div className="dept-banner" style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : {}}>
      <div className="dept-banner-content">
        <div className="dept-banner-title">
          <h1 style={{ color: department.color || undefined }}>{department.name}</h1>
        </div>
        {typeof total === "number" && (
          <div className="dept-banner-stats">
            <div><strong>{filled}</strong> <span className="muted">filled</span></div>
            <div><strong>{total - filled}</strong> <span className="muted">vacant</span></div>
            <div><strong>{total}</strong> <span className="muted">total</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
