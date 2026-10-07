import express from "express";
import {
  searchHotelsController,
} from "../controller/hotelSearch.controller.js";

const router = express.Router();

router.post(
  "/search",
  searchHotelsController
);

export default router;