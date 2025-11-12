import { pool } from "../config/database.js";

const getDestinations = async (req, res) => {
  //   const id = parseInt(req.params.id);
  try {
    const results = await pool.query(
      `
            SELECT * FROM destinations ORDER BY id ASC
        `,
      []
    );
    res.status(201).json(results.rows);
  } catch (error) {
    res.status(409).json({
      error: error.message,
    });
  }
};

const getDestination = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const results = await pool.query(
      `
            SELECT * FROM destinations
            WHERE id = $1
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

const createDestination = async (req, res) => {
  //   const id = parseInt(req.params.id);
  const { destination, description, city, country, img_url, flag_img_url } =
    req.body;
  try {
    const results = await pool.query(
      `
             INSERT INTO destinations (
          destination,
          description,
          city,
          country,
          img_url,
          flag_img_url
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        `,
      [destination, description, city, country, img_url, flag_img_url]
    );
    res.status(201).json(results.rows[0]);
  } catch (error) {
    res.status(409).json({
      error: error.message,
    });
  }
};

const deleteDestination = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const results = await pool.query(
      `
            DELETE FROM destinations
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

const updateDestination = async (req, res) => {
  const id = parseInt(req.params.id);
  const { destination, description, city, country, img_url, flag_img_url } =
    req.body;
  try {
    const results = await pool.query(
      `
              UPDATE destinations
              SET destination= $1,
                    description= $2,
                    city= $3,
                    country= $4,
                    img_url= $5,
                    flag_img_url=$6
              WHERE id = $7
              RETURNING *
          `,
      [destination, description, city, country, img_url, flag_img_url, id]
    );
    res.status(200).json(results.rows[0]);
  } catch (error) {
    res.status(409).json({
      error: error.message,
    });
  }
};

export default {
  getDestinations,
  getDestination,
  createDestination,
  deleteDestination,
  updateDestination,
};
