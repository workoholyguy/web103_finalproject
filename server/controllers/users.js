import { pool } from "../config/database.js";

const getUsers = async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users ORDER BY id ASC");
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUser = async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "id must be a number" });
  }

  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [
      id,
    ]);

    if (!rows[0]) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createUser = async (req, res) => {
  const { github, username, avatarurl, accesstoken } = req.body;

  if (!github || !username || !avatarurl || !accesstoken) {
    return res.status(400).json({
      error: "github, username, avatarurl, and accesstoken are required",
    });
  }

  try {
    const { rows } = await pool.query(
      `
        INSERT INTO users (github, username, avatarurl, accesstoken)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [github, username, avatarurl, accesstoken]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "User already exists" });
    }

    res.status(500).json({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "id must be a number" });
  }

  const { github, username, avatarurl, accesstoken } = req.body;

  try {
    const { rows } = await pool.query(
      `
        UPDATE users
        SET github = COALESCE($1, github),
            username = COALESCE($2, username),
            avatarurl = COALESCE($3, avatarurl),
            accesstoken = COALESCE($4, accesstoken)
        WHERE id = $5
        RETURNING *
      `,
      [github, username, avatarurl, accesstoken, id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteUser = async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "id must be a number" });
  }

  try {
    await pool.query("DELETE FROM trips_users WHERE user_id = $1", [id]);
    const { rows } = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING *",
      [id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
};
