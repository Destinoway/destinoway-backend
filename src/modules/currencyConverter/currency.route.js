import express from "express";

import { getCurrencies } from "./currency.controller.js";

const router = express.Router();

router.get("/list", getCurrencies);

export default router;
