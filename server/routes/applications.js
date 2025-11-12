import express from "express";
import ApplicationsController from "../controllers/applications.js";

const router = express.Router();

router.get("/", ApplicationsController.list);

export default router;
