import express from "express";
import { getBusCancellationPolicy } from "./cancellationPolicy.controller.js";
import { validateBusCancellationPolicy } from "./validators/cancellationPolicy.validator.js";

const router = express.Router();
router.post("/", validateBusCancellationPolicy, getBusCancellationPolicy);
export default router;
