import "../config/dotenv.js";
import { aggregateJobFeeds } from "../controllers/jobs.js";
import { cacheJobListings } from "../services/jobCache.js";
import { parseRefreshTargets } from "../utils/refreshTargets.js";

const DEFAULT_TARGETS = [{ q: "software engineer", loc: "United States", page: 1 }];

const run = async () => {
  const targets = parseRefreshTargets(process.env.REFRESH_JOB_QUERIES, DEFAULT_TARGETS);
  if (!targets.length) {
    console.warn("[job-refresh] No targets provided; exiting");
    return;
  }

  const summary = [];
  for (const target of targets) {
    try {
      const listings = await aggregateJobFeeds({
        q: target.q,
        loc: target.loc,
        page: target.page || 1,
      });
      await cacheJobListings(listings);
      summary.push({ ...target, count: listings.length });
      console.log(
        `[job-refresh] cached ${listings.length} listings for "${target.q}" @ ${target.loc}`
      );
    } catch (error) {
      summary.push({ ...target, error: error.message || String(error) });
      console.error(
        `[job-refresh] failed for "${target.q}" @ ${target.loc}:`,
        error
      );
    }
  }

  console.log("[job-refresh] summary", summary);
};

run()
  .catch((error) => {
    console.error("[job-refresh] fatal", error);
    process.exitCode = 1;
  })
  .finally(() => {
    setTimeout(() => process.exit(), 0);
  });
