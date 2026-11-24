import express from "express";
import signatureRoutes from "./signature/signature.routes.js";
import stationsRoutes from "./stations/stations.routes.js";
import searchRoutes from "./search/search.routes.js";
import cancellationPolicyRoutes from "./cancellationPolicy/cancellationPolicy.routes.js";

// Only mounts each bus sub-module. Routes are defined inside
// each folder's own *.routes.js file.
const router = express.Router();

router.use("/signature", signatureRoutes);
router.use("/stations", stationsRoutes);
router.use("/search", searchRoutes);
router.use("/cancellation-policy", cancellationPolicyRoutes);

export default router;
