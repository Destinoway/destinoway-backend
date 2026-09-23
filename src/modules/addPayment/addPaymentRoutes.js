
import express from "express";
import { addPaymentController } from "./addPayment.controller.js";

const router = express.Router();

router.post("/AddBalance", addPaymentController);

export default router;