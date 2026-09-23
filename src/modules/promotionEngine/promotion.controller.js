import HotelTempBooking
from "../hotel/hotelTempBooking/hotelTempBooking.model.js";

import {
  applyManualCoupon,
  createCouponService,
   getAllCouponsService,
  getSingleCouponService,
  updateCouponAdminService,
  updateCouponStatusService,
  deleteCouponAdminService,
  giftcard
} from "./promotion.service.js";

import {
  sendSuccess,
  sendError,
} from "../../utils/response/ApiResponse.js";


/*
====================================
ADMIN CREATE COUPON
====================================
*/

export const createCouponController =
  async (req, res) => {
    try {
      const data =
        await createCouponService(
          req.body
        );

      return sendSuccess(
        res,
        "Coupon created successfully",
        data
      );
    } catch (error) {
      return sendError(
        res,
        error.message
      );
    }
  };


/*
====================================
USER MANUAL APPLY COUPON
====================================
*/

export const applyCouponController =
  async (req, res) => {
    try {

      const {
        tempBookingId,
        couponCode,
      } = req.body;

      const booking =
        await HotelTempBooking.findById(
          tempBookingId
        );

      if (!booking) {
        throw new Error(
          "Booking not found"
        );
      }

      const data =
        await applyManualCoupon({
          booking,
          couponCode,
          module: "hotel",
        });

      return sendSuccess(
        res,
        "Coupon applied successfully",
        data
      );

    } catch (error) {
      return sendError(
        res,
        error.message
      );
    }
  };

  export const getAllCouponsController =
  async (req, res) => {
    try {
      const data =
        await getAllCouponsService(
          req.query
        );

      return sendSuccess(
        res,
        "Coupons fetched successfully",
        data
      );

    } catch (error) {
      return sendError(
        res,
        error.message
      );
    }
  };
  export const giftcardcontoroller =
  async (req, res) => {
    try {
      const data =
        await giftcard(
          req.query
        );

      return sendSuccess(
        res,
        "Coupons fetched successfully",
        data
      );

    } catch (error) {
      return sendError(
        res,
        error.message
      );
    }
  };


/*
====================================
GET SINGLE COUPON
====================================
*/
export const getSingleCouponController =
  async (req, res) => {
    try {
      const data =
        await getSingleCouponService(
          req.params.id
        );

      return sendSuccess(
        res,
        "Coupon fetched successfully",
        data
      );

    } catch (error) {
      return sendError(
        res,
        error.message
      );
    }
  };

/*
====================================
UPDATE COUPON
====================================
*/
export const updateCouponAdminController =
  async (req, res) => {
    try {
      const data =
        await updateCouponAdminService(
          req.params.id,
          req.body
        );

      return sendSuccess(
        res,
        "Coupon updated successfully",
        data
      );

    } catch (error) {
      return sendError(
        res,
        error.message
      );
    }
  };
  export const updateCouponStatusController =
  async (req, res) => {
    try {
      const data =
        await updateCouponStatusService(
          req.params.id,
          req.body.isActive
        );

      return sendSuccess(
        res,
        "Coupon status updated successfully",
        data
      );

    } catch (error) {
      return sendError(
        res,
        error.message
      );
    }
  };

  export const deleteCouponAdminController =
  async (req, res) => {
    try {
      const data =
        await deleteCouponAdminService(
          req.params.id
        );

      return sendSuccess(
        res,
        "Coupon deleted successfully",
        data
      );

    } catch (error) {
      return sendError(
        res,
        error.message
      );
    }
  };