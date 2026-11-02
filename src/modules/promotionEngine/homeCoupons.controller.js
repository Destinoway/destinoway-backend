import { sendError, sendSuccess } from "../../utils/response/ApiResponse.js";
import { getHomeCouponsService } from "./homeCoupons.service.js";

export const getHomeCouponsController = async (req, res) => {
  try {
    const result = await getHomeCouponsService(req.query);
    res.setHeader("X-Home-Coupons-Cache", result.cacheHit ? "HIT" : "MISS");
    return sendSuccess(res, "Coupons fetched successfully", result.data);
  } catch (error) {
    return sendError(res, error.message || "Coupon request failed", error.statusCode || 400);
  }
};
