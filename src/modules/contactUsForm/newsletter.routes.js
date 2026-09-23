import express from "express";
import {
  subscribeNewsletter,
  getAllSubscribers,
  unsubscribeNewsletter
} from "./newsletter.controller.js";

const router = express.Router();

// User subscribe
router.post("/subscribe", subscribeNewsletter);

// Admin get all
router.get("/all", getAllSubscribers);

// Unsubscribe
router.patch("/unsubscribe", unsubscribeNewsletter);

export default router;