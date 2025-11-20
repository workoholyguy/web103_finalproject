import express from "express";
import AuthController from "../controllers/auth.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refresh);
router.post("/logout", AuthController.logout);
router.get("/me", requireAuth, AuthController.me);
router.patch("/me", requireAuth, AuthController.updateProfile);
router.patch("/email", requireAuth, AuthController.updateEmail);
router.patch("/password", requireAuth, AuthController.updatePassword);

export default router;
