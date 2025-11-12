import { pool } from "../config/database.js";

const getTripsUsers = async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT trip_id, user_id FROM trips_users ORDER BY trip_id ASC, user_id ASC"
    );
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTripsForUser = async (req, res) => {
  const userId = Number(req.params.user_id);
  if (Number.isNaN(userId)) {
    return res.status(400).json({ error: "user_id must be a number" });
  }

  try {
    const { rows } = await pool.query(
      `
        SELECT t.*
        FROM trips_users tu
        JOIN trips t ON tu.trip_id = t.id
        WHERE tu.user_id = $1
        ORDER BY t.start_date ASC
      `,
      [userId]
    );
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUsersForTrip = async (req, res) => {
  const tripId = Number(req.params.trip_id);
  if (Number.isNaN(tripId)) {
    return res.status(400).json({ error: "trip_id must be a number" });
  }

  try {
    const { rows } = await pool.query(
      `
        SELECT u.*
        FROM trips_users tu
        JOIN users u ON tu.user_id = u.id
        WHERE tu.trip_id = $1
        ORDER BY u.id ASC
      `,
      [tripId]
    );
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createTripUser = async (req, res) => {
  const { trip_id, user_id } = req.body;
  const tripId = Number(trip_id);
  const userId = Number(user_id);

  if (Number.isNaN(tripId) || Number.isNaN(userId)) {
    return res
      .status(400)
      .json({ error: "trip_id and user_id must be numbers" });
  }

  try {
    const { rows } = await pool.query(
      `
        INSERT INTO trips_users (trip_id, user_id)
        VALUES ($1, $2)
        RETURNING trip_id, user_id
      `,
      [tripId, userId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ error: "User is already associated with this trip" });
    }

    res.status(500).json({ error: error.message });
  }
};

const deleteTripUser = async (req, res) => {
  const tripId = Number(req.params.trip_id);
  const userId = Number(req.params.user_id);

  if (Number.isNaN(tripId) || Number.isNaN(userId)) {
    return res
      .status(400)
      .json({ error: "trip_id and user_id must be numbers" });
  }

  try {
    const { rows } = await pool.query(
      `
        DELETE FROM trips_users
        WHERE trip_id = $1 AND user_id = $2
        RETURNING trip_id, user_id
      `,
      [tripId, userId]
    );

    if (!rows[0]) {
      return res
        .status(404)
        .json({ error: "Association between trip and user not found" });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default {
  getTripsUsers,
  getTripsForUser,
  getUsersForTrip,
  createTripUser,
  deleteTripUser,
};
