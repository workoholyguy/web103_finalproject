import crypto from "crypto";
import { dedupeListings } from "../utils/listings.js";
import { cacheJobListings } from "../services/jobCache.js";
import { pool } from "../config/database.js";
import { parseRefreshTargets } from "../utils/refreshTargets.js";


const US = "United States";
const defaultQuery = "software engineer";

const stripHtml = (html = "") =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const containsAll = (haystack = "", words = []) =>
  words.every((word) => haystack.toLowerCase().includes(word.toLowerCase()));

const parseAtsEnv = (raw = "") => {
  const buckets = {
    lever: [],
    greenhouse: [],
    workable: [],
    ashby: [],
    recruitee: [],
  };

  raw
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const [type, org] = pair.split(":").map((val) => val.trim().toLowerCase());
      if (!type || !org) return;
      if (buckets[type]) buckets[type].push(org);
    });

  return buckets;
};

const parseQueryParam = (value, fallback) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
};

const parsePageParam = (value, fallback = 1) => {
  if (typeof value !== "string") return fallback;
  const page = Number.parseInt(value, 10);
  return Number.isFinite(page) && page > 0 ? page : fallback;
};

const parseBooleanParam = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;
  return null;
};

const SORT_CLAUSES = {
  recent: "job_listings.posted_at DESC NULLS LAST, job_listings.created_at DESC",
  oldest: "job_listings.posted_at ASC NULLS LAST, job_listings.created_at ASC",
  title_asc: "job_listings.title ASC NULLS LAST",
  title_desc: "job_listings.title DESC NULLS LAST",
  salary_desc:
    "job_listings.salary_max DESC NULLS LAST, job_listings.salary_min DESC NULLS LAST, job_listings.posted_at DESC NULLS LAST",
  salary_asc:
    "job_listings.salary_max ASC NULLS LAST, job_listings.salary_min ASC NULLS LAST, job_listings.posted_at DESC NULLS LAST",
};

const parseSortParam = (value) => {
  if (typeof value !== "string") return "recent";
  const normalized = value.trim().toLowerCase();
  return SORT_CLAUSES[normalized] ? normalized : "recent";
};

const logProviderError = (provider, error) => {
  console.error(`[jobs] ${provider} provider failed:`, error.message || error);
};

const DEFAULT_REFRESH_TARGETS = [{ q: defaultQuery, loc: US, page: 1 }];

const loadRefreshTargets = (raw) => {
  const parsed = parseRefreshTargets(raw, DEFAULT_REFRESH_TARGETS);
  return parsed.length ? parsed : DEFAULT_REFRESH_TARGETS;
};

export const aggregateJobFeeds = async ({ q, loc, page }) => {
  const atsOrgs = parseAtsEnv(process.env.ATS_ORGS || "");
  const USE = {
    USAJOBS: true,
    ADZUNA: true,
    REMOTIVE: true,
    JOOBLE: Boolean(
      process.env.JOOBLE_API_KEY ||
        process.env.JOOBLE_APP_KEY ||
        process.env.JOOBLE_KEY
    ),
    LEVER: atsOrgs.lever.length > 0,
    GREENHOUSE: atsOrgs.greenhouse.length > 0,
    WORKABLE: atsOrgs.workable.length > 0,
    ASHBY: atsOrgs.ashby.length > 0,
    RECRUITEE: atsOrgs.recruitee.length > 0,
  };

  const jobsPromises = [
    USE.USAJOBS && handleProvider("USAJOBS", () => searchUsaJobs(q, loc, page)),
    USE.ADZUNA && handleProvider("ADZUNA", () => searchAdzuna(q, loc, page)),
    USE.REMOTIVE && handleProvider("REMOTIVE", () => searchRemotive(q)),
    USE.JOOBLE && handleProvider("JOOBLE", () => searchJooble(q, loc, page)),
    USE.LEVER &&
      handleProvider("LEVER", () => searchLever(atsOrgs.lever, q, loc)),
    USE.GREENHOUSE &&
      handleProvider("GREENHOUSE", () =>
        searchGreenhouse(atsOrgs.greenhouse, q, loc)
      ),
    USE.WORKABLE &&
      handleProvider("WORKABLE", () => searchWorkable(atsOrgs.workable, q, loc)),
    USE.ASHBY &&
      handleProvider("ASHBY", () => searchAshby(atsOrgs.ashby, q, loc)),
    USE.RECRUITEE &&
      handleProvider("RECRUITEE", () =>
        searchRecruitee(atsOrgs.recruitee, q, loc)
      ),
  ].filter(Boolean);

  const results = await Promise.all(jobsPromises);
  const combined = results.flat();

  return dedupeListings(combined).sort((a, b) => {
    const left = a.postedAt || "";
    const right = b.postedAt || "";
    return right.localeCompare(left);
  });
};

const searchUsaJobs = async (q, loc, page) => {
  const key = process.env.USAJOBS_API_KEY;
  const ua = process.env.USAJOBS_USER_AGENT;
  if (!key || !ua) return [];

  const url = new URL("https://data.usajobs.gov/api/search");
  url.searchParams.set("Keyword", q);
  url.searchParams.set("LocationName", loc);
  url.searchParams.set("ResultsPerPage", "20");
  url.searchParams.set("Page", String(page));

  const response = await fetch(url, {
    headers: {
      "User-Agent": ua,
      "Authorization-Key": key,
      Accept: "application/json",
    },
  });

  if (!response.ok) return [];
  const data = await response.json();
  const items = data?.SearchResult?.SearchResultItems ?? [];

  return items.map((row) => {
    const descriptor = row.MatchedObjectDescriptor || {};
    const id = String(
      row.MatchedObjectId || descriptor.PositionID || crypto.randomUUID()
    );
    const pay = descriptor.PositionRemuneration?.[0] || {};
    const postedAt =
      descriptor.PublicationStartDate ||
      descriptor.PublicationDate ||
      descriptor.ApplicationCloseDate;

    return {
      externalId: `usajobs:${id}`,
      title: descriptor.PositionTitle || "",
      company: descriptor.OrganizationName || "US Federal",
      location:
        descriptor.PositionLocationDisplay ||
        descriptor.PositionLocation?.[0]?.LocationName,
      url: descriptor.PositionURI || "",
      source: "usajobs",
      description: descriptor.UserArea?.Details?.JobSummary || undefined,
      salaryMin: pay.MinimumRange ? Number(pay.MinimumRange) : undefined,
      salaryMax: pay.MaximumRange ? Number(pay.MaximumRange) : undefined,
      currency: pay.CurrencyCode,
      postedAt: postedAt ? new Date(postedAt).toISOString() : undefined,
    };
  });
};

const searchAdzuna = async (q, loc, page) => {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  const url = new URL(`https://api.adzuna.com/v1/api/jobs/us/search/${page}`);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("what", q);
  url.searchParams.set("where", loc);
  url.searchParams.set("results_per_page", "20");

  const response = await fetch(url);
  if (!response.ok) return [];

  const data = await response.json();
  const items = data?.results ?? [];

  return items.map((row) => ({
    externalId: `adzuna:${row.id ?? crypto.randomUUID()}`,
    title: row.title || "",
    company: row.company?.display_name || "Unknown",
    location: row.location?.display_name || row.location?.area?.join(", "),
    url: row.redirect_url || row.adref || "",
    source: "adzuna",
    description: row.description
      ? stripHtml(row.description).slice(0, 400)
      : undefined,
    salaryMin: row.salary_min ? Number(row.salary_min) : undefined,
    salaryMax: row.salary_max ? Number(row.salary_max) : undefined,
    currency:
      row.salary_currency ||
      (row.salary_min || row.salary_max ? "USD" : undefined),
    postedAt: row.created ? new Date(row.created).toISOString() : undefined,
    tags: row.category?.label ? [row.category.label] : undefined,
  }));
};

const searchRemotive = async (q) => {
  const url = new URL("https://remotive.com/api/remote-jobs");
  url.searchParams.set("search", q);

  const response = await fetch(url);
  if (!response.ok) return [];

  const data = await response.json();
  const items = data?.jobs ?? [];

  return items.map((row) => ({
    externalId: `remotive:${row.id ?? crypto.randomUUID()}`,
    title: row.title || "",
    company: row.company_name || "Unknown",
    location: row.candidate_required_location || "Remote",
    remote: true,
    url: row.url || "",
    source: "remotive",
    description: row.description
      ? stripHtml(row.description).slice(0, 400)
      : undefined,
    postedAt: row.publication_date
      ? new Date(row.publication_date).toISOString()
      : undefined,
    tags: row.tags || undefined,
    currency: row.salary ? "USD" : undefined,
  }));
};

const searchJooble = async (q, loc, page) => {
  const key =
    process.env.JOOBLE_API_KEY ||
    process.env.JOOBLE_APP_KEY ||
    process.env.JOOBLE_KEY;
  if (!key) return [];

  const response = await fetch(`https://jooble.org/api/${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywords: q, location: loc, page }),
  });

  if (!response.ok) return [];
  const data = await response.json();
  const items = data?.jobs ?? [];

  return items.map((row, idx) => ({
    externalId: `jooble:${row.id ?? idx}`,
    title: row.title || "",
    company: row.company || "Unknown",
    location: row.location || row.country || "",
    url: row.link || row.redirect_url || "",
    source: "jooble",
    description: row.snippet
      ? stripHtml(row.snippet).slice(0, 400)
      : undefined,
    postedAt: row.updated || row.posted || undefined,
    salaryMin: row.salary_min ? Number(row.salary_min) : undefined,
    salaryMax: row.salary_max ? Number(row.salary_max) : undefined,
    currency: row.salary_currency || undefined,
  }));
};

const searchLever = async (orgs, q, loc) => {
  const out = [];
  await Promise.all(
    orgs.map(async (org) => {
      const response = await fetch(
        `https://api.lever.co/v0/postings/${org}?mode=json`
      );
      if (!response.ok) return;
      const jobs = await response.json();
      for (const job of jobs) {
        const title = job.text || "";
        const location = job.categories?.location || "";
        const description = job.descriptionPlain || "";
        if (q && !containsAll((title + description).toLowerCase(), q.split(/\s+/))) continue;
        if (
          loc &&
          loc !== US &&
          !(location || "").toLowerCase().includes(loc.toLowerCase())
        )
          continue;
        out.push({
          externalId: `lever:${org}:${job.id}`,
          title,
          company: org,
          location,
          url: job.hostedUrl || "",
          source: "lever",
          description: description ? description.slice(0, 400) : undefined,
          postedAt: job.createdAt
            ? new Date(job.createdAt).toISOString()
            : undefined,
          tags: job.categories
            ? Object.values(job.categories).filter(Boolean)
            : undefined,
        });
      }
    })
  );

  return out;
};

const searchGreenhouse = async (orgs, q, loc) => {
  const out = [];
  await Promise.all(
    orgs.map(async (org) => {
      const response = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${org}/jobs`
      );
      if (!response.ok) return;
      const data = await response.json();
      const jobs = data?.jobs || [];
      for (const job of jobs) {
        const title = job.title || "";
        const location = job.location?.name || "";
        const description = job.content || "";
        if (q && !containsAll((title + description).toLowerCase(), q.split(/\s+/))) continue;
        if (
          loc &&
          loc !== US &&
          !(location || "").toLowerCase().includes(loc.toLowerCase())
        )
          continue;
        out.push({
          externalId: `greenhouse:${org}:${job.id}`,
          title,
          company: org,
          location,
          url: job.absolute_url || "",
          source: "greenhouse",
          description: description
            ? stripHtml(description).slice(0, 400)
            : undefined,
          postedAt: job.updated_at
            ? new Date(job.updated_at).toISOString()
            : undefined,
          tags: job.departments
            ? job.departments
                .map((dept) => dept.name || "")
                .filter(Boolean)
            : undefined,
        });
      }
    })
  );
  return out;
};

const searchWorkable = async (orgs, q, loc) => {
  const out = [];
  await Promise.all(
    orgs.map(async (org) => {
      const response = await fetch(
        `https://apply.workable.com/api/v1/widget/accounts/${org}`
      );
      if (!response.ok) return;
      const data = await response.json();
      const jobs = data?.jobs || [];
      for (const job of jobs) {
        const title = job.title || "";
        const location = job.location?.city
          ? [job.location.city, job.location.region, job.location.country]
              .filter(Boolean)
              .join(", ")
          : job.location?.country || "";
        const description = job.description || "";
        if (q && !containsAll((title + description).toLowerCase(), q.split(/\s+/))) continue;
        if (
          loc &&
          loc !== US &&
          !(location || "").toLowerCase().includes(loc.toLowerCase())
        )
          continue;
        out.push({
          externalId: `workable:${org}:${job.id}`,
          title,
          company: org,
          location,
          url: job.application_url || job.url || "",
          source: "workable",
          description: description
            ? stripHtml(description).slice(0, 400)
            : undefined,
          postedAt: job.published_on
            ? new Date(job.published_on).toISOString()
            : undefined,
        });
      }
    })
  );
  return out;
};

const searchAshby = async (orgs, q, loc) => {
  const out = [];
  await Promise.all(
    orgs.map(async (org) => {
      const response = await fetch(
        `https://jobs.ashbyhq.com/api/non-user-facing/posting/org/${org}`
      );
      if (!response.ok) return;
      const data = await response.json();
      const jobs = data?.jobs || data?.postings || [];
      for (const job of jobs) {
        const title = job.title || job.jobTitle || "";
        const location = job.location?.name || job.locationText || "";
        const description = job.descriptionHtml || job.description || "";
        if (q && !containsAll((title + description).toLowerCase(), q.split(/\s+/))) continue;
        if (
          loc &&
          loc !== US &&
          !(location || "").toLowerCase().includes(loc.toLowerCase())
        )
          continue;
        out.push({
          externalId: `ashby:${org}:${job.id || job.publicId || job.postingId}`,
          title,
          company: org,
          location,
          url:
            job.jobUrl ||
            job.applyUrl ||
            job.postUrl ||
            job.url ||
            `https://jobs.ashbyhq.com/${org}`,
          source: "ashby",
          description: description
            ? stripHtml(description).slice(0, 400)
            : undefined,
          postedAt: job.publishedAt
            ? new Date(job.publishedAt).toISOString()
            : undefined,
        });
      }
    })
  );
  return out;
};

const searchRecruitee = async (orgs, q, loc) => {
  const out = [];
  await Promise.all(
    orgs.map(async (org) => {
      const response = await fetch(
        `https://${org}.recruitee.com/api/offers/`
      );
      if (!response.ok) return;
      const data = await response.json();
      const jobs = data?.offers || [];
      for (const job of jobs) {
        const title = job.title || "";
        const location = job.city || job.country || "";
        const description = job.description || "";
        if (q && !containsAll((title + description).toLowerCase(), q.split(/\s+/))) continue;
        if (
          loc &&
          loc !== US &&
          !(location || "").toLowerCase().includes(loc.toLowerCase())
        )
          continue;
        out.push({
          externalId: `recruitee:${org}:${job.id}`,
          title,
          company: org,
          location,
          url: job.careers_url || job.url || "",
          source: "recruitee",
          description: description
            ? stripHtml(description).slice(0, 400)
            : undefined,
          postedAt: job.published_at
            ? new Date(job.published_at).toISOString()
            : undefined,
        });
      }
    })
  );
  return out;
};

const handleProvider = async (label, fn) => {
  try {
    return await fn();
  } catch (error) {
    logProviderError(label, error);
    return [];
  }
};

const JobsController = {
  async search(req, res) {
    const q = parseQueryParam(req.query.q, defaultQuery);
    const loc = parseQueryParam(req.query.loc, US);
    const page = parsePageParam(req.query.page, 1);

    try {
      const unique = await aggregateJobFeeds({ q, loc, page });

      try {
        await cacheJobListings(unique);
      } catch (error) {
        console.error("[jobs] cache persist failed:", error.message || error);
      }

      return res.status(200).json({ items: unique.slice(0, 80) });
    } catch (error) {
      console.error("[jobs] aggregation failed:", error);
      return res.status(500).json({ error: "Unable to fetch job listings" });
    }
  },

  async cached(req, res) {
    const limitParam = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 100)
      : 20;
    const page = parsePageParam(req.query.page, 1);
    const offset = (page - 1) * limit;

    const qFilter = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const locFilter = typeof req.query.loc === "string" ? req.query.loc.trim() : "";
    const remoteFilter = parseBooleanParam(req.query.remote);
    const sortKey = parseSortParam(req.query.sort);
    const sourceFilter =
      typeof req.query.source === "string"
        ? req.query.source
            .split(",")
            .map((source) => source.trim().toLowerCase())
            .filter(Boolean)
        : [];

    const clauses = [];
    const values = [];
    let idx = 1;

    if (qFilter) {
      values.push(`%${qFilter}%`);
      clauses.push(
        `(job_listings.title ILIKE $${idx} OR job_listings.description ILIKE $${idx} OR companies.name ILIKE $${idx})`
      );
      idx += 1;
    }

    if (locFilter) {
      values.push(`%${locFilter}%`);
      clauses.push(
        `(locations.raw_text ILIKE $${idx} OR job_listings.description ILIKE $${idx})`
      );
      idx += 1;
    }

    if (remoteFilter !== null) {
      values.push(remoteFilter);
      clauses.push(`job_listings.is_remote = $${idx}`);
      idx += 1;
    }

    if (sourceFilter.length) {
      const placeholders = sourceFilter.map(() => `$${idx++}`);
      sourceFilter.forEach((code) => values.push(code));
      clauses.push(`LOWER(job_sources.code) IN (${placeholders.join(", ")})`);
    }

    values.push(limit);
    const limitPlaceholder = `$${idx++}`;
    values.push(offset);
    const offsetPlaceholder = `$${idx++}`;

    const baseQuery = `
      SELECT
        job_listings.external_id,
        job_listings.title,
        COALESCE(companies.name, 'Unknown Company') AS company_name,
        CASE
          WHEN job_listings.is_remote THEN 'Remote'
          ELSE COALESCE(locations.raw_text, 'Unspecified')
        END AS location_text,
        job_listings.is_remote,
        job_listings.url,
        COALESCE(job_sources.code, 'unknown') AS source_code,
        job_listings.description,
        job_listings.salary_min,
        job_listings.salary_max,
        job_listings.currency,
        job_listings.posted_at
      FROM job_listings
      LEFT JOIN companies ON companies.id = job_listings.company_id
      LEFT JOIN job_sources ON job_sources.id = job_listings.job_source_id
      LEFT JOIN locations ON locations.id = job_listings.location_id
    `;

    const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const query = `
      ${baseQuery}
      ${whereClause}
      ORDER BY ${SORT_CLAUSES[sortKey]}
      LIMIT ${limitPlaceholder}
      OFFSET ${offsetPlaceholder}
    `;

    try {
      const { rows } = await pool.query(query, values);
      const items = rows.map((row) => ({
        externalId: row.external_id,
        title: row.title,
        company: row.company_name,
        location: row.location_text,
        remote: row.is_remote,
        url: row.url,
        source: row.source_code,
        description: row.description || undefined,
        salaryMin: row.salary_min ? Number(row.salary_min) : undefined,
        salaryMax: row.salary_max ? Number(row.salary_max) : undefined,
        currency: row.currency || undefined,
        postedAt: row.posted_at ? new Date(row.posted_at).toISOString() : undefined,
      }));

      return res.status(200).json({
        items,
        meta: { page, limit, count: items.length, sort: sortKey },
      });
    } catch (error) {
      console.error("[jobs] cached query failed:", error);
      return res.status(500).json({ error: "Unable to read cached listings" });
    }
  },

  async refreshCache(req, res) {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && req.query.key !== cronSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const rawTargets =
      typeof req.query.targets === "string"
        ? req.query.targets
        : process.env.REFRESH_JOB_QUERIES;
    const targets = loadRefreshTargets(rawTargets);

    if (!targets.length) {
      return res.status(400).json({ error: "No refresh targets defined" });
    }

    const details = [];
    let totalCached = 0;

    for (const target of targets) {
      try {
        const listings = await aggregateJobFeeds({
          q: target.q,
          loc: target.loc,
          page: target.page || 1,
        });
        await cacheJobListings(listings);
        totalCached += listings.length;
        details.push({
          query: target.q,
          location: target.loc,
          page: target.page || 1,
          count: listings.length,
        });
      } catch (error) {
        console.error("[jobs] refresh target failed:", target.q, target.loc, error);
        details.push({
          query: target.q,
          location: target.loc,
          page: target.page || 1,
          error: error.message || "Unknown error",
        });
      }
    }

    return res.status(200).json({
      runs: targets.length,
      totalCached,
      details,
    });
  },
};

export default JobsController;
