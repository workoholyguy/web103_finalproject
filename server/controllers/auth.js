import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { pool } from "../config/database.js";
import { mapUserFromRow, normalizeEmail } from "../utils/auth.js";

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
};

export default AuthController;
