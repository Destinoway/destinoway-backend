
import express from "express";
import { searchHotels } from "./search.controller.js";
import { currencyMiddleware } from "../../../middleware/currency.middleware.js";

const router = express.Router();

router.post("/search",  currencyMiddleware, searchHotels);

export default router;