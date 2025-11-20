import express from "express";
import ApplicationsController from "../controllers/applications.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", ApplicationsController.list);
router.post("/", ApplicationsController.create);
router.patch("/:id/status", ApplicationsController.updateStatus);
router.patch("/:id", ApplicationsController.update);
router.delete("/:id", ApplicationsController.remove);

export default router;
