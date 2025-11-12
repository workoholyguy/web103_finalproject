import { pool } from "../config/database.js";
import { cleanText, listingKey } from "../utils/listings.js";

const SOURCE_METADATA = {
  usajobs: {
    name: "USAJOBS",
    type: "api",
    baseUrl: "https://data.usajobs.gov/api/search",
  },
  adzuna: {
    name: "Adzuna",
    type: "api",
    baseUrl: "https://api.adzuna.com/v1/api/jobs/us",
  },
  remotive: {
    name: "Remotive",
    type: "api",
    baseUrl: "https://remotive.com/api/remote-jobs",
  },
  jooble: {
    name: "Jooble",
    type: "api",
    baseUrl: "https://jooble.org/api",
  },
  lever: {
    name: "Lever ATS",
    type: "ats",
    baseUrl: "https://api.lever.co/v0/postings",
  },
  greenhouse: {
    name: "Greenhouse ATS",
    type: "ats",
    baseUrl: "https://boards-api.greenhouse.io/v1/boards",
  },
  workable: {
    name: "Workable ATS",
    type: "ats",
    baseUrl: "https://apply.workable.com/api/v1/widget",
  },
  ashby: {
    name: "Ashby ATS",
    type: "ats",
    baseUrl: "https://jobs.ashbyhq.com/api",
  },
  recruitee: {
    name: "Recruitee ATS",
    type: "ats",
    baseUrl: "https://{org}.recruitee.com/api",
  },
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const detectRemote = (locationText, explicitFlag) => {
  if (explicitFlag === true) return true;
  if (explicitFlag === false) return false;
  if (!locationText) return false;
  return /remote|anywhere/i.test(locationText);
};

const normalizeLocationText = (text) => {
  if (!text) return null;
  const trimmed = text.trim();
  return trimmed.length ? trimmed : null;
};

const parseLocationParts = (rawText) => {
  if (!rawText) return { city: null, region: null, country: null };
  const tokens = rawText.split(",").map((t) => t.trim()).filter(Boolean);
  if (!tokens.length) return { city: null, region: null, country: null };

  if (tokens.length === 1) {
    return { city: tokens[0], region: null, country: null };
  }

  if (tokens.length === 2) {
    return { city: tokens[0], region: tokens[1], country: null };
  }

  return {
    city: tokens[0],
    region: tokens.slice(1, -1).join(", ") || null,
    country: tokens[tokens.length - 1],
  };
};

const defaultCaches = () => ({
  sourceIds: new Map(),
  companyIds: new Map(),
  locationIds: new Map(),
});

const ensureJobSource = async (code = "unknown", caches) => {
  const sourceCode = code?.toLowerCase() || "unknown";
  if (caches.sourceIds.has(sourceCode)) {
    return caches.sourceIds.get(sourceCode);
  }

  const meta = SOURCE_METADATA[sourceCode] || {
    name: sourceCode.toUpperCase(),
    type: "api",
    baseUrl: null,
  };

  const { rows } = await pool.query(
    `INSERT INTO job_sources (code, name, type, base_url, is_active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (code) DO UPDATE
       SET name = EXCLUDED.name,
           type = EXCLUDED.type,
           base_url = COALESCE(EXCLUDED.base_url, job_sources.base_url),
           is_active = true,
           updated_at = now()
     RETURNING id`,
    [sourceCode, meta.name, meta.type, meta.baseUrl]
  );

  const sourceId = rows[0]?.id;
  caches.sourceIds.set(sourceCode, sourceId);
  return sourceId;
};

const upsertLocation = async (locationText, remoteFlag, caches) => {
  const normalized = normalizeLocationText(locationText) || (remoteFlag ? "Remote" : null);
  if (!normalized) return null;

  const cacheKey = normalized.toLowerCase();
  if (caches.locationIds.has(cacheKey)) {
    return caches.locationIds.get(cacheKey);
  }

  const existing = await pool.query(
    "SELECT id FROM locations WHERE raw_text = $1 LIMIT 1",
    [normalized]
  );
  if (existing.rowCount) {
    const id = existing.rows[0].id;
    caches.locationIds.set(cacheKey, id);
    return id;
  }

  const parts = parseLocationParts(normalized);
  const isRemote = detectRemote(normalized, remoteFlag);

  const { rows } = await pool.query(
    `INSERT INTO locations (raw_text, city, region, country, is_remote)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [normalized, parts.city, parts.region, parts.country, isRemote]
  );

  const id = rows[0]?.id;
  caches.locationIds.set(cacheKey, id);
  return id;
};

const upsertCompany = async (name, locationId, caches) => {
  const displayName = name?.trim() || "Unknown Company";
  const cleanName = cleanText(displayName);
  const cacheKey = (cleanName || displayName.toLowerCase()).trim();

  if (cacheKey && caches.companyIds.has(cacheKey)) {
    return caches.companyIds.get(cacheKey);
  }

  const hasClean = Boolean(cleanName);
  const params = hasClean
    ? [displayName, cleanName, locationId]
    : [displayName, locationId];

  const query = hasClean
    ? `INSERT INTO companies (name, clean_name, hq_location_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (clean_name) DO UPDATE
          SET name = EXCLUDED.name,
              hq_location_id = COALESCE(companies.hq_location_id, EXCLUDED.hq_location_id),
              updated_at = now()
        RETURNING id`
    : `INSERT INTO companies (name, hq_location_id)
        VALUES ($1, $2)
        RETURNING id`;

  const { rows } = await pool.query(query, params);
  const id = rows[0]?.id;

  if (cacheKey) {
    caches.companyIds.set(cacheKey, id);
  }

  return id;
};

const upsertDedupeSignature = async (hash, companyId, title, location) => {
  if (!hash) return;
  await pool.query(
    `INSERT INTO dedupe_signatures (signature_hash, company_id, title_text, location_text, last_seen_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (signature_hash) DO UPDATE
       SET company_id = EXCLUDED.company_id,
           title_text = EXCLUDED.title_text,
           location_text = EXCLUDED.location_text,
           last_seen_at = now()`,
    [hash, companyId, title || null, location || null]
  );
};

const upsertJobListing = async (listing, refs) => {
  const externalId = listing.externalId || `${listing.source || "unknown"}:${listing.title || "untitled"}`;
  const postedAt = toDate(listing.postedAt);
  const salaryMin = toNumber(listing.salaryMin);
  const salaryMax = toNumber(listing.salaryMax);
  const isRemote = detectRemote(listing.location, listing.remote);

  await pool.query(
    `INSERT INTO job_listings (
        external_id,
        job_source_id,
        company_id,
        location_id,
        title,
        description,
        url,
        posted_at,
        salary_min,
        salary_max,
        currency,
        is_remote,
        raw_payload,
        dedupe_hash
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14)
      ON CONFLICT (external_id) DO UPDATE SET
        job_source_id = EXCLUDED.job_source_id,
        company_id = EXCLUDED.company_id,
        location_id = EXCLUDED.location_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        url = EXCLUDED.url,
        posted_at = COALESCE(EXCLUDED.posted_at, job_listings.posted_at),
        salary_min = EXCLUDED.salary_min,
        salary_max = EXCLUDED.salary_max,
        currency = EXCLUDED.currency,
        is_remote = EXCLUDED.is_remote,
        raw_payload = EXCLUDED.raw_payload,
        dedupe_hash = EXCLUDED.dedupe_hash,
        updated_at = now()`,
    [
      externalId,
      refs.sourceId,
      refs.companyId,
      refs.locationId,
      listing.title || "Untitled Role",
      listing.description || null,
      listing.url || null,
      postedAt,
      salaryMin,
      salaryMax,
      listing.currency || null,
      isRemote,
      JSON.stringify(listing),
      refs.dedupeHash,
    ]
  );
};

const persistListing = async (listing, caches) => {
  const sourceId = await ensureJobSource(listing.source, caches);
  const locationId = await upsertLocation(listing.location, listing.remote, caches);
  const companyId = await upsertCompany(listing.company, locationId, caches);
  const dedupeHash = listingKey(listing.company, listing.title, listing.location);

  await upsertDedupeSignature(dedupeHash, companyId, listing.title, listing.location);
  await upsertJobListing(listing, { sourceId, companyId, locationId, dedupeHash });
};

export const cacheJobListings = async (listings = []) => {
  if (!Array.isArray(listings) || !listings.length) return;
  const caches = defaultCaches();
  for (const listing of listings) {
    try {
      await persistListing(listing, caches);
    } catch (error) {
      console.error(
        "[job-cache] failed to persist listing",
        listing?.externalId || listing?.title,
        error.message || error
      );
    }
  }
};
