
import express from "express";
import { searchHotels } from "./search.controller.js";

const router = express.Router();

router.post("/search", searchHotels);

export default router;