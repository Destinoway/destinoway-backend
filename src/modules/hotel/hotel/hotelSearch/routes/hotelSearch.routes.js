import express from "express";

import {
  searchHotelsController,
} from "../controller/hotelSearch.controller.js";

import {
  getHotelSearchResultsController,
} from "../controller/hotelSearchResult.controller.js";

const router = express.Router();

/**
 * Start hotel search
 */
router.post(
  "/search",
  searchHotelsController
);

/**
 * Get progressive hotel search results
 */
router.get(
  "/search/:searchId",
  getHotelSearchResultsController
);

export default router;