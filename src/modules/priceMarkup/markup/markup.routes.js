import express from "express";
import {
  createMarkup,
  getAllMarkups,
  updateMarkup,
  deleteMarkup,
  toggleMarkupStatus
} from "./markup.controller.js";
import { checkPermission } from "../../../middleware/checkPermission.js";
import { protect } from "../../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/createMarkup",protect,checkPermission("Markups","create"), createMarkup);
router.get("/getAllMarkups",protect,checkPermission("Markups","read"), getAllMarkups);
router.patch("/status/:id",protect, checkPermission("Markups","update"),toggleMarkupStatus);
router.put("/:id",protect,checkPermission("Markups","update"), updateMarkup);
router.delete("/:id",protect, checkPermission("Markups","delete"),deleteMarkup);

export default router;

