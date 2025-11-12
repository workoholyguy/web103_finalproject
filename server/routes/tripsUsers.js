import express from "express";
import TripsUsersController from "../controllers/tripsUsers.js";

const router = express.Router();

router.get("/", TripsUsersController.getTripsUsers);
router.get("/user/:user_id", TripsUsersController.getTripsForUser);
router.get("/trip/:trip_id", TripsUsersController.getUsersForTrip);
router.post("/", TripsUsersController.createTripUser);
router.delete("/trip/:trip_id/user/:user_id", TripsUsersController.deleteTripUser);

export default router;
