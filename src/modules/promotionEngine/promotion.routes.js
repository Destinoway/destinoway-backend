import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { checkPermission } from "../../middleware/checkPermission.js";
import {
  createCouponController,
  deleteCouponAdminController,
  getAllCouponsController,
  getSingleCouponController,
  updateCouponAdminController,
  updateCouponStatusController,
} from "./promotion.controller.js";

const router = express.Router();

router.get("/get-all-coupons", protect, checkPermission("couponCodes", "read"), getAllCouponsController);
router.get("/get-single-coupon/:id", protect, checkPermission("couponCodes", "read"), getSingleCouponController);
router.post("/create-coupon", protect, checkPermission("couponCodes", "write"), createCouponController);
router.put("/update-coupon/:id", protect, checkPermission("couponCodes", "update"), updateCouponAdminController);
router.patch("/coupon-status/:id", protect, checkPermission("couponCodes", "update"), updateCouponStatusController);
router.delete("/delete-coupon/:id", protect, checkPermission("couponCodes", "delete"), deleteCouponAdminController);

export default router;
