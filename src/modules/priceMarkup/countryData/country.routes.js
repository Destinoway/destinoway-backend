import express from "express";
import {
  seedCountryController,
  getCountries,
} from "../countryData/country.controller.js";

const router = express.Router();

// Run once to save countries in DB
router.get("/seed-countries", seedCountryController);

// Get countries from DB (dropdown use)
router.get("/countries", getCountries);

export default router;