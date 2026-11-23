import express from "express";
import { sendSuccess, sendError } from "../../../utils/response/ApiResponse.js";
import { getCities } from "./city.service.js";

const router = express.Router();

// GET /api/v1/cities?countryCode=IN&state=Rajasthan&search=jai
router.get("/", async (req, res) => {
  try {
    const data = await getCities(req.query);
    return sendSuccess(res, "Cities fetched successfully", data);
  } catch (error) {
    return sendError(res, error.statusCode ? error.message : "Failed to fetch cities", error.statusCode || 500, error.details);
  }
});

export default router;
