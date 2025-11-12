import { pool } from "../config/database.js";

// Retrieve all trip destinations
const getTripsDestinations = async (req, res) => {
  //   const id = parseInt(req.params.id);
  try {
    const results = await pool.query(
      `
        SELECT * FROM trips_destinations ORDER BY trip_id ASC
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

// Retrieve all trips associated with a specific destination
const getAllTrips = async (req, res) => {
  const destination_id = parseInt(req.params.destination_id);

  try {
    const results = await pool.query(
      `
        SELECT * FROM trips_destinations
        WHERE destination_id = $1
        `,
      [destination_id]
    );

    res.status(200).json(results.rows);
  } catch (error) {
    res.status(409).json({
      error: error.message,
    });
  }
};

// Retrieve all destinations associated with a specific trip
const getAllDestinations = async (req, res) => {
  const trip_id = parseInt(req.params.trip_id);

  try {
    const results = await pool.query(
      `
        SELECT d.*
        FROM trips_destinations td
        JOIN destinations d ON d.id = td.destination_id
        WHERE td.trip_id = $1
        ORDER BY d.id ASC
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

// Insert a new trip destination
const createTripDestination = async (req, res) => {
  //   const id = parseInt(req.params.id);
  const { trip_id, destination_id } = req.body;

  try {
    const results = await pool.query(
      `
       INSERT INTO trips_destinations(
        trip_id,
        destination_id
       ) VALUES ($1,$2) RETURNING *
        `,
      [trip_id, destination_id]
    );

    res.status(201).json(results.rows[0]);
  } catch (error) {
    res.status(409).json({
      error: error.message,
    });
  }
};

export default {
  getTripsDestinations,
  getAllTrips,
  getAllDestinations,
  createTripDestination,
};
