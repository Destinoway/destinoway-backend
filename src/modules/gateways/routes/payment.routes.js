import express from "express";

import { protectCustomer } from "../../../middleware/customerAuth.middleware.js";
import idempotencyMiddleware from "../../../middleware/idempotency.middleware.js";

import { createOrder, verifyPayment ,refund} from "../controllers/payment.controller.js";

const router = express.Router();

router.post("/create-order",protectCustomer,createOrder);

router.post("/verify-payment", protectCustomer, verifyPayment);
router.post( "/refund", protectCustomer, refund);

export default router;
