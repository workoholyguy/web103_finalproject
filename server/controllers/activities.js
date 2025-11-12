import { pool } from "../config/database.js";

const getActivities = async (req, res) => {
  try {
    const results = await pool.query(
      `
            SELECT * FROM activities ORDER BY id ASC
        `,
      []
    );
    res.status(200).json(results.rows);
  } catch (error) {
    res.status(409).json({
      error: error.message,
    });
  }
};
const getTripActivities = async (req, res) => {
  const trip_id = parseInt(req.params.trip_id);
  try {
    const results = await pool.query(
      `
            SELECT * FROM activities
            WHERE trip_id = $1
        `,
      [trip_id]
    );
    res.status(200).json(results.rows);
  } catch (error) {
    res.status(409).json({
      error: error.message,
    });
  }
};
const createActivity = async (req, res) => {
  const trip_id = parseInt(req.params.trip_id);

  const { activity, num_votes } = req.body;
  try {
    const results = await pool.query(
      `
            INSERT INTO activities(
                trip_id, activity, num_votes
            ) VALUES(
            $1, $2, $3
            ) RETURNING *
        `,
      [trip_id, activity, num_votes]
    );
    res.status(201).json(results.rows[0]);
  } catch (error) {
    res.status(409).json({
      error: error.message,
    });
  }
};
const updateActivityLikes = async (req, res) => {
  const id = parseInt(req.params.id);
  const { activity, num_votes } = req.body;
  try {
    const results = await pool.query(
      `
            UPDATE activities
            SET activity = $1,
                num_votes = $2
            WHERE id = $3
            RETURNING *
        `,
      [activity, num_votes, id]
    );
    res.status(200).json(results.rows[0]);
  } catch (error) {
    res.status(409).json({
      error: error.message,
    });
  }
};
const deleteActivity = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const results = await pool.query(
      `
            DELETE FROM activities
            WHERE id = $1
            RETURNING *
        `,
      [id]
    );
    res.status(200).json(results.rows[0]);
  } catch (error) {
    res.status(409).json({
      error: error.message,
    });
  }
};

export default {
  getActivities,
  getTripActivities,
  createActivity,
  updateActivityLikes,
  deleteActivity,
};
