import express from "express";
import { getBusAmenities } from "./amenities.controller.js";
import { validateBusAmenities } from "./validators/amenities.validator.js";

const router = express.Router();
router.post("/", validateBusAmenities, getBusAmenities);
export default router;
