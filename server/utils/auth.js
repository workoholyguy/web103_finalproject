export const normalizeEmail = (value = "") =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const mapUserFromRow = (row = {}) => {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    timezone: row.timezone,
    emailVerifiedAt: row.email_verified_at,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};
