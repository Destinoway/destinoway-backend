import Coupon from "./coupon.model.js";

export const findBestCoupon =
  async ({
    module,
    bookingAmount,
    serviceTax,
  }) => {
    const coupons =
      await Coupon.find({
        applicableModules:
          module,
        isAutoApply: true,
        isActive: true,
      });

    let bestCoupon = null;
    let bestDiscount = 0;

    const maxAllowedDiscount =
      serviceTax * 0.7;

    let availableCoupons =
      [];

    for (const coupon of coupons) {
      if (
        bookingAmount <
        coupon.minAmount
      ) {
        continue;
      }

      let discount = 0;

      if (
        coupon.discountType ===
        "flat"
      ) {
        discount =
          coupon.discountValue;
      }

      if (
        coupon.discountType ===
        "percent"
      ) {
        discount =
          (bookingAmount *
            coupon.discountValue) /
          100;
      }

      // cap discount
      if (
        discount >
        maxAllowedDiscount
      ) {
        discount =
          maxAllowedDiscount;
      }

      availableCoupons.push({
        code: coupon.code,
        discount,
      });

      if (
        discount >
        bestDiscount
      ) {
        bestDiscount =
          discount;

        bestCoupon = coupon;
      }
    }

    return {
      bestCoupon,
      bestDiscount,
      availableCoupons,
    };
  };