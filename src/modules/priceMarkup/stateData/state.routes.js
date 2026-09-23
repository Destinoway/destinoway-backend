import express from "express";
import { getStatesByCountry } from "./stateController.js";

const router = express.Router();

// GET states by country code
// Example: /api/states/IN
router.get("/:code", getStatesByCountry);

export default router;