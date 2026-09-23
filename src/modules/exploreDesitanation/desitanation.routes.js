import express from "express";
import {
  createDestination,
  deleteDestination,
  getDestinations,
  getHomeDestinationsController,
  updateDestination,
} from "./desitanation.controller.js";

const router = express.Router();

router.get("/", getHomeDestinationsController);

import { protect } from "../../middleware/auth.middleware.js";
import { checkPermission } from "../../middleware/checkPermission.js";

//const router = express.Router();

// Admin Panel
router.post(
  "/createDestination",
  protect,
  checkPermission("destination", "write"),
  createDestination,
);

router.put(
  "/:id",
  protect,
  checkPermission("destination", "update"),
  updateDestination,
);

router.delete(
  "/:id",
  protect,
  checkPermission("destination", "delete"),
  deleteDestination,
);

// Public
router.get(
  "/admin",
  protect,
  checkPermission("destination", "read"),
  getDestinations,
);

export default router;
