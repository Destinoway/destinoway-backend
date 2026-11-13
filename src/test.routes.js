// import express from "express";
// import { protectCustomer } from "./middleware/customerAuth.middleware.js";

// const router = express.Router();

// router.get("/test", protectCustomer, (req, res) => {
//   res.json({
//     success: true,
//     message: "Protected route working",
//     user: req.user,
//   });
// });

// export default router;

import express from "express";
import { protectCustomer } from "./middleware/customerAuth.middleware.js";

const router = express.Router();

// Public DEV deployment test
router.get("/dev-test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "DEV backend deployment is working",
    environment: process.env.NODE_ENV || "development",
    server: "AWS DEV",
    timestamp: new Date().toISOString(),
  });
});

// Existing protected test
router.get("/test", protectCustomer, (req, res) => {
  res.json({
    success: true,
    message: "Protected route working",
    user: req.user,
  });
});

export default router;
