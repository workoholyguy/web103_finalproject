import express from "express";
import TripsDestinationControllers from "../controllers/tripsDestinations.js";

const router = express.Router();

// Retrieve all trip destinations
router.get("/", TripsDestinationControllers.getTripsDestinations);

// Retrieve all trips associated with a specific destination
router.get("/trips/:destination_id", TripsDestinationControllers.getAllTrips);

// Retrieve all destinations associated with a specific trip
router.get(
  "/destinations/:trip_id",
  TripsDestinationControllers.getAllDestinations
);

// Insert a new trip destination
router.post("/", TripsDestinationControllers.createTripDestination);

export default router;
