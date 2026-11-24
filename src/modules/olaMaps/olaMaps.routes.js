import express from "express";
import {
  getAutocomplete,
  getPlaceDetails,
} from "./olaMaps.controller.js";
import {
  validateAutocompleteRequest,
  validatePlaceDetailsRequest,
} from "./olaMaps.validator.js";

const router = express.Router();

router.get("/autocomplete", validateAutocompleteRequest, getAutocomplete);
router.get("/place-details", validatePlaceDetailsRequest, getPlaceDetails);

export default router;
