import express from "express";
import JobsController from "../controllers/jobs.js";

const router = express.Router();

router.get("/search", JobsController.search);
router.get("/cached", JobsController.cached);
router.get("/refresh", JobsController.refreshCache);

export default router;
