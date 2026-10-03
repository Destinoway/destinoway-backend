import { Router } from "express";

const router = Router();

router.get("/health", async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Destinoway backend is healthy",
      environment: process.env.NODE_ENV || "development",
      service: "destinoway-backend",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Backend health check failed",
    });
  }
});

export default router;
