import express from "express";
import { startBusSearch, getBusSearchResults } from "./search.controller.js";
import { validateStartBusSearch, validateBusSearchResults } from "./validators/search.validator.js";

const router = express.Router();
router.post("/", validateStartBusSearch, startBusSearch);
router.post("/results", validateBusSearchResults, getBusSearchResults);
export default router;
