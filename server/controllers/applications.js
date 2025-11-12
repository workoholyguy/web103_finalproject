import { pool } from "../config/database.js";

const STATUS_VALUES = new Set([
  "planned",
  "applied",
  "interviewing",
  "offer",
  "rejected",
]);

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

let cachedDefaultUserId = null;

const parsePageParam = (value) => {
  if (typeof value !== "string") return DEFAULT_PAGE;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PAGE;
};

const parseLimitParam = (value) => {
  if (typeof value !== "string") return DEFAULT_PAGE_SIZE;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(parsed, 5), 50);
};

const parseDateParam = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return null;
  return new Date(ts).toISOString();
};

const mapRowToApplication = (row) => {
  const snapshot = row.listing_snapshot || {};
  const fallbackTitle =
    snapshot.title || snapshot.position_title || snapshot.role || snapshot.job;
  const fallbackCompany =
    row.company_name ||
    snapshot.company ||
    snapshot.company_name ||
    "Unknown Company";

  const salaryMin =
    row.salary_min ??
    snapshot.salary_min ??
    snapshot.salary?.min ??
    snapshot.compensation?.min ??
    null;
  const salaryMax =
    row.salary_max ??
    snapshot.salary_max ??
    snapshot.salary?.max ??
    snapshot.compensation?.max ??
    null;

  return {
    id: row.id,
    title: row.job_title || fallbackTitle || "Untitled role",
    company: fallbackCompany,
    status: row.status,
    stage: row.stage_name || undefined,
    appliedAt: row.applied_at ? new Date(row.applied_at).toISOString() : undefined,
    responseAt: row.response_at
      ? new Date(row.response_at).toISOString()
      : undefined,
    location: row.location_text || snapshot.location || snapshot.city || undefined,
    remote:
      row.is_remote ??
      snapshot.is_remote ??
      snapshot.remote ??
      (snapshot.candidate_required_location === "Remote" ? true : undefined),
    source: row.source || snapshot.source || snapshot.platform || undefined,
    jobPostUrl:
      row.job_post_url || row.listing_url || snapshot.job_post_url || snapshot.url,
    notes: row.notes || undefined,
    salaryMin: salaryMin != null ? Number(salaryMin) : undefined,
    salaryMax: salaryMax != null ? Number(salaryMax) : undefined,
    currency: row.currency || snapshot.currency || undefined,
  };
};

const buildStatusFilter = (rawStatus) => {
  if (typeof rawStatus !== "string") return [];
  return rawStatus
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => STATUS_VALUES.has(value));
};

const resolveUserId = async (explicit) => {
  if (explicit) return explicit;
  if (cachedDefaultUserId) return cachedDefaultUserId;

  const { rows } = await pool.query(
    "SELECT id FROM users WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 1"
  );
  cachedDefaultUserId = rows[0]?.id || null;
  return cachedDefaultUserId;
};

const ApplicationsController = {
  async list(req, res) {
    try {
      const userId =
        typeof req.query.userId === "string" && req.query.userId.trim()
          ? req.query.userId.trim()
          : await resolveUserId();

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const page = parsePageParam(req.query.page);
      const limit = parseLimitParam(req.query.limit);
      const offset = (page - 1) * limit;

      const textFilter =
        typeof req.query.query === "string" ? req.query.query.trim() : "";
      const statuses = buildStatusFilter(req.query.status);
      const appliedAfter = parseDateParam(req.query.appliedAfter);

      const clauses = ["ja.user_id = $1"];
      const values = [userId];
      let idx = values.length + 1;

      if (textFilter) {
        values.push(`%${textFilter}%`);
        clauses.push(
          `(companies.name ILIKE $${idx} OR job_listings.title ILIKE $${idx})`
        );
        idx += 1;
      }

      if (statuses.length) {
        values.push(statuses);
        clauses.push(`ja.status = ANY($${idx})`);
        idx += 1;
      }

      if (appliedAfter) {
        values.push(appliedAfter);
        clauses.push(`ja.applied_at >= $${idx}`);
        idx += 1;
      }

      values.push(limit);
      const limitPlaceholder = `$${idx}`;
      idx += 1;
      values.push(offset);
      const offsetPlaceholder = `$${idx}`;

      const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

      const query = `
        SELECT
          ja.id,
          ja.status,
          ja.applied_at,
          ja.response_at,
          ja.job_post_url,
          ja.source,
          ja.notes,
          ja.listing_snapshot,
          job_listings.title AS job_title,
          job_listings.url AS listing_url,
          job_listings.is_remote,
          job_listings.salary_min,
          job_listings.salary_max,
          job_listings.currency,
          companies.name AS company_name,
          locations.raw_text AS location_text,
          stages.name AS stage_name,
          COUNT(*) OVER() AS total_count
        FROM job_applications ja
        LEFT JOIN companies ON companies.id = ja.company_id
        LEFT JOIN job_listings ON job_listings.id = ja.job_listing_id
        LEFT JOIN locations ON locations.id = job_listings.location_id
        LEFT JOIN application_stages stages ON stages.id = ja.stage_id
        ${whereClause}
        ORDER BY ja.applied_at DESC NULLS LAST, ja.created_at DESC
        LIMIT ${limitPlaceholder}
        OFFSET ${offsetPlaceholder}
      `;

      const { rows } = await pool.query(query, values);
      const total = rows.length ? Number(rows[0].total_count) : 0;

      return res.status(200).json({
        items: rows.map(mapRowToApplication),
        meta: {
          page,
          limit,
          total,
        },
      });
    } catch (error) {
      console.error("[applications] list failed:", error);
      return res
        .status(500)
        .json({ error: "Unable to load job applications right now" });
    }
  },
};

export default ApplicationsController;
