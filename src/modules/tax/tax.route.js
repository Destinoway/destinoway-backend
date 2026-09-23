import express from "express";

import { protect } from "../../middleware/auth.middleware.js";
import {
  createTaxRule,
  deleteTaxRule,
  getAllTaxRules,
  toggleTaxStatus,
  updateTaxRule,
} from "./tax.controller.js";

const router = express.Router();

router.post("/create", protect, createTaxRule);

router.get("/all", protect, getAllTaxRules);

router.put("/update/:id", protect, updateTaxRule);

router.patch("/status/:id", protect, toggleTaxStatus);

router.delete("/delete/:id", protect, deleteTaxRule);

export default router;
