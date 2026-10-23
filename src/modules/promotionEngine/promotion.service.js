import Coupon from "./coupon.model.js";

const roundCurrency = (value) => Number(value.toFixed(2));

export const getAutoApplyCoupons = async (module = "hotel") => {
  const now = new Date();
  return Coupon.find({
    applicableModules: module,
    isAutoApply: true,
    isActive: true,
    "validity.startDate": { $lte: now },
    "validity.endDate": { $gte: now },
    $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }],
  }).lean();
};

export const findBestCouponFromList = ({
  coupons = [],
  bookingAmount = 0,
  serviceTax = 0,
}) => {
  const amount = Number(bookingAmount) || 0;
  const tax = Number(serviceTax) || 0;
  let bestCoupon = null;
  let bestDiscount = 0;
  const availableCoupons = [];

  for (const coupon of coupons) {
    if (amount < Number(coupon.minAmount ?? 0)) continue;
    if (
      coupon.usageLimit !== null &&
      coupon.usageLimit !== undefined &&
      Number(coupon.usedCount ?? 0) >= Number(coupon.usageLimit)
    ) {
      continue;
    }

    let discount =
      coupon.discountType === "flat"
        ? Number(coupon.discountValue)
        : (amount * Number(coupon.discountValue)) / 100;

    const capPercent = Number(coupon.maxDiscountPercentOfServiceTax ?? 70);
    const maxAllowedDiscount = (tax * capPercent) / 100;
    discount = roundCurrency(Math.max(0, Math.min(discount, maxAllowedDiscount, amount)));

    if (discount <= 0) continue;

    availableCoupons.push({
      code: coupon.code,
      title: coupon.title,
      discount,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    });

    if (discount > bestDiscount) {
      bestDiscount = discount;
      bestCoupon = coupon;
    }
  }

  return { bestCoupon, bestDiscount, availableCoupons };
};

export const findBestCoupon = async ({
  module = "hotel",
  bookingAmount,
  serviceTax,
}) => {
  const coupons = await getAutoApplyCoupons(module);
  return findBestCouponFromList({ coupons, bookingAmount, serviceTax });
};

const asServiceError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

export const createCouponService = async (payload) => {
  try {
    return await Coupon.create({
      ...payload,
      code: String(payload.code ?? "").trim().toUpperCase(),
    });
  } catch (error) {
    if (error.code === 11000) throw asServiceError("Coupon code already exists", 409);
    throw error;
  }
};

export const getAllCouponsService = async (query = {}) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  const filter = {};
  if (query.isActive !== undefined) filter.isActive = query.isActive === "true";
  if (query.module) filter.applicableModules = query.module;
  if (query.search) filter.code = { $regex: String(query.search).trim(), $options: "i" };

  const [coupons, total] = await Promise.all([
    Coupon.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Coupon.countDocuments(filter),
  ]);
  return { coupons, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getSingleCouponService = async (id) => {
  const coupon = await Coupon.findById(id);
  if (!coupon) throw asServiceError("Coupon not found", 404);
  return coupon;
};

export const updateCouponAdminService = async (id, payload) => {
  const updates = { ...payload };
  if (updates.code !== undefined) updates.code = String(updates.code).trim().toUpperCase();
  try {
    const coupon = await Coupon.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
    if (!coupon) throw asServiceError("Coupon not found", 404);
    return coupon;
  } catch (error) {
    if (error.code === 11000) throw asServiceError("Coupon code already exists", 409);
    throw error;
  }
};

export const updateCouponStatusService = async (id, isActive) => {
  if (typeof isActive !== "boolean") {
    throw asServiceError("isActive must be a boolean");
  }
  const coupon = await Coupon.findByIdAndUpdate(
    id,
    { $set: { isActive } },
    { new: true, runValidators: true },
  );
  if (!coupon) throw asServiceError("Coupon not found", 404);
  return coupon;
};

export const deleteCouponAdminService = async (id) => {
  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) throw asServiceError("Coupon not found", 404);
  return { id: coupon._id };
};
