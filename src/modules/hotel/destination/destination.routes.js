import express from "express";
import { searchDestination } from "./destination.controller.js";

const router = express.Router();

router.post("/search", searchDestination);

export default router;