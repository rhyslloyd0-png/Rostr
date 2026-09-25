function slugify(name) {
  const base = String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base.slice(0, 60) || "item";
}

async function uniqueGuildSlug(pool, name) {
  const base = slugify(name);
  let slug = base;
  let n = 1;
  for (;;) {
    const { rows } = await pool.query("SELECT 1 FROM guilds WHERE slug = $1", [slug]);
    if (!rows.length) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

async function uniqueDepartmentSlug(pool, guildId, name) {
  const base = slugify(name);
  let slug = base;
  let n = 1;
  for (;;) {
    const { rows } = await pool.query("SELECT 1 FROM departments WHERE guild_id = $1 AND slug = $2", [guildId, slug]);
    if (!rows.length) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

module.exports = { slugify, uniqueGuildSlug, uniqueDepartmentSlug };
