import express
from "express";

import {
  razorpayWebhook,
  stripeWebhook
}
from "../controllers/webhook.controller.js";

const router =
  express.Router();

/*
 Razorpay webhook
*/
router.post(
  "/razorpay",
  razorpayWebhook
);

/*
 Stripe webhook
*/
router.post(
  "/stripe",
  stripeWebhook
);

export default router;