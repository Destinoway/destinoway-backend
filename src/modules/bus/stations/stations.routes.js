import express from "express";
import { getBusStations } from "./stations.controller.js";
import { validateBusStationsRequest } from "./validators/stations.validator.js";

const router = express.Router();

router.post("/", validateBusStationsRequest, getBusStations);

export default router;
