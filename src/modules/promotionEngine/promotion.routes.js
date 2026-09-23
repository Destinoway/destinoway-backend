// import express from "express";

// import {
//   createCouponController,
//   deleteCouponAdminController,
//   getAllCouponsController,
//   getSingleCouponController,
//   updateCouponAdminController,
//   updateCouponStatusController,
//   giftcardcontoroller
// } from "./promotion.controller.js";

// import { protect } from "../../middleware/auth.middleware.js";
// const router = express.Router();

// router.post("/create-coupon", protect, createCouponController);
// router.get("/get-all-giftCard",  giftcardcontoroller);
// router.get("/get-all-coupons", protect, getAllCouponsController);
// router.get("/get-single-coupon/:id", protect, getSingleCouponController);
// router.put("/update-coupon/:id", protect, updateCouponAdminController);
// router.patch("/coupon-status/:id", updateCouponStatusController);
// router.delete("/delete-coupon/:id", deleteCouponAdminController);

// export default router;

import express from "express";

import { protect } from "../../middleware/auth.middleware.js";
import { checkPermission } from "../../middleware/checkPermission.js";
import {
  createCouponController,
  deleteCouponAdminController,
  getAllCouponsController,
  getSingleCouponController,
  giftcardcontoroller,
  updateCouponAdminController,
  updateCouponStatusController,
} from "./promotion.controller.js";
const router = express.Router();

router.get("/get-all-giftCard", giftcardcontoroller);

router.patch("/coupon-status/:id", updateCouponStatusController);
router.delete("/delete-coupon/:id", deleteCouponAdminController);

//Admin routes
router.get(
  "/get-all-coupons",
  protect,
  checkPermission("couponCodes", "read"),
  getAllCouponsController,
);
router.get(
  "/get-single-coupon/:id",
  protect,
  checkPermission("couponCodes", "read"),
  getSingleCouponController,
);
router.put(
  "/update-coupon/:id",
  protect,
  checkPermission("couponCodes", "update"),
  updateCouponAdminController,
);
router.post(
  "/create-coupon",
  protect,
  checkPermission("couponCodes", "write"),
  createCouponController,
);
router.delete(
  "/delete-coupon/:id",
  protect,
  checkPermission("couponCodes", "delete"),
  deleteCouponAdminController,
);
export default router;
