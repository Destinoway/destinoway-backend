import express from "express";

import {
  createSupport,
  getAllSupport,
  getSingleSupport,
  updateSupport,
  deleteSupport,
} from "./support.controller.js";

const router = express.Router();

router.post("/createSupport", createSupport);

router.get("/getAllSupport", getAllSupport);

router.get("/getSingleSupport/:supportType", getSingleSupport);

router.put("/updateSupport/:id", updateSupport);

router.delete("/deleteSupport/:id", deleteSupport);

export default router;