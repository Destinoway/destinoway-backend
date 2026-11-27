import { Router } from "express";
import { protect } from "../../../middleware/auth.middleware.js";
import { checkPermission } from "../../../middleware/checkPermission.js";
import { createPaymentGatewayConfigController } from "../controllers/paymentGateway.controller.js";

const router = Router();

router.post("/", protect, checkPermission("paymentGateways", "write"), createPaymentGatewayConfigController);

export default router;
