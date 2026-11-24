import express from "express";
import { protectCustomer } from "../../../middleware/customerAuth.middleware.js";
import { createBusTravelItinerary } from "./travelItinerary.controller.js";
import { validateBusTravelItinerary } from "./validators/travelItinerary.validator.js";

const router = express.Router();
router.post("/", protectCustomer, validateBusTravelItinerary, createBusTravelItinerary);
export default router;
