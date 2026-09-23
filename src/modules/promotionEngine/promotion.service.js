import Coupon from "./coupon.model.js";

/*
=========================================
CREATE COUPON (ADMIN)
=========================================
*/

export const createCouponService = async (payload) => {
  const coupon = await Coupon.create(payload);

  return coupon;
};

/*
=========================================
AUTO FIND BEST COUPON
=========================================
*/

export const findBestCoupon =
  async ({
    module,
    bookingAmount,
    serviceTax,
  }) => {
const now = new Date();
    const coupons =
      await Coupon.find({
        applicableModules: {
          $in: [module],
        },
        isAutoApply: true,
        isActive: true,
       
    "validity.startDate": { $lte: now },
    "validity.endDate": { $gte: now },
  });

  let bestCoupon = null;
  let bestDiscount = 0;

  let availableCoupons = [];

  const maxAllowedDiscount = serviceTax * 0.7;

  for (const coupon of coupons) {
    // minimum amount validation
    if (bookingAmount < coupon.minAmount) {
      continue;
    }

    // expiry check
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      continue;
    }

    let discount = 0;

    // flat discount
    if (coupon.discountType === "flat") {
      discount = coupon.discountValue;
    }

    // percentage discount
    if (coupon.discountType === "percent") {
      discount = (bookingAmount * coupon.discountValue) / 100;
    }

    // max cap = 70% of service tax
    if (discount > maxAllowedDiscount) {
      discount = maxAllowedDiscount;
    }

    // push all available coupons
    availableCoupons.push({
      code: coupon.code,
      title: coupon.title,
      discount,
    });

    // choose best coupon
    if (discount > bestDiscount) {
      bestDiscount = discount;

      bestCoupon = coupon;
    }
  }

  return {
    bestCoupon,
    bestDiscount,
    availableCoupons,
  };
};

/*
=========================================
MANUAL APPLY COUPON
=========================================
*/

export const applyManualCoupon = async ({ booking, couponCode, module }) => {
  const coupon = await Coupon.findOne({
    code: couponCode,
    isActive: true,
  });

  if (!coupon) {
    throw new Error("Invalid coupon");
  }

  // module check
  if (!coupon.applicableModules.includes(module)) {
    throw new Error("Coupon not valid for this module");
  }

  // expiry check
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new Error("Coupon expired");
  }

  let discount = 0;

  if (coupon.discountType === "flat") {
    discount = coupon.discountValue;
  }

  if (coupon.discountType === "percent") {
    discount = (booking.pricing.finalSellingPrice * coupon.discountValue) / 100;
  }

  const maxAllowedDiscount = booking.pricing.serviceTaxAmount * 0.7;

  if (discount > maxAllowedDiscount) {
    discount = maxAllowedDiscount;
  }

  booking.offer = {
    couponCode: coupon.code,

    couponDiscount: discount,

    autoDiscount: discount,
  };

  booking.payableAmount = booking.pricing.finalSellingPrice - discount;

  await booking.save();

  return booking;
};

export const giftcard = async () => {
  const now = new Date();

  const coupons = await Coupon.find({
    isActive: true,
    $or: [
      // validity nahi hai to bhi show karo
      { validity: { $exists: false } },

      // validity object hai lekin endDate nahi hai
      { "validity.endDate": { $exists: false } },

      // sirf non-expired coupons
      {
        "validity.endDate": {
          $gte: now,
        },
      },
    ],
  }).sort({ createdAt: -1 });

  return coupons.map((coupon) => {
    const obj = coupon.toObject();

    obj.comingSoon =
      obj.validity?.startDate &&
      new Date(obj.validity.startDate) > now;

    return obj;
  });
};

export const getAllCouponsService = async (queryParams = {}) => {
  const {
    isActive,
    module,
    startDate,
    endDate,
    search,
    page = 1,
    limit = 10,
  } = queryParams;

  let filter = {};

  const pageNumber = Number(page);

  const limitNumber = Number(limit);

  const skip = (pageNumber - 1) * limitNumber;

  /* ==========================
       SEARCH BY CODE / TITLE
    ========================== */

  if (search) {
    filter.$or = [
      {
        code: {
          $regex: search,
          $options: "i",
        },
      },

      {
        title: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  /* ==========================
       STATUS FILTER
    ========================== */

  if (isActive !== undefined) {
    filter.isActive = isActive === "true";
  }

  /* ==========================
       MODULE FILTER
    ========================== */

  if (module) {
    filter.applicableModules = module;
  }

  /* ==========================
       DATE FILTER
    ========================== */

  if (startDate || endDate) {
    if (startDate) {
      filter["validity.startDate"] = {
        $gte: new Date(startDate),
      };
    }

    if (endDate) {
      filter["validity.endDate"] = {
        $lte: new Date(endDate),
      };
    }
  }

  /* ==========================
       GET TOTAL COUNT
    ========================== */

  const totalCoupons = await Coupon.countDocuments(filter);

  /* ==========================
       FETCH DATA
    ========================== */

  const coupons = await Coupon.find(filter)
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limitNumber);

  return {
    coupons,

    pagination: {
      totalRecords: totalCoupons,

      currentPage: pageNumber,

      totalPages: Math.ceil(totalCoupons / limitNumber),

      limit: limitNumber,
    },
  };
};
// /*
// ====================================
// GET SINGLE COUPON
// ====================================
// */
export const getSingleCouponService = async (couponId) => {
  const coupon = await Coupon.findById(couponId);

  if (!coupon) {
    throw new Error("Coupon not found");
  }

  return coupon;
};

/*
====================================
UPDATE COUPON
====================================
*/
export const updateCouponAdminService = async (couponId, payload) => {
  const coupon = await Coupon.findByIdAndUpdate(couponId, payload, {
    new: true,
  });

  if (!coupon) {
    throw new Error("Coupon not found");
  }

  return coupon;
};
export const updateCouponStatusService = async (couponId, isActive) => {
  const coupon = await Coupon.findByIdAndUpdate(
    couponId,
    { isActive },
    { new: true },
  );

  if (!coupon) {
    throw new Error("Coupon not found");
  }

  return coupon;
};
export const deleteCouponAdminService = async (couponId) => {
  const coupon = await Coupon.findByIdAndDelete(couponId);

  if (!coupon) {
    throw new Error("Coupon not found");
  }

  return coupon;
};
