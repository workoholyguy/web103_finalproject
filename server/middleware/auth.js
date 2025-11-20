import jwt from "jsonwebtoken";
import { pool } from "../config/database.js";
import { mapUserFromRow } from "../utils/auth.js";

const JWT_SECRET = process.env.JWT_SECRET;

const extractBearerToken = (req) => {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (typeof header !== "string") return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
};

const fetchSessionWithUser = async (sessionId) => {
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
      WHERE sessions.id = $1
      LIMIT 1
    `,
    [sessionId]
  );
  return rows[0] || null;
};

const applyAuthContext = async (req) => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET env variable is not configured");
  }
  const token = extractBearerToken(req);
  if (!token) {
    const error = new Error("Missing Authorization header");
    error.status = 401;
    throw error;
  }

  const payload = jwt.verify(token, JWT_SECRET);
  if (!payload?.sid) {
    const error = new Error("Invalid token payload");
    error.status = 401;
    throw error;
  }

  const session = await fetchSessionWithUser(payload.sid);
  if (!session) {
    const error = new Error("Session not found");
    error.status = 401;
    throw error;
  }

  if (session.invalidated_at) {
    const error = new Error("Session is no longer valid");
    error.status = 401;
    throw error;
  }

  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    const error = new Error("Session has expired");
    error.status = 401;
    throw error;
  }

  req.user = mapUserFromRow(session);
  req.auth = {
    sessionId: session.session_id,
    userId: session.user_id,
  };
};

export const requireAuth = async (req, res, next) => {
  try {
    await applyAuthContext(req);
    next();
  } catch (error) {
    const status = error.status || (error.name === "TokenExpiredError" ? 401 : 500);
    const message =
      status === 401 ? "Invalid or expired authentication token" : "Unable to verify session";
    console.error("[auth] requireAuth failed:", error.message || error);
    res.status(status).json({ error: message });
  }
};

export const attachUserIfPresent = async (req, _res, next) => {
  try {
    await applyAuthContext(req);
  } catch {
    // ignore failures for optional auth
  } finally {
    next();
  }
};
