# Entity Relationship Diagram

Reference the Creating an Entity Relationship Diagram final project guide in the course portal for more information about how to complete this deliverable.

## Create the List of Tables

[👉🏾👉🏾👉🏾 
    analytics_snapshots
    application_events
    application_stages
    ats_organizations
    auth_events
    companies
    dedupe_signatures
    email_verification_tokens
    ingest_runs
    job_alert_runs
    job_alerts
    job_applications
    job_comparison_items
    job_comparison_sets
    job_listing_tags
    job_listings
    job_sources
    job_tags
    listing_archives
    locations
    password_reset_tokens
    saved_jobs
    saved_searches
    search_history
    sessions
    user_auth_providers
    users
    ]

## Add the Entity Relationship Diagram

[👉🏾👉🏾👉🏾 Include an image or images of the diagram below. You may also wish to use the following markdown syntax to outline each table, as per your preference.]
<img src="./codepath_capstone_postgress - public.png" alt="Description" width="800">


# JobLedger Database Documentation

A comprehensive overview of the JobLedger PostgreSQL schema, grouped by functional sections. Each table includes its column names, data types, and concise descriptions.

---

## Section 1 — Identity & Authentication

### Table: users
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. Unique identifier generated with `gen_random_uuid()`. |
| email | TEXT | Unique user email address; lowercased index for case-insensitive queries. |
| password_hash | TEXT | Bcrypt/Argon2 hash of user password. Nullable for GitHub-only users. |
| github_id | TEXT | GitHub account identifier for OAuth logins. Unique when present. |
| display_name | TEXT | User’s public display name. |
| avatar_url | TEXT | Profile image URL (from GitHub or manual upload). |
| timezone | TEXT | User’s preferred timezone (e.g., “America/New_York”). |
| email_verified_at | TIMESTAMPTZ | Timestamp when email was verified. |
| last_login_at | TIMESTAMPTZ | Timestamp of the last successful login. |
| deleted_at | TIMESTAMPTZ | Soft-delete flag; if set, account considered inactive. |
| created_at | TIMESTAMPTZ | Record creation timestamp. |
| updated_at | TIMESTAMPTZ | Record update timestamp. |

---

### Table: user_auth_providers
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| user_id | UUID | FK → users.id. The linked user account. |
| provider | ENUM('github','password') | Type of authentication provider. |
| provider_user_id | TEXT | External provider’s unique user ID. |
| access_token_encrypted | TEXT | Encrypted OAuth access token. |
| refresh_token_encrypted | TEXT | Encrypted refresh token for long-lived sessions. |
| scopes | TEXT[] | Array of granted permission scopes. |
| created_at | TIMESTAMPTZ | Creation timestamp. |
| updated_at | TIMESTAMPTZ | Last update timestamp. |

---

### Table: sessions
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| user_id | UUID | FK → users.id. Owner of the session. |
| session_token_hash | TEXT | SHA-256 hash of session token (never stored raw). |
| refresh_token_hash | TEXT | Optional hashed refresh token. |
| ip_address | INET | IP of device that initiated session. |
| user_agent | TEXT | Client or browser details. |
| created_at | TIMESTAMPTZ | Session start. |
| expires_at | TIMESTAMPTZ | Expiration date. |
| invalidated_at | TIMESTAMPTZ | If set, marks the session as revoked. |

---

### Table: email_verification_tokens
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| user_id | UUID | FK → users.id. |
| token_hash | TEXT | SHA-256 hash of verification token. |
| expires_at | TIMESTAMPTZ | Expiration time. |
| consumed_at | TIMESTAMPTZ | Set when token is used. |
| created_at | TIMESTAMPTZ | Issued time. |

---

### Table: password_reset_tokens
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| user_id | UUID | FK → users.id. |
| token_hash | TEXT | SHA-256 hash of reset token. |
| expires_at | TIMESTAMPTZ | Expiration time. |
| consumed_at | TIMESTAMPTZ | Marked once used. |
| created_at | TIMESTAMPTZ | Creation timestamp. |

---

### Table: auth_events
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| user_id | UUID | FK → users.id. |
| event | TEXT | One of (`login_success`,`login_failure`,`password_reset`,`oauth_linked`). |
| provider | TEXT | Source provider (e.g., github). |
| ip_address | INET | Origin IP. |
| user_agent | TEXT | Device/browser details. |
| occurred_at | TIMESTAMPTZ | Event timestamp. |

---

## Section 2 — Job Aggregation

### Table: job_sources
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| code | TEXT | Unique short code (`adzuna`, `usajobs`). |
| name | TEXT | Full provider name. |
| type | TEXT | Either 'api' or 'ats'. |
| base_url | TEXT | API base URL. |
| credentials | JSONB | API keys or metadata. |
| is_active | BOOLEAN | Whether the integration is active. |
| created_at | TIMESTAMPTZ | Creation timestamp. |
| updated_at | TIMESTAMPTZ | Update timestamp. |

---

### Table: ats_organizations
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| job_source_id | UUID | FK → job_sources.id. |
| slug | TEXT | Unique organization slug per provider. |
| display_name | TEXT | Organization’s readable name. |
| last_sync_at | TIMESTAMPTZ | Last successful sync time. |
| sync_status | TEXT | State of sync (success, failed). |
| sync_error | TEXT | Error message if failed. |
| metadata | JSONB | Additional org metadata. |
| created_at | TIMESTAMPTZ | Creation timestamp. |
| updated_at | TIMESTAMPTZ | Update timestamp. |

---

### Table: locations
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| raw_text | TEXT | Original location text from job source. |
| city | TEXT | City name. |
| region | TEXT | State or province. |
| country | TEXT | Country name. |
| latitude | NUMERIC(9,6) | Geographic coordinate. |
| longitude | NUMERIC(9,6) | Geographic coordinate. |
| is_remote | BOOLEAN | Indicates remote job. |
| timezone | TEXT | Local timezone of the location. |
| created_at | TIMESTAMPTZ | Creation timestamp. |
| updated_at | TIMESTAMPTZ | Update timestamp. |

---

### Table: companies
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| name | TEXT | Official company name. |
| clean_name | TEXT | Normalized lowercase name for deduplication (unique). |
| website | TEXT | Company website URL. |
| industry | TEXT | Company industry. |
| size_band | TEXT | Company size range. |
| logo_url | TEXT | URL to company logo. |
| hq_location_id | UUID | FK → locations.id. Headquarters location. |
| created_at | TIMESTAMPTZ | Creation timestamp. |
| updated_at | TIMESTAMPTZ | Update timestamp. |

---

### Table: job_listings
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| external_id | TEXT | Unique external job ID. |
| job_source_id | UUID | FK → job_sources.id. |
| company_id | UUID | FK → companies.id. |
| location_id | UUID | FK → locations.id. |
| title | TEXT | Job title. |
| description | TEXT | Job description text. |
| url | TEXT | URL of job posting. |
| posted_at | TIMESTAMPTZ | When job was posted. |
| ingested_at | TIMESTAMPTZ | When job was imported. |
| expires_at | TIMESTAMPTZ | When job expires. |
| salary_min | NUMERIC | Minimum salary. |
| salary_max | NUMERIC | Maximum salary. |
| currency | TEXT | Currency type. |
| is_remote | BOOLEAN | Remote flag. |
| raw_payload | JSONB | Original API payload. |
| dedupe_hash | TEXT | Deduplication hash. |
| created_at | TIMESTAMPTZ | Creation timestamp. |
| updated_at | TIMESTAMPTZ | Update timestamp. |

---

### Table: job_tags
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| name | TEXT | Tag name (e.g., “Python”). |
| type | ENUM('skill','department','category') | Tag classification. |
| source | TEXT | Originating dataset. |
| created_at | TIMESTAMPTZ | Creation timestamp. |
| updated_at | TIMESTAMPTZ | Update timestamp. |

---

### Table: job_listing_tags
| Column Name | Type | Description |
|--------------|------|-------------|
| job_listing_id | UUID | FK → job_listings.id. |
| job_tag_id | UUID | FK → job_tags.id. |
| confidence | NUMERIC(4,3) | Confidence score. |
| ingest_source | TEXT | Source of tagging data. |

---

### Table: dedupe_signatures
| Column Name | Type | Description |
|--------------|------|-------------|
| signature_hash | TEXT | Primary key. Hash of title, company, and location. |
| company_id | UUID | FK → companies.id. |
| title_text | TEXT | Job title component. |
| location_text | TEXT | Location component. |
| first_seen_at | TIMESTAMPTZ | First appearance timestamp. |
| last_seen_at | TIMESTAMPTZ | Last appearance timestamp. |

---

### Table: ingest_runs
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| job_source_id | UUID | FK → job_sources.id. |
| ats_organization_id | UUID | FK → ats_organizations.id. |
| started_at | TIMESTAMPTZ | Start of ingestion job. |
| finished_at | TIMESTAMPTZ | End of ingestion job. |
| status | TEXT | Status of the run (success, error). |
| result_count | INT | Total jobs fetched. |
| new_count | INT | Newly added jobs. |
| updated_count | INT | Updated jobs. |
| errors | JSONB | Error log. |

---

### Table: listing_archives
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| job_listing_id | UUID | FK → job_listings.id. |
| captured_at | TIMESTAMPTZ | Snapshot timestamp. |
| payload | JSONB | Archived job payload. |

---

## Section 3 — User Workspace

### Table: saved_jobs
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| user_id | UUID | FK → users.id. |
| job_listing_id | UUID | FK → job_listings.id. |
| created_at | TIMESTAMPTZ | When job was saved. |
| note | TEXT | User’s note about the job. |
| priority | ENUM('low','med','high') | Priority flag. |

---

### Table: search_history
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| user_id | UUID | FK → users.id. |
| query | TEXT | Search keywords. |
| location_text | TEXT | Location query text. |
| remote_flag | BOOLEAN | Remote filter. |
| salary_min | NUMERIC | Minimum salary filter. |
| salary_max | NUMERIC | Maximum salary filter. |
| experience_level | TEXT | Experience filter. |
| executed_at | TIMESTAMPTZ | When the search was executed. |
| result_count | INT | Number of results returned. |

---

### Table: saved_searches
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| user_id | UUID | FK → users.id. |
| name | TEXT | Friendly search name. |
| query | TEXT | Keywords. |
| location_text | TEXT | Location text. |
| remote_flag | BOOLEAN | Remote filter flag. |
| salary_min | NUMERIC | Minimum salary filter. |
| salary_max | NUMERIC | Maximum salary filter. |
| experience_level | TEXT | Experience level filter. |
| created_at | TIMESTAMPTZ | Creation timestamp. |
| updated_at | TIMESTAMPTZ | Update timestamp. |
| last_run_at | TIMESTAMPTZ | Last execution timestamp. |

---

### Table: job_alerts
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| saved_search_id | UUID | FK → saved_searches.id. |
| frequency | ENUM('immediate','daily','weekly') | Frequency of alert. |
| is_active | BOOLEAN | Whether alert is enabled. |
| last_checked_at | TIMESTAMPTZ | Last check time. |
| new_jobs_count | INT | Number of new jobs found. |
| created_at | TIMESTAMPTZ | Creation timestamp. |
| updated_at | TIMESTAMPTZ | Update timestamp. |

---

### Table: job_alert_runs
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| job_alert_id | UUID | FK → job_alerts.id. |
| checked_at | TIMESTAMPTZ | Time alert ran. |
| result_count | INT | Jobs found. |
| error | TEXT | Error details if any. |

---

### Table: job_comparison_sets
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| user_id | UUID | FK → users.id. |
| title | TEXT | Comparison set name. |
| created_at | TIMESTAMPTZ | Creation timestamp. |

---

### Table: job_comparison_items
| Column Name | Type | Description |
|--------------|------|-------------|
| comparison_set_id | UUID | FK → job_comparison_sets.id. |
| job_listing_id | UUID | FK → job_listings.id. |
| position | INT | Display order. |
| added_at | TIMESTAMPTZ | When job was added to comparison. |

---

## Section 4 — Applications & Workflow

### Table: application_stages
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| user_id | UUID | FK → users.id. |
| name | TEXT | Stage name (Applied, Interviewing, etc.). |
| position | INT | Display order of stage. |
| is_default | BOOLEAN | Whether included by default. |

---

### Table: job_applications
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| user_id | UUID | FK → users.id. |
| job_listing_id | UUID | FK → job_listings.id. Nullable for manual entries. |
| company_id | UUID | FK → companies.id. |
| stage_id | UUID | FK → application_stages.id. |
| status | ENUM('planned','applied','interviewing','offer','rejected') | Current status. |
| applied_at | TIMESTAMPTZ | Application date. |
| response_at | TIMESTAMPTZ | Employer response date. |
| job_post_url | TEXT | URL to job posting. |
| source | TEXT | Origin (manual, import, prefill). |
| notes | TEXT | Additional notes. |
| listing_snapshot | JSONB | Snapshot of job at application time. |
| created_at | TIMESTAMPTZ | Creation timestamp. |
| updated_at | TIMESTAMPTZ | Update timestamp. |

---

### Table: application_events
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| job_application_id | UUID | FK → job_applications.id. |
| event_type | ENUM('note','interview','offer','follow_up') | Type of event. |
| occurred_at | TIMESTAMPTZ | Event time. |
| payload | JSONB | Metadata (e.g., interview details). |
| attachments | JSONB | Related files or links. |
| created_at | TIMESTAMPTZ | Creation timestamp. |

---

## Section 5 — Analytics

### Table: analytics_snapshots
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| user_id | UUID | FK → users.id. |
| period_start | DATE | Start of snapshot period. |
| period_end | DATE | End of snapshot period. |
| metric | ENUM('active_jobs','success_rate','avg_response') | Metric type. |
| value | NUMERIC | Metric value. |
| dimension | JSONB | Dimension info (e.g., by source). |
| created_at | TIMESTAMPTZ | Snapshot creation timestamp. |

---

## Section 6 — Operational Support

### Table: ingest_runs
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| job_source_id | UUID | FK → job_sources.id. |
| ats_organization_id | UUID | FK → ats_organizations.id. |
| started_at | TIMESTAMPTZ | Ingestion start time. |
| finished_at | TIMESTAMPTZ | Ingestion finish time. |
| status | TEXT | Status (success, error, partial). |
| result_count | INT | Total records processed. |
| new_count | INT | Newly added jobs. |
| updated_count | INT | Updated jobs. |
| errors | JSONB | Error payloads. |

---

### Table: dedupe_signatures
| Column Name | Type | Description |
|--------------|------|-------------|
| signature_hash | TEXT | Primary key. |
| company_id | UUID | FK → companies.id. |
| title_text | TEXT | Job title text. |
| location_text | TEXT | Location text. |
| first_seen_at | TIMESTAMPTZ | First appearance. |
| last_seen_at | TIMESTAMPTZ | Most recent appearance. |

---

### Table: listing_archives
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| job_listing_id | UUID | FK → job_listings.id. |
| captured_at | TIMESTAMPTZ | Archive timestamp. |
| payload | JSONB | Archived listing content. |

---

### Table: auth_events
| Column Name | Type | Description |
|--------------|------|-------------|
| id | UUID | Primary key. |
| user_id | UUID | FK → users.id. |
| event | TEXT | Event type (`login_success`, `login_failure`, `password_reset`, `oauth_linked`). |
| provider | TEXT | Provider name. |
| ip_address | INET | Origin IP address. |
| user_agent | TEXT | Device or browser user agent. |
| occurred_at | TIMESTAMPTZ | Event timestamp. |

---

## Summary Overview

| Section | Description | Key Tables |
|----------|--------------|-------------|
| Identity & Auth | Manages users, authentication, sessions, tokens, and security events. | users, user_auth_providers, sessions, email_verification_tokens, password_reset_tokens, auth_events |
| Job Aggregation | Handles job feeds, deduplication, and company/location normalization. | job_sources, ats_organizations, locations, companies, job_listings, job_tags, job_listing_tags, dedupe_signatures, ingest_runs, listing_archives |
| User Workspace | User interactions: bookmarks, saved searches, alerts, and job comparisons. | saved_jobs, search_history, saved_searches, job_alerts, job_alert_runs, job_comparison_sets, job_comparison_items |
| Applications & Workflow | Tracks users’ job application pipelines and events. | application_stages, job_applications, application_events |
| Analytics | Stores aggregated metrics for dashboards and performance reports. | analytics_snapshots |
| Operational Support | Internal monitoring, deduplication, archival, and ingestion auditing. | ingest_runs, dedupe_signatures, listing_archives, auth_events |

---

## Key Design Highlights

- UUIDs used throughout for safe global uniqueness.
- Strict foreign key constraints for referential integrity.
- ENUM types maintain controlled vocabularies (e.g., alert frequencies, job statuses).
- JSONB columns for flexible data structures.
- Audit columns (`created_at`, `updated_at`, `deleted_at`) ensure traceability.
- Soft-delete and archival features support compliance and recovery.

---