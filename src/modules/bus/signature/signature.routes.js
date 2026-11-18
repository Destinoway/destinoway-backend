import express from "express";
import {
  checkBusSignature,
  getBusHealth,
} from "./signature.controller.js";

const router = express.Router();

router.get("/health", getBusHealth);
router.get("/check", checkBusSignature);

export default router;
