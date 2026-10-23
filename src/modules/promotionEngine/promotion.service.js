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
