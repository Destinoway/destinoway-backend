import {
  createCouponService,
  deleteCouponAdminService,
  getAllCouponsService,
  getSingleCouponService,
  updateCouponAdminService,
  updateCouponStatusService,
} from "./promotion.service.js";
import { sendError, sendSuccess } from "../../utils/response/ApiResponse.js";

const handleError = (res, error) =>
  sendError(res, error.message || "Coupon request failed", error.statusCode || 400);

export const createCouponController = async (req, res) => {
  try {
    const data = await createCouponService(req.body);
    return sendSuccess(res, "Coupon created successfully", data);
  } catch (error) {
    return handleError(res, error);
  }
};

export const getAllCouponsController = async (req, res) => {
  try {
    const data = await getAllCouponsService(req.query);
    return sendSuccess(res, "Coupons fetched successfully", data);
  } catch (error) {
    return handleError(res, error);
  }
};

export const getSingleCouponController = async (req, res) => {
  try {
    const data = await getSingleCouponService(req.params.id);
    return sendSuccess(res, "Coupon fetched successfully", data);
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateCouponAdminController = async (req, res) => {
  try {
    const data = await updateCouponAdminService(req.params.id, req.body);
    return sendSuccess(res, "Coupon updated successfully", data);
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateCouponStatusController = async (req, res) => {
  try {
    const data = await updateCouponStatusService(req.params.id, req.body.isActive);
    return sendSuccess(res, "Coupon status updated successfully", data);
  } catch (error) {
    return handleError(res, error);
  }
};

export const deleteCouponAdminController = async (req, res) => {
  try {
    const data = await deleteCouponAdminService(req.params.id);
    return sendSuccess(res, "Coupon deleted successfully", data);
  } catch (error) {
    return handleError(res, error);
  }
};
