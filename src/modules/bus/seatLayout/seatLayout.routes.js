import express from "express";
import { getBusSeatLayout } from "./seatLayout.controller.js";
import { validateBusSeatLayout } from "./validators/seatLayout.validator.js";

const router = express.Router();
router.post("/", validateBusSeatLayout, getBusSeatLayout);
export default router;
