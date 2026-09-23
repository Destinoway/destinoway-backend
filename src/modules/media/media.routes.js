import express from "express";
import multer from "multer";

import { protect } from "../../middleware/auth.middleware.js";

import { uploadMedia } from "./media.controller.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post("/upload", protect, upload.single("file"), uploadMedia);

export default router;
