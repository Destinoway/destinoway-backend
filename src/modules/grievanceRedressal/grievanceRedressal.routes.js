import express from "express";
import {
  createGrievance,
  getAllGrievance,
  getSingleGrievance,
  updateGrievance,
  deleteGrievance,
  getAllGrievanceAdmin,
  updateGrievanceStatusAdmin
} from "./grievanceRedressal.controller.js";

import { protectCustomer } from "../../middleware/customerAuth.middleware.js";
import { protect } from "../../middleware/auth.middleware.js";

const router = express.Router();

// WEBSITE

router.post(
  "/createGrievance",
  protectCustomer,
  createGrievance
);


router.get(
  "/getAllGrievance",
  protectCustomer,
  getAllGrievance
);

router.get(
  "/getSingleGrievance/:id",
  protectCustomer,
  getSingleGrievance
);

router.put(
  "/updateGrievance/:id",
  protectCustomer,
  updateGrievance
);

router.delete(
  "/:id",
  protectCustomer,
  deleteGrievance
);

//ADMIN

router.get(
  "/admin/all-grievance",protect,
  getAllGrievanceAdmin
);

router.patch(
  "/admin/update-grievance/:id",
  protect,
  updateGrievanceStatusAdmin
);
export default router;