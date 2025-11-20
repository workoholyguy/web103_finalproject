import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { pool } from "../config/database.js";
import { mapUserFromRow, normalizeEmail } from "../utils/auth.js";

class AuthValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_EXPIRATION = process.env.JWT_ACCESS_EXPIRES_IN || "2h";

const parsePositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const SESSION_TTL_DAYS = parsePositiveNumber(process.env.SESSION_TTL_DAYS, 30);
const PASSWORD_SALT_ROUNDS = parsePositiveNumber(
  process.env.AUTH_SALT_ROUNDS,
  10
);

const hasOwn = (obj = {}, key) =>
  Object.prototype.hasOwnProperty.call(obj ?? {}, key);

const parseOptionalString = (value, field) => {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new AuthValidationError(`${field} must be a string`);
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const parseOptionalAvatarUrl = (value) => {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new AuthValidationError("avatarUrl must be a string");
  }
  const trimmed = value.trim();
  if (!trimmed.length) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Invalid protocol");
    }
    return url.toString();
  } catch {
    throw new AuthValidationError("avatarUrl must be a valid http(s) URL");
  }
};

const parseProfileUpdatePayload = (body = {}) => {
  const updates = {};
  let touched = false;

  if (hasOwn(body, "displayName")) {
    touched = true;
    const value =
      body.displayName === undefined
        ? undefined
        : parseOptionalString(body.displayName, "displayName");
    updates.displayName = value;
  }

  if (hasOwn(body, "timezone")) {
    touched = true;
    const value =
      body.timezone === undefined
        ? undefined
        : parseOptionalString(body.timezone, "timezone");
    updates.timezone = value;
  }

  if (hasOwn(body, "avatarUrl")) {
    touched = true;
    updates.avatarUrl = parseOptionalAvatarUrl(body.avatarUrl ?? null);
  }

  if (!touched) {
    throw new AuthValidationError("At least one field must be provided");
  }

  return updates;
};

const hashToken = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex");

const buildAccessToken = (userId, sessionId) => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET env variable is required");
  }

  return jwt.sign(
    {
      sub: userId,
      sid: sessionId,
    },
    JWT_SECRET,
    {
      expiresIn: ACCESS_EXPIRATION,
    }
  );
};

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim().length) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length) {
    return forwarded[0];
  }
  return req.ip || req.connection?.remoteAddress || null;
};

const recordAuthEvent = async ({
  userId,
  event,
  provider = "password",
  ipAddress,
  userAgent,
}) => {
  if (!userId) return;
  try {
    await pool.query(
      `
        INSERT INTO auth_events (user_id, event, provider, ip_address, user_agent, occurred_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `,
      [userId, event, provider, ipAddress || null, userAgent || null]
    );
  } catch (error) {
    console.warn("[auth] failed to record auth event", error.message);
  }
};

const buildSession = async ({ userId, ipAddress, userAgent }) => {
  const refreshToken = crypto.randomBytes(48).toString("hex");
  const refreshHash = hashToken(refreshToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  const { rows } = await pool.query(
    `
      INSERT INTO sessions (
        user_id,
        session_token_hash,
        refresh_token_hash,
        ip_address,
        user_agent,
        created_at,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      RETURNING id, expires_at
    `,
    [
      userId,
      refreshHash,
      refreshHash,
      ipAddress || null,
      userAgent || null,
      expiresAt.toISOString(),
    ]
  );

  const row = rows[0];
  if (!row?.id) {
    throw new Error("Unable to create session");
  }

  return {
    sessionId: row.id,
    refreshToken,
    expiresAt: row.expires_at || expiresAt.toISOString(),
  };
};

const buildAuthResponse = async (userRow, req) => {
  const session = await buildSession({
    userId: userRow.id,
    ipAddress: getClientIp(req),
    userAgent: req.headers["user-agent"],
  });

  const accessToken = buildAccessToken(userRow.id, session.sessionId);

  return {
    user: mapUserFromRow(userRow),
    accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
  };
};

const findUserByEmail = async (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const { rows } = await pool.query(
    `
      SELECT
        id,
        email,
        password_hash,
        display_name,
        avatar_url,
        timezone,
        email_verified_at,
        last_login_at,
        created_at,
        updated_at
      FROM users
      WHERE LOWER(email) = $1
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [normalized]
  );
  return rows[0] || null;
};

const findUserById = async (id) => {
  if (!id) return null;
  const { rows } = await pool.query(
    `
      SELECT
        id,
        email,
        password_hash,
        display_name,
        avatar_url,
        timezone,
        email_verified_at,
        last_login_at,
        created_at,
        updated_at
      FROM users
      WHERE id = $1
    `,
    [id]
  );
  return rows[0] || null;
};

const ensurePasswordMatches = async (userRow, password, errorMessage) => {
  if (!userRow?.password_hash) {
    throw new AuthValidationError(errorMessage || "Invalid credentials");
  }
  const matches = await bcrypt.compare(password, userRow.password_hash);
  if (!matches) {
    throw new AuthValidationError(errorMessage || "Invalid credentials");
  }
};

const AuthController = {
  async register(req, res) {
    try {
      const email = normalizeEmail(req.body?.email);
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      const displayName =
        typeof req.body?.displayName === "string"
          ? req.body.displayName.trim()
          : null;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      if (!password || password.length < 8) {
        return res
          .status(400)
          .json({ error: "Password must be at least 8 characters long" });
      }

      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: "Email is already registered" });
      }

      const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
      const { rows } = await pool.query(
        `
          INSERT INTO users (
            email,
            password_hash,
            display_name,
            created_at,
            updated_at,
            last_login_at
          )
          VALUES ($1, $2, $3, NOW(), NOW(), NOW())
          RETURNING
            id,
            email,
            display_name,
            avatar_url,
            timezone,
            email_verified_at,
            last_login_at,
            created_at,
            updated_at
        `,
        [email, passwordHash, displayName]
      );

      const userRow = rows[0];
      if (!userRow) {
        return res.status(500).json({ error: "Unable to create user account" });
      }

      try {
        await pool.query(
          `
            INSERT INTO user_auth_providers (
              user_id,
              provider,
              provider_user_id,
              created_at,
              updated_at
            )
            VALUES ($1, 'password', $2, NOW(), NOW())
          `,
          [userRow.id, email]
        );
      } catch (providerError) {
        if (providerError.code !== "23505") {
          console.warn("[auth] failed to insert auth provider", providerError);
        }
      }

      await recordAuthEvent({
        userId: userRow.id,
        event: "login_success",
        provider: "password",
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"],
      });

      const payload = await buildAuthResponse(userRow, req);
      return res.status(201).json(payload);
    } catch (error) {
      console.error("[auth] register failed:", error);
      return res.status(500).json({ error: "Unable to create account right now" });
    }
  },

  async login(req, res) {
    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required to sign in" });
    }

    const userRow = await findUserByEmail(email);
    if (!userRow?.password_hash) {
      await recordAuthEvent({
        userId: userRow?.id,
        event: "login_failure",
        provider: "password",
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"],
      });
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isValid = await bcrypt.compare(password, userRow.password_hash);
    if (!isValid) {
      await recordAuthEvent({
        userId: userRow.id,
        event: "login_failure",
        provider: "password",
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"],
      });
      return res.status(401).json({ error: "Invalid email or password" });
    }

    await pool.query("UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1", [
      userRow.id,
    ]);
    await recordAuthEvent({
      userId: userRow.id,
      event: "login_success",
      provider: "password",
      ipAddress: getClientIp(req),
      userAgent: req.headers["user-agent"],
    });

    const payload = await buildAuthResponse(userRow, req);
    return res.status(200).json(payload);
  },

  async refresh(req, res) {
    try {
      const refreshToken =
        typeof req.body?.refreshToken === "string" ? req.body.refreshToken : "";
      if (!refreshToken) {
        return res.status(400).json({ error: "refreshToken is required" });
      }

      const tokenHash = hashToken(refreshToken);
      const { rows } = await pool.query(
        `
          SELECT
            sessions.id AS session_id,
            sessions.user_id,
            sessions.expires_at,
            sessions.invalidated_at,
            users.id,
            users.email,
            users.display_name,
            users.avatar_url,
            users.timezone,
            users.email_verified_at,
            users.last_login_at,
            users.created_at,
            users.updated_at
          FROM sessions
          JOIN users ON users.id = sessions.user_id
          WHERE sessions.refresh_token_hash = $1
          LIMIT 1
        `,
        [tokenHash]
      );

      const session = rows[0];
      if (!session) {
        return res.status(401).json({ error: "Invalid refresh token" });
      }

      if (session.invalidated_at) {
        return res.status(401).json({ error: "Session has been revoked" });
      }

      if (session.expires_at && new Date(session.expires_at) < new Date()) {
        return res.status(401).json({ error: "Session has expired" });
      }

      const nextRefreshToken = crypto.randomBytes(48).toString("hex");
      const nextHash = hashToken(nextRefreshToken);
      const nextExpiry = new Date();
      nextExpiry.setDate(nextExpiry.getDate() + SESSION_TTL_DAYS);

      await pool.query(
        `
          UPDATE sessions
          SET
            refresh_token_hash = $1,
            session_token_hash = $1,
            expires_at = $2
          WHERE id = $3
        `,
        [nextHash, nextExpiry.toISOString(), session.session_id]
      );

      const accessToken = buildAccessToken(session.user_id, session.session_id);

      return res.status(200).json({
        user: mapUserFromRow(session),
        accessToken,
        refreshToken: nextRefreshToken,
        expiresAt: nextExpiry.toISOString(),
      });
    } catch (error) {
      console.error("[auth] refresh failed:", error);
      return res.status(500).json({ error: "Unable to refresh session right now" });
    }
  },

  async logout(req, res) {
    try {
      const refreshToken =
        typeof req.body?.refreshToken === "string" ? req.body.refreshToken : "";
      if (!refreshToken) {
        return res.status(400).json({ error: "refreshToken is required" });
      }
      const tokenHash = hashToken(refreshToken);
      await pool.query(
        `
          UPDATE sessions
          SET invalidated_at = NOW()
          WHERE refresh_token_hash = $1 AND invalidated_at IS NULL
        `,
        [tokenHash]
      );
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("[auth] logout failed:", error);
      return res.status(500).json({ error: "Unable to logout right now" });
    }
  },

  async me(req, res) {
    return res.status(200).json({ user: req.user });
  },

  async updateProfile(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const updates = parseProfileUpdatePayload(req.body || {});
      const setClauses = [];
      const values = [];
      let idx = 1;

      if (updates.displayName !== undefined) {
        setClauses.push(`display_name = $${idx}`);
        values.push(updates.displayName);
        idx += 1;
      }

      if (updates.timezone !== undefined) {
        setClauses.push(`timezone = $${idx}`);
        values.push(updates.timezone);
        idx += 1;
      }

      if (updates.avatarUrl !== undefined) {
        setClauses.push(`avatar_url = $${idx}`);
        values.push(updates.avatarUrl);
        idx += 1;
      }

      setClauses.push("updated_at = NOW()");

      const query = `
        UPDATE users
        SET ${setClauses.join(", ")}
        WHERE id = $${idx}
        RETURNING
          id,
          email,
          display_name,
          avatar_url,
          timezone,
          email_verified_at,
          last_login_at,
          created_at,
          updated_at
      `;

      const { rows } = await pool.query(query, [...values, userId]);
      if (!rows.length) {
        return res.status(404).json({ error: "User not found" });
      }

      const user = mapUserFromRow(rows[0]);
      req.user = user;
      return res.status(200).json({ user });
    } catch (error) {
      if (error instanceof AuthValidationError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("[auth] update profile failed:", error);
      return res.status(500).json({ error: "Unable to update profile right now" });
    }
  },

  async updateEmail(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const rawEmail = req.body?.email;
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      const email = normalizeEmail(rawEmail);

      if (!email) {
        throw new AuthValidationError("A valid email is required");
      }
      if (!password) {
        throw new AuthValidationError("Password is required to change email");
      }
      if (email === req.user?.email?.toLowerCase()) {
        throw new AuthValidationError("Please enter a different email address");
      }

      const existing = await findUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "Email is already in use" });
      }

      const userRow = await findUserById(userId);
      if (!userRow) {
        return res.status(404).json({ error: "User not found" });
      }

      await ensurePasswordMatches(userRow, password, "Incorrect password");

      const { rows } = await pool.query(
        `
          UPDATE users
          SET email = $1,
              updated_at = NOW()
          WHERE id = $2
          RETURNING
            id,
            email,
            display_name,
            avatar_url,
            timezone,
            email_verified_at,
            last_login_at,
            created_at,
            updated_at
        `,
        [email, userId]
      );

      try {
        await pool.query(
          `
            UPDATE user_auth_providers
            SET provider_user_id = $1,
                updated_at = NOW()
            WHERE user_id = $2 AND provider = 'password'
          `,
          [email, userId]
        );
      } catch (error) {
        console.warn("[auth] failed to sync auth provider email:", error);
      }

      const updated = mapUserFromRow(rows[0]);
      req.user = updated;
      return res.status(200).json({ user: updated });
    } catch (error) {
      if (error instanceof AuthValidationError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("[auth] update email failed:", error);
      return res.status(500).json({ error: "Unable to update email right now" });
    }
  },

  async updatePassword(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const currentPassword =
        typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
      const newPassword =
        typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

      if (!currentPassword || !newPassword) {
        throw new AuthValidationError(
          "Current password and new password are both required"
        );
      }
      if (newPassword.length < 8) {
        throw new AuthValidationError("New password must be at least 8 characters long");
      }
      if (currentPassword === newPassword) {
        throw new AuthValidationError(
          "New password must be different from your current password"
        );
      }

      const userRow = await findUserById(userId);
      if (!userRow) {
        return res.status(404).json({ error: "User not found" });
      }

      await ensurePasswordMatches(
        userRow,
        currentPassword,
        "Current password is incorrect"
      );

      const passwordHash = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);

      await pool.query(
        `
          UPDATE users
          SET password_hash = $1,
              updated_at = NOW()
          WHERE id = $2
        `,
        [passwordHash, userId]
      );

      await recordAuthEvent({
        userId,
        event: "password_reset",
        provider: "password",
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"],
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      if (error instanceof AuthValidationError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("[auth] update password failed:", error);
      return res
        .status(500)
        .json({ error: "Unable to update password right now" });
    }
  },
};

export default AuthController;
