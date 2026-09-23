import express from "express";
import { protectCustomer } from "./middleware/customerAuth.middleware.js";

const router = express.Router();

router.get("/test", protectCustomer, (req, res) => {
  res.json({
    success: true,
    message: "Protected route working",
    user: req.user,
  });
});

export default router;