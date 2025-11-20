import { randomUUID } from "crypto";
import { pool } from "../config/database.js";
import mockApplications from "../config/data/applications.json" assert { type: "json" };

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

const SORT_MAPPINGS = {
  applied_desc: "ja.applied_at DESC NULLS LAST, ja.created_at DESC",
  applied_asc: "ja.applied_at ASC NULLS FIRST, ja.created_at ASC",
  created_desc: "ja.created_at DESC",
  created_asc: "ja.created_at ASC",
  company_asc: "LOWER(companies.name) ASC NULLS LAST, ja.created_at DESC",
  company_desc: "LOWER(companies.name) DESC NULLS LAST, ja.created_at DESC",
  title_asc: "LOWER(job_listings.title) ASC NULLS LAST, ja.created_at DESC",
  title_desc: "LOWER(job_listings.title) DESC NULLS LAST, ja.created_at DESC",
};

const APPLICATION_BASE_QUERY = `
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
`;

const isConnectionError = (error) => {
  if (!error) return false;
  const code = error.code || error?.original?.code;
  if (code && ["ECONNREFUSED", "ENOTFOUND", "57P01", "3D000"].includes(code)) {
    return true;
  }
  const message = typeof error.message === "string" ? error.message : "";
  return message.includes("ECONNREFUSED") || message.includes("connect ECONNREFUSED");
};

const respondWithMockApplications = (res) => {
  return res.status(200).json({
    items: mockApplications,
    meta: {
      page: 1,
      limit: mockApplications.length,
      total: mockApplications.length,
      source: "mock",
    },
  });
};

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

const resolveSortOrder = (rawSort) => {
  if (typeof rawSort !== "string") {
    return SORT_MAPPINGS.applied_desc;
  }
  const normalized = rawSort.trim().toLowerCase();
  return SORT_MAPPINGS[normalized] || SORT_MAPPINGS.applied_desc;
};

const resolveUserId = async (explicit, authenticatedId = null) => {
  if (authenticatedId) {
    cachedDefaultUserId = authenticatedId;
    return authenticatedId;
  }
  if (explicit) return explicit;
  if (cachedDefaultUserId) return cachedDefaultUserId;

  const { rows } = await pool.query(
    "SELECT id FROM users WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 1"
  );
  cachedDefaultUserId = rows[0]?.id || null;
  return cachedDefaultUserId;
};

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

const sanitizeText = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const parseStatusValue = (value) => {
  const normalized = sanitizeText(value || "planned").toLowerCase();
  if (STATUS_VALUES.has(normalized)) return normalized;
  throw new ValidationError(
    "status must be one of planned, applied, interviewing, offer, rejected"
  );
};

const parseBodyDate = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) {
    throw new ValidationError("appliedAt must be a valid date string");
  }
  return new Date(ts).toISOString();
};

const parseRemoteValue = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    if (["true", "yes", "remote"].includes(normalized)) return true;
    if (["false", "no", "onsite"].includes(normalized)) return false;
  }
  return null;
};

const parseJobPostUrl = (value) => {
  const raw = sanitizeText(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    // ignore invalid urls
  }
  return null;
};

const normalizeCreatePayload = (body = {}) => {
  const title = sanitizeText(body.title);
  if (!title) throw new ValidationError("title is required");
  const company = sanitizeText(body.company);
  if (!company) throw new ValidationError("company is required");
  const status = parseStatusValue(body.status);
  const appliedAt = body.appliedAt ? parseBodyDate(body.appliedAt) : null;
  const location = sanitizeText(body.location);
  const remote = parseRemoteValue(body.remote);
  const notes = sanitizeText(body.notes) || null;
  const jobPostUrl = parseJobPostUrl(body.jobPostUrl || body.url);
  const source = sanitizeText(body.source) || "manual";
  const userId =
    typeof body.userId === "string" && body.userId.trim() ? body.userId.trim() : null;

  const snapshot = {
    title,
    company,
    company_name: company,
    location: location || undefined,
    is_remote: remote ?? undefined,
    job_post_url: jobPostUrl || undefined,
    source,
  };

  return {
    title,
    company,
    status,
    appliedAt,
    location: location || null,
    remote,
    notes,
    jobPostUrl,
    source,
    snapshot,
    userId,
  };
};

const fetchApplicationById = async (id) => {
  const { rows } = await pool.query(
    `
    ${APPLICATION_BASE_QUERY}
    WHERE ja.id = $1
    `,
    [id]
  );
  return rows[0] ? mapRowToApplication(rows[0]) : null;
};

const ApplicationsController = {
  async list(req, res) {
    try {
      const requestedUserId =
        typeof req.query.userId === "string" && req.query.userId.trim()
          ? req.query.userId.trim()
          : null;
      const userId = await resolveUserId(requestedUserId, req.user?.id || null);

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
      const sortClause = resolveSortOrder(req.query.sort);

      const clauses = ["ja.user_id = $1"];
      const values = [userId];
      let idx = values.length + 1;

      if (textFilter) {
        values.push(`%${textFilter}%`);
        clauses.push(
          `(companies.name ILIKE $${idx} OR job_listings.title ILIKE $${idx} OR ja.source ILIKE $${idx} OR ja.notes ILIKE $${idx} OR locations.raw_text ILIKE $${idx})`
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
        ${APPLICATION_BASE_QUERY}
        ${whereClause}
        ORDER BY ${sortClause}
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
      if (isConnectionError(error)) {
        console.warn("[applications] serving mock application data");
        return respondWithMockApplications(res);
      }
      return res
        .status(500)
        .json({ error: "Unable to load job applications right now" });
    }
  },

  async create(req, res) {
    let payload;
    try {
      payload = normalizeCreatePayload(req.body);
      const userId = await resolveUserId(
        payload.userId,
        req.user?.id || null
      );

      if (!userId) {
        throw new ValidationError("userId is required");
      }

      const insertQuery = `
        INSERT INTO job_applications (
          user_id,
          status,
          applied_at,
          response_at,
          job_post_url,
          source,
          notes,
          listing_snapshot,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, NOW(), NOW())
        RETURNING id
      `;

      const insertValues = [
        userId,
        payload.status,
        payload.appliedAt,
        payload.jobPostUrl,
        payload.source,
        payload.notes,
        payload.snapshot,
      ];

      const result = await pool.query(insertQuery, insertValues);
      const created = await fetchApplicationById(result.rows[0]?.id);
      if (!created) {
        throw new Error("Created application could not be loaded");
      }

      return res.status(201).json(created);
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("[applications] create failed:", error);
      if (payload && isConnectionError(error)) {
        const mockEntry = {
          id: `mock-${randomUUID()}`,
          title: payload.title,
          company: payload.company,
          status: payload.status,
          stage: undefined,
          appliedAt: payload.appliedAt || undefined,
          responseAt: undefined,
          location: payload.location || undefined,
          remote: payload.remote ?? undefined,
          source: payload.source,
          jobPostUrl: payload.jobPostUrl || undefined,
          notes: payload.notes || undefined,
          salaryMin: undefined,
          salaryMax: undefined,
          currency: undefined,
        };
        mockApplications.unshift(mockEntry);
        return res.status(201).json(mockEntry);
      }
      return res
        .status(500)
        .json({ error: "Unable to create application right now" });
    }
  },

  async create(req, res) {
    let payload;
    try {
      payload = normalizeCreatePayload(req.body);
      const userId = await resolveUserId(
        payload.userId,
        req.user?.id || null
      );

      if (!userId) {
        throw new ValidationError("userId is required");
      }

      const insertQuery = `
        INSERT INTO job_applications (
          user_id,
          status,
          applied_at,
          response_at,
          job_post_url,
          source,
          notes,
          listing_snapshot,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, NOW(), NOW())
        RETURNING id
      `;

      const insertValues = [
        userId,
        payload.status,
        payload.appliedAt,
        payload.jobPostUrl,
        payload.source,
        payload.notes,
        payload.snapshot,
      ];

      const result = await pool.query(insertQuery, insertValues);
      const created = await fetchApplicationById(result.rows[0]?.id);
      if (!created) {
        throw new Error("Created application could not be loaded");
      }

      return res.status(201).json(created);
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("[applications] create failed:", error);
      if (payload && isConnectionError(error)) {
        const mockEntry = {
          id: `mock-${randomUUID()}`,
          title: payload.title,
          company: payload.company,
          status: payload.status,
          stage: undefined,
          appliedAt: payload.appliedAt || undefined,
          responseAt: undefined,
          location: payload.location || undefined,
          remote: payload.remote ?? undefined,
          source: payload.source,
          jobPostUrl: payload.jobPostUrl || undefined,
          notes: payload.notes || undefined,
          salaryMin: undefined,
          salaryMax: undefined,
          currency: undefined,
        };
        mockApplications.unshift(mockEntry);
        return res.status(201).json(mockEntry);
      }
      return res
        .status(500)
        .json({ error: "Unable to create application right now" });
    }
  },

  async updateStatus(req, res) {
    let targetId = req.params.id;
    try {
      if (typeof targetId !== "string" || !targetId.trim()) {
        throw new ValidationError("Valid application id is required");
      }
      targetId = targetId.trim();
      const status = parseStatusValue(req.body?.status);
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError("userId is required");
      }

      const updateQuery = `
        UPDATE job_applications
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND user_id = $3
        RETURNING id
      `;

      const result = await pool.query(updateQuery, [status, targetId, userId]);
      if (!result.rows.length) {
        return res.status(404).json({ error: "Application not found" });
      }
      const updated = await fetchApplicationById(targetId);
      if (!updated) {
        throw new Error("Unable to load updated application");
      }
      return res.status(200).json(updated);
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("[applications] update status failed:", error);
      if (isConnectionError(error)) {
        const index = mockApplications.findIndex((app) => app.id === targetId);
        if (index >= 0) {
          mockApplications[index] = {
            ...mockApplications[index],
            status: req.body?.status ?? mockApplications[index].status,
          };
          return res.status(200).json(mockApplications[index]);
        }
      }
      return res
        .status(500)
        .json({ error: "Unable to update application right now" });
    }
  },

  async update(req, res) {
    let targetId = req.params.id;
    let payload;
    try {
      if (typeof targetId !== "string" || !targetId.trim()) {
        throw new ValidationError("Valid application id is required");
      }
      targetId = targetId.trim();

      payload = normalizeCreatePayload(req.body);
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError("userId is required");
      }

      const updateQuery = `
        UPDATE job_applications
        SET status = $1,
            applied_at = $2,
            job_post_url = $3,
            source = $4,
            notes = $5,
            listing_snapshot = $6,
            updated_at = NOW()
        WHERE id = $7 AND user_id = $8
        RETURNING id
      `;

      const result = await pool.query(updateQuery, [
        payload.status,
        payload.appliedAt,
        payload.jobPostUrl,
        payload.source,
        payload.notes,
        payload.snapshot,
        targetId,
        userId,
      ]);

      if (!result.rows.length) {
        return res.status(404).json({ error: "Application not found" });
      }

      const updated = await fetchApplicationById(targetId);
      if (!updated) {
        throw new Error("Unable to load updated application");
      }

      return res.status(200).json(updated);
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("[applications] update failed:", error);
      if (payload && isConnectionError(error)) {
        const index = mockApplications.findIndex((app) => app.id === targetId);
        if (index >= 0) {
          mockApplications[index] = {
            ...mockApplications[index],
            title: payload.title,
            company: payload.company,
            status: payload.status,
            appliedAt: payload.appliedAt || undefined,
            location: payload.location || undefined,
            remote: payload.remote ?? undefined,
            source: payload.source,
            jobPostUrl: payload.jobPostUrl || undefined,
            notes: payload.notes || undefined,
          };
          return res.status(200).json(mockApplications[index]);
        }
      }
      return res
        .status(500)
        .json({ error: "Unable to update application right now" });
    }
  },

  async remove(req, res) {
    let targetId = req.params.id;
    try {
      if (typeof targetId !== "string" || !targetId.trim()) {
        throw new ValidationError("Valid application id is required");
      }
      targetId = targetId.trim();
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError("userId is required");
      }

      const result = await pool.query(
        "DELETE FROM job_applications WHERE id = $1 AND user_id = $2",
        [targetId, userId]
      );

      if (!result.rowCount) {
        return res.status(404).json({ error: "Application not found" });
      }

      return res.status(204).send();
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("[applications] delete failed:", error);
      if (isConnectionError(error)) {
        const index = mockApplications.findIndex((app) => app.id === targetId);
        if (index >= 0) {
          mockApplications.splice(index, 1);
          return res.status(204).send();
        }
      }
      return res
        .status(500)
        .json({ error: "Unable to delete application right now" });
    }
  },
};

export default ApplicationsController;
