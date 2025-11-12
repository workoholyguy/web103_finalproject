# Job Ledger API Notes

## Endpoints
- `GET /api/jobs/search` — live aggregation across public APIs/ATS, persists fresh results.
- `GET /api/jobs/cached` — reads from `job_listings` with optional `q`, `loc`, `source`, `remote`, `limit`, `page` query params.
- `GET /api/jobs/refresh` — runs the aggregation pipeline server-side without a user-triggered search. Protect with `CRON_SECRET` so only schedulers can invoke it: `GET /api/jobs/refresh?key=$CRON_SECRET`.

## Background refresh targets
Set `REFRESH_JOB_QUERIES` to a semicolon/newline separated list. Each entry is `keyword@location[@page]`, for example:
```
REFRESH_JOB_QUERIES="software engineer@United States;product designer@Remote@1"
```
If not set, the refresher defaults to `software engineer@United States`.

## Render cron / scripts
Two ways to warm the cache periodically:
1. **HTTP cron** – add a Render Cron job hitting `https://<service>.onrender.com/api/jobs/refresh?key=$CRON_SECRET` every X minutes.
2. **Command cron** – add a Render Scheduled Job that runs `npm run refresh` in the server directory. This uses `server/scripts/refreshJobs.js` which shares the same aggregator logic.

Both strategies rely on the same `REFRESH_JOB_QUERIES` matrix and write into Postgres via the service layer.
